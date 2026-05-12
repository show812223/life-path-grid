# Viewer COBie 篩選器 v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 砍掉 v1 篩選器，重寫成「4 個互斥模式 chip + 顯式套用 + 純 Viewer 屬性資料源」的極簡版。

**Architecture:** 兩個新 composable — `useModelCobieIndex`（從 Viewer 屬性建一次性索引）與 `useCobieFilter`（pending/applied 雙態狀態機 + viewer isolation sync）。UI 為 chip toggle + 多選清單 + apply 按鈕 + 結果清單。完全不上色，只 isolate。

**Tech Stack:** Vue 3 (Composition API + `<script setup>`)、Vuetify 3、Vitest + happy-dom、Forge Viewer API。

**Spec:** `docs/superpowers/specs/2026-05-12-viewer-cobie-filter-v2-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `app/composables/useModelCobieIndex.ts` | Create | 從 Viewer 屬性掃描建 extId 索引；快取 |
| `app/composables/useCobieFilter.ts` | Replace | pending/applied 雙態 + viewer isolation sync |
| `app/components/CobieFilterPanel.vue` | Replace | 4 chip + 選項 + 套用列 + 結果清單 |
| `app/components/CobieFilterStatusBar.vue` | Replace | viewer 上方浮動狀態（簡化版） |
| `app/pages/viewer/[id].vue` | Modify | 移除 v1 殘留呼叫、簡化 focusElements |
| `app/composables/filterEngine.ts` | Delete | v1 chain engine |
| `app/composables/filterRegistry.ts` | Delete | v1 dimension registry |
| `app/composables/filterTypes.ts` | Delete | v1 型別 |
| `app/composables/useFilterCtx.ts` | Delete | v1 store-based context |
| `app/composables/useViewerHighlight.ts` | Delete | v1 highlight helper |
| `app/components/FilterConditionCard.vue` | Delete | v1 condition card |
| `app/components/FilterOrGroupCard.vue` | Delete | v1 OR group |
| `app/components/FilterValueInput.vue` | Delete | v1 value input |
| `tests/composables/filterEngine.test.ts` | Delete | v1 測試 |
| `tests/composables/filterRegistry.test.ts` | Delete | v1 測試 |
| `tests/composables/useFilterCtx.test.ts` | Delete | v1 測試 |
| `tests/composables/useModelCobieIndex.test.ts` | Create | 索引建立純邏輯測試 |
| `tests/composables/useCobieFilter.test.ts` | Create | 篩選狀態機測試 |

---

## Task 1: `useModelCobieIndex` — 索引型別與純掃描函式

**Files:**
- Create: `app/composables/useModelCobieIndex.ts`
- Test: `tests/composables/useModelCobieIndex.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/composables/useModelCobieIndex.test.ts
import { describe, it, expect } from 'vitest'
import { scanModel, type CobieIndex } from '~/composables/useModelCobieIndex'

function makeMockModel(elements: Array<{
  dbId: number
  externalId: string
  name: string
  floor?: string
  space?: string
  typeName?: string
  system?: string
}>) {
  const dbIds = elements.map(e => e.dbId)
  return {
    getInstanceTree: () => ({
      getRootId: () => 1,
      enumNodeChildren: (id: number, cb: (child: number) => void) => {
        if (id === 1) for (const dbId of dbIds) cb(dbId)
      }
    }),
    getBulkProperties2: (
      _ids: number[],
      _opts: any,
      cb: (results: any[]) => void
    ) => {
      cb(elements.map(e => ({
        dbId: e.dbId,
        externalId: e.externalId,
        name: e.name,
        properties: [
          e.floor != null && { displayName: 'COBie.Floor.Name', displayValue: e.floor },
          e.space != null && { displayName: 'COBie.Component.Space', displayValue: e.space },
          e.typeName != null && { displayName: 'COBie.Type.Name', displayValue: e.typeName },
          e.system != null && { displayName: 'COBie.System.Name', displayValue: e.system }
        ].filter(Boolean)
      })))
    }
  }
}

describe('scanModel', () => {
  it('builds byExtId with floor/space/type/system fields', async () => {
    const model = makeMockModel([
      { dbId: 10, externalId: 'A', name: 'Duct-1', floor: '1F', space: 'Lobby', typeName: 'Round Duct', system: 'HVAC' },
      { dbId: 20, externalId: 'B', name: 'Pipe-1', floor: '2F', typeName: 'Pipe' }
    ])
    const idx: CobieIndex = await scanModel(model)
    expect(idx.byExtId.size).toBe(2)
    expect(idx.byExtId.get('A')).toEqual({
      floor: '1F', space: 'Lobby', typeName: 'Round Duct', system: 'HVAC',
      dbId: 10, name: 'Duct-1'
    })
    expect(idx.byExtId.get('B')?.floor).toBe('2F')
    expect(idx.byExtId.get('B')?.space).toBeUndefined()
  })

  it('builds reverse indices keyed by value', async () => {
    const model = makeMockModel([
      { dbId: 1, externalId: 'A', name: 'a', floor: '1F', typeName: 'Pipe' },
      { dbId: 2, externalId: 'B', name: 'b', floor: '1F', typeName: 'Duct' },
      { dbId: 3, externalId: 'C', name: 'c', floor: '2F', typeName: 'Pipe' }
    ])
    const idx = await scanModel(model)
    expect([...idx.byFloor.get('1F') ?? []].sort()).toEqual(['A', 'B'])
    expect([...idx.byFloor.get('2F') ?? []].sort()).toEqual(['C'])
    expect([...idx.byType.get('Pipe') ?? []].sort()).toEqual(['A', 'C'])
    expect([...idx.byType.get('Duct') ?? []].sort()).toEqual(['B'])
  })

  it('skips elements without any COBie field', async () => {
    const model = makeMockModel([
      { dbId: 1, externalId: 'A', name: 'a' },
      { dbId: 2, externalId: 'B', name: 'b', floor: '1F' }
    ])
    const idx = await scanModel(model)
    expect(idx.byExtId.has('A')).toBe(false)
    expect(idx.byExtId.has('B')).toBe(true)
  })

  it('treats empty-string value as missing', async () => {
    const model = makeMockModel([
      { dbId: 1, externalId: 'A', name: 'a', floor: '', typeName: 'X' }
    ])
    const idx = await scanModel(model)
    expect(idx.byExtId.get('A')?.floor).toBeUndefined()
    expect(idx.byExtId.get('A')?.typeName).toBe('X')
  })

  it('returns empty index when model lacks instance tree', async () => {
    const model = { getInstanceTree: () => null }
    const idx = await scanModel(model)
    expect(idx.byExtId.size).toBe(0)
    expect(idx.byFloor.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/composables/useModelCobieIndex.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scanModel` + types**

```ts
// app/composables/useModelCobieIndex.ts
import { ref, type Ref } from 'vue'

export interface CobieIndexEntry {
  floor?: string
  space?: string
  typeName?: string
  system?: string
  dbId: number
  name: string
}

export interface CobieIndex {
  byExtId: Map<string, CobieIndexEntry>
  byFloor: Map<string, Set<string>>
  bySpace: Map<string, Set<string>>
  byType: Map<string, Set<string>>
  bySystem: Map<string, Set<string>>
}

const FIELD_TO_DISPLAY = {
  floor: 'COBie.Floor.Name',
  space: 'COBie.Component.Space',
  typeName: 'COBie.Type.Name',
  system: 'COBie.System.Name'
} as const

const emptyIndex = (): CobieIndex => ({
  byExtId: new Map(),
  byFloor: new Map(),
  bySpace: new Map(),
  byType: new Map(),
  bySystem: new Map()
})

const addToReverse = (m: Map<string, Set<string>>, k: string, v: string) => {
  let s = m.get(k)
  if (!s) { s = new Set(); m.set(k, s) }
  s.add(v)
}

const normalizeValue = (raw: any): string | undefined => {
  if (raw == null) return undefined
  const s = String(raw).trim()
  return s ? s : undefined
}

const enumAllDbIds = (tree: any): number[] => {
  const ids: number[] = []
  const root = tree.getRootId()
  const walk = (id: number) => {
    tree.enumNodeChildren(id, (child: number) => {
      ids.push(child)
      walk(child)
    }, false)
  }
  walk(root)
  return ids
}

export async function scanModel(model: any): Promise<CobieIndex> {
  const idx = emptyIndex()
  if (!model) return idx
  const tree = model.getInstanceTree?.()
  if (!tree) return idx
  const dbIds = enumAllDbIds(tree)
  if (dbIds.length === 0) return idx

  const results: any[] = await new Promise((resolve, reject) => {
    model.getBulkProperties2(
      dbIds,
      { propFilter: [...Object.values(FIELD_TO_DISPLAY), 'externalId'] },
      (res: any[]) => resolve(res),
      (err: any) => reject(err)
    )
  })

  for (const r of results) {
    const extId: string | undefined = r?.externalId
    if (!extId || !r?.properties) continue

    const fields: Partial<CobieIndexEntry> = {}
    for (const p of r.properties) {
      if (typeof p.displayName !== 'string') continue
      for (const [key, displayName] of Object.entries(FIELD_TO_DISPLAY)) {
        if (p.displayName === displayName) {
          const v = normalizeValue(p.displayValue)
          if (v) (fields as any)[key] = v
        }
      }
    }

    if (!fields.floor && !fields.space && !fields.typeName && !fields.system) continue

    const entry: CobieIndexEntry = {
      ...fields,
      dbId: r.dbId,
      name: typeof r.name === 'string' ? r.name : ''
    }
    idx.byExtId.set(extId, entry)
    if (fields.floor) addToReverse(idx.byFloor, fields.floor, extId)
    if (fields.space) addToReverse(idx.bySpace, fields.space, extId)
    if (fields.typeName) addToReverse(idx.byType, fields.typeName, extId)
    if (fields.system) addToReverse(idx.bySystem, fields.system, extId)
  }
  return idx
}

const modelCache = new WeakMap<object, CobieIndex>()

export interface UseModelCobieIndex {
  index: Ref<CobieIndex | null>
  loading: Ref<boolean>
  build(viewer: any): Promise<void>
  reset(): void
}

export function useModelCobieIndex(): UseModelCobieIndex {
  const index = ref<CobieIndex | null>(null)
  const loading = ref(false)

  async function build(viewer: any): Promise<void> {
    const model = viewer?.model
    if (!model) { index.value = null; return }
    const cached = modelCache.get(model)
    if (cached) { index.value = cached; return }
    loading.value = true
    try {
      const idx = await scanModel(model)
      modelCache.set(model, idx)
      index.value = idx
    } catch (e) {
      console.error('[useModelCobieIndex] scan failed:', e)
      index.value = null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    index.value = null
  }

  return { index, loading, build, reset }
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test tests/composables/useModelCobieIndex.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/composables/useModelCobieIndex.ts tests/composables/useModelCobieIndex.test.ts
git commit -m "feat(filter v2): useModelCobieIndex composable + tests"
```

---

## Task 2: `useCobieFilter` — pending/applied 雙態 + actions

**Files:**
- Replace: `app/composables/useCobieFilter.ts`
- Test: `tests/composables/useCobieFilter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/composables/useCobieFilter.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useCobieFilter } from '~/composables/useCobieFilter'
import type { CobieIndex } from '~/composables/useModelCobieIndex'

function makeIndex(): CobieIndex {
  return {
    byExtId: new Map([
      ['A', { floor: '1F', space: 'Lobby', typeName: 'Duct', system: 'HVAC', dbId: 10, name: 'Duct-A' }],
      ['B', { floor: '1F', space: 'Lobby', typeName: 'Pipe', system: 'Plumbing', dbId: 20, name: 'Pipe-B' }],
      ['C', { floor: '2F', space: 'Office', typeName: 'Duct', system: 'HVAC', dbId: 30, name: 'Duct-C' }]
    ]),
    byFloor: new Map([
      ['1F', new Set(['A', 'B'])],
      ['2F', new Set(['C'])]
    ]),
    bySpace: new Map([
      ['Lobby', new Set(['A', 'B'])],
      ['Office', new Set(['C'])]
    ]),
    byType: new Map([
      ['Duct', new Set(['A', 'C'])],
      ['Pipe', new Set(['B'])]
    ]),
    bySystem: new Map([
      ['HVAC', new Set(['A', 'C'])],
      ['Plumbing', new Set(['B'])]
    ])
  }
}

function makeMockViewer() {
  const calls: any[] = []
  return {
    calls,
    showAll: () => calls.push(['showAll']),
    hideAll: () => calls.push(['hideAll']),
    isolate: (ids: number[]) => calls.push(['isolate', [...ids]]),
    select: (ids: number[]) => calls.push(['select', [...ids]]),
    fitToView: (ids: number[]) => calls.push(['fitToView', [...ids]]),
    model: {} // truthy but unused in these tests
  }
}

describe('useCobieFilter — state machine', () => {
  let viewer: ReturnType<typeof makeMockViewer>
  let viewerRef: ReturnType<typeof ref>
  let filter: ReturnType<typeof useCobieFilter>

  beforeEach(() => {
    viewer = makeMockViewer()
    viewerRef = ref(viewer as any)
    filter = useCobieFilter({ viewer: viewerRef, injectedIndex: makeIndex() })
  })

  it('starts with null mode and empty selections', () => {
    expect(filter.pendingMode.value).toBeNull()
    expect(filter.appliedMode.value).toBeNull()
    expect(filter.pendingSelected.value.size).toBe(0)
    expect(filter.appliedSelected.value.size).toBe(0)
    expect(filter.isDirty.value).toBe(false)
  })

  it('setPendingMode changes pendingMode and clears pendingSelected', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    expect(filter.pendingSelected.value.has('1F')).toBe(true)
    filter.setPendingMode('type')
    expect(filter.pendingMode.value).toBe('type')
    expect(filter.pendingSelected.value.size).toBe(0)
  })

  it('togglePending adds and removes values', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.togglePending('2F')
    expect([...filter.pendingSelected.value].sort()).toEqual(['1F', '2F'])
    filter.togglePending('1F')
    expect([...filter.pendingSelected.value]).toEqual(['2F'])
  })

  it('selectAllPending picks every option of current mode', () => {
    filter.setPendingMode('floor')
    filter.selectAllPending()
    expect([...filter.pendingSelected.value].sort()).toEqual(['1F', '2F'])
  })

  it('clearPendingSelection empties pending but keeps mode', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.clearPendingSelection()
    expect(filter.pendingMode.value).toBe('floor')
    expect(filter.pendingSelected.value.size).toBe(0)
  })

  it('apply copies pending into applied', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.apply()
    expect(filter.appliedMode.value).toBe('floor')
    expect([...filter.appliedSelected.value]).toEqual(['1F'])
    expect(filter.isDirty.value).toBe(false)
  })

  it('clear resets both pending and applied to null', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.apply()
    filter.clear()
    expect(filter.pendingMode.value).toBeNull()
    expect(filter.appliedMode.value).toBeNull()
    expect(filter.pendingSelected.value.size).toBe(0)
    expect(filter.appliedSelected.value.size).toBe(0)
  })

  it('isDirty reflects pending vs applied differences', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    expect(filter.isDirty.value).toBe(true)
    filter.apply()
    expect(filter.isDirty.value).toBe(false)
    filter.togglePending('2F')
    expect(filter.isDirty.value).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test tests/composables/useCobieFilter.test.ts`
Expected: FAIL — old API mismatch (module exports differ).

- [ ] **Step 3: Replace `useCobieFilter.ts` with new state machine (no viewer sync yet)**

```ts
// app/composables/useCobieFilter.ts
import { ref, computed, watch, onScopeDispose, type Ref, type ComputedRef } from 'vue'
import { useModelCobieIndex, type CobieIndex } from './useModelCobieIndex'

export type FilterMode = 'floor' | 'space' | 'type' | 'system' | null

export interface HitListItem {
  extId: string
  dbId: number
  name: string
  typeName?: string
}

export interface UseCobieFilterReturn {
  pendingMode: Ref<FilterMode>
  pendingSelected: Ref<Set<string>>
  appliedMode: Ref<FilterMode>
  appliedSelected: Ref<Set<string>>
  index: Ref<CobieIndex | null>
  indexLoading: Ref<boolean>
  isDirty: ComputedRef<boolean>
  pendingOptions: ComputedRef<string[]>
  hitExtIds: ComputedRef<Set<string>>
  hitCount: ComputedRef<number>
  totalCount: ComputedRef<number>
  hitsAsList: ComputedRef<HitListItem[]>
  canApply: ComputedRef<boolean>
  setPendingMode(m: FilterMode): void
  togglePending(value: string): void
  selectAllPending(): void
  clearPendingSelection(): void
  apply(): void
  clear(): void
  focusOne(extId: string): void
}

const reverseMapForMode = (idx: CobieIndex | null, mode: FilterMode): Map<string, Set<string>> | null => {
  if (!idx || !mode) return null
  switch (mode) {
    case 'floor':  return idx.byFloor
    case 'space':  return idx.bySpace
    case 'type':   return idx.byType
    case 'system': return idx.bySystem
  }
}

const setsEqual = (a: Set<string>, b: Set<string>): boolean => {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

export function useCobieFilter(opts: {
  viewer: Ref<any | null>
  /** test-only: skip the index composable, inject a prebuilt index */
  injectedIndex?: CobieIndex
}): UseCobieFilterReturn {
  const indexComposable = useModelCobieIndex()
  const index = opts.injectedIndex
    ? ref<CobieIndex | null>(opts.injectedIndex)
    : indexComposable.index
  const indexLoading = indexComposable.loading

  const pendingMode = ref<FilterMode>(null)
  const pendingSelected = ref<Set<string>>(new Set())
  const appliedMode = ref<FilterMode>(null)
  const appliedSelected = ref<Set<string>>(new Set())

  const pendingOptions = computed<string[]>(() => {
    const m = reverseMapForMode(index.value, pendingMode.value)
    if (!m) return []
    return [...m.keys()].sort((a, b) => a.localeCompare(b))
  })

  const hitExtIds = computed<Set<string>>(() => {
    const m = reverseMapForMode(index.value, appliedMode.value)
    if (!m || appliedSelected.value.size === 0) return new Set()
    const out = new Set<string>()
    for (const v of appliedSelected.value) {
      for (const id of m.get(v) ?? []) out.add(id)
    }
    return out
  })

  const hitCount = computed(() => hitExtIds.value.size)
  const totalCount = computed(() => index.value?.byExtId.size ?? 0)

  const hitsAsList = computed<HitListItem[]>(() => {
    const idx = index.value
    if (!idx) return []
    const out: HitListItem[] = []
    for (const extId of hitExtIds.value) {
      const e = idx.byExtId.get(extId)
      if (!e) continue
      out.push({ extId, dbId: e.dbId, name: e.name, typeName: e.typeName })
    }
    out.sort((a, b) => a.name.localeCompare(b.name))
    return out
  })

  const isDirty = computed(() =>
    pendingMode.value !== appliedMode.value
      || !setsEqual(pendingSelected.value, appliedSelected.value)
  )

  const canApply = computed(() =>
    isDirty.value && pendingMode.value !== null && pendingSelected.value.size > 0
  )

  function setPendingMode(m: FilterMode) {
    pendingMode.value = m
    pendingSelected.value = new Set()
  }

  function togglePending(value: string) {
    const next = new Set(pendingSelected.value)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    pendingSelected.value = next
  }

  function selectAllPending() {
    pendingSelected.value = new Set(pendingOptions.value)
  }

  function clearPendingSelection() {
    pendingSelected.value = new Set()
  }

  function apply() {
    appliedMode.value = pendingMode.value
    appliedSelected.value = new Set(pendingSelected.value)
  }

  function clear() {
    pendingMode.value = null
    pendingSelected.value = new Set()
    appliedMode.value = null
    appliedSelected.value = new Set()
  }

  function focusOne(extId: string) {
    const v = opts.viewer.value
    const dbId = index.value?.byExtId.get(extId)?.dbId
    if (!v || dbId == null) return
    v.select?.([dbId])
    v.fitToView?.([dbId])
  }

  // Build index on viewer change (skip when injectedIndex provided — test mode).
  if (!opts.injectedIndex) {
    watch(opts.viewer, async (v, oldV) => {
      if (oldV && v !== oldV) {
        indexComposable.reset()
        clear()
      }
      if (v) await indexComposable.build(v)
    }, { immediate: true })
  }

  onScopeDispose(() => {
    const v = opts.viewer.value
    if (v) { v.showAll?.(); v.isolate?.([]) }
  })

  return {
    pendingMode, pendingSelected, appliedMode, appliedSelected,
    index, indexLoading,
    isDirty, pendingOptions, hitExtIds, hitCount, totalCount, hitsAsList, canApply,
    setPendingMode, togglePending, selectAllPending, clearPendingSelection,
    apply, clear, focusOne
  }
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test tests/composables/useCobieFilter.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add app/composables/useCobieFilter.ts tests/composables/useCobieFilter.test.ts
git commit -m "feat(filter v2): useCobieFilter pending/applied state machine"
```

---

## Task 3: `useCobieFilter` — derived hits + focusOne

**Files:**
- Modify: `tests/composables/useCobieFilter.test.ts`

- [ ] **Step 1: Add tests for derived computeds**

Append to `tests/composables/useCobieFilter.test.ts`:

```ts
describe('useCobieFilter — derived hits', () => {
  let viewer: ReturnType<typeof makeMockViewer>
  let viewerRef: ReturnType<typeof ref>
  let filter: ReturnType<typeof useCobieFilter>

  beforeEach(() => {
    viewer = makeMockViewer()
    viewerRef = ref(viewer as any)
    filter = useCobieFilter({ viewer: viewerRef, injectedIndex: makeIndex() })
  })

  it('pendingOptions lists sorted values for current mode', () => {
    filter.setPendingMode('floor')
    expect(filter.pendingOptions.value).toEqual(['1F', '2F'])
    filter.setPendingMode('type')
    expect(filter.pendingOptions.value).toEqual(['Duct', 'Pipe'])
  })

  it('hitExtIds is empty when no applied filter', () => {
    expect(filter.hitExtIds.value.size).toBe(0)
  })

  it('hitExtIds is union of selected values', () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.togglePending('2F')
    filter.apply()
    expect([...filter.hitExtIds.value].sort()).toEqual(['A', 'B', 'C'])
  })

  it('hitsAsList sorts by name and includes typeName', () => {
    filter.setPendingMode('type')
    filter.togglePending('Duct')
    filter.apply()
    expect(filter.hitsAsList.value).toEqual([
      { extId: 'A', dbId: 10, name: 'Duct-A', typeName: 'Duct' },
      { extId: 'C', dbId: 30, name: 'Duct-C', typeName: 'Duct' }
    ])
  })

  it('canApply requires dirty + non-empty pending + non-null mode', () => {
    expect(filter.canApply.value).toBe(false)
    filter.setPendingMode('floor')
    expect(filter.canApply.value).toBe(false) // empty selection
    filter.togglePending('1F')
    expect(filter.canApply.value).toBe(true)
    filter.apply()
    expect(filter.canApply.value).toBe(false) // not dirty
  })

  it('focusOne calls viewer.select + fitToView with the dbId', () => {
    filter.focusOne('B')
    expect(viewer.calls).toEqual([['select', [20]], ['fitToView', [20]]])
  })

  it('focusOne is a no-op for unknown extId', () => {
    filter.focusOne('UNKNOWN')
    expect(viewer.calls).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify pass (no source changes needed — Task 2 already covers)**

Run: `pnpm test tests/composables/useCobieFilter.test.ts`
Expected: PASS (15 tests total).

- [ ] **Step 3: Commit**

```bash
git add tests/composables/useCobieFilter.test.ts
git commit -m "test(filter v2): cover derived hits + focusOne"
```

---

## Task 4: Viewer isolation sync

**Files:**
- Modify: `app/composables/useCobieFilter.ts`
- Modify: `tests/composables/useCobieFilter.test.ts`

- [ ] **Step 1: Add failing tests for isolation sync**

Append to `tests/composables/useCobieFilter.test.ts`:

```ts
describe('useCobieFilter — viewer isolation sync', () => {
  let viewer: ReturnType<typeof makeMockViewer>
  let viewerRef: ReturnType<typeof ref>
  let filter: ReturnType<typeof useCobieFilter>

  beforeEach(() => {
    viewer = makeMockViewer()
    viewerRef = ref(viewer as any)
    filter = useCobieFilter({ viewer: viewerRef, injectedIndex: makeIndex() })
  })

  it('does nothing while appliedMode is null', async () => {
    await nextTick()
    expect(viewer.calls).toEqual([])
  })

  it('isolates hit dbIds after apply()', async () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.apply()
    await nextTick()
    const last = viewer.calls.slice(-2)
    expect(last[0]).toEqual(['showAll'])
    expect(last[1][0]).toBe('isolate')
    expect([...last[1][1]].sort()).toEqual([10, 20])
  })

  it('hideAll when applied filter produces zero hits', async () => {
    filter.setPendingMode('floor')
    filter.togglePending('UNKNOWN_FLOOR')
    filter.apply()
    await nextTick()
    expect(viewer.calls.at(-1)).toEqual(['hideAll'])
  })

  it('restores all on clear()', async () => {
    filter.setPendingMode('floor')
    filter.togglePending('1F')
    filter.apply()
    await nextTick()
    viewer.calls.length = 0
    filter.clear()
    await nextTick()
    expect(viewer.calls).toEqual([['showAll'], ['isolate', []]])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/composables/useCobieFilter.test.ts`
Expected: FAIL — "isolates hit dbIds after apply()" calls list empty (no sync watch).

- [ ] **Step 3: Wire viewer isolation watcher**

In `app/composables/useCobieFilter.ts`, add inside `useCobieFilter` body (immediately before `onScopeDispose`):

```ts
  function applyIsolation() {
    const v = opts.viewer.value
    if (!v) return
    if (appliedMode.value === null) {
      v.showAll?.()
      v.isolate?.([])
      return
    }
    const idx = index.value
    if (!idx) return
    const dbIds: number[] = []
    for (const extId of hitExtIds.value) {
      const e = idx.byExtId.get(extId)
      if (e) dbIds.push(e.dbId)
    }
    if (dbIds.length === 0) {
      v.hideAll?.()
    } else {
      v.showAll?.()
      v.isolate?.(dbIds)
    }
  }

  watch([appliedMode, appliedSelected, index, opts.viewer], applyIsolation, { flush: 'post' })
```

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm test tests/composables/useCobieFilter.test.ts`
Expected: PASS (19 tests total).

- [ ] **Step 5: Commit**

```bash
git add app/composables/useCobieFilter.ts tests/composables/useCobieFilter.test.ts
git commit -m "feat(filter v2): viewer isolation sync watcher"
```

---

## Task 5: Rewrite `CobieFilterPanel.vue`

**Files:**
- Replace: `app/components/CobieFilterPanel.vue`

- [ ] **Step 1: Overwrite with new SFC**

```vue
<script setup lang="ts">
import type { UseCobieFilterReturn, FilterMode } from '~/composables/useCobieFilter'

const props = defineProps<{ filter: UseCobieFilterReturn }>()

const MODE_LABELS: Record<Exclude<FilterMode, null>, string> = {
  floor: '樓層',
  space: '空間',
  type: '類型',
  system: '系統'
}
const MODES: Array<Exclude<FilterMode, null>> = ['floor', 'space', 'type', 'system']

const search = ref('')

watch(
  () => props.filter.pendingMode.value,
  () => { search.value = '' }
)

const filteredOptions = computed(() => {
  const q = search.value.trim().toLowerCase()
  const opts = props.filter.pendingOptions.value
  if (!q) return opts
  return opts.filter(o => o.toLowerCase().includes(q))
})

const onChipClick = (m: Exclude<FilterMode, null>) => {
  if (props.filter.pendingMode.value === m) {
    props.filter.setPendingMode(null)
  } else {
    props.filter.setPendingMode(m)
  }
}

const chipCount = (m: Exclude<FilterMode, null>) => {
  return props.filter.pendingMode.value === m ? props.filter.pendingSelected.value.size : 0
}

const showEmptyMode = computed(() =>
  props.filter.pendingMode.value !== null && props.filter.pendingOptions.value.length === 0
)
</script>

<template>
  <div class="filter-panel">
    <header class="filter-head">
      <h3 class="filter-title">篩選</h3>
      <v-spacer />
      <span v-if="filter.appliedMode.value" class="filter-badge t-mono">
        {{ filter.hitCount.value }} / {{ filter.totalCount.value }}
      </span>
    </header>

    <v-divider />

    <div v-if="filter.indexLoading.value" class="loading">
      <v-progress-circular indeterminate size="20" width="2" />
      <span>載入索引中…</span>
    </div>

    <template v-else>
      <div class="chip-row">
        <v-chip
          v-for="m in MODES"
          :key="m"
          :color="filter.pendingMode.value === m ? 'primary' : undefined"
          :variant="filter.pendingMode.value === m ? 'flat' : 'tonal'"
          size="small"
          @click="onChipClick(m)"
        >
          {{ MODE_LABELS[m] }}<template v-if="chipCount(m) > 0"> · {{ chipCount(m) }}</template>
        </v-chip>
      </div>

      <div v-if="filter.pendingMode.value" class="options-section">
        <div class="options-head">
          <v-btn
            size="x-small"
            variant="text"
            :disabled="filter.pendingOptions.value.length === 0"
            @click="filter.selectAllPending()"
          >全選</v-btn>
          <v-btn
            size="x-small"
            variant="text"
            :disabled="filter.pendingSelected.value.size === 0"
            @click="filter.clearPendingSelection()"
          >清空</v-btn>
        </div>
        <v-text-field
          v-model="search"
          density="compact"
          variant="outlined"
          placeholder="搜尋…"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
          class="options-search"
        />
        <div v-if="showEmptyMode" class="empty-mode">
          無 {{ MODE_LABELS[filter.pendingMode.value!] }} 資料
        </div>
        <div v-else class="options-list">
          <v-checkbox
            v-for="opt in filteredOptions"
            :key="opt"
            :model-value="filter.pendingSelected.value.has(opt)"
            :label="opt"
            density="compact"
            hide-details
            color="primary"
            @update:model-value="filter.togglePending(opt)"
          />
        </div>
      </div>

      <div class="apply-row">
        <v-btn
          size="small"
          variant="text"
          :disabled="filter.appliedMode.value === null && filter.pendingMode.value === null && filter.pendingSelected.value.size === 0"
          @click="filter.clear()"
        >清除</v-btn>
        <v-spacer />
        <v-btn
          size="small"
          color="primary"
          variant="flat"
          :disabled="!filter.canApply.value"
          @click="filter.apply()"
        >
          篩選<span v-if="filter.canApply.value" class="dirty-dot" />
        </v-btn>
      </div>

      <v-divider v-if="filter.appliedMode.value" />

      <div v-if="filter.appliedMode.value" class="results">
        <div class="results-head">結果（{{ filter.hitCount.value }}）</div>
        <div v-if="filter.hitsAsList.value.length === 0" class="empty-hits">
          此條件下無命中
        </div>
        <div v-else class="results-list">
          <div
            v-for="item in filter.hitsAsList.value"
            :key="item.extId"
            class="result-row"
            @click="filter.focusOne(item.extId)"
          >
            <span class="result-name">{{ item.name || '(未命名)' }}</span>
            <span v-if="item.typeName" class="result-type">{{ item.typeName }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.filter-panel { display: flex; flex-direction: column; height: 100%; }
.filter-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; }
.filter-title { font-size: 13px; font-weight: 700; margin: 0; }
.filter-badge { font-size: 11px; color: var(--primary); }
.loading {
  padding: 16px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px; }
.options-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 12px 8px;
  flex: 1;
  min-height: 0;
}
.options-head { display: flex; gap: 4px; }
.options-search :deep(input) { font-size: 12px; }
.options-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: 4px;
  padding: 4px 8px;
  max-height: 260px;
}
.options-list :deep(.v-selection-control) { min-height: 24px; }
.options-list :deep(.v-label) { font-size: 12px; }
.empty-mode { padding: 12px; text-align: center; font-size: 12px; color: var(--text-muted); }
.apply-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 6px;
}
.dirty-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #fff;
  margin-left: 6px;
}
.results { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.results-head { padding: 8px 12px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.results-list { flex: 1; overflow-y: auto; }
.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  border-top: 1px solid var(--border, rgba(0,0,0,0.04));
}
.result-row:hover { background: var(--surface-2); }
.result-name { word-break: break-word; }
.result-type { color: var(--text-muted); font-size: 11px; flex-shrink: 0; }
.empty-hits { padding: 12px; text-align: center; font-size: 12px; color: var(--text-muted); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/CobieFilterPanel.vue
git commit -m "feat(filter v2): rewrite CobieFilterPanel with chip toggle UI"
```

---

## Task 6: Rewrite `CobieFilterStatusBar.vue`

**Files:**
- Replace: `app/components/CobieFilterStatusBar.vue`

- [ ] **Step 1: Overwrite**

```vue
<script setup lang="ts">
import type { UseCobieFilterReturn, FilterMode } from '~/composables/useCobieFilter'

const props = defineProps<{ filter: UseCobieFilterReturn }>()

const MODE_LABELS: Record<Exclude<FilterMode, null>, string> = {
  floor: '樓層',
  space: '空間',
  type: '類型',
  system: '系統'
}

const show = computed(() => props.filter.appliedMode.value !== null)
const label = computed(() => {
  const m = props.filter.appliedMode.value
  return m ? MODE_LABELS[m] : ''
})
</script>

<template>
  <div v-if="show" class="status-bar">
    <v-icon icon="mdi-filter-variant" size="14" color="primary" />
    <span class="t-label">{{ label }}</span>
    <span class="t-mono">{{ filter.appliedSelected.value.size }} 已選</span>
    <span class="t-mono divider">·</span>
    <span class="t-mono">{{ filter.hitCount.value }} 件</span>
    <v-btn
      icon="mdi-close"
      variant="text"
      size="x-small"
      title="清除篩選"
      @click="filter.clear()"
    />
  </div>
</template>

<style scoped>
.status-bar {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  font-size: 12px;
}
.divider { color: var(--text-muted); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/CobieFilterStatusBar.vue
git commit -m "feat(filter v2): simplified CobieFilterStatusBar"
```

---

## Task 7: Update viewer page integration

**Files:**
- Modify: `app/pages/viewer/[id].vue`

- [ ] **Step 1: Locate and update the `useCobieFilter` call site**

Find the line:

```ts
const filter = useCobieFilter({ modelId, viewer: viewerRef })
```

Replace with:

```ts
const filter = useCobieFilter({ viewer: viewerRef })
```

- [ ] **Step 2: Simplify `focusElements`**

Locate the `focusElements` function. Replace its body with the simpler version (no `shouldSuppressIsolate` branch):

```ts
const focusElements = async (viewer: any, externalIds: string[]) => {
  const viewerModel = viewer.model
  if (!viewerModel) return

  const dbIds = await resolveDbIds(viewer, externalIds)
  if (dbIds.length === 0) return

  viewer.isolate(dbIds)
  viewer.select(dbIds)
  viewer.fitToView(dbIds)
  isolationActive.value = true
  if (dbIds.length === 1) populateSelectedFromDbId(viewer, dbIds[0])
}
```

- [ ] **Step 3: Remove obsolete `filter.notifyManualFocus()` calls**

Search the file for `filter.notifyManualFocus`. Remove every call (line + surrounding empty if-guard if any).

- [ ] **Step 4: Remove obsolete `filter.shouldSuppressIsolate` references**

Search the file for `filter.shouldSuppressIsolate`. Remove any branches gating on it.

- [ ] **Step 5: Verify build / type check**

Run: `pnpm run build 2>&1 | tail -30`
Expected: build completes (or fails only on unrelated lines — fix any reference to removed v1 API: `filter.expandToSystem`, `filter.expandToCategory`, `filter.enabled`, `filter.clearAll`, `filter.extractTypeCategoriesFromHits`, `filter.exportExtIds`, `filter.fitToHits`, `filter.hitsGroupedByType`, `filter.result`, `filter.ctx`, `filter.chain`).

If any such references remain in the viewer page, delete the using blocks (they were part of v1 features being removed).

- [ ] **Step 6: Commit**

```bash
git add app/pages/viewer/[id].vue
git commit -m "refactor(filter v2): viewer page uses simplified filter API"
```

---

## Task 8: Delete v1 files and v1 tests

**Files:**
- Delete: 8 v1 source files + 3 v1 test files

- [ ] **Step 1: Delete v1 source files**

```bash
rm app/composables/filterEngine.ts \
   app/composables/filterRegistry.ts \
   app/composables/filterTypes.ts \
   app/composables/useFilterCtx.ts \
   app/composables/useViewerHighlight.ts \
   app/components/FilterConditionCard.vue \
   app/components/FilterOrGroupCard.vue \
   app/components/FilterValueInput.vue
```

- [ ] **Step 2: Delete v1 test files**

```bash
rm tests/composables/filterEngine.test.ts \
   tests/composables/filterRegistry.test.ts \
   tests/composables/useFilterCtx.test.ts
```

- [ ] **Step 3: Search for lingering imports**

Run: `grep -rn "filterEngine\|filterRegistry\|filterTypes\|useFilterCtx\|useViewerHighlight\|FilterConditionCard\|FilterOrGroupCard\|FilterValueInput" app/ tests/ 2>/dev/null`
Expected: no output (no remaining references).

If any references remain, remove them from the offending file before continuing.

- [ ] **Step 4: Run all tests**

Run: `pnpm test`
Expected: PASS — only new tests run; no failures.

- [ ] **Step 5: Run build**

Run: `pnpm run build 2>&1 | tail -20`
Expected: build completes without errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(filter v2): remove v1 source + tests"
```

---

## Task 9: Manual smoke test

**Files:** None.

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`
Expected: server starts on http://localhost:3000.

- [ ] **Step 2: Open the viewer page**

Browse to a model with COBie data. Wait for it to load.

- [ ] **Step 3: Verify smoke checks**

For each row below, confirm the observed behavior matches:

| Action | Expected |
|---|---|
| Open 篩選 tab | 4 chips visible, all tonal. Loading shown briefly during first scan. |
| Click 樓層 chip | Chip turns primary; options list appears; 搜尋 box visible. |
| Check 1F | Checkbox toggles; chip shows `樓層·1`; [篩選] button enables with dot. |
| Click 篩選 | viewer isolates 1F objects; header shows `n / total`; result list shows hits sorted by name. |
| Click a result row | viewer fits to that single object; isolation set unchanged. |
| Click another chip (e.g. 類型) | Pending mode switches; options list refreshes; applied 1F filter still active in viewer; header still shows 1F count. |
| Check a value + 篩選 | viewer isolation switches to new criterion. |
| Click 清除 | viewer shows all objects; chips reset; result list disappears. |
| Click empty viewer element manually | Element selects; filter unchanged. |
| Collapse rail | Floating status bar appears at top center; clicking ✕ clears the filter. |

- [ ] **Step 4: Note any visual or behavior issues**

If any issues found, file follow-up tasks. Otherwise, mark this task complete and proceed.

- [ ] **Step 5: Final commit (if smoke fixes needed)**

If you fixed issues during smoke, commit them with a descriptive message:

```bash
git add -A
git commit -m "fix(filter v2): <describe fix from smoke>"
```

---

## Verification Checklist

After all tasks complete, verify against spec:

- [ ] 4 個互斥模式 chip 在 panel 頂部
- [ ] 任一時刻最多一個 chip active
- [ ] active 模式內可複選（v-checkbox 多選清單）
- [ ] 顯式套用：勾選不會立即改 viewer，須按 [篩選]
- [ ] [篩選] 在 pending 為空或無 mode 時 disabled
- [ ] [清除] 永遠可點，把 applied + pending 都清掉
- [ ] viewer 只 isolate 不 setThemingColor
- [ ] 索引純 Viewer 屬性，不讀 COBie store
- [ ] 切換 chip 清空 pending、保留 applied
- [ ] 命中 0 件 → viewer.hideAll
- [ ] 結果清單依 name 排序，點擊 = select + fitToView，不動 isolation
- [ ] CobieFilterStatusBar 在 applied 非 null 時顯示
- [ ] 換模型 → 索引重建 + 狀態清空
- [ ] v1 8 個檔案 + 3 個測試已刪除
- [ ] 沒有遺留 v1 import 或呼叫
