import type {
  ChainItem,
  FilterCondition,
  FilterCtx
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
