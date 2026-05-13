import Database from '@tauri-apps/plugin-sql'
import {
  type CobieRepo,
  type CobieComponent,
  type CobieType,
  type CobieSpace,
  type CobieFloor,
  type CobieSystem,
  type CobieZone,
  type CobieFacility,
  type CobieDocument,
  type CobieContact,
  type CobieAttribute,
  type CobieSheetRow,
  type CobieMeta,
  type ReplacePayload,
  type MergePayload,
  plain
} from './cobieTypes'

let _db: Database | null = null
let _loading: Promise<Database> | null = null
const getDb = async (): Promise<Database> => {
  if (_db) return _db
  if (!_loading) _loading = Database.load('sqlite:cobie.db').then((d) => (_db = d))
  return _loading
}

const nv = (v: any) => (v === undefined ? null : v)
const j = (v: any) => (v == null ? null : JSON.stringify(v))
const parseJson = <T>(v: any, fallback: T): T => {
  if (v == null) return fallback
  if (typeof v !== 'string') return v as T
  try { return JSON.parse(v) as T } catch { return fallback }
}

const CHUNK = 200

async function bulkInsert(
  db: Database,
  table: string,
  cols: string[],
  rows: any[][]
) {
  if (!rows.length) return
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    const placeholders = slice.map(() => `(${cols.map(() => '?').join(',')})`).join(',')
    const values: any[] = []
    for (const r of slice) values.push(...r)
    await db.execute(
      `INSERT OR REPLACE INTO ${table} (${cols.map((c) => `"${c}"`).join(',')}) VALUES ${placeholders}`,
      values
    )
  }
}

// column lists must match migration order
const COMPONENT_COLS = [
  'modelId','externalId','dbId','name','typeName','space','systemName','description',
  'serialNumber','installationDate','warrantyStartDate','tagNumber','barCode',
  'assetIdentifier','area','length','raw'
]
const componentRow = (c: CobieComponent) => [
  c.modelId, c.externalId, c.dbId, c.name, nv(c.typeName), nv(c.space), nv(c.systemName),
  nv(c.description), nv(c.serialNumber), nv(c.installationDate), nv(c.warrantyStartDate),
  nv(c.tagNumber), nv(c.barCode), nv(c.assetIdentifier), nv(c.area), nv(c.length), j(c.raw)
]
const componentFromRow = (r: any): CobieComponent => ({
  modelId: r.modelId, externalId: r.externalId, dbId: r.dbId, name: r.name,
  typeName: r.typeName ?? undefined, space: r.space ?? undefined,
  systemName: r.systemName ?? undefined, description: r.description ?? undefined,
  serialNumber: r.serialNumber ?? undefined, installationDate: r.installationDate ?? undefined,
  warrantyStartDate: r.warrantyStartDate ?? undefined, tagNumber: r.tagNumber ?? undefined,
  barCode: r.barCode ?? undefined, assetIdentifier: r.assetIdentifier ?? undefined,
  area: r.area ?? undefined, length: r.length ?? undefined,
  raw: parseJson(r.raw, undefined as any)
})

const TYPE_COLS = [
  'modelId','name','category','description','assetType','manufacturer','modelNumber',
  'warrantyGuarantorParts','warrantyDurationParts','warrantyDurationLabor','warrantyDurationUnit',
  'replacementCost','expectedLife','durationUnit','nominalLength','nominalWidth','nominalHeight','raw'
]
const typeRow = (t: CobieType) => [
  t.modelId, t.name, nv(t.category), nv(t.description), nv(t.assetType), nv(t.manufacturer),
  nv(t.modelNumber), nv(t.warrantyGuarantorParts), nv(t.warrantyDurationParts),
  nv(t.warrantyDurationLabor), nv(t.warrantyDurationUnit), nv(t.replacementCost),
  nv(t.expectedLife), nv(t.durationUnit), nv(t.nominalLength), nv(t.nominalWidth),
  nv(t.nominalHeight), j(t.raw)
]
const typeFromRow = (r: any): CobieType => ({
  modelId: r.modelId, name: r.name, category: r.category ?? undefined,
  description: r.description ?? undefined, assetType: r.assetType ?? undefined,
  manufacturer: r.manufacturer ?? undefined, modelNumber: r.modelNumber ?? undefined,
  warrantyGuarantorParts: r.warrantyGuarantorParts ?? undefined,
  warrantyDurationParts: r.warrantyDurationParts ?? undefined,
  warrantyDurationLabor: r.warrantyDurationLabor ?? undefined,
  warrantyDurationUnit: r.warrantyDurationUnit ?? undefined,
  replacementCost: r.replacementCost ?? undefined,
  expectedLife: r.expectedLife ?? undefined,
  durationUnit: r.durationUnit ?? undefined,
  nominalLength: r.nominalLength ?? undefined,
  nominalWidth: r.nominalWidth ?? undefined,
  nominalHeight: r.nominalHeight ?? undefined,
  raw: parseJson(r.raw, undefined as any)
})

const SPACE_COLS = [
  'modelId','name','category','floorName','zoneName','description',
  'grossArea','netArea','externalId','raw'
]
const spaceRow = (s: CobieSpace) => [
  s.modelId, s.name, nv(s.category), nv(s.floorName), nv(s.zoneName), nv(s.description),
  nv(s.grossArea), nv(s.netArea), nv(s.externalId), j(s.raw)
]
const spaceFromRow = (r: any): CobieSpace => ({
  modelId: r.modelId, name: r.name, category: r.category ?? undefined,
  floorName: r.floorName ?? undefined, zoneName: r.zoneName ?? undefined,
  description: r.description ?? undefined,
  grossArea: r.grossArea ?? undefined, netArea: r.netArea ?? undefined,
  externalId: r.externalId ?? undefined,
  raw: parseJson(r.raw, undefined as any)
})

const FLOOR_COLS = ['modelId','name','category','description','elevation','height','externalId','raw']
const floorRow = (f: CobieFloor) => [
  f.modelId, f.name, nv(f.category), nv(f.description), nv(f.elevation), nv(f.height),
  nv(f.externalId), j(f.raw)
]
const floorFromRow = (r: any): CobieFloor => ({
  modelId: r.modelId, name: r.name, category: r.category ?? undefined,
  description: r.description ?? undefined,
  elevation: r.elevation ?? undefined, height: r.height ?? undefined,
  externalId: r.externalId ?? undefined,
  raw: parseJson(r.raw, undefined as any)
})

const SYSTEM_COLS = [
  'modelId','name','category','description','componentExternalIds','declaredComponentNames','raw'
]
const systemRow = (s: CobieSystem) => [
  s.modelId, s.name, nv(s.category), nv(s.description),
  j(s.componentExternalIds ?? []), j(s.declaredComponentNames ?? null), j(s.raw)
]
const systemFromRow = (r: any): CobieSystem => ({
  modelId: r.modelId, name: r.name, category: r.category ?? undefined,
  description: r.description ?? undefined,
  componentExternalIds: parseJson<string[]>(r.componentExternalIds, []),
  declaredComponentNames: parseJson<string[] | undefined>(r.declaredComponentNames, undefined),
  raw: parseJson(r.raw, undefined as any)
})

const ZONE_COLS = ['modelId','name','category','description','spaceNames','raw']
const zoneRow = (z: CobieZone) => [
  z.modelId, z.name, nv(z.category), nv(z.description), j(z.spaceNames ?? []), j(z.raw)
]
const zoneFromRow = (r: any): CobieZone => ({
  modelId: r.modelId, name: r.name, category: r.category ?? undefined,
  description: r.description ?? undefined,
  spaceNames: parseJson<string[]>(r.spaceNames, []),
  raw: parseJson(r.raw, undefined as any)
})

const FACILITY_COLS = ['modelId','name','projectName','siteName','raw']
const facilityRow = (f: CobieFacility) => [
  f.modelId, nv(f.name), nv(f.projectName), nv(f.siteName), j(f.raw)
]
const facilityFromRow = (r: any): CobieFacility => ({
  modelId: r.modelId, name: r.name ?? undefined,
  projectName: r.projectName ?? undefined, siteName: r.siteName ?? undefined,
  raw: parseJson(r.raw, undefined as any)
})

// auto-id tables: omit id so AUTOINCREMENT fills it
const DOC_COLS = ['modelId','name','raw']
const docRow = (d: CobieDocument) => [d.modelId, nv(d.name), j(d.raw)]
const docFromRow = (r: any): CobieDocument => ({
  id: r.id, modelId: r.modelId, name: r.name ?? undefined,
  raw: parseJson(r.raw, undefined as any)
})

const CONTACT_COLS = ['modelId','email','company','raw']
const contactRow = (c: CobieContact) => [c.modelId, nv(c.email), nv(c.company), j(c.raw)]
const contactFromRow = (r: any): CobieContact => ({
  id: r.id, modelId: r.modelId, email: r.email ?? undefined,
  company: r.company ?? undefined, raw: parseJson(r.raw, undefined as any)
})

const ATTR_COLS = ['modelId','sheetName','rowName','name','value','unit','category','description','raw']
const attrRow = (a: CobieAttribute) => [
  a.modelId, nv(a.sheetName), nv(a.rowName), nv(a.name), nv(a.value), nv(a.unit),
  nv(a.category), nv(a.description), j(a.raw)
]
const attrFromRow = (r: any): CobieAttribute => ({
  id: r.id, modelId: r.modelId,
  sheetName: r.sheetName ?? undefined, rowName: r.rowName ?? undefined,
  name: r.name ?? undefined, value: r.value ?? undefined, unit: r.unit ?? undefined,
  category: r.category ?? undefined, description: r.description ?? undefined,
  raw: parseJson(r.raw, undefined as any)
})

const SHEETROW_COLS = ['modelId','sheetName','rowIndex','raw']
const sheetRowRow = (s: CobieSheetRow) => [
  s.modelId, s.sheetName, s.rowIndex, j(s.raw) ?? '{}'
]
const sheetRowFromRow = (r: any): CobieSheetRow => ({
  id: r.id, modelId: r.modelId, sheetName: r.sheetName,
  rowIndex: r.rowIndex, raw: parseJson(r.raw, {})
})

const META_COLS = [
  'modelId','modelName','extractedAt','source','componentCount','typeCount','spaceCount',
  'floorCount','systemCount','zoneCount','totalDbIds','facilityCount','documentCount',
  'contactCount','attributeCount','extraSheetCount'
]
const metaRow = (m: CobieMeta) => [
  m.modelId, nv(m.modelName), m.extractedAt, m.source,
  m.componentCount, m.typeCount, m.spaceCount, m.floorCount,
  m.systemCount, m.zoneCount, m.totalDbIds,
  nv(m.facilityCount), nv(m.documentCount), nv(m.contactCount),
  nv(m.attributeCount), nv(m.extraSheetCount)
]
const metaFromRow = (r: any): CobieMeta => ({
  modelId: r.modelId,
  modelName: r.modelName ?? undefined,
  extractedAt: r.extractedAt,
  source: r.source,
  componentCount: r.componentCount,
  typeCount: r.typeCount,
  spaceCount: r.spaceCount,
  floorCount: r.floorCount,
  systemCount: r.systemCount,
  zoneCount: r.zoneCount,
  totalDbIds: r.totalDbIds,
  facilityCount: r.facilityCount ?? undefined,
  documentCount: r.documentCount ?? undefined,
  contactCount: r.contactCount ?? undefined,
  attributeCount: r.attributeCount ?? undefined,
  extraSheetCount: r.extraSheetCount ?? undefined
})

async function deleteByModel(db: Database, modelId: string) {
  await db.execute('DELETE FROM components WHERE modelId = ?', [modelId])
  await db.execute('DELETE FROM types WHERE modelId = ?', [modelId])
  await db.execute('DELETE FROM spaces WHERE modelId = ?', [modelId])
  await db.execute('DELETE FROM floors WHERE modelId = ?', [modelId])
  await db.execute('DELETE FROM systems WHERE modelId = ?', [modelId])
  await db.execute('DELETE FROM zones WHERE modelId = ?', [modelId])
  await db.execute('DELETE FROM facilities WHERE modelId = ?', [modelId])
  await db.execute('DELETE FROM documents WHERE modelId = ?', [modelId])
  await db.execute('DELETE FROM contacts WHERE modelId = ?', [modelId])
  await db.execute('DELETE FROM attributes WHERE modelId = ?', [modelId])
  await db.execute('DELETE FROM sheetRows WHERE modelId = ?', [modelId])
  await db.execute('DELETE FROM meta WHERE modelId = ?', [modelId])
}

async function withTx<T>(db: Database, fn: () => Promise<T>): Promise<T> {
  await db.execute('BEGIN')
  try {
    const r = await fn()
    await db.execute('COMMIT')
    return r
  } catch (e) {
    try { await db.execute('ROLLBACK') } catch {}
    throw e
  }
}

export const createSqliteRepo = (): CobieRepo => ({
  async getMeta(modelId) {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM meta WHERE modelId = ?', [modelId])
    return rows[0] ? metaFromRow(rows[0]) : undefined
  },
  async getComponent(modelId, externalId) {
    if (!externalId) return undefined
    const db = await getDb()
    const rows = await db.select<any[]>(
      'SELECT * FROM components WHERE modelId = ? AND externalId = ?',
      [modelId, externalId]
    )
    return rows[0] ? componentFromRow(rows[0]) : undefined
  },
  async getType(modelId, name) {
    if (!name) return undefined
    const db = await getDb()
    const rows = await db.select<any[]>(
      'SELECT * FROM types WHERE modelId = ? AND name = ?',
      [modelId, name]
    )
    return rows[0] ? typeFromRow(rows[0]) : undefined
  },
  async getSpace(modelId, name) {
    if (!name) return undefined
    const db = await getDb()
    const rows = await db.select<any[]>(
      'SELECT * FROM spaces WHERE modelId = ? AND name = ?',
      [modelId, name]
    )
    return rows[0] ? spaceFromRow(rows[0]) : undefined
  },
  async getFacility(modelId) {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM facilities WHERE modelId = ?', [modelId])
    return rows[0] ? facilityFromRow(rows[0]) : undefined
  },
  async listComponents(modelId) {
    const db = await getDb()
    const rows = modelId
      ? await db.select<any[]>('SELECT * FROM components WHERE modelId = ?', [modelId])
      : await db.select<any[]>('SELECT * FROM components')
    return rows.map(componentFromRow)
  },
  async listTypes(modelId) {
    const db = await getDb()
    const rows = modelId
      ? await db.select<any[]>('SELECT * FROM types WHERE modelId = ?', [modelId])
      : await db.select<any[]>('SELECT * FROM types')
    return rows.map(typeFromRow)
  },
  async listSpaces(modelId) {
    const db = await getDb()
    const rows = modelId
      ? await db.select<any[]>('SELECT * FROM spaces WHERE modelId = ?', [modelId])
      : await db.select<any[]>('SELECT * FROM spaces')
    return rows.map(spaceFromRow)
  },
  async listFloors(modelId) {
    const db = await getDb()
    const rows = modelId
      ? await db.select<any[]>('SELECT * FROM floors WHERE modelId = ?', [modelId])
      : await db.select<any[]>('SELECT * FROM floors')
    return rows.map(floorFromRow)
  },
  async listSystems(modelId) {
    const db = await getDb()
    const rows = modelId
      ? await db.select<any[]>('SELECT * FROM systems WHERE modelId = ?', [modelId])
      : await db.select<any[]>('SELECT * FROM systems')
    return rows.map(systemFromRow)
  },
  async listZones(modelId) {
    const db = await getDb()
    const rows = modelId
      ? await db.select<any[]>('SELECT * FROM zones WHERE modelId = ?', [modelId])
      : await db.select<any[]>('SELECT * FROM zones')
    return rows.map(zoneFromRow)
  },
  async listDocuments(modelId) {
    const db = await getDb()
    const rows = modelId
      ? await db.select<any[]>('SELECT * FROM documents WHERE modelId = ?', [modelId])
      : await db.select<any[]>('SELECT * FROM documents')
    return rows.map(docFromRow)
  },
  async listContacts(modelId) {
    const db = await getDb()
    const rows = modelId
      ? await db.select<any[]>('SELECT * FROM contacts WHERE modelId = ?', [modelId])
      : await db.select<any[]>('SELECT * FROM contacts')
    return rows.map(contactFromRow)
  },
  async listAttributes(modelId, target) {
    const db = await getDb()
    let rows: any[]
    if (modelId && target) {
      rows = await db.select<any[]>(
        'SELECT * FROM attributes WHERE modelId = ? AND sheetName = ? AND rowName = ?',
        [modelId, target.sheetName, target.rowName]
      )
    } else if (modelId) {
      rows = await db.select<any[]>('SELECT * FROM attributes WHERE modelId = ?', [modelId])
    } else {
      rows = await db.select<any[]>('SELECT * FROM attributes')
    }
    return rows.map(attrFromRow)
  },
  async listSheetRows(modelId, sheetName) {
    const db = await getDb()
    let rows: any[]
    if (modelId && sheetName) {
      rows = await db.select<any[]>(
        'SELECT * FROM sheetRows WHERE modelId = ? AND sheetName = ?',
        [modelId, sheetName]
      )
    } else if (modelId) {
      rows = await db.select<any[]>('SELECT * FROM sheetRows WHERE modelId = ?', [modelId])
    } else {
      rows = await db.select<any[]>('SELECT * FROM sheetRows')
    }
    return rows.map(sheetRowFromRow)
  },
  async listAllMeta() {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM meta')
    return rows.map(metaFromRow)
  },
  async replaceForModel(modelId, payload: ReplacePayload) {
    const db = await getDb()
    const data = plain(payload)
    await withTx(db, async () => {
      await deleteByModel(db, modelId)
      await bulkInsert(db, 'components', COMPONENT_COLS, data.components.map(componentRow))
      await bulkInsert(db, 'types', TYPE_COLS, data.types.map(typeRow))
      await bulkInsert(db, 'spaces', SPACE_COLS, data.spaces.map(spaceRow))
      await bulkInsert(db, 'floors', FLOOR_COLS, data.floors.map(floorRow))
      await bulkInsert(db, 'systems', SYSTEM_COLS, data.systems.map(systemRow))
      await bulkInsert(db, 'zones', ZONE_COLS, data.zones.map(zoneRow))
      if (data.facility) {
        await bulkInsert(db, 'facilities', FACILITY_COLS, [facilityRow(data.facility)])
      }
      if (data.documents?.length) {
        await bulkInsert(db, 'documents', DOC_COLS, data.documents.map(docRow))
      }
      if (data.contacts?.length) {
        await bulkInsert(db, 'contacts', CONTACT_COLS, data.contacts.map(contactRow))
      }
      if (data.attributes?.length) {
        await bulkInsert(db, 'attributes', ATTR_COLS, data.attributes.map(attrRow))
      }
      if (data.sheetRows?.length) {
        await bulkInsert(db, 'sheetRows', SHEETROW_COLS, data.sheetRows.map(sheetRowRow))
      }
      await bulkInsert(db, 'meta', META_COLS, [metaRow(data.meta)])
    })
  },
  async replaceSystemsAndZones(modelId, systems, zones) {
    const db = await getDb()
    const sysData = plain(systems)
    const zoneData = plain(zones)
    await withTx(db, async () => {
      await db.execute('DELETE FROM systems WHERE modelId = ?', [modelId])
      await db.execute('DELETE FROM zones WHERE modelId = ?', [modelId])
      await bulkInsert(db, 'systems', SYSTEM_COLS, sysData.map(systemRow))
      await bulkInsert(db, 'zones', ZONE_COLS, zoneData.map(zoneRow))
      await db.execute(
        `UPDATE meta SET systemCount = ?, zoneCount = ?, extractedAt = ? WHERE modelId = ?`,
        [sysData.length, zoneData.length, new Date().toISOString(), modelId]
      )
    })
  },
  async mergeFromModelExtraction(modelId, payload: MergePayload) {
    const db = await getDb()
    const data = plain(payload)
    await withTx(db, async () => {
      await db.execute('DELETE FROM components WHERE modelId = ?', [modelId])
      await db.execute('DELETE FROM types WHERE modelId = ?', [modelId])
      await db.execute('DELETE FROM spaces WHERE modelId = ?', [modelId])
      await db.execute('DELETE FROM floors WHERE modelId = ?', [modelId])
      await bulkInsert(db, 'components', COMPONENT_COLS, data.components.map(componentRow))
      await bulkInsert(db, 'types', TYPE_COLS, data.types.map(typeRow))
      await bulkInsert(db, 'spaces', SPACE_COLS, data.spaces.map(spaceRow))
      await bulkInsert(db, 'floors', FLOOR_COLS, data.floors.map(floorRow))

      const existingSys = await db.select<any[]>(
        'SELECT COUNT(*) AS c FROM systems WHERE modelId = ?', [modelId]
      )
      if ((existingSys[0]?.c ?? 0) === 0 && data.systems?.length) {
        await bulkInsert(db, 'systems', SYSTEM_COLS, data.systems.map(systemRow))
      }
      const existingZ = await db.select<any[]>(
        'SELECT COUNT(*) AS c FROM zones WHERE modelId = ?', [modelId]
      )
      if ((existingZ[0]?.c ?? 0) === 0 && data.zones?.length) {
        await bulkInsert(db, 'zones', ZONE_COLS, data.zones.map(zoneRow))
      }

      const [sysCntRow] = await db.select<any[]>('SELECT COUNT(*) AS c FROM systems WHERE modelId = ?', [modelId])
      const [zoneCntRow] = await db.select<any[]>('SELECT COUNT(*) AS c FROM zones WHERE modelId = ?', [modelId])
      const [facRow] = await db.select<any[]>('SELECT 1 AS x FROM facilities WHERE modelId = ?', [modelId])
      const [docCntRow] = await db.select<any[]>('SELECT COUNT(*) AS c FROM documents WHERE modelId = ?', [modelId])
      const [contactCntRow] = await db.select<any[]>('SELECT COUNT(*) AS c FROM contacts WHERE modelId = ?', [modelId])
      const [attrCntRow] = await db.select<any[]>('SELECT COUNT(*) AS c FROM attributes WHERE modelId = ?', [modelId])
      const sheetNameRows = await db.select<any[]>(
        'SELECT DISTINCT sheetName FROM sheetRows WHERE modelId = ?', [modelId]
      )

      const merged: CobieMeta = {
        ...data.meta,
        systemCount: sysCntRow?.c ?? 0,
        zoneCount: zoneCntRow?.c ?? 0,
        facilityCount: facRow ? 1 : 0,
        documentCount: docCntRow?.c ?? 0,
        contactCount: contactCntRow?.c ?? 0,
        attributeCount: attrCntRow?.c ?? 0,
        extraSheetCount: sheetNameRows.length
      }
      await db.execute('DELETE FROM meta WHERE modelId = ?', [modelId])
      await bulkInsert(db, 'meta', META_COLS, [metaRow(merged)])
    })
  },
  async clearModel(modelId) {
    const db = await getDb()
    await withTx(db, async () => {
      await deleteByModel(db, modelId)
    })
  },
  async clearAll() {
    const db = await getDb()
    await withTx(db, async () => {
      await db.execute('DELETE FROM components')
      await db.execute('DELETE FROM types')
      await db.execute('DELETE FROM spaces')
      await db.execute('DELETE FROM floors')
      await db.execute('DELETE FROM systems')
      await db.execute('DELETE FROM zones')
      await db.execute('DELETE FROM facilities')
      await db.execute('DELETE FROM documents')
      await db.execute('DELETE FROM contacts')
      await db.execute('DELETE FROM attributes')
      await db.execute('DELETE FROM sheetRows')
      await db.execute('DELETE FROM meta')
      // reset AUTOINCREMENT counters
      await db.execute(
        "DELETE FROM sqlite_sequence WHERE name IN ('documents','contacts','attributes','sheetRows')"
      )
    })
  }
})
