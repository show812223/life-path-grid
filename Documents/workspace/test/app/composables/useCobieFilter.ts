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
