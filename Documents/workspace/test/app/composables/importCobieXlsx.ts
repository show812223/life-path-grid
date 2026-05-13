import * as XLSX from 'xlsx'
import type {
  CobieComponent,
  CobieType,
  CobieSpace,
  CobieFloor,
  CobieSystem,
  CobieZone,
  CobieFacility,
  CobieDocument,
  CobieContact,
  CobieAttribute,
  CobieSheetRow,
  CobieMeta
} from './cobieTypes'

const str = (v: any) => {
  if (v === '' || v === 'n/a' || v === 'N/A' || v == null) return undefined
  return String(v)
}
const num = (v: any) => {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

const normalizeName = (s: string) =>
  s.trim().toLowerCase().replace(/[\s_.\-]+$/g, '')

/**
 * Keep the entire xlsx row as a plain object — preserves every column
 * (including non-COBie-standard extensions) so the UI can show everything.
 */
const cloneRow = (r: any): Record<string, any> => {
  const out: Record<string, any> = {}
  for (const k of Object.keys(r)) {
    const v = r[k]
    if (v === '' || v == null) continue
    out[k] = v
  }
  return out
}

export interface XlsxImportReport {
  modelId: string
  facility: CobieFacility
  components: CobieComponent[]
  types: CobieType[]
  spaces: CobieSpace[]
  floors: CobieFloor[]
  systems: CobieSystem[]
  zones: CobieZone[]
  documents: CobieDocument[]
  contacts: CobieContact[]
  attributes: CobieAttribute[]
  sheetRows: CobieSheetRow[]
  /** Sheets present in the workbook other than Instruction (for UI overview). */
  sheetNames: string[]
  counts: {
    components: number
    types: number
    spaces: number
    floors: number
    systems: number
    zones: number
    documents: number
    contacts: number
    attributes: number
    extraSheets: number
  }
}

const rowsFrom = (wb: XLSX.WorkBook, name: string) => {
  const ws = wb.Sheets[name]
  if (!ws) return [] as any[]
  return XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[]
}

/**
 * Parse a COBie xlsx into a full import payload covering all 7 tables.
 * Component.ExtIdentifier is the Revit UniqueId which equals Forge externalId
 * for the corresponding SVF — that's what makes "focus in model" work.
 *
 * Every row is also stored verbatim in `raw` so non-typed columns survive.
 */
export const parseCobieXlsx = async (
  input: File | ArrayBuffer,
  modelId: string
): Promise<XlsxImportReport> => {
  const buffer = input instanceof File ? await input.arrayBuffer() : input
  const wb = XLSX.read(buffer, { type: 'array' })

  // Facility — keep entire row
  const facilityRow = rowsFrom(wb, 'Facility')[0] || {}
  const facility: CobieFacility = {
    modelId,
    name: str(facilityRow.Name),
    projectName: str(facilityRow.ProjectName),
    siteName: str(facilityRow.SiteName),
    raw: cloneRow(facilityRow)
  }

  // Floors
  const floors: CobieFloor[] = rowsFrom(wb, 'Floor')
    .map(r => ({
      modelId,
      name: str(r.Name) || '',
      category: str(r.Category),
      description: str(r.Description),
      elevation: num(r.Elevation),
      height: num(r.Height),
      externalId: str(r.ExtIdentifier),
      raw: cloneRow(r)
    }))
    .filter(f => f.name)

  // Spaces
  const spaces: CobieSpace[] = rowsFrom(wb, 'Space')
    .map(r => ({
      modelId,
      name: str(r.Name) || '',
      category: str(r.Category),
      floorName: str(r.FloorName),
      description: str(r.Description),
      grossArea: num(r.GrossArea),
      netArea: num(r.NetArea),
      externalId: str(r.ExtIdentifier),
      raw: cloneRow(r)
    }))
    .filter(s => s.name)

  // Types
  const types: CobieType[] = rowsFrom(wb, 'Type')
    .map(r => ({
      modelId,
      name: str(r.Name) || '',
      category: str(r.Category),
      description: str(r.Description),
      assetType: str(r.AssetType),
      manufacturer: str(r.Manufacturer),
      modelNumber: str(r.ModelNumber),
      warrantyGuarantorParts: str(r.WarrantyGuarantorParts),
      warrantyDurationParts: num(r.WarrantyDurationParts),
      warrantyDurationLabor: num(r.WarrantyDurationLabor),
      warrantyDurationUnit: str(r.WarrantyDurationUnit),
      replacementCost: num(r.ReplacementCost),
      expectedLife: num(r.ExpectedLife),
      durationUnit: str(r.DurationUnit),
      nominalLength: num(r.NominalLength),
      nominalWidth: num(r.NominalWidth),
      nominalHeight: num(r.NominalHeight),
      raw: cloneRow(r)
    }))
    .filter(t => t.name)

  // Components — key by ExtIdentifier (Revit UniqueId)
  const components: CobieComponent[] = []
  for (const r of rowsFrom(wb, 'Component')) {
    const extId = str(r.ExtIdentifier)
    const name = str(r.Name)
    if (!extId || !name) continue
    components.push({
      modelId,
      externalId: extId,
      dbId: 0, // unknown until model loaded
      name,
      typeName: str(r.TypeName),
      space: str(r.Space),
      description: str(r.Description),
      serialNumber: str(r.SerialNumber),
      installationDate: str(r.InstallationDate),
      warrantyStartDate: str(r.WarrantyStartDate),
      tagNumber: str(r.TagNumber),
      barCode: str(r.BarCode),
      assetIdentifier: str(r.AssetIdentifier),
      area: num(r.Area),
      length: num(r.Length),
      raw: cloneRow(r)
    })
  }

  // build name → externalId index for system bridging
  const componentNameToExt = new Map<string, string[]>()
  for (const c of components) {
    const k = normalizeName(c.name)
    const arr = componentNameToExt.get(k) || []
    arr.push(c.externalId)
    componentNameToExt.set(k, arr)
  }

  // Systems — group by Name; each row references one Component by ComponentNames.
  // Merge raw from the first row of each group (extension columns survive).
  const systemsMap = new Map<string, {
    sys: CobieSystem
    names: Set<string>
  }>()
  for (const r of rowsFrom(wb, 'System')) {
    const sysName = str(r.Name)
    if (!sysName) continue
    let entry = systemsMap.get(sysName)
    if (!entry) {
      entry = {
        sys: {
          modelId,
          name: sysName,
          category: str(r.Category),
          description: str(r.Description),
          componentExternalIds: [],
          raw: cloneRow(r)
        },
        names: new Set<string>()
      }
      systemsMap.set(sysName, entry)
    }
    const compNames = str(r.ComponentNames)
    if (compNames) {
      for (const cn of compNames.split(',').map((s: string) => s.trim()).filter(Boolean)) {
        entry.names.add(cn)
      }
    }
  }

  const systems: CobieSystem[] = []
  for (const { sys, names } of systemsMap.values()) {
    const ids = new Set<string>()
    for (const n of names) {
      const matches = componentNameToExt.get(normalizeName(n))
      if (matches) for (const m of matches) ids.add(m)
    }
    sys.declaredComponentNames = [...names]
    sys.componentExternalIds = [...ids]
    systems.push(sys)
  }

  // Zones — group by Name; each row references one or more Spaces
  const zonesMap = new Map<string, CobieZone>()
  for (const r of rowsFrom(wb, 'Zone')) {
    const zName = str(r.Name)
    if (!zName) continue
    let zone = zonesMap.get(zName)
    if (!zone) {
      zone = {
        modelId,
        name: zName,
        category: str(r.Category),
        description: str(r.Description),
        spaceNames: [],
        raw: cloneRow(r)
      }
      zonesMap.set(zName, zone)
    }
    const spNames = str(r.SpaceNames)
    if (spNames) {
      for (const sn of spNames.split(',').map((s: string) => s.trim()).filter(Boolean)) {
        if (!zone.spaceNames.includes(sn)) zone.spaceNames.push(sn)
      }
    }
  }

  // also stamp space.zoneName for reverse lookup
  const spaceToZone = new Map<string, string>()
  for (const z of zonesMap.values()) {
    for (const sn of z.spaceNames) spaceToZone.set(normalizeName(sn), z.name)
  }
  for (const s of spaces) {
    const z = spaceToZone.get(normalizeName(s.name))
    if (z) s.zoneName = z
  }

  // Stamp component.systemName from systems
  const compToSystem = new Map<string, string>()
  for (const sys of systems) {
    for (const extId of sys.componentExternalIds) {
      compToSystem.set(extId, sys.name)
    }
  }
  for (const c of components) {
    const s = compToSystem.get(c.externalId)
    if (s) c.systemName = s
  }

  // Documents — preserve every row (no natural key, use raw)
  const documents: CobieDocument[] = rowsFrom(wb, 'Document')
    .filter(r => Object.keys(cloneRow(r)).length > 0)
    .map(r => ({
      modelId,
      name: str(r.Name),
      raw: cloneRow(r)
    }))

  // Contacts — keep every row that has any data
  const contacts: CobieContact[] = rowsFrom(wb, 'Contact')
    .filter(r => Object.keys(cloneRow(r)).length > 0)
    .map(r => ({
      modelId,
      email: str(r.Email),
      company: str(r.Company),
      raw: cloneRow(r)
    }))

  // Attributes — extension properties for any sheet/row (Component, Type, …)
  const attributes: CobieAttribute[] = rowsFrom(wb, 'Attribute')
    .filter(r => Object.keys(cloneRow(r)).length > 0)
    .map(r => ({
      modelId,
      sheetName: str(r.SheetName),
      rowName: str(r.RowName),
      name: str(r.Name),
      value: str(r.Value),
      unit: str(r.Unit),
      category: str(r.Category),
      description: str(r.Description),
      raw: cloneRow(r)
    }))

  // Everything else — catch-all so no sheet is silently dropped.
  const TYPED_SHEETS = new Set([
    'Instruction',
    'Facility', 'Floor', 'Space', 'Zone', 'Type', 'Component', 'System',
    'Document', 'Contact', 'Attribute'
  ])
  const sheetRows: CobieSheetRow[] = []
  const allSheetNames = wb.SheetNames.filter(n => n !== 'Instruction')
  for (const sheetName of wb.SheetNames) {
    if (TYPED_SHEETS.has(sheetName)) continue
    const rows = rowsFrom(wb, sheetName)
    rows.forEach((r, idx) => {
      const cleaned = cloneRow(r)
      if (Object.keys(cleaned).length === 0) return
      sheetRows.push({
        modelId,
        sheetName,
        rowIndex: idx,
        raw: cleaned
      })
    })
  }
  const extraSheetCount = new Set(sheetRows.map(r => r.sheetName)).size

  return {
    modelId,
    facility,
    components,
    types,
    spaces,
    floors,
    systems,
    zones: [...zonesMap.values()],
    documents,
    contacts,
    attributes,
    sheetRows,
    sheetNames: allSheetNames,
    counts: {
      components: components.length,
      types: types.length,
      spaces: spaces.length,
      floors: floors.length,
      systems: systems.length,
      zones: zonesMap.size,
      documents: documents.length,
      contacts: contacts.length,
      attributes: attributes.length,
      extraSheets: extraSheetCount
    }
  }
}

/** Build a full CobieMeta for an xlsx import. */
export const buildMetaForXlsxImport = (
  report: XlsxImportReport,
  modelName?: string
): CobieMeta => ({
  modelId: report.modelId,
  modelName,
  extractedAt: new Date().toISOString(),
  source: 'xlsx',
  componentCount: report.counts.components,
  typeCount: report.counts.types,
  spaceCount: report.counts.spaces,
  floorCount: report.counts.floors,
  systemCount: report.counts.systems,
  zoneCount: report.counts.zones,
  facilityCount: report.facility?.name ? 1 : 0,
  documentCount: report.counts.documents,
  contactCount: report.counts.contacts,
  attributeCount: report.counts.attributes,
  extraSheetCount: report.counts.extraSheets,
  totalDbIds: 0
})
