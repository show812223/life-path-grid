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
import type { ExtractedComponent } from './useCobieStore'

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
    components: ExtractedComponent[]
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
      chain.value.items.splice(idx, 1)
    } else if (item.conditions.length === 1) {
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
    const groups = new Map<string, { typeName: string; typeCategory?: string; components: ExtractedComponent[] }>()
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

  return {
    chain, ctx, availableDimensions, result, enabled,
    shouldSuppressIsolate,
    addCondition, addOrGroup, addConditionToGroup,
    removeItem, removeConditionFromGroup, updateCondition,
    clearAll, notifyManualFocus, exportExtIds, fitToHits,
    hitsGroupedByType
  }
}
