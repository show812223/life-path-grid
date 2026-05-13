export interface CobieComponent {
  modelId: string
  externalId: string
  dbId: number
  name: string
  typeName?: string
  space?: string
  systemName?: string
  description?: string
  serialNumber?: string
  installationDate?: string
  warrantyStartDate?: string
  tagNumber?: string
  barCode?: string
  assetIdentifier?: string
  area?: number
  length?: number
  raw?: Record<string, any>
}

export interface CobieType {
  modelId: string
  name: string
  category?: string
  description?: string
  assetType?: string
  manufacturer?: string
  modelNumber?: string
  warrantyGuarantorParts?: string
  warrantyDurationParts?: number
  warrantyDurationLabor?: number
  warrantyDurationUnit?: string
  replacementCost?: number
  expectedLife?: number
  durationUnit?: string
  nominalLength?: number
  nominalWidth?: number
  nominalHeight?: number
  raw?: Record<string, any>
}

export interface CobieSpace {
  modelId: string
  name: string
  category?: string
  floorName?: string
  zoneName?: string
  description?: string
  grossArea?: number
  netArea?: number
  externalId?: string
  raw?: Record<string, any>
}

export interface CobieFloor {
  modelId: string
  name: string
  category?: string
  description?: string
  elevation?: number
  height?: number
  externalId?: string
  raw?: Record<string, any>
}

export interface CobieSystem {
  modelId: string
  name: string
  category?: string
  description?: string
  componentExternalIds: string[]
  declaredComponentNames?: string[]
  raw?: Record<string, any>
}

export interface CobieZone {
  modelId: string
  name: string
  category?: string
  description?: string
  spaceNames: string[]
  raw?: Record<string, any>
}

export interface CobieFacility {
  modelId: string
  name?: string
  projectName?: string
  siteName?: string
  raw?: Record<string, any>
}

export interface CobieDocument {
  id?: number
  modelId: string
  name?: string
  raw?: Record<string, any>
}

export interface CobieContact {
  id?: number
  modelId: string
  email?: string
  company?: string
  raw?: Record<string, any>
}

export interface CobieAttribute {
  id?: number
  modelId: string
  sheetName?: string
  rowName?: string
  name?: string
  value?: string
  unit?: string
  category?: string
  description?: string
  raw?: Record<string, any>
}

export interface CobieSheetRow {
  id?: number
  modelId: string
  sheetName: string
  rowIndex: number
  raw: Record<string, any>
}

export interface CobieMeta {
  modelId: string
  modelName?: string
  extractedAt: string
  source: 'model' | 'xlsx'
  componentCount: number
  typeCount: number
  spaceCount: number
  floorCount: number
  systemCount: number
  zoneCount: number
  totalDbIds: number
  facilityCount?: number
  documentCount?: number
  contactCount?: number
  attributeCount?: number
  extraSheetCount?: number
}

export interface ReplacePayload {
  components: CobieComponent[]
  types: CobieType[]
  spaces: CobieSpace[]
  floors: CobieFloor[]
  systems: CobieSystem[]
  zones: CobieZone[]
  facility?: CobieFacility
  documents?: CobieDocument[]
  contacts?: CobieContact[]
  attributes?: CobieAttribute[]
  sheetRows?: CobieSheetRow[]
  meta: CobieMeta
}

export interface MergePayload {
  components: CobieComponent[]
  types: CobieType[]
  spaces: CobieSpace[]
  floors: CobieFloor[]
  systems?: CobieSystem[]
  zones?: CobieZone[]
  meta: CobieMeta
}

export interface CobieRepo {
  getMeta(modelId: string): Promise<CobieMeta | undefined>
  getComponent(modelId: string, externalId?: string | null): Promise<CobieComponent | undefined>
  getType(modelId: string, name?: string | null): Promise<CobieType | undefined>
  getSpace(modelId: string, name?: string | null): Promise<CobieSpace | undefined>
  getFacility(modelId: string): Promise<CobieFacility | undefined>
  listComponents(modelId?: string): Promise<CobieComponent[]>
  listTypes(modelId?: string): Promise<CobieType[]>
  listSpaces(modelId?: string): Promise<CobieSpace[]>
  listFloors(modelId?: string): Promise<CobieFloor[]>
  listSystems(modelId?: string): Promise<CobieSystem[]>
  listZones(modelId?: string): Promise<CobieZone[]>
  listDocuments(modelId?: string): Promise<CobieDocument[]>
  listContacts(modelId?: string): Promise<CobieContact[]>
  listAttributes(
    modelId?: string,
    target?: { sheetName: string; rowName: string }
  ): Promise<CobieAttribute[]>
  listSheetRows(modelId?: string, sheetName?: string): Promise<CobieSheetRow[]>
  listAllMeta(): Promise<CobieMeta[]>
  replaceForModel(modelId: string, payload: ReplacePayload): Promise<void>
  replaceSystemsAndZones(
    modelId: string,
    systems: CobieSystem[],
    zones: CobieZone[]
  ): Promise<void>
  mergeFromModelExtraction(modelId: string, payload: MergePayload): Promise<void>
  clearModel(modelId: string): Promise<void>
  clearAll(): Promise<void>
}

/** Vue reactive proxies cannot be structured-cloned by IndexedDB. JSON round-trip strips Proxy wrappers. */
export const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v))
