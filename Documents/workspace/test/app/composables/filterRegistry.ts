import type { FilterCtx, FilterDimension, Operator } from './filterTypes'
import type { ExtractedComponent } from './useCobieStore'

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

export const getDim = (id: string): FilterDimension => {
  const d = REGISTRY[id]
  if (!d) throw new Error(`Unknown dimension: ${id}`)
  return d
}
