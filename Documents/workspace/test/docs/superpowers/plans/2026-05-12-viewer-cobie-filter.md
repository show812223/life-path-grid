# Viewer COBie 篩選器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `viewer/[id].vue` 加一個 COBie 篩選器：使用者選一個 `Type.Name` 自動展開為同 `Type.Category` 的所有元件並上色（橘）、非命中 ghost；可再用 Manufacturer / Floor / Space / System / Attribute 等維度漸進收窄，並支援 OR 群組。

**Architecture:** 引擎是純函式 (`filterEngine` + `filterRegistry`)；資料層由 `useFilterCtx` 從 Dexie 一次性載入後預建索引；Forge 互動封裝在 factory composable `useViewerHighlight`；`useCobieFilter` 是 facade 將 chain state、ctx、viewer 串接，並暴露給 UI（`CobieFilterPanel` + `CobieFilterStatusBar`）。Viewer 既有 `focusElements()` 改為「讓路」分支，篩選啟用時不 isolate。

**Tech Stack:** Vue 3 (`ref / computed / watch`), Vuetify 3, Nuxt 4, Dexie (via existing `useCobieStore`), Forge Viewer (Autodesk SVF), `vitest` for unit tests, 純 TypeScript 引擎 (無新依賴)。

**Spec:** [docs/superpowers/specs/2026-05-12-viewer-cobie-filter-design.md](../specs/2026-05-12-viewer-cobie-filter-design.md)

---

## File Structure

```
app/
├── composables/
│   ├── filterTypes.ts            [新] 共用型別 (避免 import 循環)
│   ├── filterRegistry.ts         [新] REGISTRY 維度定義 + dim helper
│   ├── filterEngine.ts           [新] 純函式：intersect / itemKey / shouldExpand / evaluateItem / evaluateChain / expandToSameCategory
│   ├── useFilterCtx.ts           [新] buildFilterCtx + 索引建構 + ctx ref + reload
│   ├── useViewerHighlight.ts     [新] factory composable: applyHighlight / clearHighlight / fitToHighlight / resetForNewModel + getMapping
│   └── useCobieFilter.ts         [新] facade composable
├── components/
│   ├── FilterValueInput.vue      [新] 依 op 渲染輸入控件
│   ├── FilterConditionCard.vue   [新] 單條件 row card
│   ├── FilterOrGroupCard.vue     [新] OR 群組 card（內含多張 FilterConditionCard）
│   ├── CobieFilterPanel.vue      [新] rail tab root
│   └── CobieFilterStatusBar.vue  [新] rail 收起時的 thin status bar
├── pages/viewer/
│   └── [id].vue                  [改] viewerRef refactor + 第 4 個 rail tab + StatusBar + focusElements 讓路分支
tests/
└── composables/
    ├── filterEngine.test.ts      [新]
    ├── filterRegistry.test.ts    [新]
    └── useFilterCtx.test.ts      [新]
vitest.config.ts                  [新]
```

---

## Task 0: 安裝 vitest 與 test scaffolding

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/.gitkeep`

- [ ] **Step 1: Install vitest**

Run: `pnpm add -D vitest @vue/test-utils happy-dom`
Expected: dependencies added to devDependencies, lockfile updated.

- [ ] **Step 2: Add test script to package.json**

Edit `package.json` `scripts` section to add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts']
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
      '~~': path.resolve(__dirname)
    }
  }
})
```

- [ ] **Step 4: Create tests/.gitkeep placeholder**

Empty file at `tests/.gitkeep`.

- [ ] **Step 5: Verify vitest runs**

Run: `pnpm test`
Expected: `No test files found, exiting with code 0` or similar. Exit code 0.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts tests/.gitkeep
git commit -m "chore: add vitest scaffolding"
```

---

## Task 1: filterTypes.ts — 共用型別

**Files:**
- Create: `app/composables/filterTypes.ts`

- [ ] **Step 1: Create filterTypes.ts**

```ts
import type {
  ExtractedComponent,
  ExtractedType,
  ExtractedSpace,
  ExtractedFloor,
  ExtractedZone,
  ExtractedSystem,
  ExtractedAttribute
} from './useCobieStore'

export type Operator = 'eq' | 'in' | 'contains' | 'range' | 'dateRange' | 'exists'

export interface FilterCondition {
  id: string
  dimensionId: string
  op: Operator
  value: any
  attrName?: string
}

export type ChainItem =
  | { kind: 'single'; condition: FilterCondition }
  | { kind: 'orGroup'; id: string; conditions: FilterCondition[] }

export interface FilterChain {
  items: ChainItem[]
}

export interface FilterDimension {
  id: string
  label: string
  group: 'Type' | 'Component' | 'Space' | 'Floor' | 'Zone' | 'System' | 'Attribute'
  ops: Operator[]
  expandsTypeCategory?: boolean
  loadOptions: (ctx: FilterCtx) => string[]
  evaluate: (ctx: FilterCtx, op: Operator, value: any) => Set<string>
}

export interface FilterCtx {
  modelId: string
  components: ExtractedComponent[]
  byExternalId: Map<string, ExtractedComponent>
  types: Map<string, ExtractedType>
  spaces: Map<string, ExtractedSpace>
  floors: Map<string, ExtractedFloor>
  zones: ExtractedZone[]
  systems: ExtractedSystem[]
  attributesIndex: Map<string, ExtractedAttribute[]>
  bySpace: Map<string, Set<string>>
  byFloor: Map<string, Set<string>>
  byZone: Map<string, Set<string>>
  bySystem: Map<string, Set<string>>
  byType: Map<string, Set<string>>
  dim: (dimensionId: string) => FilterDimension
}

export type EvaluateResult =
  | { active: false }
  | {
      active: true
      perStep: Array<{ itemId: string; count: number }>
      finalSet: Set<string>
      emptyAtStep?: number
    }

export type EvaluateResultWithMissing =
  | { active: false }
  | {
      active: true
      finalSet: Set<string>
      perStep: Array<{ itemId: string; count: number }>
      emptyAtStep?: number
      missingInModel: number
    }
```

- [ ] **Step 2: Commit**

```bash
git add app/composables/filterTypes.ts
git commit -m "feat(filter): add shared filter types"
```

---

## Task 2: filterEngine helpers — itemKey / intersect / shouldExpand / isConditionActive

**Files:**
- Create: `app/composables/filterEngine.ts`
- Create: `tests/composables/filterEngine.test.ts`

- [ ] **Step 1: Write failing tests for helpers**

Create `tests/composables/filterEngine.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  itemKey,
  intersect,
  shouldExpand,
  isConditionActive
} from '~/composables/filterEngine'
import type { ChainItem, FilterCondition } from '~/composables/filterTypes'

describe('itemKey', () => {
  it('returns condition.id for single', () => {
    const item: ChainItem = {
      kind: 'single',
      condition: { id: 'c1', dimensionId: 'type.name', op: 'eq', value: 'X' }
    }
    expect(itemKey(item)).toBe('c1')
  })
  it('returns group id for orGroup', () => {
    const item: ChainItem = { kind: 'orGroup', id: 'g1', conditions: [] }
    expect(itemKey(item)).toBe('g1')
  })
})

describe('intersect', () => {
  it('returns the intersection of two sets', () => {
    expect([...intersect(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))].sort())
      .toEqual(['b', 'c'])
  })
  it('returns empty when no overlap', () => {
    expect(intersect(new Set(['a']), new Set(['b'])).size).toBe(0)
  })
})

describe('shouldExpand', () => {
  it('returns true only for type.name', () => {
    expect(shouldExpand({ id: '', dimensionId: 'type.name', op: 'eq', value: 'X' })).toBe(true)
    expect(shouldExpand({ id: '', dimensionId: 'type.category', op: 'eq', value: 'X' })).toBe(false)
  })
})

describe('isConditionActive', () => {
  const base: FilterCondition = { id: '', dimensionId: 'type.name', op: 'eq', value: undefined }
  it('rejects empty values', () => {
    expect(isConditionActive({ ...base, value: undefined })).toBe(false)
    expect(isConditionActive({ ...base, value: null })).toBe(false)
    expect(isConditionActive({ ...base, value: '' })).toBe(false)
    expect(isConditionActive({ ...base, value: [] })).toBe(false)
  })
  it('rejects all-empty range', () => {
    expect(isConditionActive({ ...base, op: 'range', value: { min: '', max: undefined } })).toBe(false)
  })
  it('accepts partial range', () => {
    expect(isConditionActive({ ...base, op: 'range', value: { min: 10, max: undefined } })).toBe(true)
  })
  it('accepts strings, non-empty arrays, numbers', () => {
    expect(isConditionActive({ ...base, value: 'x' })).toBe(true)
    expect(isConditionActive({ ...base, value: ['x'] })).toBe(true)
    expect(isConditionActive({ ...base, value: 0 })).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — module not found / functions not exported.

- [ ] **Step 3: Write filterEngine.ts helpers**

Create `app/composables/filterEngine.ts`:

```ts
import type {
  ChainItem,
  FilterCondition
} from './filterTypes'

export const itemKey = (item: ChainItem): string =>
  item.kind === 'single' ? item.condition.id : item.id

export const intersect = <T>(a: Set<T>, b: Set<T>): Set<T> => {
  const r = new Set<T>()
  const [small, large] = a.size < b.size ? [a, b] : [b, a]
  for (const v of small) if (large.has(v)) r.add(v)
  return r
}

export const shouldExpand = (c: FilterCondition): boolean =>
  c.dimensionId === 'type.name'

export function isConditionActive(c: FilterCondition): boolean {
  if (c.value === undefined || c.value === null || c.value === '') return false
  if (Array.isArray(c.value) && c.value.length === 0) return false
  if (typeof c.value === 'object' && c.value !== null) {
    return Object.values(c.value).some(v => v !== undefined && v !== null && v !== '')
  }
  return true
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: All 4 describe blocks pass.

- [ ] **Step 5: Commit**

```bash
git add app/composables/filterEngine.ts tests/composables/filterEngine.test.ts
git commit -m "feat(filter): engine helpers (itemKey/intersect/shouldExpand/isConditionActive)"
```

---

## Task 3: filterEngine — expandToSameCategory

**Files:**
- Modify: `app/composables/filterEngine.ts`
- Modify: `tests/composables/filterEngine.test.ts`

- [ ] **Step 1: Add failing test**

Append to `tests/composables/filterEngine.test.ts`:

```ts
import { expandToSameCategory } from '~/composables/filterEngine'
import type { FilterCtx } from '~/composables/filterTypes'

const makeCtx = (overrides: Partial<FilterCtx> = {}): FilterCtx => ({
  modelId: 'M',
  components: [],
  byExternalId: new Map(),
  types: new Map(),
  spaces: new Map(),
  floors: new Map(),
  zones: [],
  systems: [],
  attributesIndex: new Map(),
  bySpace: new Map(),
  byFloor: new Map(),
  byZone: new Map(),
  bySystem: new Map(),
  byType: new Map(),
  dim: () => { throw new Error('not used') },
  ...overrides
})

describe('expandToSameCategory', () => {
  it('expands matched components to all components sharing the same Type.Category', () => {
    const comps = [
      { modelId: 'M', externalId: 'e1', dbId: 0, name: 'C1', typeName: 'T1' },
      { modelId: 'M', externalId: 'e2', dbId: 0, name: 'C2', typeName: 'T2' },
      { modelId: 'M', externalId: 'e3', dbId: 0, name: 'C3', typeName: 'T3' }
    ] as any
    const ctx = makeCtx({
      components: comps,
      byExternalId: new Map(comps.map((c: any) => [c.externalId, c])),
      types: new Map([
        ['T1', { modelId: 'M', name: 'T1', category: 'cat-A' } as any],
        ['T2', { modelId: 'M', name: 'T2', category: 'cat-A' } as any],
        ['T3', { modelId: 'M', name: 'T3', category: 'cat-B' } as any]
      ]),
      byType: new Map([
        ['T1', new Set(['e1'])],
        ['T2', new Set(['e2'])],
        ['T3', new Set(['e3'])]
      ])
    })
    // 命中 e1 (T1, cat-A) → 應展開到 cat-A 所有 components = e1 + e2
    expect([...expandToSameCategory(ctx, new Set(['e1']))].sort()).toEqual(['e1', 'e2'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `expandToSameCategory` not exported.

- [ ] **Step 3: Add expandToSameCategory to filterEngine.ts**

Append to `app/composables/filterEngine.ts`:

```ts
import type { FilterCtx } from './filterTypes'

export function expandToSameCategory(
  ctx: FilterCtx,
  typeMatchedIds: Set<string>
): Set<string> {
  const cats = new Set<string>()
  for (const id of typeMatchedIds) {
    const c = ctx.byExternalId.get(id)
    const t = c?.typeName ? ctx.types.get(c.typeName) : undefined
    if (t?.category) cats.add(t.category)
  }
  const result = new Set<string>()
  for (const t of ctx.types.values()) {
    if (t.category && cats.has(t.category)) {
      for (const id of ctx.byType.get(t.name) ?? []) result.add(id)
    }
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: All tests pass including expandToSameCategory.

- [ ] **Step 5: Commit**

```bash
git add app/composables/filterEngine.ts tests/composables/filterEngine.test.ts
git commit -m "feat(filter): expandToSameCategory"
```

---

## Task 4: filterEngine — evaluateItem (single + orGroup)

**Files:**
- Modify: `app/composables/filterEngine.ts`
- Modify: `tests/composables/filterEngine.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/composables/filterEngine.test.ts`:

```ts
import { evaluateItem } from '~/composables/filterEngine'
import type { FilterDimension } from '~/composables/filterTypes'

const mockDim = (id: string, sets: Record<string, string[]>): FilterDimension => ({
  id, label: id, group: 'Type', ops: ['eq'],
  expandsTypeCategory: id === 'type.name',
  loadOptions: () => Object.keys(sets),
  evaluate: (_ctx, _op, value) => new Set(sets[String(value)] ?? [])
})

describe('evaluateItem', () => {
  it('returns null for inactive single condition', () => {
    const ctx = makeCtx({ dim: () => mockDim('any', {}) })
    const item: ChainItem = {
      kind: 'single',
      condition: { id: 'c1', dimensionId: 'any', op: 'eq', value: '' }
    }
    expect(evaluateItem(item, ctx, true)).toBeNull()
  })
  it('evaluates active single condition', () => {
    const dim = mockDim('mfg', { Trane: ['e1', 'e2'] })
    const ctx = makeCtx({ dim: () => dim })
    const item: ChainItem = {
      kind: 'single',
      condition: { id: 'c1', dimensionId: 'mfg', op: 'eq', value: 'Trane' }
    }
    expect([...evaluateItem(item, ctx, false)!].sort()).toEqual(['e1', 'e2'])
  })
  it('returns null for orGroup with all inactive conditions', () => {
    const ctx = makeCtx({ dim: () => mockDim('mfg', {}) })
    const item: ChainItem = {
      kind: 'orGroup',
      id: 'g1',
      conditions: [
        { id: 'c1', dimensionId: 'mfg', op: 'eq', value: '' },
        { id: 'c2', dimensionId: 'mfg', op: 'eq', value: undefined }
      ]
    }
    expect(evaluateItem(item, ctx, false)).toBeNull()
  })
  it('unions orGroup sub-conditions', () => {
    const dim = mockDim('mfg', { Trane: ['e1'], Carrier: ['e2'] })
    const ctx = makeCtx({ dim: () => dim })
    const item: ChainItem = {
      kind: 'orGroup',
      id: 'g1',
      conditions: [
        { id: 'c1', dimensionId: 'mfg', op: 'eq', value: 'Trane' },
        { id: 'c2', dimensionId: 'mfg', op: 'eq', value: 'Carrier' }
      ]
    }
    expect([...evaluateItem(item, ctx, false)!].sort()).toEqual(['e1', 'e2'])
  })
  it('expands type.name only when isFirst', () => {
    // 設一個能 expand 的 ctx
    const comps = [
      { modelId: 'M', externalId: 'e1', dbId: 0, name: 'C1', typeName: 'T1' },
      { modelId: 'M', externalId: 'e2', dbId: 0, name: 'C2', typeName: 'T2' }
    ] as any
    const dim = mockDim('type.name', { T1: ['e1'] })
    const ctx = makeCtx({
      components: comps,
      byExternalId: new Map(comps.map((c: any) => [c.externalId, c])),
      types: new Map([
        ['T1', { modelId: 'M', name: 'T1', category: 'cat-A' } as any],
        ['T2', { modelId: 'M', name: 'T2', category: 'cat-A' } as any]
      ]),
      byType: new Map([['T1', new Set(['e1'])], ['T2', new Set(['e2'])]]),
      dim: () => dim
    })
    const item: ChainItem = {
      kind: 'single',
      condition: { id: 'c1', dimensionId: 'type.name', op: 'eq', value: 'T1' }
    }
    // isFirst=true → 展開到 cat-A 所有 = e1 + e2
    expect([...evaluateItem(item, ctx, true)!].sort()).toEqual(['e1', 'e2'])
    // isFirst=false → 不展開，只 e1
    expect([...evaluateItem(item, ctx, false)!].sort()).toEqual(['e1'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `evaluateItem` not exported.

- [ ] **Step 3: Add evaluateItem**

Append to `app/composables/filterEngine.ts`:

```ts
export function evaluateItem(
  item: ChainItem,
  ctx: FilterCtx,
  isFirst: boolean
): Set<string> | null {
  if (item.kind === 'single') {
    if (!isConditionActive(item.condition)) return null
    let s = ctx.dim(item.condition.dimensionId).evaluate(ctx, item.condition.op, item.condition.value)
    if (isFirst && shouldExpand(item.condition)) s = expandToSameCategory(ctx, s)
    return s
  }
  // orGroup
  let any = false
  const acc = new Set<string>()
  const typeNameUnion = new Set<string>()
  for (const c of item.conditions) {
    if (!isConditionActive(c)) continue
    any = true
    const s = ctx.dim(c.dimensionId).evaluate(ctx, c.op, c.value)
    if (isFirst && shouldExpand(c)) {
      for (const id of s) typeNameUnion.add(id)
    } else {
      for (const id of s) acc.add(id)
    }
  }
  if (typeNameUnion.size > 0) {
    const expanded = expandToSameCategory(ctx, typeNameUnion)
    for (const id of expanded) acc.add(id)
  }
  return any ? acc : null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: 5 evaluateItem cases pass.

- [ ] **Step 5: Commit**

```bash
git add app/composables/filterEngine.ts tests/composables/filterEngine.test.ts
git commit -m "feat(filter): evaluateItem with OR group + type.name expand"
```

---

## Task 5: filterEngine — evaluateChain

**Files:**
- Modify: `app/composables/filterEngine.ts`
- Modify: `tests/composables/filterEngine.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/composables/filterEngine.test.ts`:

```ts
import { evaluateChain } from '~/composables/filterEngine'
import type { FilterChain } from '~/composables/filterTypes'

describe('evaluateChain', () => {
  it('returns active:false for empty chain', () => {
    const ctx = makeCtx({ dim: () => mockDim('x', {}) })
    expect(evaluateChain({ items: [] }, ctx)).toEqual({ active: false })
  })
  it('returns active:false when all items are pass-through', () => {
    const ctx = makeCtx({ dim: () => mockDim('x', {}) })
    const chain: FilterChain = {
      items: [{
        kind: 'single',
        condition: { id: 'c1', dimensionId: 'x', op: 'eq', value: '' }
      }]
    }
    expect(evaluateChain(chain, ctx)).toEqual({ active: false })
  })
  it('AND-intersects two items', () => {
    const dimA = mockDim('A', { v: ['e1', 'e2', 'e3'] })
    const dimB = mockDim('B', { w: ['e2', 'e3', 'e4'] })
    const ctx = makeCtx({ dim: (id) => id === 'A' ? dimA : dimB })
    const chain: FilterChain = {
      items: [
        { kind: 'single', condition: { id: 'c1', dimensionId: 'A', op: 'eq', value: 'v' } },
        { kind: 'single', condition: { id: 'c2', dimensionId: 'B', op: 'eq', value: 'w' } }
      ]
    }
    const r = evaluateChain(chain, ctx)
    expect(r.active).toBe(true)
    if (r.active) {
      expect([...r.finalSet].sort()).toEqual(['e2', 'e3'])
      expect(r.perStep.map(p => p.count)).toEqual([3, 2])
    }
  })
  it('short-circuits on empty step', () => {
    const dimA = mockDim('A', { v: ['e1'] })
    const dimB = mockDim('B', { w: ['e9'] })
    const ctx = makeCtx({ dim: (id) => id === 'A' ? dimA : dimB })
    const chain: FilterChain = {
      items: [
        { kind: 'single', condition: { id: 'c1', dimensionId: 'A', op: 'eq', value: 'v' } },
        { kind: 'single', condition: { id: 'c2', dimensionId: 'B', op: 'eq', value: 'w' } }
      ]
    }
    const r = evaluateChain(chain, ctx)
    expect(r.active).toBe(true)
    if (r.active) {
      expect(r.finalSet.size).toBe(0)
      expect(r.emptyAtStep).toBe(1)
    }
  })
  it('treats pass-through items as "first active item" carrier', () => {
    // First item is pass-through; second item should still be isFirst=true
    const dimType = mockDim('type.name', { T1: ['e1'] })
    const comps = [{ modelId: 'M', externalId: 'e1', dbId: 0, name: 'C1', typeName: 'T1' }] as any
    const ctx = makeCtx({
      components: comps,
      byExternalId: new Map([['e1', comps[0]]]),
      types: new Map([['T1', { modelId: 'M', name: 'T1', category: 'cat-A' } as any]]),
      byType: new Map([['T1', new Set(['e1'])]]),
      dim: () => dimType
    })
    const chain: FilterChain = {
      items: [
        { kind: 'single', condition: { id: 'c1', dimensionId: 'type.name', op: 'eq', value: '' } }, // pass-through
        { kind: 'single', condition: { id: 'c2', dimensionId: 'type.name', op: 'eq', value: 'T1' } }
      ]
    }
    const r = evaluateChain(chain, ctx)
    // c2 應該觸發展開（因為是第一個 active）
    expect(r.active).toBe(true)
    if (r.active) expect([...r.finalSet]).toEqual(['e1'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `evaluateChain` not exported.

- [ ] **Step 3: Add evaluateChain**

Append to `app/composables/filterEngine.ts`:

```ts
import type { EvaluateResult, FilterChain } from './filterTypes'

export function evaluateChain(chain: FilterChain, ctx: FilterCtx): EvaluateResult {
  let acc: Set<string> | null = null
  const perStep: Array<{ itemId: string; count: number }> = []
  let isFirstApplied = true
  let emptyAtStep: number | undefined
  for (const [i, item] of chain.items.entries()) {
    const s = evaluateItem(item, ctx, isFirstApplied)
    if (s === null) continue
    isFirstApplied = false
    acc = acc === null ? s : intersect(acc, s)
    perStep.push({ itemId: itemKey(item), count: acc.size })
    if (acc.size === 0) { emptyAtStep = i; break }
  }
  if (acc === null) return { active: false }
  return { active: true, perStep, finalSet: acc, emptyAtStep }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: all `evaluateChain` cases + earlier tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/composables/filterEngine.ts tests/composables/filterEngine.test.ts
git commit -m "feat(filter): evaluateChain with AND/pass-through/short-circuit"
```

---

## Task 6: filterRegistry — Type 維度（name / category / manufacturer / modelNumber / assetType）

**Files:**
- Create: `app/composables/filterRegistry.ts`
- Create: `tests/composables/filterRegistry.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/composables/filterRegistry.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { REGISTRY, getDim } from '~/composables/filterRegistry'
import type { FilterCtx, FilterDimension } from '~/composables/filterTypes'

const makeCtx = (overrides: Partial<FilterCtx> = {}): FilterCtx => ({
  modelId: 'M', components: [], byExternalId: new Map(),
  types: new Map(), spaces: new Map(), floors: new Map(),
  zones: [], systems: [], attributesIndex: new Map(),
  bySpace: new Map(), byFloor: new Map(), byZone: new Map(),
  bySystem: new Map(), byType: new Map(),
  dim: getDim,
  ...overrides
})

const sample = () => {
  const types = new Map([
    ['T1', { modelId: 'M', name: 'T1', category: 'cat-A', manufacturer: 'Trane', modelNumber: 'M-100', assetType: 'Fixed' } as any],
    ['T2', { modelId: 'M', name: 'T2', category: 'cat-A', manufacturer: 'Carrier', modelNumber: 'M-200', assetType: 'Moveable' } as any],
    ['T3', { modelId: 'M', name: 'T3', category: 'cat-B', manufacturer: 'Trane', assetType: 'Fixed' } as any]
  ])
  const byType = new Map([
    ['T1', new Set(['e1', 'e2'])],
    ['T2', new Set(['e3'])],
    ['T3', new Set(['e4'])]
  ])
  return makeCtx({ types, byType })
}

describe('REGISTRY type.name', () => {
  it('eq returns components of that type', () => {
    const ctx = sample()
    expect([...REGISTRY['type.name'].evaluate(ctx, 'eq', 'T1')].sort()).toEqual(['e1', 'e2'])
  })
  it('in returns union', () => {
    const ctx = sample()
    expect([...REGISTRY['type.name'].evaluate(ctx, 'in', ['T1', 'T3'])].sort()).toEqual(['e1', 'e2', 'e4'])
  })
  it('expandsTypeCategory flag is true', () => {
    expect(REGISTRY['type.name'].expandsTypeCategory).toBe(true)
  })
})

describe('REGISTRY type.category', () => {
  it('eq returns components of types in that category', () => {
    const ctx = sample()
    expect([...REGISTRY['type.category'].evaluate(ctx, 'eq', 'cat-A')].sort()).toEqual(['e1', 'e2', 'e3'])
  })
})

describe('REGISTRY type.manufacturer', () => {
  it('eq matches manufacturer', () => {
    const ctx = sample()
    expect([...REGISTRY['type.manufacturer'].evaluate(ctx, 'eq', 'Trane')].sort()).toEqual(['e1', 'e2', 'e4'])
  })
  it('contains is case-insensitive substring', () => {
    const ctx = sample()
    expect([...REGISTRY['type.manufacturer'].evaluate(ctx, 'contains', 'car')].sort()).toEqual(['e3'])
  })
})

describe('REGISTRY type.modelNumber / assetType', () => {
  it('modelNumber eq', () => {
    const ctx = sample()
    expect([...REGISTRY['type.modelNumber'].evaluate(ctx, 'eq', 'M-100')].sort()).toEqual(['e1', 'e2'])
  })
  it('assetType eq', () => {
    const ctx = sample()
    expect([...REGISTRY['type.assetType'].evaluate(ctx, 'eq', 'Fixed')].sort()).toEqual(['e1', 'e2', 'e4'])
  })
})

describe('getDim', () => {
  it('throws on unknown id', () => {
    expect(() => getDim('nope')).toThrow(/Unknown dimension/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Create filterRegistry.ts with type.* dimensions**

```ts
import type { FilterCtx, FilterDimension, Operator } from './filterTypes'

const includesCI = (haystack: string | undefined, needle: string) =>
  !!haystack && haystack.toLowerCase().includes(needle.toLowerCase())

/** 從 types 的 predicate 結果聚合到 components externalIds */
const typesPredToComponents = (
  ctx: FilterCtx,
  pred: (t: { name: string; category?: string; manufacturer?: string; modelNumber?: string; assetType?: string }) => boolean
): Set<string> => {
  const out = new Set<string>()
  for (const t of ctx.types.values()) {
    if (!pred(t as any)) continue
    for (const id of ctx.byType.get(t.name) ?? []) out.add(id)
  }
  return out
}

const typeName: FilterDimension = {
  id: 'type.name',
  label: 'Type 名稱',
  group: 'Type',
  ops: ['eq', 'in'],
  expandsTypeCategory: true,
  loadOptions: (ctx) => [...ctx.types.keys()].sort(),
  evaluate: (ctx, op, value) => {
    const vals = op === 'in' ? (value as string[]) : [value as string]
    const out = new Set<string>()
    for (const v of vals) {
      for (const id of ctx.byType.get(v) ?? []) out.add(id)
    }
    return out
  }
}

const typeCategory: FilterDimension = {
  id: 'type.category',
  label: 'Type 類別',
  group: 'Type',
  ops: ['eq', 'in'],
  loadOptions: (ctx) => [...new Set([...ctx.types.values()].map(t => t.category).filter((x): x is string => !!x))].sort(),
  evaluate: (ctx, op, value) => {
    const vals = new Set(op === 'in' ? (value as string[]) : [value as string])
    return typesPredToComponents(ctx, t => !!t.category && vals.has(t.category))
  }
}

const typeManufacturer: FilterDimension = {
  id: 'type.manufacturer',
  label: 'Manufacturer',
  group: 'Type',
  ops: ['eq', 'contains'],
  loadOptions: (ctx) => [...new Set([...ctx.types.values()].map(t => t.manufacturer).filter((x): x is string => !!x))].sort(),
  evaluate: (ctx, op, value) => {
    const v = String(value)
    return typesPredToComponents(ctx, t =>
      op === 'eq' ? t.manufacturer === v : includesCI(t.manufacturer, v)
    )
  }
}

const typeModelNumber: FilterDimension = {
  id: 'type.modelNumber',
  label: 'Model Number',
  group: 'Type',
  ops: ['eq', 'contains'],
  loadOptions: (ctx) => [...new Set([...ctx.types.values()].map(t => t.modelNumber).filter((x): x is string => !!x))].sort(),
  evaluate: (ctx, op, value) => {
    const v = String(value)
    return typesPredToComponents(ctx, t =>
      op === 'eq' ? t.modelNumber === v : includesCI(t.modelNumber, v)
    )
  }
}

const typeAssetType: FilterDimension = {
  id: 'type.assetType',
  label: 'Asset Type',
  group: 'Type',
  ops: ['eq'],
  loadOptions: (ctx) => [...new Set([...ctx.types.values()].map(t => t.assetType).filter((x): x is string => !!x))].sort(),
  evaluate: (ctx, _op, value) =>
    typesPredToComponents(ctx, t => t.assetType === String(value))
}

export const REGISTRY: Record<string, FilterDimension> = {
  'type.name': typeName,
  'type.category': typeCategory,
  'type.manufacturer': typeManufacturer,
  'type.modelNumber': typeModelNumber,
  'type.assetType': typeAssetType
}

export const getDim = (id: string): FilterDimension => {
  const d = REGISTRY[id]
  if (!d) throw new Error(`Unknown dimension: ${id}`)
  return d
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: all type.* tests + getDim test pass.

- [ ] **Step 5: Commit**

```bash
git add app/composables/filterRegistry.ts tests/composables/filterRegistry.test.ts
git commit -m "feat(filter): registry — Type dimensions"
```

---

## Task 7: filterRegistry — Component 維度

**Files:**
- Modify: `app/composables/filterRegistry.ts`
- Modify: `tests/composables/filterRegistry.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/composables/filterRegistry.test.ts`:

```ts
const sampleComponents = () => {
  const comps = [
    { modelId: 'M', externalId: 'e1', dbId: 0, name: 'AHU-01', typeName: 'T1', tagNumber: 'TAG-01', serialNumber: 'SN-01', assetIdentifier: 'A001', barCode: 'BC1', area: 12, length: 100, installationDate: '2020-01-01', warrantyStartDate: '2020-02-01' },
    { modelId: 'M', externalId: 'e2', dbId: 0, name: 'AHU-02', typeName: 'T1', tagNumber: 'TAG-02', area: 25, length: 200, installationDate: '2021-06-01' },
    { modelId: 'M', externalId: 'e3', dbId: 0, name: 'VAV-01', typeName: 'T2', area: 5 }
  ] as any
  return makeCtx({
    components: comps,
    byExternalId: new Map(comps.map((c: any) => [c.externalId, c]))
  })
}

describe('REGISTRY component dimensions', () => {
  it('component.name contains', () => {
    const ctx = sampleComponents()
    expect([...REGISTRY['component.name'].evaluate(ctx, 'contains', 'AHU')].sort()).toEqual(['e1', 'e2'])
  })
  it('component.tagNumber eq', () => {
    const ctx = sampleComponents()
    expect([...REGISTRY['component.tagNumber'].evaluate(ctx, 'eq', 'TAG-01')]).toEqual(['e1'])
  })
  it('component.area range', () => {
    const ctx = sampleComponents()
    expect([...REGISTRY['component.area'].evaluate(ctx, 'range', { min: 10, max: 20 })]).toEqual(['e1'])
    expect([...REGISTRY['component.area'].evaluate(ctx, 'range', { min: 10 })].sort()).toEqual(['e1', 'e2'])
    expect([...REGISTRY['component.area'].evaluate(ctx, 'range', { max: 10 })]).toEqual(['e3'])
  })
  it('component.installationDate dateRange', () => {
    const ctx = sampleComponents()
    expect([...REGISTRY['component.installationDate'].evaluate(ctx, 'dateRange', { from: '2020-06-01' })]).toEqual(['e2'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — component dimensions not yet in REGISTRY.

- [ ] **Step 3: Add Component dimensions**

Append to `app/composables/filterRegistry.ts` (above the `export const REGISTRY` line — or wherever appropriate; here we add new objects and merge):

```ts
import type { ExtractedComponent } from './useCobieStore'

const componentsPred = (
  ctx: FilterCtx,
  pred: (c: ExtractedComponent) => boolean
): Set<string> => {
  const out = new Set<string>()
  for (const c of ctx.components) if (pred(c)) out.add(c.externalId)
  return out
}

const distinctStringField = <K extends keyof ExtractedComponent>(ctx: FilterCtx, field: K): string[] => {
  const set = new Set<string>()
  for (const c of ctx.components) {
    const v = c[field]
    if (typeof v === 'string' && v) set.add(v)
  }
  return [...set].sort()
}

const stringDim = (
  id: string, label: string, field: keyof ExtractedComponent, ops: Operator[] = ['eq', 'contains']
): FilterDimension => ({
  id, label, group: 'Component', ops,
  loadOptions: (ctx) => distinctStringField(ctx, field),
  evaluate: (ctx, op, value) => {
    const v = String(value)
    return componentsPred(ctx, c => {
      const fv = c[field]
      if (typeof fv !== 'string') return false
      return op === 'eq' ? fv === v : includesCI(fv, v)
    })
  }
})

const numberRangeDim = (id: string, label: string, field: 'area' | 'length'): FilterDimension => ({
  id, label, group: 'Component', ops: ['range'],
  loadOptions: () => [],
  evaluate: (ctx, _op, value) => {
    const { min, max } = (value as { min?: number; max?: number }) ?? {}
    return componentsPred(ctx, c => {
      const fv = c[field]
      if (typeof fv !== 'number') return false
      if (min !== undefined && min !== null && (min as any) !== '' && fv < Number(min)) return false
      if (max !== undefined && max !== null && (max as any) !== '' && fv > Number(max)) return false
      return true
    })
  }
})

const dateRangeDim = (
  id: string, label: string, field: 'installationDate' | 'warrantyStartDate'
): FilterDimension => ({
  id, label, group: 'Component', ops: ['dateRange'],
  loadOptions: () => [],
  evaluate: (ctx, _op, value) => {
    const { from, to } = (value as { from?: string; to?: string }) ?? {}
    return componentsPred(ctx, c => {
      const fv = c[field]
      if (typeof fv !== 'string' || !fv) return false
      if (from && fv < from) return false
      if (to && fv > to) return false
      return true
    })
  }
})

const componentName = stringDim('component.name', 'Component 名稱', 'name', ['contains'])
const componentTagNumber = stringDim('component.tagNumber', 'Tag Number', 'tagNumber')
const componentSerialNumber = stringDim('component.serialNumber', 'Serial Number', 'serialNumber')
const componentAssetIdentifier = stringDim('component.assetIdentifier', 'Asset Identifier', 'assetIdentifier')
const componentBarCode = stringDim('component.barCode', 'Bar Code', 'barCode')
const componentArea = numberRangeDim('component.area', 'Area', 'area')
const componentLength = numberRangeDim('component.length', 'Length', 'length')
const componentInstallationDate = dateRangeDim('component.installationDate', 'Installation Date', 'installationDate')
const componentWarrantyStartDate = dateRangeDim('component.warrantyStartDate', 'Warranty Start', 'warrantyStartDate')
```

Then update the `REGISTRY` object to include these:

Replace the existing `REGISTRY` export with:

```ts
export const REGISTRY: Record<string, FilterDimension> = {
  'type.name': typeName,
  'type.category': typeCategory,
  'type.manufacturer': typeManufacturer,
  'type.modelNumber': typeModelNumber,
  'type.assetType': typeAssetType,
  'component.name': componentName,
  'component.tagNumber': componentTagNumber,
  'component.serialNumber': componentSerialNumber,
  'component.assetIdentifier': componentAssetIdentifier,
  'component.barCode': componentBarCode,
  'component.area': componentArea,
  'component.length': componentLength,
  'component.installationDate': componentInstallationDate,
  'component.warrantyStartDate': componentWarrantyStartDate
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: component.* tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/composables/filterRegistry.ts tests/composables/filterRegistry.test.ts
git commit -m "feat(filter): registry — Component dimensions"
```

---

## Task 8: filterRegistry — Space / Floor / Zone / System

**Files:**
- Modify: `app/composables/filterRegistry.ts`
- Modify: `tests/composables/filterRegistry.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/composables/filterRegistry.test.ts`:

```ts
describe('REGISTRY space / floor / zone / system', () => {
  const ctx = makeCtx({
    bySpace: new Map([['1AC1', new Set(['e1', 'e2'])], ['1AC2', new Set(['e3'])]]),
    byFloor: new Map([['1F', new Set(['e1', 'e2', 'e3'])], ['2F', new Set(['e4'])]]),
    byZone: new Map([['Admin', new Set(['e1'])]]),
    bySystem: new Map([['HVAC', new Set(['e2', 'e3'])]]),
    spaces: new Map([
      ['1AC1', { modelId: 'M', name: '1AC1', category: 'Waiting' } as any],
      ['1AC2', { modelId: 'M', name: '1AC2', category: 'Office' } as any]
    ]),
    zones: [
      { modelId: 'M', name: 'Admin', category: 'Occupancy', spaceNames: [] } as any
    ],
    systems: [
      { modelId: 'M', name: 'HVAC', category: 'Air', componentExternalIds: [] } as any
    ]
  })
  it('space.name eq', () => {
    expect([...REGISTRY['space.name'].evaluate(ctx, 'eq', '1AC1')].sort()).toEqual(['e1', 'e2'])
  })
  it('space.category eq', () => {
    expect([...REGISTRY['space.category'].evaluate(ctx, 'eq', 'Waiting')].sort()).toEqual(['e1', 'e2'])
  })
  it('floor.name eq', () => {
    expect([...REGISTRY['floor.name'].evaluate(ctx, 'eq', '1F')].sort()).toEqual(['e1', 'e2', 'e3'])
  })
  it('zone.name eq', () => {
    expect([...REGISTRY['zone.name'].evaluate(ctx, 'eq', 'Admin')]).toEqual(['e1'])
  })
  it('zone.category eq', () => {
    expect([...REGISTRY['zone.category'].evaluate(ctx, 'eq', 'Occupancy')]).toEqual(['e1'])
  })
  it('system.name eq', () => {
    expect([...REGISTRY['system.name'].evaluate(ctx, 'eq', 'HVAC')].sort()).toEqual(['e2', 'e3'])
  })
  it('system.category eq', () => {
    expect([...REGISTRY['system.category'].evaluate(ctx, 'eq', 'Air')].sort()).toEqual(['e2', 'e3'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL.

- [ ] **Step 3: Add Space / Floor / Zone / System dimensions**

Append to `app/composables/filterRegistry.ts`:

```ts
const mapDim = (
  id: string, label: string, group: FilterDimension['group'],
  pick: (ctx: FilterCtx) => Map<string, Set<string>>,
  optionLister: (ctx: FilterCtx) => string[]
): FilterDimension => ({
  id, label, group, ops: ['eq', 'in'],
  loadOptions: optionLister,
  evaluate: (ctx, op, value) => {
    const vals = op === 'in' ? (value as string[]) : [value as string]
    const out = new Set<string>()
    for (const v of vals) for (const id of pick(ctx).get(v) ?? []) out.add(id)
    return out
  }
})

const spaceName = mapDim('space.name', 'Space', 'Space',
  (c) => c.bySpace,
  (c) => [...c.bySpace.keys()].sort()
)
const spaceCategory: FilterDimension = {
  id: 'space.category', label: 'Space 類別', group: 'Space', ops: ['eq', 'in'],
  loadOptions: (ctx) => [...new Set([...ctx.spaces.values()].map(s => s.category).filter((x): x is string => !!x))].sort(),
  evaluate: (ctx, op, value) => {
    const vals = new Set(op === 'in' ? (value as string[]) : [value as string])
    const out = new Set<string>()
    for (const s of ctx.spaces.values()) {
      if (!s.category || !vals.has(s.category)) continue
      for (const id of ctx.bySpace.get(s.name) ?? []) out.add(id)
    }
    return out
  }
}

const floorName = mapDim('floor.name', 'Floor', 'Floor',
  (c) => c.byFloor,
  (c) => [...c.byFloor.keys()].sort()
)

const zoneName = mapDim('zone.name', 'Zone', 'Zone',
  (c) => c.byZone,
  (c) => [...c.byZone.keys()].sort()
)
const zoneCategory: FilterDimension = {
  id: 'zone.category', label: 'Zone 類別', group: 'Zone', ops: ['eq', 'in'],
  loadOptions: (ctx) => [...new Set(ctx.zones.map(z => z.category).filter((x): x is string => !!x))].sort(),
  evaluate: (ctx, op, value) => {
    const vals = new Set(op === 'in' ? (value as string[]) : [value as string])
    const out = new Set<string>()
    for (const z of ctx.zones) {
      if (!z.category || !vals.has(z.category)) continue
      for (const id of ctx.byZone.get(z.name) ?? []) out.add(id)
    }
    return out
  }
}

const systemName = mapDim('system.name', 'System', 'System',
  (c) => c.bySystem,
  (c) => [...c.bySystem.keys()].sort()
)
const systemCategory: FilterDimension = {
  id: 'system.category', label: 'System 類別', group: 'System', ops: ['eq', 'in'],
  loadOptions: (ctx) => [...new Set(ctx.systems.map(s => s.category).filter((x): x is string => !!x))].sort(),
  evaluate: (ctx, op, value) => {
    const vals = new Set(op === 'in' ? (value as string[]) : [value as string])
    const out = new Set<string>()
    for (const sys of ctx.systems) {
      if (!sys.category || !vals.has(sys.category)) continue
      for (const id of ctx.bySystem.get(sys.name) ?? []) out.add(id)
    }
    return out
  }
}
```

Update `REGISTRY` object to merge in:

```ts
export const REGISTRY: Record<string, FilterDimension> = {
  'type.name': typeName,
  'type.category': typeCategory,
  'type.manufacturer': typeManufacturer,
  'type.modelNumber': typeModelNumber,
  'type.assetType': typeAssetType,
  'component.name': componentName,
  'component.tagNumber': componentTagNumber,
  'component.serialNumber': componentSerialNumber,
  'component.assetIdentifier': componentAssetIdentifier,
  'component.barCode': componentBarCode,
  'component.area': componentArea,
  'component.length': componentLength,
  'component.installationDate': componentInstallationDate,
  'component.warrantyStartDate': componentWarrantyStartDate,
  'space.name': spaceName,
  'space.category': spaceCategory,
  'floor.name': floorName,
  'zone.name': zoneName,
  'zone.category': zoneCategory,
  'system.name': systemName,
  'system.category': systemCategory
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: all new tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/composables/filterRegistry.ts tests/composables/filterRegistry.test.ts
git commit -m "feat(filter): registry — Space/Floor/Zone/System dimensions"
```

---

## Task 9: filterRegistry — Attribute 維度 + 擴散規則

**Files:**
- Modify: `app/composables/filterRegistry.ts`
- Modify: `tests/composables/filterRegistry.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `tests/composables/filterRegistry.test.ts`:

```ts
describe('REGISTRY attr', () => {
  const sampleAttr = () => {
    const comps = [
      { modelId: 'M', externalId: 'e1', dbId: 0, name: 'AHU-01', typeName: 'T1' },
      { modelId: 'M', externalId: 'e2', dbId: 0, name: 'AHU-02', typeName: 'T1' },
      { modelId: 'M', externalId: 'e3', dbId: 0, name: 'VAV-01', typeName: 'T2', space: 'Room-A' }
    ] as any
    const byType = new Map([['T1', new Set(['e1', 'e2'])], ['T2', new Set(['e3'])]])
    const bySpace = new Map([['Room-A', new Set(['e3'])]])
    const attributesIndex = new Map<string, any[]>([
      // Type-level: 套用到 T1 旗下所有 component
      ['type::t1', [{ modelId: 'M', name: 'PaintColor', value: 'White', sheetName: 'Type', rowName: 'T1' }]],
      // Component-level: 單一 component
      ['component::ahu-02', [{ modelId: 'M', name: 'PaintColor', value: 'Blue', sheetName: 'Component', rowName: 'AHU-02' }]],
      // Space-level: 套用到該 space 旗下 components
      ['space::room-a', [{ modelId: 'M', name: 'PaintColor', value: 'Green', sheetName: 'Space', rowName: 'Room-A' }]]
    ])
    return makeCtx({
      components: comps,
      byExternalId: new Map(comps.map((c: any) => [c.externalId, c])),
      byType, bySpace, attributesIndex
    })
  }

  it('attr eq matches Type-level attribute and spreads to all components of that type', () => {
    const ctx = sampleAttr()
    const r = REGISTRY.attr.evaluate(ctx, 'eq', { attrName: 'PaintColor', value: 'White' })
    expect([...r].sort()).toEqual(['e1', 'e2'])
  })
  it('attr eq matches Component-level attribute', () => {
    const ctx = sampleAttr()
    const r = REGISTRY.attr.evaluate(ctx, 'eq', { attrName: 'PaintColor', value: 'Blue' })
    expect([...r]).toEqual(['e2'])
  })
  it('attr eq matches Space-level attribute', () => {
    const ctx = sampleAttr()
    const r = REGISTRY.attr.evaluate(ctx, 'eq', { attrName: 'PaintColor', value: 'Green' })
    expect([...r]).toEqual(['e3'])
  })
  it('attr contains is case-insensitive substring on value', () => {
    const ctx = sampleAttr()
    const r = REGISTRY.attr.evaluate(ctx, 'contains', { attrName: 'PaintColor', value: 'whi' })
    expect([...r].sort()).toEqual(['e1', 'e2'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — REGISTRY.attr undefined.

- [ ] **Step 3: Add attr dimension**

Append to `app/composables/filterRegistry.ts`:

```ts
const attr: FilterDimension = {
  id: 'attr',
  label: 'Attribute',
  group: 'Attribute',
  ops: ['eq', 'contains'],
  loadOptions: (ctx) => {
    // 回所有 distinct attribute Name
    const set = new Set<string>()
    for (const list of ctx.attributesIndex.values()) {
      for (const a of list) if (a.name) set.add(a.name)
    }
    return [...set].sort()
  },
  evaluate: (ctx, op, value) => {
    const { attrName, value: needle } = (value as { attrName: string; value: string }) ?? {}
    if (!attrName) return new Set()
    const out = new Set<string>()
    const targetName = attrName.toLowerCase()
    const v = String(needle ?? '')
    for (const [key, list] of ctx.attributesIndex) {
      for (const a of list) {
        if (!a.name || a.name.toLowerCase() !== targetName) continue
        const av = a.value ?? ''
        const match = op === 'eq' ? av === v : includesCI(av, v)
        if (!match) continue
        // key 形如 `${sheet}::${rowName}` — 依 sheet 擴散
        const [sheet, rowName] = key.split('::')
        if (sheet === 'component') {
          // rowName = component.name (lowercased)；反查所有同 name component
          for (const c of ctx.components) {
            if (c.name && c.name.toLowerCase() === rowName) out.add(c.externalId)
          }
        } else if (sheet === 'type') {
          // rowName = type.name (lowercased)；展到 byType
          for (const [tn, ids] of ctx.byType) {
            if (tn.toLowerCase() === rowName) for (const id of ids) out.add(id)
          }
        } else if (sheet === 'space') {
          for (const [sn, ids] of ctx.bySpace) {
            if (sn.toLowerCase() === rowName) for (const id of ids) out.add(id)
          }
        }
      }
    }
    return out
  }
}
```

Update `REGISTRY` to include `attr`:

```ts
export const REGISTRY: Record<string, FilterDimension> = {
  // ... (all previous keys)
  'type.name': typeName,
  'type.category': typeCategory,
  'type.manufacturer': typeManufacturer,
  'type.modelNumber': typeModelNumber,
  'type.assetType': typeAssetType,
  'component.name': componentName,
  'component.tagNumber': componentTagNumber,
  'component.serialNumber': componentSerialNumber,
  'component.assetIdentifier': componentAssetIdentifier,
  'component.barCode': componentBarCode,
  'component.area': componentArea,
  'component.length': componentLength,
  'component.installationDate': componentInstallationDate,
  'component.warrantyStartDate': componentWarrantyStartDate,
  'space.name': spaceName,
  'space.category': spaceCategory,
  'floor.name': floorName,
  'zone.name': zoneName,
  'zone.category': zoneCategory,
  'system.name': systemName,
  'system.category': systemCategory,
  'attr': attr
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: 4 attr cases pass.

- [ ] **Step 5: Commit**

```bash
git add app/composables/filterRegistry.ts tests/composables/filterRegistry.test.ts
git commit -m "feat(filter): registry — Attribute dimension with diffusion rules"
```

---

## Task 10: useFilterCtx — buildFilterCtx + 索引

**Files:**
- Create: `app/composables/useFilterCtx.ts`
- Create: `tests/composables/useFilterCtx.test.ts`

- [ ] **Step 1: Add failing test for buildFilterCtx**

Create `tests/composables/useFilterCtx.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildFilterCtx } from '~/composables/useFilterCtx'

describe('buildFilterCtx', () => {
  it('builds byExternalId / bySpace / byType / byFloor / byZone / bySystem / attributesIndex', () => {
    const components = [
      { modelId: 'M', externalId: 'e1', dbId: 0, name: 'AHU-01', typeName: 'T1', space: 'Room-A' },
      { modelId: 'M', externalId: 'e2', dbId: 0, name: 'AHU-02', typeName: 'T1', space: 'Room-A' },
      { modelId: 'M', externalId: 'e3', dbId: 0, name: 'VAV-01', typeName: 'T2', space: 'Room-B' }
    ]
    const types = [
      { modelId: 'M', name: 'T1', category: 'cat-A' },
      { modelId: 'M', name: 'T2', category: 'cat-B' }
    ]
    const spaces = [
      { modelId: 'M', name: 'Room-A', floorName: '1F' },
      { modelId: 'M', name: 'Room-B', floorName: '1F' },
      { modelId: 'M', name: 'Room-C', floorName: '2F' } // no components
    ]
    const floors = [{ modelId: 'M', name: '1F' }, { modelId: 'M', name: '2F' }]
    const zones = [
      { modelId: 'M', name: 'Admin', spaceNames: ['Room-A'] },
      { modelId: 'M', name: 'Util', spaceNames: ['Room-B', 'Room-C'] }
    ]
    const systems = [
      { modelId: 'M', name: 'HVAC', componentExternalIds: ['e1', 'e3'] }
    ]
    const attributes = [
      { modelId: 'M', sheetName: 'Type', rowName: 'T1', name: 'Color', value: 'White' },
      { modelId: 'M', sheetName: 'Component', rowName: 'AHU-02', name: 'Color', value: 'Blue' }
    ]
    const ctx = buildFilterCtx({
      modelId: 'M',
      components: components as any,
      types: types as any,
      spaces: spaces as any,
      floors: floors as any,
      zones: zones as any,
      systems: systems as any,
      attributes: attributes as any
    })
    expect(ctx.byExternalId.size).toBe(3)
    expect([...ctx.bySpace.get('Room-A') ?? []].sort()).toEqual(['e1', 'e2'])
    expect([...ctx.byType.get('T1') ?? []].sort()).toEqual(['e1', 'e2'])
    expect([...ctx.byFloor.get('1F') ?? []].sort()).toEqual(['e1', 'e2', 'e3'])
    expect([...ctx.byZone.get('Util') ?? []].sort()).toEqual(['e3'])
    expect([...ctx.bySystem.get('HVAC') ?? []].sort()).toEqual(['e1', 'e3'])
    expect(ctx.attributesIndex.get('type::t1')?.length).toBe(1)
    expect(ctx.attributesIndex.get('component::ahu-02')?.length).toBe(1)
    expect(ctx.dim('type.name').id).toBe('type.name')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `buildFilterCtx` not exported.

- [ ] **Step 3: Create useFilterCtx.ts**

```ts
import { ref, watch, unref, type Ref } from 'vue'
import type {
  ExtractedComponent,
  ExtractedType,
  ExtractedSpace,
  ExtractedFloor,
  ExtractedZone,
  ExtractedSystem,
  ExtractedAttribute
} from './useCobieStore'
import type { FilterCtx } from './filterTypes'
import { getDim } from './filterRegistry'
import { useCobieStore } from './useCobieStore'

type MaybeRef<T> = T | Ref<T>

const addToMap = <K, V>(m: Map<K, Set<V>>, k: K, v: V) => {
  let s = m.get(k); if (!s) { s = new Set<V>(); m.set(k, s) }; s.add(v)
}
const pushToMap = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
  const arr = m.get(k); if (arr) arr.push(v); else m.set(k, [v])
}

export interface BuildInput {
  modelId: string
  components: ExtractedComponent[]
  types: ExtractedType[]
  spaces: ExtractedSpace[]
  floors: ExtractedFloor[]
  zones: ExtractedZone[]
  systems: ExtractedSystem[]
  attributes: ExtractedAttribute[]
}

export function buildFilterCtx(input: BuildInput): FilterCtx {
  const byExternalId = new Map<string, ExtractedComponent>()
  const bySpace = new Map<string, Set<string>>()
  const byType = new Map<string, Set<string>>()
  const byFloor = new Map<string, Set<string>>()
  const byZone = new Map<string, Set<string>>()
  const bySystem = new Map<string, Set<string>>()
  const attributesIndex = new Map<string, ExtractedAttribute[]>()

  for (const c of input.components) {
    byExternalId.set(c.externalId, c)
    if (c.space) addToMap(bySpace, c.space, c.externalId)
    if (c.typeName) addToMap(byType, c.typeName, c.externalId)
  }
  for (const s of input.spaces) {
    if (!s.floorName) continue
    for (const id of bySpace.get(s.name) ?? []) addToMap(byFloor, s.floorName, id)
  }
  for (const z of input.zones) {
    for (const sn of z.spaceNames) {
      for (const id of bySpace.get(sn) ?? []) addToMap(byZone, z.name, id)
    }
  }
  for (const sys of input.systems) {
    for (const id of sys.componentExternalIds) addToMap(bySystem, sys.name, id)
  }
  for (const a of input.attributes) {
    if (!a.sheetName || !a.rowName) continue
    const k = `${a.sheetName.trim().toLowerCase()}::${a.rowName.trim().toLowerCase()}`
    pushToMap(attributesIndex, k, a)
  }

  return {
    modelId: input.modelId,
    components: input.components,
    byExternalId,
    types: new Map(input.types.map(t => [t.name, t])),
    spaces: new Map(input.spaces.map(s => [s.name, s])),
    floors: new Map(input.floors.map(f => [f.name, f])),
    zones: input.zones,
    systems: input.systems,
    attributesIndex,
    bySpace, byFloor, byZone, bySystem, byType,
    dim: getDim
  }
}

export function useFilterCtx(modelId: MaybeRef<string>) {
  const ctx = ref<FilterCtx | null>(null)
  const loading = ref(false)
  const store = useCobieStore()
  let token = 0

  const reload = async () => {
    const my = ++token
    loading.value = true
    const id = unref(modelId)
    if (!id) { loading.value = false; return }
    const [components, types, spaces, floors, zones, systems, attributes] = await Promise.all([
      store.listComponents(id),
      store.listTypes(id),
      store.listSpaces(id),
      store.listFloors(id),
      store.listZones(id),
      store.listSystems(id),
      store.listAttributes(id)
    ])
    if (my !== token) return            // 過期，丟棄
    ctx.value = buildFilterCtx({
      modelId: id, components, types, spaces, floors, zones, systems, attributes
    })
    loading.value = false
  }

  watch(() => unref(modelId), reload, { immediate: true })

  return { ctx, loading, reload }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: `buildFilterCtx` test passes.

- [ ] **Step 5: Commit**

```bash
git add app/composables/useFilterCtx.ts tests/composables/useFilterCtx.test.ts
git commit -m "feat(filter): useFilterCtx + buildFilterCtx with index building"
```

---

## Task 11: useViewerHighlight — factory composable

**Files:**
- Create: `app/composables/useViewerHighlight.ts`

- [ ] **Step 1: Create useViewerHighlight.ts**

```ts
// 動態取 THREE.Vector4：Forge global 提供
declare const THREE: any

const COLOR_HIT = () => new THREE.Vector4(1.0, 0.55, 0.0, 0.9)

const mappingCache = new WeakMap<object, Record<string, number>>()

async function getMapping(viewer: any): Promise<Record<string, number>> {
  const model = viewer?.model
  if (!model) return {}
  const cached = mappingCache.get(model)
  if (cached) return cached
  const map = await new Promise<Record<string, number>>(resolve => {
    model.getExternalIdMapping(
      (m: Record<string, number>) => resolve(m),
      () => resolve({})
    )
  })
  mappingCache.set(model, map)
  return map
}

export interface UseViewerHighlight {
  applyHighlight(
    viewer: any,
    externalIds: Set<string>,
    opts?: { emptyMode?: 'showAll' | 'hideAll' }
  ): Promise<{ hitDbIds: number[]; missing: number }>
  clearHighlight(viewer: any): void
  fitToHighlight(viewer: any): Promise<void>
  resetForNewModel(): void
}

export function useViewerHighlight(): UseViewerHighlight {
  let lastHitDbIds: number[] = []

  async function applyHighlight(
    viewer: any,
    externalIds: Set<string>,
    opts: { emptyMode?: 'showAll' | 'hideAll' } = {}
  ) {
    const emptyMode = opts.emptyMode ?? 'showAll'
    const map = await getMapping(viewer)
    const dbIds: number[] = []
    for (const e of externalIds) {
      const n = map[e]
      if (typeof n === 'number') dbIds.push(n)
    }
    viewer.clearThemingColors(viewer.model)
    if (dbIds.length === 0) {
      if (emptyMode === 'hideAll') viewer.hideAll?.()
      else viewer.isolate([])
      lastHitDbIds = []
      return { hitDbIds: [], missing: externalIds.size }
    }
    viewer.showAll?.()
    viewer.isolate(dbIds)
    const color = COLOR_HIT()
    for (const id of dbIds) viewer.setThemingColor(id, color, viewer.model)
    lastHitDbIds = dbIds
    return { hitDbIds: dbIds, missing: externalIds.size - dbIds.length }
  }

  function clearHighlight(viewer: any) {
    viewer.clearThemingColors(viewer.model)
    viewer.showAll?.()
    viewer.isolate([])
    lastHitDbIds = []
  }

  async function fitToHighlight(viewer: any) {
    if (lastHitDbIds.length === 0) return
    viewer.fitToView(lastHitDbIds)
  }

  function resetForNewModel() {
    lastHitDbIds = []
  }

  return { applyHighlight, clearHighlight, fitToHighlight, resetForNewModel }
}
```

- [ ] **Step 2: Sanity build**

Run: `pnpm exec nuxi build 2>&1 | tail -5`
Expected: `Build complete!`

- [ ] **Step 3: Commit**

```bash
git add app/composables/useViewerHighlight.ts
git commit -m "feat(filter): useViewerHighlight factory composable"
```

---

## Task 12: useCobieFilter — scaffold + state + mutations

**Files:**
- Create: `app/composables/useCobieFilter.ts`

- [ ] **Step 1: Create scaffold with chain ref + mutations (no watcher yet)**

```ts
import { ref, computed, watch, onScopeDispose, unref, type Ref, type ComputedRef } from 'vue'
import type {
  FilterCondition, ChainItem, FilterChain,
  FilterCtx, FilterDimension,
  EvaluateResultWithMissing
} from './filterTypes'
import { REGISTRY, getDim } from './filterRegistry'
import { evaluateChain } from './filterEngine'
import { useFilterCtx } from './useFilterCtx'
import { useViewerHighlight } from './useViewerHighlight'

type MaybeRef<T> = T | Ref<T>

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

const newCondition = (dimensionId: string): FilterCondition => ({
  id: newId(),
  dimensionId,
  op: REGISTRY[dimensionId]?.ops[0] ?? 'eq',
  value: undefined
})

export interface UseCobieFilterReturn {
  chain: Ref<FilterChain>
  ctx: ComputedRef<FilterCtx | null>
  availableDimensions: readonly FilterDimension[]
  result: Ref<EvaluateResultWithMissing>
  enabled: Ref<boolean>
  shouldSuppressIsolate: ComputedRef<boolean>
  addCondition(dimensionId: string): string
  addOrGroup(firstDimensionId: string): string
  addConditionToGroup(groupId: string, dimensionId: string): string
  removeItem(itemId: string): void
  removeConditionFromGroup(groupId: string, conditionId: string): void
  updateCondition(conditionId: string, patch: Partial<FilterCondition>): void
  clearAll(): void
  notifyManualFocus(): void
  exportExtIds(): string
  fitToHits(): void
  hitsGroupedByType: ComputedRef<Array<{
    typeName: string
    typeCategory?: string
    components: any[]
  }>>
}

export function useCobieFilter(opts: {
  modelId: MaybeRef<string>
  viewer: Ref<any | null>
}): UseCobieFilterReturn {
  const { ctx } = useFilterCtx(opts.modelId)
  const highlight = useViewerHighlight()

  const chain = ref<FilterChain>({ items: [] })
  const enabled = ref(true)
  const result = ref<EvaluateResultWithMissing>({ active: false })

  const availableDimensions = Object.freeze(Object.values(REGISTRY)) as readonly FilterDimension[]

  // -- mutations --
  const findCondition = (conditionId: string): FilterCondition | undefined => {
    for (const item of chain.value.items) {
      if (item.kind === 'single' && item.condition.id === conditionId) return item.condition
      if (item.kind === 'orGroup') {
        const c = item.conditions.find(c => c.id === conditionId)
        if (c) return c
      }
    }
  }

  const addCondition = (dimensionId: string): string => {
    const c = newCondition(dimensionId)
    chain.value.items.push({ kind: 'single', condition: c })
    return c.id
  }

  const addOrGroup = (firstDimensionId: string): string => {
    const groupId = newId()
    chain.value.items.push({
      kind: 'orGroup',
      id: groupId,
      conditions: [newCondition(firstDimensionId)]
    })
    return groupId
  }

  const addConditionToGroup = (groupId: string, dimensionId: string): string => {
    const item = chain.value.items.find(it => it.kind === 'orGroup' && it.id === groupId)
    if (!item || item.kind !== 'orGroup') throw new Error(`OR group ${groupId} not found`)
    const c = newCondition(dimensionId)
    item.conditions.push(c)
    return c.id
  }

  const removeItem = (itemId: string) => {
    chain.value.items = chain.value.items.filter(it =>
      (it.kind === 'single' ? it.condition.id : it.id) !== itemId
    )
  }

  const removeConditionFromGroup = (groupId: string, conditionId: string) => {
    const idx = chain.value.items.findIndex(it => it.kind === 'orGroup' && it.id === groupId)
    if (idx === -1) return
    const item = chain.value.items[idx]
    if (item.kind !== 'orGroup') return
    item.conditions = item.conditions.filter(c => c.id !== conditionId)
    if (item.conditions.length === 0) {
      // 空群組移除
      chain.value.items.splice(idx, 1)
    } else if (item.conditions.length === 1) {
      // 降階為 single
      chain.value.items.splice(idx, 1, { kind: 'single', condition: item.conditions[0] })
    }
  }

  const updateCondition = (conditionId: string, patch: Partial<FilterCondition>) => {
    const c = findCondition(conditionId)
    if (c) Object.assign(c, patch)
  }

  const clearAll = () => {
    chain.value = { items: [] }
  }

  const notifyManualFocus = () => {
    enabled.value = false
  }

  const exportExtIds = (): string => {
    const r = result.value
    if (!r.active) return ''
    return [...r.finalSet].join('\n')
  }

  const fitToHits = () => {
    if (opts.viewer.value) highlight.fitToHighlight(opts.viewer.value)
  }

  const shouldSuppressIsolate = computed(() => {
    if (!enabled.value) return false
    const r = result.value
    return r.active && r.finalSet.size > 0
  })

  const hitsGroupedByType = computed(() => {
    const r = result.value
    if (!r.active || !ctx.value) return []
    const groups = new Map<string, { typeName: string; typeCategory?: string; components: any[] }>()
    for (const extId of r.finalSet) {
      const c = ctx.value.byExternalId.get(extId)
      if (!c) continue
      const typeName = c.typeName ?? '(無 Type)'
      let g = groups.get(typeName)
      if (!g) {
        const t = c.typeName ? ctx.value.types.get(c.typeName) : undefined
        g = { typeName, typeCategory: t?.category, components: [] }
        groups.set(typeName, g)
      }
      g.components.push(c)
    }
    const arr = [...groups.values()]
    for (const g of arr) g.components.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    arr.sort((a, b) => b.components.length - a.components.length)
    return arr
  })

  return {
    chain, ctx, availableDimensions, result, enabled,
    shouldSuppressIsolate,
    addCondition, addOrGroup, addConditionToGroup,
    removeItem, removeConditionFromGroup, updateCondition,
    clearAll, notifyManualFocus, exportExtIds, fitToHits,
    hitsGroupedByType
  }
}
```

- [ ] **Step 2: Sanity build**

Run: `pnpm exec nuxi build 2>&1 | tail -5`
Expected: `Build complete!`

- [ ] **Step 3: Commit**

```bash
git add app/composables/useCobieFilter.ts
git commit -m "feat(filter): useCobieFilter scaffold + mutations + computeds"
```

---

## Task 13: useCobieFilter — debounce + token watcher + apply highlight + lifecycle cleanup

**Files:**
- Modify: `app/composables/useCobieFilter.ts`

- [ ] **Step 1: Append watcher logic above the return statement**

In `useCobieFilter.ts`, before the `return { ... }` block, insert:

```ts
  // -- 重算與套用 highlight --
  let requestId = 0
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const run = async () => {
    const my = ++requestId
    const c = ctx.value
    const v = opts.viewer.value
    if (!c || !v) { result.value = { active: false }; return }

    const r = evaluateChain(chain.value, c)
    if (my !== requestId) return

    if (!r.active || !enabled.value) {
      highlight.clearHighlight(v)
      result.value = { active: false }
      return
    }

    const emptyMode = r.finalSet.size === 0 ? 'hideAll' : 'showAll'
    const { missing } = await highlight.applyHighlight(v, r.finalSet, { emptyMode })
    if (my !== requestId) return
    result.value = { ...r, missingInModel: missing }
  }

  const trigger = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(run, 200)
  }

  // 拆 watch：chain 需要 deep；ctx / enabled / viewer 單值
  // ⚠️ 切忌 deep-watch viewer（Forge viewer 含 THREE.Scene 循環引用會炸）
  watch(chain, trigger, { deep: true })
  watch(enabled, trigger)
  watch(ctx, trigger)
  watch(opts.viewer, (v, oldV) => {
    if (oldV && v !== oldV) highlight.resetForNewModel()
    trigger()
  }, { immediate: true })

  // 生命週期：離開頁面 / HMR
  onScopeDispose(() => {
    if (opts.viewer.value) highlight.clearHighlight(opts.viewer.value)
    if (debounceTimer) clearTimeout(debounceTimer)
  })

```

- [ ] **Step 2: Sanity build**

Run: `pnpm exec nuxi build 2>&1 | tail -5`
Expected: `Build complete!`

- [ ] **Step 3: Commit**

```bash
git add app/composables/useCobieFilter.ts
git commit -m "feat(filter): useCobieFilter watcher (debounce+token) and lifecycle cleanup"
```

---

## Task 14: FilterValueInput.vue — 依 op 切換輸入控件

**Files:**
- Create: `app/components/FilterValueInput.vue`

- [ ] **Step 1: Create component**

```vue
<script setup lang="ts">
import type { FilterCondition, FilterDimension, FilterCtx } from '~/composables/filterTypes'

const props = defineProps<{
  condition: FilterCondition
  dimension: FilterDimension
  ctx: FilterCtx | null
}>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<FilterCondition>): void
}>()

const options = computed(() =>
  props.ctx && props.dimension.loadOptions ? props.dimension.loadOptions(props.ctx) : []
)

// Attribute 維度需要兩段：先取 attrName 再取 value
const attrNamesList = computed(() => {
  if (props.dimension.id !== 'attr' || !props.ctx) return []
  return props.dimension.loadOptions(props.ctx)
})

const setValue = (value: any) => emit('update', { value })
const setAttrName = (attrName: string) => emit('update', { attrName, value: undefined })
const setAttrValue = (raw: string) =>
  emit('update', { value: { attrName: props.condition.attrName, value: raw } })
</script>

<template>
  <!-- Attribute 維度：先 attr name autocomplete 再 value 輸入 -->
  <div v-if="dimension.id === 'attr'" class="attr-input">
    <v-autocomplete
      :model-value="condition.attrName"
      :items="attrNamesList"
      placeholder="屬性名稱"
      density="compact"
      variant="outlined"
      hide-details
      @update:model-value="setAttrName"
    />
    <v-text-field
      v-if="condition.attrName"
      :model-value="(condition.value as any)?.value ?? ''"
      :placeholder="condition.op === 'contains' ? '包含值…' : '值'"
      density="compact"
      variant="outlined"
      hide-details
      @update:model-value="setAttrValue"
    />
  </div>

  <!-- in：多選 chip -->
  <v-autocomplete
    v-else-if="condition.op === 'in'"
    :model-value="condition.value ?? []"
    :items="options"
    multiple chips closable-chips
    density="compact"
    variant="outlined"
    placeholder="挑選一個或多個…"
    hide-details
    @update:model-value="setValue"
  />

  <!-- range 數字 -->
  <div v-else-if="condition.op === 'range'" class="range-input">
    <v-text-field
      :model-value="(condition.value as any)?.min ?? ''"
      placeholder="最小"
      type="number"
      density="compact" variant="outlined" hide-details
      @update:model-value="(v) => setValue({ ...(condition.value ?? {}), min: v === '' ? undefined : Number(v) })"
    />
    <span>—</span>
    <v-text-field
      :model-value="(condition.value as any)?.max ?? ''"
      placeholder="最大"
      type="number"
      density="compact" variant="outlined" hide-details
      @update:model-value="(v) => setValue({ ...(condition.value ?? {}), max: v === '' ? undefined : Number(v) })"
    />
  </div>

  <!-- dateRange -->
  <div v-else-if="condition.op === 'dateRange'" class="range-input">
    <v-text-field
      :model-value="(condition.value as any)?.from ?? ''"
      placeholder="起" type="date"
      density="compact" variant="outlined" hide-details
      @update:model-value="(v) => setValue({ ...(condition.value ?? {}), from: v || undefined })"
    />
    <span>—</span>
    <v-text-field
      :model-value="(condition.value as any)?.to ?? ''"
      placeholder="迄" type="date"
      density="compact" variant="outlined" hide-details
      @update:model-value="(v) => setValue({ ...(condition.value ?? {}), to: v || undefined })"
    />
  </div>

  <!-- contains：純文字 -->
  <v-text-field
    v-else-if="condition.op === 'contains'"
    :model-value="condition.value ?? ''"
    placeholder="包含…"
    density="compact" variant="outlined" hide-details
    @update:model-value="setValue"
  />

  <!-- 預設 eq：autocomplete -->
  <v-autocomplete
    v-else
    :model-value="condition.value ?? null"
    :items="options"
    placeholder="挑選…"
    density="compact" variant="outlined" hide-details clearable
    @update:model-value="setValue"
  />
</template>

<style scoped>
.attr-input, .range-input {
  display: flex;
  gap: 6px;
  align-items: center;
}
.range-input span { color: var(--text-muted); font-size: 12px; }
</style>
```

- [ ] **Step 2: Sanity build**

Run: `pnpm exec nuxi build 2>&1 | tail -5`
Expected: `Build complete!`

- [ ] **Step 3: Commit**

```bash
git add app/components/FilterValueInput.vue
git commit -m "feat(filter): FilterValueInput per-op renderer"
```

---

## Task 15: FilterConditionCard.vue — 單條件 card

**Files:**
- Create: `app/components/FilterConditionCard.vue`

- [ ] **Step 1: Create component**

```vue
<script setup lang="ts">
import type { FilterCondition, FilterDimension, FilterCtx } from '~/composables/filterTypes'
import { REGISTRY } from '~/composables/filterRegistry'
import FilterValueInput from './FilterValueInput.vue'

const props = defineProps<{
  condition: FilterCondition
  ctx: FilterCtx | null
  /** 此 card 是否為 chain 的第一個 active 條件（顯示 「自動展開 Category」chip 用） */
  isFirstActive: boolean
}>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<FilterCondition>): void
  (e: 'remove'): void
}>()

const dim = computed<FilterDimension>(() => REGISTRY[props.condition.dimensionId])
const showExpandHint = computed(() =>
  props.isFirstActive && props.condition.dimensionId === 'type.name'
)
</script>

<template>
  <div class="cond-card">
    <div class="cond-head">
      <span class="cond-dim">{{ dim?.label ?? condition.dimensionId }}</span>
      <v-select
        :model-value="condition.op"
        :items="dim?.ops ?? []"
        density="compact" variant="plain" hide-details
        style="width: 96px"
        @update:model-value="(op) => emit('update', { op, value: undefined })"
      />
      <v-spacer />
      <v-btn icon="mdi-close" variant="text" size="x-small" @click="emit('remove')" />
    </div>
    <FilterValueInput
      :condition="condition"
      :dimension="dim"
      :ctx="ctx"
      @update="(p) => emit('update', p)"
    />
    <div v-if="showExpandHint" class="cond-hint">
      <v-icon icon="mdi-expand-all-outline" size="12" />
      自動展開為同 Type.Category
    </div>
  </div>
</template>

<style scoped>
.cond-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cond-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cond-dim {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.cond-hint {
  font-size: 11px;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
```

- [ ] **Step 2: Sanity build**

Run: `pnpm exec nuxi build 2>&1 | tail -5`
Expected: `Build complete!`

- [ ] **Step 3: Commit**

```bash
git add app/components/FilterConditionCard.vue
git commit -m "feat(filter): FilterConditionCard"
```

---

## Task 16: FilterOrGroupCard.vue — OR 群組 card

**Files:**
- Create: `app/components/FilterOrGroupCard.vue`

- [ ] **Step 1: Create component**

```vue
<script setup lang="ts">
import type { FilterCondition, FilterCtx, FilterDimension } from '~/composables/filterTypes'
import FilterConditionCard from './FilterConditionCard.vue'

defineProps<{
  groupId: string
  conditions: FilterCondition[]
  ctx: FilterCtx | null
  availableDimensions: readonly FilterDimension[]
  /** 整個群組是否為第一個 active 位置 */
  isFirstActive: boolean
}>()

const emit = defineEmits<{
  (e: 'update-condition', conditionId: string, patch: Partial<FilterCondition>): void
  (e: 'remove-condition', conditionId: string): void
  (e: 'add-condition', dimensionId: string): void
  (e: 'remove-group'): void
}>()

const showAddMenu = ref(false)
</script>

<template>
  <div class="or-group">
    <div class="or-label">OR</div>
    <div class="or-body">
      <FilterConditionCard
        v-for="(c, i) in conditions"
        :key="c.id"
        :condition="c"
        :ctx="ctx"
        :is-first-active="isFirstActive && i === 0"
        @update="(p) => emit('update-condition', c.id, p)"
        @remove="emit('remove-condition', c.id)"
      />

      <v-menu v-model="showAddMenu">
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="text" size="small" prepend-icon="mdi-plus" class="or-add">
            加入 OR 條件
          </v-btn>
        </template>
        <v-list density="compact" max-height="320">
          <v-list-item
            v-for="d in availableDimensions"
            :key="d.id"
            @click="emit('add-condition', d.id); showAddMenu = false"
          >
            <v-list-item-title>{{ d.label }}</v-list-item-title>
            <v-list-item-subtitle class="t-mono" style="font-size: 10px">{{ d.id }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
    <v-btn icon="mdi-close" variant="text" size="x-small" class="or-remove" @click="emit('remove-group')" />
  </div>
</template>

<style scoped>
.or-group {
  position: relative;
  border: 1.5px dashed var(--primary);
  border-radius: 8px;
  padding: 8px 32px 8px 36px;
  background: var(--primary-soft);
}
.or-label {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 10px;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 0.08em;
}
.or-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.or-add { align-self: flex-start; }
.or-remove {
  position: absolute;
  top: 6px;
  right: 6px;
}
</style>
```

- [ ] **Step 2: Sanity build**

Run: `pnpm exec nuxi build 2>&1 | tail -5`
Expected: `Build complete!`

- [ ] **Step 3: Commit**

```bash
git add app/components/FilterOrGroupCard.vue
git commit -m "feat(filter): FilterOrGroupCard"
```

---

## Task 17: CobieFilterPanel.vue — rail tab root

**Files:**
- Create: `app/components/CobieFilterPanel.vue`

- [ ] **Step 1: Create component**

```vue
<script setup lang="ts">
import type { UseCobieFilterReturn } from '~/composables/useCobieFilter'
import FilterConditionCard from './FilterConditionCard.vue'
import FilterOrGroupCard from './FilterOrGroupCard.vue'
import type { ChainItem } from '~/composables/filterTypes'
import { isConditionActive } from '~/composables/filterEngine'

const props = defineProps<{ filter: UseCobieFilterReturn }>()

const showAddMenu = ref(false)
const showOrMenu = ref(false)

const hitCount = computed(() => {
  const r = props.filter.result.value
  return r.active ? r.finalSet.size : 0
})
const totalCount = computed(() =>
  props.filter.ctx.value ? props.filter.ctx.value.components.length : 0
)
const missingCount = computed(() => {
  const r = props.filter.result.value
  return r.active ? r.missingInModel : 0
})

/** 哪個 chain item 是第一個 active（給 card 顯示「自動展開」hint） */
const firstActiveItemKey = computed<string | null>(() => {
  for (const item of props.filter.chain.value.items) {
    if (item.kind === 'single') {
      if (isConditionActive(item.condition)) return item.condition.id
    } else {
      if (item.conditions.some(isConditionActive)) return item.id
    }
  }
  return null
})

const onCopyExtIds = async () => {
  const text = props.filter.exportExtIds()
  if (!text) return
  await navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="filter-panel">
    <header class="filter-head">
      <h3 class="filter-title">篩選器</h3>
      <v-spacer />
      <span class="filter-badge t-mono">{{ hitCount }} / {{ totalCount }}</span>
      <v-btn icon="mdi-broom" variant="text" size="small" title="清除全部" @click="filter.clearAll()" />
    </header>

    <v-divider />

    <div class="filter-body">
      <v-switch
        :model-value="filter.enabled.value"
        @update:model-value="(v) => filter.enabled.value = !!v"
        label="套用到模型"
        color="primary"
        density="compact"
        hide-details
        class="filter-toggle"
      />

      <div v-if="filter.chain.value.items.length === 0" class="empty">
        <v-icon icon="mdi-filter-variant-plus" size="32" color="grey-lighten-1" />
        <div>尚無條件，點下方「+」加入</div>
      </div>

      <template v-else>
        <template v-for="item in filter.chain.value.items" :key="item.kind === 'single' ? item.condition.id : item.id">
          <FilterConditionCard
            v-if="item.kind === 'single'"
            :condition="item.condition"
            :ctx="filter.ctx.value"
            :is-first-active="firstActiveItemKey === item.condition.id"
            @update="(p) => filter.updateCondition(item.condition.id, p)"
            @remove="filter.removeItem(item.condition.id)"
          />
          <FilterOrGroupCard
            v-else
            :group-id="item.id"
            :conditions="item.conditions"
            :ctx="filter.ctx.value"
            :available-dimensions="filter.availableDimensions"
            :is-first-active="firstActiveItemKey === item.id"
            @update-condition="(cid, p) => filter.updateCondition(cid, p)"
            @remove-condition="(cid) => filter.removeConditionFromGroup(item.id, cid)"
            @add-condition="(dim) => filter.addConditionToGroup(item.id, dim)"
            @remove-group="filter.removeItem(item.id)"
          />
        </template>
      </template>

      <!-- 加入按鈕 -->
      <div class="add-row">
        <v-menu v-model="showAddMenu">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="tonal" size="small" prepend-icon="mdi-plus">加入條件 (AND)</v-btn>
          </template>
          <v-list density="compact" max-height="320">
            <v-list-item
              v-for="d in filter.availableDimensions"
              :key="d.id"
              @click="filter.addCondition(d.id); showAddMenu = false"
            >
              <v-list-item-title>{{ d.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-menu v-model="showOrMenu">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" size="small" prepend-icon="mdi-plus">OR 群組</v-btn>
          </template>
          <v-list density="compact" max-height="320">
            <v-list-item
              v-for="d in filter.availableDimensions"
              :key="d.id"
              @click="filter.addOrGroup(d.id); showOrMenu = false"
            >
              <v-list-item-title>{{ d.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <v-divider />

    <!-- 結果摘要 -->
    <footer v-if="filter.result.value.active" class="filter-foot">
      <div v-if="missingCount > 0" class="warn">
        <v-icon icon="mdi-alert" size="14" />
        {{ missingCount }} 件未在模型中找到
      </div>
      <div v-if="filter.result.value.emptyAtStep != null" class="error">
        <v-icon icon="mdi-close-circle" size="14" />
        此條件後無命中
      </div>
      <div class="foot-actions">
        <v-btn size="small" variant="text" prepend-icon="mdi-crosshairs-gps" @click="filter.fitToHits()">Fit to view</v-btn>
        <v-btn size="small" variant="text" prepend-icon="mdi-content-copy" :disabled="hitCount === 0" @click="onCopyExtIds">複製 ExtIDs</v-btn>
      </div>
      <div v-if="filter.hitsGroupedByType.value.length" class="hits-by-type">
        <div v-for="g in filter.hitsGroupedByType.value" :key="g.typeName" class="hits-group">
          <div class="hits-group-title">
            <span>{{ g.typeName }}</span>
            <span class="t-mono">{{ g.components.length }}</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.filter-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.filter-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}
.filter-title { font-size: 13px; font-weight: 700; margin: 0; }
.filter-badge { font-size: 11px; color: var(--primary); }
.filter-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.filter-toggle { margin-bottom: 4px; }
.empty {
  padding: 24px 8px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}
.add-row {
  display: flex;
  gap: 6px;
  padding-top: 4px;
}
.filter-foot {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.warn { color: #B45309; display: flex; align-items: center; gap: 4px; }
.error { color: #B91C1C; display: flex; align-items: center; gap: 4px; }
.foot-actions { display: flex; gap: 4px; }
.hits-by-type {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hits-group-title {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  background: var(--surface-2);
  border-radius: 4px;
  font-size: 11px;
}
</style>
```

- [ ] **Step 2: Sanity build**

Run: `pnpm exec nuxi build 2>&1 | tail -5`
Expected: `Build complete!`

- [ ] **Step 3: Commit**

```bash
git add app/components/CobieFilterPanel.vue
git commit -m "feat(filter): CobieFilterPanel rail tab root"
```

---

## Task 18: CobieFilterStatusBar.vue — rail 收起時的狀態條

**Files:**
- Create: `app/components/CobieFilterStatusBar.vue`

- [ ] **Step 1: Create component**

```vue
<script setup lang="ts">
import type { UseCobieFilterReturn } from '~/composables/useCobieFilter'

const props = defineProps<{ filter: UseCobieFilterReturn }>()

const show = computed(() => props.filter.enabled.value && props.filter.result.value.active)
const hitCount = computed(() => {
  const r = props.filter.result.value
  return r.active ? r.finalSet.size : 0
})
const totalCount = computed(() => props.filter.ctx.value?.components.length ?? 0)
</script>

<template>
  <div v-if="show" class="status-bar">
    <v-icon icon="mdi-filter-variant" size="14" color="primary" />
    <span class="t-label">篩選</span>
    <span class="t-mono">{{ hitCount }} / {{ totalCount }} 件</span>
    <v-btn variant="text" size="x-small" @click="filter.clearAll()">清除</v-btn>
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
  padding: 4px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  font-size: 12px;
}
</style>
```

- [ ] **Step 2: Sanity build**

Run: `pnpm exec nuxi build 2>&1 | tail -5`
Expected: `Build complete!`

- [ ] **Step 3: Commit**

```bash
git add app/components/CobieFilterStatusBar.vue
git commit -m "feat(filter): CobieFilterStatusBar"
```

---

## Task 19: viewer/[id].vue — viewerRef refactor + 4th tab + status bar + focusElements yield

**Files:**
- Modify: `app/pages/viewer/[id].vue`

- [ ] **Step 1: Refactor `onViewerReady` to populate a `viewerRef` ref**

Add at the top of `<script setup>` (after existing imports):

```ts
import { useCobieFilter } from '~/composables/useCobieFilter'
import CobieFilterPanel from '~/components/CobieFilterPanel.vue'
import CobieFilterStatusBar from '~/components/CobieFilterStatusBar.vue'

const viewerRef = ref<any | null>(null)
```

Find the existing `onViewerReady` function. At its top (right after `;(window as any).__viewer = viewer`), add:

```ts
  viewerRef.value = viewer
```

- [ ] **Step 2: Instantiate the filter composable**

Right after `const docCount = ref(0)` (near end of `<script setup>`), add:

```ts
const filter = useCobieFilter({ modelId, viewer: viewerRef })
```

- [ ] **Step 3: Add 4th rail tab "filter"**

Find the `railTab` declaration. It currently is:

```ts
const railTab = ref<'cobie' | 'docs' | 'props'>('cobie')
```

Replace with:

```ts
const railTab = ref<'cobie' | 'docs' | 'props' | 'filter'>('cobie')
```

In template, find the `.rail-tabs` block and add a 4th button after the existing three:

```vue
        <button
          class="rail-tab"
          :class="{ active: railTab === 'filter' }"
          @click="railTab = 'filter'"
        >
          <v-icon icon="mdi-filter-variant" size="16" />
          <span>篩選</span>
        </button>
```

In the `.rail-content` block, add:

```vue
          <CobieFilterPanel v-else-if="railTab === 'filter'" :filter="filter" />
```

(place it before the closing `</div>` of `.rail-content`, after the existing `PropertyPanel` line)

- [ ] **Step 4: Add StatusBar to canvas-area**

Find `<main class="canvas-area">` and inside it, after `</ClientOnly>`, add:

```vue
        <CobieFilterStatusBar v-if="!railOpen" :filter="filter" />
```

- [ ] **Step 5: Add focusElements 「讓路」 branch**

Find the existing `focusElements` function. Add at its very top (before `const model = viewer.model`):

```ts
  // 篩選器啟用且有命中時，不 isolate（保留 ghost 層），只 select + fitToView
  if (filter.shouldSuppressIsolate.value) {
    const mapping: Record<string, number> = await new Promise(resolve => {
      viewer.model.getExternalIdMapping(
        (m: Record<string, number>) => resolve(m),
        () => resolve({})
      )
    })
    const dbIds = externalIds.map(extId => mapping[extId]).filter((id): id is number => typeof id === 'number')
    if (dbIds.length === 0) return
    viewer.select(dbIds)
    viewer.fitToView(dbIds)
    if (dbIds.length === 1) {
      viewer.getProperties(dbIds[0], (result: any) => {
        selectedElement.value = {
          dbId: dbIds[0],
          externalId: result.externalId,
          name: result.name,
          properties: (result.properties ?? []).filter((p: any) => !p.hidden && p.displayValue !== '')
        }
      })
    }
    return
  }
```

- [ ] **Step 6: Run dev server and smoke test**

Run in one terminal: `pnpm dev`
Open `http://localhost:3000/viewer/<some-model-id>` (use whatever manifest model id is available).

Manually verify:
1. Rail 出現第 4 個 tab「篩選」、icon mdi-filter-variant
2. 切到該 tab 看到「尚無條件」empty state、有「+加入條件」與「+OR 群組」按鈕
3. 點「+ 加入條件」→ 維度選單彈出，選 `type.name` → 新 card 出現、有 op dropdown 與 autocomplete value 輸入
4. 在 autocomplete 選一個值 → 模型開始有 ghost + 橘色 highlight、頂端 badge 顯示 `N / total`
5. 按 broom 圖示清除全部 → 模型回復原狀

關閉 dev server (`Ctrl+C`)。

- [ ] **Step 7: Build verification**

Run: `pnpm exec nuxi build 2>&1 | tail -5`
Expected: `Build complete!`

- [ ] **Step 8: Commit**

```bash
git add app/pages/viewer/[id].vue
git commit -m "feat(filter): integrate filter panel into viewer page (4th tab + status bar + focusElements yield)"
```

---

## Task 20: Manual acceptance — 全流程驗收

**Files:** 無新增；純手動驗收。

- [ ] **Step 1: 啟動 dev server**

Run: `pnpm dev`

- [ ] **Step 2: 案例 1（Type.Name 自動展開）**

於 viewer 頁切到「篩選」tab：
- 加入 `Type.Name` 條件，挑選一個樣本（例如 `Supply Diffuser 600 Face`）
- 驗證：模型中所有 `Type.Category = "23.75.70.21.27.11: Diffusers..."` 的構件變橘、其餘 ghost
- 條件 card 上應顯示「自動展開為同 Type.Category」hint
- badge 應顯示 N / total，N >> 1 表示已展開

- [ ] **Step 3: 案例 2（漸進收窄）**

繼續加 `Floor.Name = "First Floor"`：
- 驗證命中數縮減
- perStep 統計顯示第一步、第二步逐次的命中數

- [ ] **Step 4: 案例 3（OR 群組）**

加 OR 群組 `Manufacturer = Trane`，群組內再加 `Manufacturer = Carrier`：
- 驗證 OR 群組視覺（紫紅 dashed border 包起）
- 命中數 = 案例 2 與兩廠商 union 的交集

- [ ] **Step 5: 案例 4（清除）**

按 broom：
- 驗證模型完全還原：無 ghost、無上色、`canvas-area` 看起來與初始一致

- [ ] **Step 6: 案例 5（讓路）**

重新建立案例 1 狀態，然後切到 `COBie 資料` tab、點任一構件的 mdi-cube-scan 按鈕：
- 驗證篩選 toggle 仍 on、橘色 highlight 仍在
- 目標構件被 select（高亮邊框）並 fitToView

- [ ] **Step 7: 案例 6（rail 收起 + status bar）**

點 rail 收起按鈕：
- 驗證畫布頂端中央出現 thin status bar `篩選 N / total 件 清除`
- 按 status bar 上的「清除」→ 篩選清空、status bar 消失

- [ ] **Step 8: 案例 7（empty result 視覺）**

加一個明顯沒有命中的條件（例如 `Floor.Name = "不存在的樓"`）：
- 驗證模型整體被 hideAll、UI 顯示紅色「此條件後無命中」

- [ ] **Step 9: 案例 8（toggle 套用到模型）**

關閉「套用到模型」switch：
- 驗證模型立即還原（無 ghost、無上色），但條件清單保留
- 重開 switch → 命中再次顯示

- [ ] **Step 10: 案例 9（Attribute 維度）**

加入 `Attribute` 條件：
- 第一段選一個 attribute name（如 `BaseColor`）
- 第二段填值
- 驗證有對應命中（依 sample xlsx 內容調整測試值）

- [ ] **Step 11: 案例 10（離開與重回）**

切到 `/cobie` 頁再回 `/viewer/<id>`：
- 驗證重回時模型乾淨（unmount 已 clear），且重建 viewer 後可重新建立篩選

- [ ] **Step 12: 全部通過後關閉 dev server，沒有 commit**

驗收純檢查，沒有檔案變動，跳過 commit。

---

## Self-Review Checklist (for plan author)

- [x] Spec §1（UI 結構）→ Tasks 14–19 涵蓋
- [x] Spec §2（資料模型）→ Tasks 1–10 涵蓋
- [x] Spec §3（Forge 整合）→ Tasks 11–13 涵蓋
- [x] Spec §4（檔案結構/測試）→ Tasks 0、2–10、20 涵蓋
- [x] 所有 helper / 型別都有定義位置（itemKey/intersect/shouldExpand/isConditionActive/expandToSameCategory/evaluateItem/evaluateChain/addToMap/pushToMap/getMapping/REGISTRY 全部在 Tasks 1–10）
- [x] 每個改動的步驟皆含完整程式碼（無 "TBD / similar to" 等占位）
- [x] 命名與簽名跨任務一致（`useCobieFilter` 的所有 return method 在 Task 12 定義並在後續 UI tasks 使用）
- [x] focusElements 讓路 (Task 19 step 5) 與 spec §3.5 一致
- [x] OR group 降階 (Task 12 removeConditionFromGroup) 與 spec §1 規則一致
- [x] 自動展開「第一個 active item」(Tasks 4–5 + Task 17 firstActiveItemKey computed) 與 spec §2 一致
