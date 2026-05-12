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
