import type { FilterCtx, FilterDimension, Operator } from './filterTypes'

const includesCI = (haystack: string | undefined, needle: string) =>
  !!haystack && haystack.toLowerCase().includes(needle.toLowerCase())

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
