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
