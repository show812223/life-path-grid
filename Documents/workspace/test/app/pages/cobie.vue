<script setup lang="ts">
import type {
  CobieComponent,
  CobieType,
  CobieSpace,
  CobieFloor,
  CobieSystem,
  CobieZone,
  CobieAttribute,
  CobieSheetRow,
  CobieMeta
} from '~/composables/cobieTypes'

definePageMeta({ layout: 'default' })

await loadManifest()
const manifest = useManifest()
const store = useCobieStore()

const metas = ref<CobieMeta[]>([])
const components = ref<CobieComponent[]>([])
const types = ref<CobieType[]>([])
const spaces = ref<CobieSpace[]>([])
const floors = ref<CobieFloor[]>([])
const systems = ref<CobieSystem[]>([])
const zones = ref<CobieZone[]>([])
const attributes = ref<CobieAttribute[]>([])
const sheetRows = ref<CobieSheetRow[]>([])
const loading = ref(true)

const reload = async () => {
  loading.value = true
  metas.value = await store.listAllMeta()
  components.value = await store.listComponents()
  types.value = await store.listTypes()
  spaces.value = await store.listSpaces()
  floors.value = await store.listFloors()
  systems.value = await store.listSystems()
  zones.value = await store.listZones()
  attributes.value = await store.listAttributes()
  sheetRows.value = await store.listSheetRows()
  loading.value = false
}

const clearConfirmOpen = ref(false)
const clearing = ref(false)
const clearAll = async () => {
  clearing.value = true
  try {
    await store.clearAll()
    await reload()
  } finally {
    clearing.value = false
    clearConfirmOpen.value = false
  }
}

/**
 * Group attributes by (modelId, sheetName, rowName) for O(1) lookup when
 * rendering the detail panel of a Component/Type/Space/etc.
 */
const attributesByTarget = computed(() => {
  const map = new Map<string, CobieAttribute[]>()
  const norm = (s?: string) => (s || '').trim().toLowerCase()
  for (const a of attributes.value) {
    const k = `${a.modelId}::${norm(a.sheetName)}::${norm(a.rowName)}`
    const arr = map.get(k) || []
    arr.push(a)
    map.set(k, arr)
  }
  return map
})
const attributesFor = (
  modelId: string,
  sheetName: string,
  rowName?: string
): CobieAttribute[] => {
  if (!rowName) return []
  const norm = (s?: string) => (s || '').trim().toLowerCase()
  return attributesByTarget.value.get(
    `${modelId}::${norm(sheetName)}::${norm(rowName)}`
  ) || []
}

onMounted(reload)

// xlsx supplemental importer
const importerOpen = ref(false)
const importModelId = ref<string | null>(null)
const importFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const importReport = ref<Awaited<ReturnType<typeof parseCobieXlsx>> | null>(null)
const importing = ref(false)
const importError = ref<string | null>(null)

const importableModelItems = computed(() => {
  const importedIds = new Set(metas.value.map(m => m.modelId))
  return (manifest.value?.models || []).map(m => ({
    title: importedIds.has(m.id) ? `${m.name} · 已匯入` : m.name,
    value: m.id
  }))
})

const openImporter = () => {
  importerOpen.value = true
  importModelId.value = metas.value[0]?.modelId || manifest.value?.models[0]?.id || null
}
const closeImporter = () => {
  importerOpen.value = false
  importFile.value = null
  importReport.value = null
  importError.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const processFile = async (file: File | ArrayBuffer) => {
  const modelId = importModelId.value
  if (!modelId) return
  importError.value = null
  try {
    importReport.value = await parseCobieXlsx(file, modelId)
  } catch (e: any) {
    console.error('[import] parse failed:', e)
    importError.value = e?.message ?? String(e)
    importReport.value = null
  }
}

// re-bridge when user changes target model after file is loaded
watch(importModelId, () => {
  if (importFile.value && importerOpen.value) {
    processFile(importFile.value)
  }
})

const onFilePicked = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importFile.value = file
  await processFile(file)
}

const loadSampleXlsx = async () => {
  const res = await fetch('/data/xlsx/SampleCOBieSpreadsheet.xlsx')
  const buf = await res.arrayBuffer()
  importFile.value = new File([buf], 'SampleCOBieSpreadsheet.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  await processFile(buf)
}

const confirmImport = async () => {
  if (!importReport.value || !importModelId.value) return
  importing.value = true
  try {
    const report = importReport.value
    const meta = buildMetaForXlsxImport(report, modelNameById.value[report.modelId])
    await store.replaceForModel(report.modelId, {
      components: report.components,
      types: report.types,
      spaces: report.spaces,
      floors: report.floors,
      systems: report.systems,
      zones: report.zones,
      facility: report.facility,
      documents: report.documents,
      contacts: report.contacts,
      attributes: report.attributes,
      sheetRows: report.sheetRows,
      meta
    })
    await reload()
    closeImporter()
  } finally {
    importing.value = false
  }
}

/**
 * Active tab. Standard COBie sheets use their short key ('components'...'zones');
 * each extra worksheet from the imported XLSX becomes its own tab keyed as
 * `sheet:${sheetName}`.
 */
const tab = ref<string>('components')
const SHEET_PREFIX = 'sheet:'
const isSheetTab = (t: string) => t.startsWith(SHEET_PREFIX)
const activeSheetName = computed(() =>
  isSheetTab(tab.value) ? tab.value.slice(SHEET_PREFIX.length) : null
)
const search = ref('')
const modelFilter = ref<string | 'all'>('all')

/**
 * Per-column filter state. Each tab has its own map of column-key → query text.
 * Substring match, case-insensitive. Applied AFTER model & global search filters.
 */
/**
 * Per-column filter values. Each tab maps column-key → filter value.
 * - string  : substring match (text fields like name, description)
 * - string[]: exact-match set, OR-joined within the column (autocomplete fields)
 */
type ColFilterValue = string | string[]
type ColFilterMap = Record<string, ColFilterValue>
const colFilters = reactive<{
  components: ColFilterMap
  types: ColFilterMap
  spaces: ColFilterMap
  floors: ColFilterMap
  systems: ColFilterMap
  zones: ColFilterMap
}>({
  components: {},
  types: {},
  spaces: {},
  floors: {},
  systems: {},
  zones: {}
})

const isEmptyFilter = (v: ColFilterValue | undefined): boolean => {
  if (v === undefined || v === null) return true
  if (Array.isArray(v)) return v.length === 0
  return !v.trim()
}

const matchCol = (value: unknown, filter: ColFilterValue): boolean => {
  if (isEmptyFilter(filter)) return true
  const v = value == null ? '' : String(value)
  if (Array.isArray(filter)) return filter.includes(v)
  return v.toLowerCase().includes(filter.trim().toLowerCase())
}

const applyColFilters = <T extends Record<string, any>>(rows: T[], filters: ColFilterMap): T[] => {
  const entries = Object.entries(filters).filter(([, v]) => !isEmptyFilter(v))
  if (entries.length === 0) return rows
  return rows.filter(r => entries.every(([k, v]) => matchCol(r[k], v)))
}

const hasColFilters = (tabKey: keyof typeof colFilters) =>
  Object.values(colFilters[tabKey]).some(v => !isEmptyFilter(v))

const clearColFilters = (tabKey: keyof typeof colFilters) => {
  for (const k of Object.keys(colFilters[tabKey])) {
    const v = colFilters[tabKey][k]
    colFilters[tabKey][k] = Array.isArray(v) ? [] : ''
  }
}

const modelNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const m of manifest.value?.models || []) map[m.id] = m.name
  return map
})

const byModel = <T extends { modelId: string }>(rows: T[]) =>
  modelFilter.value === 'all' ? rows : rows.filter(r => r.modelId === modelFilter.value)

const matchSearch = (haystacks: (string | undefined)[]) => {
  if (!search.value) return true
  const q = search.value.toLowerCase()
  return haystacks.some(h => h?.toLowerCase().includes(q))
}

const filteredComponents = computed(() =>
  byModel(components.value).filter(c =>
    matchSearch([c.name, c.typeName, c.space, c.tagNumber, c.assetIdentifier])
  )
)

const filteredTypes = computed(() =>
  byModel(types.value).filter(t =>
    matchSearch([t.name, t.manufacturer, t.modelNumber, t.category])
  )
)

const filteredSpaces = computed(() =>
  byModel(spaces.value).filter(s =>
    matchSearch([s.name, s.floorName, s.description, s.category, s.zoneName])
  )
)

const filteredFloors = computed(() =>
  byModel(floors.value).filter(f => matchSearch([f.name, f.description, f.category]))
)

const filteredSystems = computed(() =>
  byModel(systems.value).filter(s => matchSearch([s.name, s.description, s.category]))
)

const filteredZones = computed(() =>
  byModel(zones.value).filter(z => matchSearch([z.name, z.description, z.category]))
)

const filteredSheetRows = computed(() => {
  const list = modelFilter.value === 'all'
    ? sheetRows.value
    : sheetRows.value.filter(r => r.modelId === modelFilter.value)
  const q = search.value?.trim().toLowerCase()
  if (!q) return list
  return list.filter(r => {
    if (r.sheetName.toLowerCase().includes(q)) return true
    for (const v of Object.values(r.raw)) {
      if (String(v).toLowerCase().includes(q)) return true
    }
    return false
  })
})

// Distinct sheet names across the *unfiltered* sheetRows — these become
// the side-nav entries so they don't disappear when search/model filters
// happen to exclude all of a sheet's rows.
const allSheetNames = computed(() => {
  const set = new Set<string>()
  for (const r of sheetRows.value) set.add(r.sheetName)
  return [...set].sort()
})

// Counts per sheet honour the current model + search filters.
const sheetCounts = computed(() => {
  const m: Record<string, number> = {}
  for (const r of filteredSheetRows.value) m[r.sheetName] = (m[r.sheetName] || 0) + 1
  return m
})

// Rows visible in the currently-selected sheet tab.
const activeSheetRows = computed(() => {
  const name = activeSheetName.value
  if (!name) return []
  return filteredSheetRows.value.filter(r => r.sheetName === name)
})

// Headers derived from the union of `raw` keys across the active sheet's rows.
const activeSheetHeaders = computed(() => {
  const cols = new Set<string>()
  for (const r of activeSheetRows.value) {
    for (const k of Object.keys(r.raw)) cols.add(k)
  }
  return [...cols].map(c => ({ title: c, key: `raw.${c}`, sortable: true }))
})

// Fall back to first standard tab if the active sheet disappears (e.g. data
// was cleared or re-imported without that sheet).
watch(allSheetNames, names => {
  if (activeSheetName.value && !names.includes(activeSheetName.value)) {
    tab.value = 'components'
  }
})

// Component lookup map: members by Type / Space / Floor / Zone per model
const componentsByModel = computed(() => {
  const map: Record<string, CobieComponent[]> = {}
  for (const c of components.value) {
    if (!map[c.modelId]) map[c.modelId] = []
    map[c.modelId].push(c)
  }
  return map
})

const spacesByModel = computed(() => {
  const map: Record<string, CobieSpace[]> = {}
  for (const s of spaces.value) {
    if (!map[s.modelId]) map[s.modelId] = []
    map[s.modelId].push(s)
  }
  return map
})

const componentsForType = (modelId: string, typeName: string) =>
  (componentsByModel.value[modelId] || []).filter(c => c.typeName === typeName)

const componentsForSpace = (modelId: string, spaceName: string) =>
  (componentsByModel.value[modelId] || []).filter(c => c.space === spaceName)

const spacesForFloor = (modelId: string, floorName: string) =>
  (spacesByModel.value[modelId] || []).filter(s => s.floorName === floorName)

const componentsOnFloor = (modelId: string, floorName: string) => {
  const spaceNames = new Set(spacesForFloor(modelId, floorName).map(s => s.name))
  return (componentsByModel.value[modelId] || []).filter(c => c.space && spaceNames.has(c.space))
}

const componentsInZone = (modelId: string, zoneName: string) => {
  const zone = zones.value.find(z => z.modelId === modelId && z.name === zoneName)
  if (!zone) return []
  const spaceSet = new Set(zone.spaceNames)
  return (componentsByModel.value[modelId] || []).filter(c => c.space && spaceSet.has(c.space))
}

const FOCUS_KEY_PREFIX = 'viewer:focus:'

/**
 * Navigate to /viewer/{id} with externalIds for focus.
 * Uses sessionStorage instead of URL params so large lists (hundreds of IDs)
 * don't exceed the browser URL length limit.
 */
const navigateToViewer = (modelId: string, externalIds: string[]) => {
  if (!modelId || externalIds.length === 0) return
  try {
    sessionStorage.setItem(FOCUS_KEY_PREFIX + modelId, JSON.stringify(externalIds))
  } catch (e) {
    console.warn('[navigateToViewer] sessionStorage failed', e)
  }
  navigateTo(`/viewer/${modelId}`)
}

// inline preview state
const previewOpen = ref(true)
const previewModelId = ref<string | null>(null)
const previewSvfUrl = ref<string | null>(null)
const previewFocusIds = ref<string[]>([])

const ensurePreviewSvf = (modelId: string) => {
  if (!manifest.value) return null
  const m = manifest.value.models.find(x => x.id === modelId)
  return m?.views[0]?.svf || null
}

const onRowClick = (modelId: string, externalIds: string[]) => {
  if (externalIds.length === 0) return
  // switch model if different
  if (previewModelId.value !== modelId) {
    const svf = ensurePreviewSvf(modelId)
    if (!svf) return
    previewModelId.value = modelId
    previewSvfUrl.value = svf
  }
  previewFocusIds.value = [...externalIds]
  previewOpen.value = true
  // default: clear expansion (system handler overrides AFTER calling)
  lastExpansion.value = null
}

const openInFullViewer = () => {
  if (!previewModelId.value) return
  navigateToViewer(previewModelId.value, previewFocusIds.value)
}

const previewModelName = computed(() =>
  previewModelId.value
    ? manifest.value?.models.find(m => m.id === previewModelId.value)?.name
    : null
)

/**
 * Expand a seed of externalIds to include every component sharing the same
 * Type.Category as any seed. Used when selecting a System — picks up the
 * whole category instead of only the declared members.
 */
const expandByTypeCategory = (modelId: string, seedExternalIds: string[]) => {
  if (seedExternalIds.length === 0) return { ids: [] as string[], categories: [] as string[], declared: 0 }
  const declared = seedExternalIds.length
  const seedSet = new Set(seedExternalIds)

  const modelComps = components.value.filter(c => c.modelId === modelId)
  const modelTypes = types.value.filter(t => t.modelId === modelId)

  const seedTypeNames = new Set(
    modelComps.filter(c => seedSet.has(c.externalId)).map(c => c.typeName).filter(Boolean) as string[]
  )

  const categories = new Set<string>()
  for (const tn of seedTypeNames) {
    const t = modelTypes.find(t => t.name === tn)
    if (t?.category) categories.add(t.category)
  }

  // types whose category matches any seed category
  const matchingTypeNames = new Set<string>()
  for (const t of modelTypes) {
    if (t.category && categories.has(t.category)) matchingTypeNames.add(t.name)
  }

  const expanded = new Set<string>(seedExternalIds)
  for (const c of modelComps) {
    if (c.typeName && matchingTypeNames.has(c.typeName)) expanded.add(c.externalId)
  }

  return {
    ids: [...expanded],
    categories: [...categories],
    declared
  }
}

// Used by System tab row click — preserve the breakdown for UI hint
const lastExpansion = ref<{
  declared: number
  expanded: number
  categories: string[]
} | null>(null)

const onSystemRowClick = (modelId: string, declaredExternalIds: string[]) => {
  const exp = expandByTypeCategory(modelId, declaredExternalIds)
  onRowClick(modelId, exp.ids)
  // overwrite after, since onRowClick resets it
  lastExpansion.value = {
    declared: exp.declared,
    expanded: exp.ids.length,
    categories: exp.categories
  }
}

// Augmented row data with counts and modelName.
// *RowsBase = post model+search filter, pre-column-filter (used for autocomplete option lists).
// *Rows     = final rows shown in the table.
const componentRowsBase = computed(() =>
  filteredComponents.value.map(c => ({
    ...c,
    _key: `${c.modelId}::${c.externalId}`,
    modelName: modelNameById.value[c.modelId]
  }))
)
const componentRows = computed(() =>
  applyColFilters(componentRowsBase.value, colFilters.components)
)

const typeRowsBase = computed(() =>
  filteredTypes.value.map(t => ({
    ...t,
    _key: `${t.modelId}::${t.name}`,
    modelName: modelNameById.value[t.modelId],
    instanceCount: componentsForType(t.modelId, t.name).length,
    instanceIds: componentsForType(t.modelId, t.name).map(c => c.externalId)
  }))
)
const typeRows = computed(() => applyColFilters(typeRowsBase.value, colFilters.types))

const spaceRowsBase = computed(() =>
  filteredSpaces.value.map(s => ({
    ...s,
    _key: `${s.modelId}::${s.name}`,
    modelName: modelNameById.value[s.modelId],
    componentCount: componentsForSpace(s.modelId, s.name).length,
    componentIds: componentsForSpace(s.modelId, s.name).map(c => c.externalId)
  }))
)
const spaceRows = computed(() => applyColFilters(spaceRowsBase.value, colFilters.spaces))

const floorRowsBase = computed(() =>
  filteredFloors.value.map(f => {
    const comps = componentsOnFloor(f.modelId, f.name)
    return {
      ...f,
      _key: `${f.modelId}::${f.name}`,
      modelName: modelNameById.value[f.modelId],
      spaceCount: spacesForFloor(f.modelId, f.name).length,
      componentCount: comps.length,
      componentIds: comps.map(c => c.externalId)
    }
  })
)
const floorRows = computed(() => applyColFilters(floorRowsBase.value, colFilters.floors))

const systemRowsBase = computed(() =>
  filteredSystems.value.map(s => ({
    ...s,
    _key: `${s.modelId}::${s.name}`,
    modelName: modelNameById.value[s.modelId],
    componentCount: s.componentExternalIds.length,
    declaredCount: s.declaredComponentNames?.length ?? s.componentExternalIds.length
  }))
)
const systemRows = computed(() => applyColFilters(systemRowsBase.value, colFilters.systems))

// component name → externalId per model (for system member status lookup)
const componentByModelName = computed(() => {
  const map: Record<string, Record<string, string>> = {}
  const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_.\-]+$/g, '')
  for (const c of components.value) {
    if (!c.name) continue
    if (!map[c.modelId]) map[c.modelId] = {}
    map[c.modelId][norm(c.name)] = c.externalId
  }
  return map
})

const memberStatus = (modelId: string, declaredName: string) => {
  const norm = declaredName.trim().toLowerCase().replace(/[\s_.\-]+$/g, '')
  return componentByModelName.value[modelId]?.[norm]
}

const zoneRowsBase = computed(() =>
  filteredZones.value.map(z => {
    const comps = componentsInZone(z.modelId, z.name)
    return {
      ...z,
      _key: `${z.modelId}::${z.name}`,
      modelName: modelNameById.value[z.modelId],
      spaceCount: z.spaceNames.length,
      componentCount: comps.length,
      componentIds: comps.map(c => c.externalId)
    }
  })
)
const zoneRows = computed(() => applyColFilters(zoneRowsBase.value, colFilters.zones))

/**
 * Flatten a row's full field set for the expanded-row detail panel.
 * Prioritizes raw XLSX columns (preserves original casing + non-standard extensions),
 * then appends typed/derived fields not already in raw.
 */
const SKIP_KEYS = new Set([
  'raw', 'modelId', '_key', 'dbId', 'externalId',
  'componentExternalIds', 'componentIds', 'instanceIds',
  'declaredComponentNames', 'spaceNames'
])
const detailFields = (item: any): Array<{ key: string; value: any }> => {
  const out: Array<{ key: string; value: any }> = []
  const seen = new Set<string>()
  if (item.raw && typeof item.raw === 'object') {
    for (const k of Object.keys(item.raw)) {
      const v = item.raw[k]
      if (v === '' || v == null) continue
      seen.add(k.toLowerCase())
      out.push({ key: k, value: v })
    }
  }
  for (const k of Object.keys(item)) {
    if (SKIP_KEYS.has(k)) continue
    if (seen.has(k.toLowerCase())) continue
    const v = (item as any)[k]
    if (v === undefined || v === null || v === '') continue
    if (typeof v === 'object') continue
    out.push({ key: k, value: v })
  }
  return out
}
const formatDetailValue = (v: any): string => {
  if (v === true) return '是'
  if (v === false) return '否'
  return String(v)
}

const totalCount = computed(() =>
  metas.value.reduce((s, m) => s + m.componentCount, 0)
)

type NavItem = { value: string; label: string; icon: string; count: number; group?: 'sheet' }
const navItems = computed<NavItem[]>(() => {
  const base: NavItem[] = [
    { value: 'components', label: '設備', icon: 'mdi-cube-outline', count: filteredComponents.value.length },
    { value: 'types', label: '類型', icon: 'mdi-shape-outline', count: filteredTypes.value.length },
    { value: 'spaces', label: '空間', icon: 'mdi-floor-plan', count: filteredSpaces.value.length },
    { value: 'floors', label: '樓層', icon: 'mdi-layers-outline', count: filteredFloors.value.length },
    { value: 'systems', label: '系統', icon: 'mdi-sitemap-outline', count: filteredSystems.value.length },
    { value: 'zones', label: '區域', icon: 'mdi-map-marker-radius-outline', count: filteredZones.value.length }
  ]
  for (const name of allSheetNames.value) {
    base.push({
      value: `${SHEET_PREFIX}${name}`,
      label: name,
      icon: 'mdi-table-large',
      count: sheetCounts.value[name] || 0,
      group: 'sheet'
    })
  }
  return base
})

const currentNav = computed(() =>
  navItems.value.find(i => i.value === tab.value) ?? navItems.value[0]!
)

/**
 * Visible row count for the active tab AFTER all filters (model + search + column).
 * Side-nav still shows the pre-column-filter count for "how much exists here";
 * the toolbar exposes both so users can see the filter's effect.
 */
const currentVisibleCount = computed(() => {
  if (isSheetTab(tab.value)) return activeSheetRows.value.length
  switch (tab.value) {
    case 'components': return componentRows.value.length
    case 'types': return typeRows.value.length
    case 'spaces': return spaceRows.value.length
    case 'floors': return floorRows.value.length
    case 'systems': return systemRows.value.length
    case 'zones': return zoneRows.value.length
    default: return 0
  }
})

const currentIsFiltered = computed(() => {
  if (isSheetTab(tab.value)) return false
  return hasColFilters(tab.value as keyof typeof colFilters)
})

/**
 * Per-tab filter field definitions for the right-side filter panel.
 * - text: substring match, free input
 * - autocomplete: multi-select dropdown of distinct values from the dataset
 */
type FilterField = { key: string; label: string; type: 'text' | 'autocomplete' }
const filterFieldsByTab: Record<keyof typeof colFilters, FilterField[]> = {
  components: [
    { key: 'name', label: '名稱', type: 'text' },
    { key: 'typeName', label: '類型', type: 'autocomplete' },
    { key: 'space', label: '空間', type: 'autocomplete' },
    { key: 'assetIdentifier', label: '資產編號', type: 'text' },
    { key: 'modelName', label: '所屬模型', type: 'autocomplete' }
  ],
  types: [
    { key: 'name', label: '型號', type: 'text' },
    { key: 'manufacturer', label: '製造商', type: 'autocomplete' },
    { key: 'modelNumber', label: '型號編號', type: 'text' },
    { key: 'category', label: '類別', type: 'autocomplete' },
    { key: 'modelName', label: '所屬模型', type: 'autocomplete' }
  ],
  spaces: [
    { key: 'name', label: '名稱', type: 'text' },
    { key: 'floorName', label: '樓層', type: 'autocomplete' },
    { key: 'zoneName', label: '區域', type: 'autocomplete' },
    { key: 'description', label: '描述', type: 'text' },
    { key: 'modelName', label: '所屬模型', type: 'autocomplete' }
  ],
  floors: [
    { key: 'name', label: '名稱', type: 'autocomplete' },
    { key: 'description', label: '描述', type: 'text' },
    { key: 'modelName', label: '所屬模型', type: 'autocomplete' }
  ],
  systems: [
    { key: 'name', label: '名稱', type: 'autocomplete' },
    { key: 'category', label: '類別', type: 'autocomplete' },
    { key: 'description', label: '描述', type: 'text' },
    { key: 'modelName', label: '所屬模型', type: 'autocomplete' }
  ],
  zones: [
    { key: 'name', label: '名稱', type: 'autocomplete' },
    { key: 'category', label: '類別', type: 'autocomplete' },
    { key: 'description', label: '描述', type: 'text' },
    { key: 'modelName', label: '所屬模型', type: 'autocomplete' }
  ]
}

const currentFilterFields = computed<FilterField[]>(() => {
  if (isSheetTab(tab.value)) return []
  return filterFieldsByTab[tab.value as keyof typeof colFilters] || []
})

/**
 * Distinct, sorted, non-empty values for a given column. Used to populate
 * autocomplete option lists. Derived from *RowsBase so options reflect the
 * current model + global search scope but ignore the user's column-filter
 * choices (otherwise picking a value would hide all other options).
 */
const baseRowsByTab: Record<keyof typeof colFilters, ComputedRef<any[]>> = {
  components: componentRowsBase,
  types: typeRowsBase,
  spaces: spaceRowsBase,
  floors: floorRowsBase,
  systems: systemRowsBase,
  zones: zoneRowsBase
}
const filterOptions = (tabKey: keyof typeof colFilters, fieldKey: string): string[] => {
  const rows = baseRowsByTab[tabKey].value
  const set = new Set<string>()
  for (const r of rows) {
    const v = r[fieldKey]
    if (v == null) continue
    const s = String(v).trim()
    if (s) set.add(s)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hant'))
}

const filterPanelOpen = ref(true)

/**
 * Pixel height passed to v-data-table-virtual. Without an explicit height,
 * the virtualizer can't compute the visible window so rows would all render.
 * Recomputed on window resize so the table fills the available vertical space.
 */
const tableHeight = ref(560)
const recomputeTableHeight = () => {
  if (typeof window === 'undefined') return
  const h = window.innerHeight - 56 - 220
  tableHeight.value = Math.max(360, h)
}
onMounted(() => {
  recomputeTableHeight()
  window.addEventListener('resize', recomputeTableHeight)
})
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', recomputeTableHeight)
  }
})

const componentHeaders = [
  { title: '名稱', key: 'name', sortable: true },
  { title: '類型', key: 'typeName', sortable: true },
  { title: '空間', key: 'space', sortable: true },
  { title: '資產編號', key: 'assetIdentifier', sortable: true },
  { title: '所屬模型', key: 'modelName', sortable: true },
  { title: '', key: 'actions', sortable: false, width: 50 }
]
const typeHeaders = [
  { title: '型號', key: 'name', sortable: true },
  { title: '製造商', key: 'manufacturer', sortable: true },
  { title: '型號編號', key: 'modelNumber', sortable: true },
  { title: '類別', key: 'category', sortable: true },
  { title: '實例', key: 'instanceCount', sortable: true, align: 'end' },
  { title: '所屬模型', key: 'modelName', sortable: true },
  { title: '', key: 'actions', sortable: false, width: 50 }
]
const spaceHeaders = [
  { title: '名稱', key: 'name', sortable: true },
  { title: '樓層', key: 'floorName', sortable: true },
  { title: '區域', key: 'zoneName', sortable: true },
  { title: '描述', key: 'description', sortable: true },
  { title: '構件', key: 'componentCount', sortable: true, align: 'end' },
  { title: '所屬模型', key: 'modelName', sortable: true },
  { title: '', key: 'actions', sortable: false, width: 50 }
]
const floorHeaders = [
  { title: '名稱', key: 'name', sortable: true },
  { title: '描述', key: 'description', sortable: true },
  { title: '高程', key: 'elevation', sortable: true, align: 'end' },
  { title: '空間', key: 'spaceCount', sortable: true, align: 'end' },
  { title: '構件', key: 'componentCount', sortable: true, align: 'end' },
  { title: '所屬模型', key: 'modelName', sortable: true },
  { title: '', key: 'actions', sortable: false, width: 50 }
]
const systemHeaders = [
  { title: '', key: 'data-table-expand', width: 30 },
  { title: '名稱', key: 'name', sortable: true },
  { title: '類別', key: 'category', sortable: true },
  { title: '描述', key: 'description', sortable: true },
  { title: '對應 / 宣告', key: 'componentCount', sortable: true, align: 'end' },
  { title: '所屬模型', key: 'modelName', sortable: true },
  { title: '', key: 'actions', sortable: false, width: 50 }
]
const zoneHeaders = [
  { title: '名稱', key: 'name', sortable: true },
  { title: '類別', key: 'category', sortable: true },
  { title: '描述', key: 'description', sortable: true },
  { title: '空間', key: 'spaceCount', sortable: true, align: 'end' },
  { title: '構件', key: 'componentCount', sortable: true, align: 'end' },
  { title: '所屬模型', key: 'modelName', sortable: true },
  { title: '', key: 'actions', sortable: false, width: 50 }
]
</script>

<template>
  <div class="page-shell" :class="{ 'preview-open': previewOpen && previewSvfUrl }">

    <div class="page">

      <header class="page-head">
      <div>
        <h1 class="page-title">COBie 資料</h1>
        <div class="page-sub">
          <template v-if="metas.length === 0 && !loading">
            尚無資料 · 點右上「匯入 COBie XLSX」開始
          </template>
          <template v-else>
            來自 {{ metas.length }} 個模型 · 共 {{ totalCount }} 個構件 · 點任一列即可在模型中圈選對應構件
          </template>
        </div>
      </div>
      <div class="head-actions">
        <v-btn
          prepend-icon="mdi-file-table-outline"
          variant="outlined"
          size="small"
          @click="openImporter"
        >
          匯入 COBie 補充資料
        </v-btn>
        <v-btn
          prepend-icon="mdi-refresh"
          variant="outlined"
          size="small"
          @click="reload"
        >
          重新載入
        </v-btn>
        <v-btn
          prepend-icon="mdi-database-remove"
          variant="outlined"
          color="error"
          size="small"
          :disabled="metas.length === 0"
          @click="clearConfirmOpen = true"
        >
          清空資料庫
        </v-btn>
      </div>
    </header>

    <v-dialog v-model="clearConfirmOpen" max-width="460" persistent>
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon icon="mdi-alert" color="error" />
          清空 COBie 資料庫
        </v-card-title>
        <v-card-text>
          將永久刪除目前儲存的<strong>所有模型</strong>的 COBie 資料（共 {{ metas.length }} 個模型、{{ totalCount }} 個構件）。
          此動作無法復原。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="clearing" @click="clearConfirmOpen = false">取消</v-btn>
          <v-btn color="error" variant="flat" :loading="clearing" @click="clearAll">
            確認清空
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- xlsx full importer -->
    <v-dialog v-model="importerOpen" max-width="700" persistent>
      <v-card>
        <v-toolbar density="compact" flat>
          <v-icon icon="mdi-file-table-outline" class="mx-3" color="primary" />
          <v-toolbar-title>匯入 COBie XLSX</v-toolbar-title>
          <v-btn icon="mdi-close" variant="text" @click="closeImporter" />
        </v-toolbar>
        <v-divider />

        <div class="imp-body">
          <p class="imp-lede">
            匯入 COBie 試算表的<strong>全部七張表</strong>到指定模型，覆寫該模型現有 COBie 資料。Component 的 <span class="t-mono">ExtIdentifier</span> 即 Revit UniqueId，會直接對到 SVF 模型的 <span class="t-mono">externalId</span>。
          </p>

          <div class="imp-field">
            <label class="imp-label">附加到模型</label>
            <v-select
              v-model="importModelId"
              :items="importableModelItems"
              placeholder="選擇模型"
              variant="outlined"
              density="compact"
              hide-details
            />
            <div v-if="!manifest?.models?.length" class="imp-hint">
              manifest.json 中尚未列出任何模型
            </div>
          </div>

          <div class="imp-field">
            <label class="imp-label">選擇 XLSX 檔案</label>
            <div class="imp-file-row">
              <input
                ref="fileInputRef"
                type="file"
                accept=".xlsx"
                style="display:none"
                @change="onFilePicked"
              />
              <v-btn
                prepend-icon="mdi-upload"
                variant="tonal"
                @click="fileInputRef?.click()"
              >
                選擇檔案
              </v-btn>
              <v-btn
                prepend-icon="mdi-test-tube"
                variant="text"
                @click="loadSampleXlsx"
              >
                載入範例（buildingSMART）
              </v-btn>
            </div>
            <div v-if="importFile" class="imp-hint t-mono">
              {{ importFile.name }} · {{ Math.round(importFile.size / 1024) }} KB
            </div>
          </div>

          <div v-if="importReport" class="imp-report">
            <div class="imp-stat">
              <div class="imp-stat-label">構件</div>
              <div class="imp-stat-num t-mono">{{ importReport.counts.components }}</div>
            </div>
            <div class="imp-stat">
              <div class="imp-stat-label">類型</div>
              <div class="imp-stat-num t-mono">{{ importReport.counts.types }}</div>
            </div>
            <div class="imp-stat">
              <div class="imp-stat-label">空間</div>
              <div class="imp-stat-num t-mono">{{ importReport.counts.spaces }}</div>
            </div>
            <div class="imp-stat">
              <div class="imp-stat-label">樓層</div>
              <div class="imp-stat-num t-mono">{{ importReport.counts.floors }}</div>
            </div>
            <div class="imp-stat">
              <div class="imp-stat-label">系統</div>
              <div class="imp-stat-num t-mono">{{ importReport.counts.systems }}</div>
            </div>
            <div class="imp-stat">
              <div class="imp-stat-label">區域</div>
              <div class="imp-stat-num t-mono">{{ importReport.counts.zones }}</div>
            </div>
          </div>

          <div v-if="importReport" class="imp-extra">
            <div class="imp-extra-row">
              <span>專案</span>
              <span class="t-mono">{{ importReport.facility.projectName || importReport.facility.name || '—' }}</span>
            </div>
            <div class="imp-extra-row">
              <span>文件 / 聯絡人</span>
              <span class="t-mono">
                {{ importReport.counts.documents }} · {{ importReport.counts.contacts }}
              </span>
            </div>
            <div class="imp-extra-row">
              <span>擴充屬性 (Attribute)</span>
              <span class="t-mono">{{ importReport.counts.attributes }}</span>
            </div>
            <div v-if="importReport.counts.extraSheets > 0" class="imp-extra-row">
              <span>其他工作表</span>
              <span class="t-mono">
                {{ importReport.counts.extraSheets }} 張 · {{ importReport.sheetRows.length }} 列
              </span>
            </div>
          </div>

          <v-alert
            v-if="importError"
            type="error"
            density="compact"
            variant="tonal"
            class="mt-3"
          >
            <div class="t-mono">解析失敗：{{ importError }}</div>
          </v-alert>

          <v-alert
            v-if="importReport && importReport.counts.components === 0"
            type="warning"
            density="compact"
            variant="tonal"
            class="mt-3"
          >
            xlsx 沒有 Component 資料，無法在模型中對應構件
          </v-alert>
        </div>

        <v-divider />
        <div class="imp-foot">
          <v-btn variant="text" @click="closeImporter">取消</v-btn>
          <v-btn
            variant="flat"
            color="primary"
            prepend-icon="mdi-database-import-outline"
            :disabled="!importReport || !importModelId"
            :loading="importing"
            @click="confirmImport"
          >
            匯入並覆寫
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-card v-if="metas.length === 0 && !loading" class="empty-card">
      <div class="empty-state">
        <v-icon icon="mdi-database-off-outline" size="48" color="grey-lighten-1" class="mb-3" />
        <div class="empty-title">尚未匯入 COBie 資料</div>
        <div class="empty-text">
          從 COBie XLSX 試算表匯入完整資料；匯入後即可在此瀏覽並對應到模型構件
        </div>
        <v-btn
          variant="flat"
          color="primary"
          prepend-icon="mdi-file-table-outline"
          class="mt-4"
          @click="openImporter"
        >
          匯入 COBie XLSX
        </v-btn>
      </div>
    </v-card>

    <template v-else>
      <v-card class="tools tools-split">
        <nav class="side-nav">
          <div class="side-nav-section">COBie</div>
          <button
            v-for="item in navItems.filter(i => !i.group)"
            :key="item.value"
            class="side-nav-item"
            :class="{ active: tab === item.value }"
            @click="tab = item.value"
          >
            <v-icon :icon="item.icon" size="18" class="side-nav-icon" />
            <span class="side-nav-label">{{ item.label }}</span>
            <span class="side-nav-count t-mono">{{ item.count }}</span>
          </button>

          <template v-if="allSheetNames.length">
            <div class="side-nav-section side-nav-section-spacer">其他工作表</div>
            <button
              v-for="item in navItems.filter(i => i.group === 'sheet')"
              :key="item.value"
              class="side-nav-item"
              :class="{ active: tab === item.value }"
              :title="item.label"
              @click="tab = item.value"
            >
              <v-icon :icon="item.icon" size="18" class="side-nav-icon" />
              <span class="side-nav-label">{{ item.label }}</span>
              <span class="side-nav-count t-mono">{{ item.count }}</span>
            </button>
          </template>
        </nav>

        <div class="tools-main">
          <div class="tools-toolbar">
            <div class="tools-toolbar-title">
              <v-icon :icon="currentNav.icon" size="18" color="primary" />
              <span>{{ currentNav.label }}</span>
              <v-chip
                v-if="currentIsFiltered"
                size="x-small"
                variant="tonal"
                color="primary"
                class="t-mono ml-1"
              >
                {{ currentVisibleCount }} / {{ currentNav.count }}
              </v-chip>
              <v-chip
                v-else
                size="x-small"
                variant="tonal"
                class="t-mono ml-1"
              >
                {{ currentNav.count }}
              </v-chip>
            </div>
            <v-spacer />
            <div class="filters">
              <v-select
                v-model="modelFilter"
                :items="[
                  { title: '全部模型', value: 'all' },
                  ...metas.map(m => ({ title: m.modelName || m.modelId, value: m.modelId }))
                ]"
                density="compact"
                hide-details
                variant="outlined"
                style="width: 180px"
              />
              <v-text-field
                v-model="search"
                placeholder="搜尋…"
                prepend-inner-icon="mdi-magnify"
                density="compact"
                variant="outlined"
                hide-details
                single-line
                clearable
                style="width: 220px"
              />
              <v-btn
                v-if="currentFilterFields.length"
                :icon="filterPanelOpen ? 'mdi-filter-off-outline' : 'mdi-filter-outline'"
                variant="text"
                size="small"
                :color="filterPanelOpen ? 'primary' : undefined"
                :title="filterPanelOpen ? '收合篩選' : '展開篩選'"
                @click="filterPanelOpen = !filterPanelOpen"
              />
            </div>
          </div>
          <v-divider />
          <div class="tools-body">
            <div class="tools-table-area">

        <v-window v-model="tab">

          <!-- Components -->
          <v-window-item value="components">
            <v-data-table-virtual
              :headers="componentHeaders"
              :items="componentRows"
              :height="tableHeight"
              fixed-header
              :loading="loading"
              density="comfortable"
              hover
              show-expand
              :expand-on-click="false"
              item-value="_key"
              :row-props="(opt: any) => ({ class: 'clickable-row' })"
              @click:row="(_e: any, { item }: any) => onRowClick(item.modelId, [item.externalId])"
            >
              <template #item.name="{ item }"><div class="cell-name">{{ item.name }}</div></template>
              <template #item.typeName="{ item }">
                <span v-if="item.typeName" class="t-mono cell-mono">{{ item.typeName }}</span>
                <span v-else class="cell-muted">—</span>
              </template>
              <template #item.space="{ item }">
                <v-chip v-if="item.space" size="x-small" variant="tonal" color="primary">{{ item.space }}</v-chip>
                <span v-else class="cell-muted">—</span>
              </template>
              <template #item.assetIdentifier="{ item }">
                <span class="t-mono cell-mono">{{ item.assetIdentifier || '—' }}</span>
              </template>
              <template #item.modelName="{ item }"><span class="cell-muted">{{ item.modelName }}</span></template>
              <template #item.actions="{ item }">
                <v-btn icon="mdi-arrow-top-right" variant="text" size="small" title="於模型中檢視" @click.stop="navigateToViewer(item.modelId, [item.externalId])" />
              </template>
              <template #expanded-row="{ columns, item }">
                <tr class="row-detail">
                  <td :colspan="columns.length">
                    <div class="detail-panel">
                      <div class="detail-title">完整欄位（{{ detailFields(item).length }}）</div>
                      <div class="detail-grid">
                        <div v-for="f in detailFields(item)" :key="f.key" class="detail-item">
                          <div class="detail-key">{{ f.key }}</div>
                          <div class="detail-val t-mono">{{ formatDetailValue(f.value) }}</div>
                        </div>
                      </div>
                      <template v-if="attributesFor(item.modelId, 'Component', item.name).length">
                        <div class="detail-title detail-title-attr">擴充屬性 / Attribute（{{ attributesFor(item.modelId, 'Component', item.name).length }}）</div>
                        <div class="detail-grid">
                          <div v-for="a in attributesFor(item.modelId, 'Component', item.name)" :key="`${a.id}`" class="detail-item attr-item">
                            <div class="detail-key">{{ a.name || '—' }}<span v-if="a.unit" class="attr-unit"> ({{ a.unit }})</span></div>
                            <div class="detail-val t-mono">{{ a.value ?? '—' }}</div>
                          </div>
                        </div>
                      </template>
                    </div>
                  </td>
                </tr>
              </template>
            </v-data-table-virtual>
          </v-window-item>

          <!-- Types -->
          <v-window-item value="types">
            <v-data-table-virtual
              :headers="typeHeaders"
              :items="typeRows"
              :height="tableHeight"
              fixed-header
              :loading="loading"
              density="comfortable"
              hover
              show-expand
              :expand-on-click="false"
              item-value="_key"
              :row-props="(opt: any) => ({ class: opt.item.instanceCount > 0 ? 'clickable-row' : 'unclickable-row' })"
              @click:row="(_e: any, { item }: any) => onRowClick(item.modelId, item.instanceIds || [])"
            >
              <template #item.name="{ item }"><div class="cell-name t-mono">{{ item.name }}</div></template>
              <template #item.manufacturer="{ item }">{{ item.manufacturer || '—' }}</template>
              <template #item.modelNumber="{ item }">
                <span class="t-mono cell-mono">{{ item.modelNumber || '—' }}</span>
              </template>
              <template #item.category="{ item }"><span class="cell-muted">{{ item.category || '—' }}</span></template>
              <template #item.instanceCount="{ item }">
                <v-chip v-if="item.instanceCount > 0" size="x-small" variant="tonal" color="primary" class="t-mono">{{ item.instanceCount }}</v-chip>
                <span v-else class="cell-muted">—</span>
              </template>
              <template #item.modelName="{ item }"><span class="cell-muted">{{ item.modelName }}</span></template>
              <template #item.actions="{ item }">
                <v-btn v-if="item.instanceCount > 0" icon="mdi-cube-scan" variant="text" size="small" :title="`圈選 ${item.instanceCount} 個實例`" @click.stop="navigateToViewer(item.modelId, item.instanceIds)" />
              </template>
              <template #expanded-row="{ columns, item }">
                <tr class="row-detail">
                  <td :colspan="columns.length">
                    <div class="detail-panel">
                      <div class="detail-title">完整欄位（{{ detailFields(item).length }}）</div>
                      <div class="detail-grid">
                        <div v-for="f in detailFields(item)" :key="f.key" class="detail-item">
                          <div class="detail-key">{{ f.key }}</div>
                          <div class="detail-val t-mono">{{ formatDetailValue(f.value) }}</div>
                        </div>
                      </div>
                      <template v-if="attributesFor(item.modelId, 'Type', item.name).length">
                        <div class="detail-title detail-title-attr">擴充屬性 / Attribute（{{ attributesFor(item.modelId, 'Type', item.name).length }}）</div>
                        <div class="detail-grid">
                          <div v-for="a in attributesFor(item.modelId, 'Type', item.name)" :key="`${a.id}`" class="detail-item attr-item">
                            <div class="detail-key">{{ a.name || '—' }}<span v-if="a.unit" class="attr-unit"> ({{ a.unit }})</span></div>
                            <div class="detail-val t-mono">{{ a.value ?? '—' }}</div>
                          </div>
                        </div>
                      </template>
                    </div>
                  </td>
                </tr>
              </template>
            </v-data-table-virtual>
          </v-window-item>

          <!-- Spaces -->
          <v-window-item value="spaces">
            <v-data-table-virtual
              :headers="spaceHeaders"
              :items="spaceRows"
              :height="tableHeight"
              fixed-header
              :loading="loading"
              density="comfortable"
              hover
              show-expand
              :expand-on-click="false"
              item-value="_key"
              :row-props="(opt: any) => ({ class: opt.item.componentCount > 0 ? 'clickable-row' : 'unclickable-row' })"
              @click:row="(_e: any, { item }: any) => onRowClick(item.modelId, item.componentIds || [])"
            >
              <template #item.name="{ item }"><div class="cell-name">{{ item.name }}</div></template>
              <template #item.floorName="{ item }">
                <v-chip v-if="item.floorName" size="x-small" variant="tonal" color="primary">{{ item.floorName }}</v-chip>
                <span v-else class="cell-muted">—</span>
              </template>
              <template #item.zoneName="{ item }">
                <v-chip v-if="item.zoneName" size="x-small" variant="tonal" color="info">{{ item.zoneName }}</v-chip>
                <span v-else class="cell-muted">—</span>
              </template>
              <template #item.description="{ item }"><span class="cell-muted">{{ item.description || '—' }}</span></template>
              <template #item.componentCount="{ item }">
                <v-chip v-if="item.componentCount > 0" size="x-small" variant="tonal" color="primary" class="t-mono">{{ item.componentCount }}</v-chip>
                <span v-else class="cell-muted">—</span>
              </template>
              <template #item.modelName="{ item }"><span class="cell-muted">{{ item.modelName }}</span></template>
              <template #item.actions="{ item }">
                <v-btn v-if="item.componentCount > 0" icon="mdi-cube-scan" variant="text" size="small" :title="`圈選 ${item.componentCount} 個構件`" @click.stop="navigateToViewer(item.modelId, item.componentIds)" />
              </template>
              <template #expanded-row="{ columns, item }">
                <tr class="row-detail">
                  <td :colspan="columns.length">
                    <div class="detail-panel">
                      <div class="detail-title">完整欄位（{{ detailFields(item).length }}）</div>
                      <div class="detail-grid">
                        <div v-for="f in detailFields(item)" :key="f.key" class="detail-item">
                          <div class="detail-key">{{ f.key }}</div>
                          <div class="detail-val t-mono">{{ formatDetailValue(f.value) }}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </v-data-table-virtual>
          </v-window-item>

          <!-- Floors -->
          <v-window-item value="floors">
            <v-data-table-virtual
              :headers="floorHeaders"
              :items="floorRows"
              :height="tableHeight"
              fixed-header
              :loading="loading"
              density="comfortable"
              hover
              show-expand
              :expand-on-click="false"
              item-value="_key"
              :row-props="(opt: any) => ({ class: opt.item.componentCount > 0 ? 'clickable-row' : 'unclickable-row' })"
              @click:row="(_e: any, { item }: any) => onRowClick(item.modelId, item.componentIds || [])"
            >
              <template #item.name="{ item }"><div class="cell-name">{{ item.name }}</div></template>
              <template #item.description="{ item }"><span class="cell-muted">{{ item.description || '—' }}</span></template>
              <template #item.elevation="{ item }">
                <span v-if="item.elevation !== undefined" class="t-mono">{{ item.elevation }}</span>
                <span v-else class="cell-muted">—</span>
              </template>
              <template #item.spaceCount="{ item }"><span class="t-mono">{{ item.spaceCount }}</span></template>
              <template #item.componentCount="{ item }">
                <v-chip v-if="item.componentCount > 0" size="x-small" variant="tonal" color="primary" class="t-mono">{{ item.componentCount }}</v-chip>
                <span v-else class="cell-muted">—</span>
              </template>
              <template #item.modelName="{ item }"><span class="cell-muted">{{ item.modelName }}</span></template>
              <template #item.actions="{ item }">
                <v-btn v-if="item.componentCount > 0" icon="mdi-cube-scan" variant="text" size="small" :title="`圈選 ${item.componentCount} 個構件`" @click.stop="navigateToViewer(item.modelId, item.componentIds)" />
              </template>
              <template #expanded-row="{ columns, item }">
                <tr class="row-detail">
                  <td :colspan="columns.length">
                    <div class="detail-panel">
                      <div class="detail-title">完整欄位（{{ detailFields(item).length }}）</div>
                      <div class="detail-grid">
                        <div v-for="f in detailFields(item)" :key="f.key" class="detail-item">
                          <div class="detail-key">{{ f.key }}</div>
                          <div class="detail-val t-mono">{{ formatDetailValue(f.value) }}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </v-data-table-virtual>
          </v-window-item>

          <!-- Systems -->
          <v-window-item value="systems">
            <v-data-table-virtual
              :headers="systemHeaders"
              :items="systemRows"
              :height="tableHeight"
              fixed-header
              :loading="loading"
              density="comfortable"
              hover
              show-expand
              :expand-on-click="false"
              item-value="_key"
              :row-props="(opt: any) => ({ class: opt.item.componentCount > 0 ? 'clickable-row' : 'unclickable-row' })"
              @click:row="(_e: any, { item }: any) => onSystemRowClick(item.modelId, item.componentExternalIds || [])"
            >
              <template #item.name="{ item }"><div class="cell-name">{{ item.name }}</div></template>
              <template #item.category="{ item }"><span class="cell-muted">{{ item.category || '—' }}</span></template>
              <template #item.description="{ item }"><span class="cell-muted">{{ item.description || '—' }}</span></template>
              <template #item.componentCount="{ item }">
                <span class="t-mono sys-ratio">
                  <span :class="item.componentCount > 0 ? 'sys-ratio-bridged' : 'sys-ratio-zero'">
                    {{ item.componentCount }}
                  </span>
                  <span class="sys-ratio-sep"> / </span>
                  <span class="cell-muted">{{ item.declaredCount }}</span>
                </span>
              </template>
              <template #item.modelName="{ item }"><span class="cell-muted">{{ item.modelName }}</span></template>
              <template #item.actions="{ item }">
                <v-btn
                  v-if="item.componentCount > 0"
                  icon="mdi-cube-scan"
                  variant="text"
                  size="small"
                  :title="`圈選同系統 + 同 Type.Category 的構件`"
                  @click.stop="onSystemRowClick(item.modelId, item.componentExternalIds || [])"
                />
              </template>

              <!-- expanded row: declared members from xlsx -->
              <template #expanded-row="{ columns, item }">
                <tr class="sys-expand">
                  <td :colspan="columns.length">
                    <div class="member-panel">
                      <div class="member-head">
                        <span class="member-title">「{{ item.name }}」宣告的成員 ({{ item.declaredCount }})</span>
                        <span v-if="item.declaredCount > item.componentCount" class="member-warn">
                          {{ item.declaredCount - item.componentCount }} 個未在模型中找到
                        </span>
                      </div>
                      <div class="member-grid">
                        <button
                          v-for="(name, i) in item.declaredComponentNames || []"
                          :key="i"
                          class="member-chip"
                          :class="memberStatus(item.modelId, name) ? 'bridged' : 'unbridged'"
                          :disabled="!memberStatus(item.modelId, name)"
                          :title="memberStatus(item.modelId, name) ? '點擊在模型檢視' : '模型中無此構件'"
                          @click="onRowClick(item.modelId, memberStatus(item.modelId, name) ? [memberStatus(item.modelId, name)!] : [])"
                        >
                          <v-icon
                            :icon="memberStatus(item.modelId, name) ? 'mdi-check-circle' : 'mdi-circle-off-outline'"
                            size="12"
                          />
                          <span class="t-mono member-name">{{ name }}</span>
                        </button>
                      </div>
                      <div v-if="detailFields(item).length" class="detail-panel detail-panel-inline">
                        <div class="detail-title">完整欄位（{{ detailFields(item).length }}）</div>
                        <div class="detail-grid">
                          <div v-for="f in detailFields(item)" :key="f.key" class="detail-item">
                            <div class="detail-key">{{ f.key }}</div>
                            <div class="detail-val t-mono">{{ formatDetailValue(f.value) }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </v-data-table-virtual>
          </v-window-item>

          <!-- Zones -->
          <v-window-item value="zones">
            <v-data-table-virtual
              :headers="zoneHeaders"
              :items="zoneRows"
              :height="tableHeight"
              fixed-header
              :loading="loading"
              density="comfortable"
              hover
              show-expand
              :expand-on-click="false"
              item-value="_key"
              :row-props="(opt: any) => ({ class: opt.item.componentCount > 0 ? 'clickable-row' : 'unclickable-row' })"
              @click:row="(_e: any, { item }: any) => onRowClick(item.modelId, item.componentIds || [])"
            >
              <template #item.name="{ item }"><div class="cell-name">{{ item.name }}</div></template>
              <template #item.category="{ item }"><span class="cell-muted">{{ item.category || '—' }}</span></template>
              <template #item.description="{ item }"><span class="cell-muted">{{ item.description || '—' }}</span></template>
              <template #item.spaceCount="{ item }"><span class="t-mono">{{ item.spaceCount }}</span></template>
              <template #item.componentCount="{ item }">
                <v-chip v-if="item.componentCount > 0" size="x-small" variant="tonal" color="primary" class="t-mono">{{ item.componentCount }}</v-chip>
                <span v-else class="cell-muted">—</span>
              </template>
              <template #item.modelName="{ item }"><span class="cell-muted">{{ item.modelName }}</span></template>
              <template #item.actions="{ item }">
                <v-btn v-if="item.componentCount > 0" icon="mdi-cube-scan" variant="text" size="small" :title="`圈選 ${item.componentCount} 個構件`" @click.stop="navigateToViewer(item.modelId, item.componentIds)" />
              </template>
              <template #expanded-row="{ columns, item }">
                <tr class="row-detail">
                  <td :colspan="columns.length">
                    <div class="detail-panel">
                      <div class="detail-title">完整欄位（{{ detailFields(item).length }}）</div>
                      <div class="detail-grid">
                        <div v-for="f in detailFields(item)" :key="f.key" class="detail-item">
                          <div class="detail-key">{{ f.key }}</div>
                          <div class="detail-val t-mono">{{ formatDetailValue(f.value) }}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </v-data-table-virtual>
          </v-window-item>

          <!-- Per-sheet dynamic tabs: one v-window-item per imported worksheet. -->
          <v-window-item
            v-for="name in allSheetNames"
            :key="name"
            :value="`${SHEET_PREFIX}${name}`"
          >
            <v-data-table-virtual
              v-if="tab === `${SHEET_PREFIX}${name}`"
              :headers="activeSheetHeaders"
              :items="activeSheetRows"
              :height="tableHeight"
              fixed-header
              :loading="loading"
              density="comfortable"
              hover
              show-expand
              :expand-on-click="false"
              item-value="id"
            >
              <template #expanded-row="{ columns, item }">
                <tr class="row-detail">
                  <td :colspan="columns.length">
                    <div class="detail-panel">
                      <div class="detail-title">完整欄位（{{ Object.keys(item.raw).length }}）</div>
                      <div class="detail-grid">
                        <div v-for="(v, k) in item.raw" :key="k" class="detail-item">
                          <div class="detail-key">{{ k }}</div>
                          <div class="detail-val t-mono">{{ formatDetailValue(v) }}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </v-data-table-virtual>
          </v-window-item>
          </v-window>
            </div>

            <aside
              v-if="currentFilterFields.length && filterPanelOpen"
              class="filter-panel"
            >
              <div class="filter-panel-head">
                <v-icon icon="mdi-filter-variant" size="16" color="primary" />
                <span class="filter-panel-title">欄位篩選</span>
                <v-spacer />
                <v-btn
                  v-if="hasColFilters(tab as keyof typeof colFilters)"
                  size="x-small"
                  variant="text"
                  color="primary"
                  @click="clearColFilters(tab as keyof typeof colFilters)"
                >
                  清除
                </v-btn>
                <v-btn
                  icon="mdi-close"
                  variant="text"
                  size="x-small"
                  title="收合"
                  @click="filterPanelOpen = false"
                />
              </div>
              <v-divider />
              <div class="filter-panel-body">
                <div
                  v-for="f in currentFilterFields"
                  :key="f.key"
                  class="filter-field"
                >
                  <label class="filter-field-label">{{ f.label }}</label>
                  <v-autocomplete
                    v-if="f.type === 'autocomplete'"
                    :model-value="(colFilters[tab as keyof typeof colFilters][f.key] as string[]) || []"
                    :items="filterOptions(tab as keyof typeof colFilters, f.key)"
                    multiple
                    chips
                    closable-chips
                    density="compact"
                    variant="outlined"
                    hide-details
                    clearable
                    placeholder="選擇…"
                    @update:model-value="(v) => (colFilters[tab as keyof typeof colFilters][f.key] = v ?? [])"
                  />
                  <v-text-field
                    v-else
                    v-model="colFilters[tab as keyof typeof colFilters][f.key] as string"
                    density="compact"
                    variant="outlined"
                    hide-details
                    clearable
                    placeholder="包含…"
                  />
                </div>
                <div class="filter-panel-hint">
                  文字欄為子字串比對；下拉欄可多選（OR）；不同欄條件採 AND
                </div>
              </div>
            </aside>
          </div>
        </div>
      </v-card>
    </template>
    </div>

    <!-- inline 3D preview panel -->
    <aside v-if="previewOpen && previewSvfUrl" class="preview-panel">
      <header class="preview-head">
        <div class="preview-meta">
          <v-icon icon="mdi-cube-outline" size="16" color="primary" class="mr-2" />
          <div>
            <div class="preview-title">{{ previewModelName }}</div>
            <div class="preview-sub t-mono">
              {{ previewFocusIds.length }} 個對象選取
              <template v-if="lastExpansion && lastExpansion.expanded > lastExpansion.declared">
                <span class="preview-sub-expand">
                  · {{ lastExpansion.declared }} 系統宣告 + {{ lastExpansion.expanded - lastExpansion.declared }} 同 Type.Category
                </span>
              </template>
            </div>
          </div>
        </div>
        <div class="preview-actions">
          <v-btn
            icon="mdi-arrow-expand-all"
            variant="text"
            size="x-small"
            title="在完整檢視器中開啟"
            @click="openInFullViewer"
          />
          <v-btn
            icon="mdi-close"
            variant="text"
            size="x-small"
            title="關閉預覽"
            @click="previewOpen = false"
          />
        </div>
      </header>
      <ClientOnly>
        <ForgeViewer
          :svf-url="previewSvfUrl"
          :focus-external-ids="previewFocusIds"
          :key="previewSvfUrl"
          class="preview-viewer"
        />
      </ClientOnly>
    </aside>

    <!-- collapsed preview toggle -->
    <button
      v-if="!previewOpen && previewSvfUrl"
      class="preview-reopen"
      @click="previewOpen = true"
      title="重新開啟預覽"
    >
      <v-icon icon="mdi-eye-outline" size="16" />
      <span class="t-label">預覽</span>
    </button>
  </div>
</template>

<style scoped>
.page-shell {
  display: grid;
  grid-template-columns: 1fr 0;
  height: calc(100vh - 56px);
  position: relative;
  transition: grid-template-columns 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.page-shell.preview-open {
  grid-template-columns: 1fr 480px;
}

.page {
  padding: 32px 40px;
  max-width: 1440px;
  margin: 0 auto;
  overflow-y: auto;
  height: 100%;
  width: 100%;
}

.preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-left: 1px solid var(--border);
  overflow: hidden;
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}
.preview-meta {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.preview-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.preview-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
}
.preview-sub-expand { color: var(--primary); }
.preview-actions { display: flex; gap: 2px; }
.preview-viewer { flex: 1; min-height: 0; }

.preview-reopen {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}
.preview-reopen :deep(.v-icon) { color: white; }
.preview-reopen:hover { background: var(--primary-darken-1, #1D4ED8); }

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 24px;
}

.page-title { font-size: 24px; font-weight: 700; color: var(--text); margin: 0; letter-spacing: -0.01em; }
.page-sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

.empty-card { padding: 0; }
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}
.empty-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.empty-text { font-size: 13px; color: var(--text-muted); line-height: 1.6; max-width: 40ch; }

.tools { overflow: hidden; }
.tools-split {
  display: grid;
  grid-template-columns: 200px 1fr;
  min-height: 540px;
}
.side-nav {
  border-right: 1px solid var(--border);
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surface-2);
}
.side-nav-section {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 4px 10px 8px;
}
.side-nav-section-spacer {
  margin-top: 10px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
.side-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-soft);
  text-align: left;
  transition: background 120ms, color 120ms;
}
.side-nav-item:hover {
  background: var(--surface);
  color: var(--text);
}
.side-nav-item.active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
}
.side-nav-item.active .side-nav-icon { color: var(--primary); }
.side-nav-icon { color: var(--text-muted); }
.side-nav-label { flex: 1; }
.side-nav-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--surface);
  padding: 1px 7px;
  border-radius: 999px;
  min-width: 24px;
  text-align: center;
}
.side-nav-item.active .side-nav-count {
  background: var(--surface);
  color: var(--primary);
  font-weight: 600;
}

.tools-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tools-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  min-height: 56px;
}
.tools-toolbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.filters { display: flex; align-items: center; gap: 10px; }

@media (max-width: 900px) {
  .tools-split { grid-template-columns: 1fr; }
  .side-nav {
    border-right: none;
    border-bottom: 1px solid var(--border);
    flex-direction: row;
    overflow-x: auto;
    padding: 8px;
  }
  .side-nav-section { display: none; }
  .side-nav-item { flex: 0 0 auto; }
}
.cell-name { font-size: 13px; font-weight: 500; color: var(--text); }
.cell-mono { font-size: 12px; color: var(--text); }
.cell-muted { color: var(--text-muted); font-size: 12px; }

:deep(.v-data-table) { font-family: var(--font-sans); }
:deep(.v-data-table-header__content) {
  font-size: 11px !important;
  font-weight: 600 !important;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-soft) !important;
  white-space: nowrap;
}
:deep(.v-data-table__th) { white-space: nowrap; }
:deep(.v-data-table__td) { font-size: 13px !important; }

.tools-body {
  display: flex;
  min-width: 0;
}
.tools-table-area {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.filter-panel {
  flex: 0 0 240px;
  border-left: 1px solid var(--border);
  background: var(--surface-2);
  display: flex;
  flex-direction: column;
  max-height: 100%;
}
.filter-panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
}
.filter-panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.02em;
}
.filter-panel-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.filter-field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-soft);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.filter-panel-hint {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
  padding-top: 6px;
  border-top: 1px dashed var(--border);
}
.filter-field :deep(.v-field__input) {
  flex-wrap: wrap;
  gap: 3px;
  min-height: 32px;
}
.filter-field :deep(.v-chip) {
  margin: 1px 0;
  --v-chip-size: 22px;
  font-size: 11px;
}

@media (max-width: 1100px) {
  .filter-panel { flex-basis: 220px; }
}
@media (max-width: 900px) {
  .tools-body { flex-direction: column; }
  .filter-panel {
    flex: 0 0 auto;
    border-left: none;
    border-top: 1px solid var(--border);
  }
}

:deep(.clickable-row) { cursor: pointer; }
:deep(.clickable-row:hover) { background: var(--primary-soft) !important; }
:deep(.unclickable-row) { cursor: default; opacity: 0.65; }

.sys-ratio { font-size: 13px; }
.sys-ratio-bridged { color: var(--primary); font-weight: 600; }
.sys-ratio-zero { color: var(--text-muted); font-weight: 400; }
.sys-ratio-sep { color: var(--text-muted); }

.sys-expand td { background: var(--surface-2) !important; padding: 16px 24px !important; }

.row-detail td {
  background: var(--surface-2) !important;
  padding: 16px 24px !important;
}
.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-panel-inline {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
}
.detail-title {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px 16px;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  min-width: 0;
}
.detail-key {
  font-size: 10.5px;
  color: var(--text-muted);
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.detail-val {
  font-size: 12px;
  color: var(--text);
  word-break: break-word;
  line-height: 1.4;
}
.detail-title-attr {
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
  color: var(--primary);
}
.attr-item { background: var(--primary-soft); border-color: transparent; }
.attr-unit { color: var(--text-muted); font-weight: 400; }

.member-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.member-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
}
.member-title { font-weight: 600; color: var(--text); }
.member-warn {
  color: var(--warning);
  font-size: 11px;
  font-family: var(--font-mono);
}

.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.member-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  cursor: pointer;
  text-align: left;
  transition: all 140ms;
}
.member-chip:hover:not(:disabled) {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.member-chip:disabled { cursor: not-allowed; opacity: 0.55; }
.member-chip.bridged { color: var(--text); }
.member-chip.bridged :deep(.v-icon) { color: var(--success); }
.member-chip.unbridged { color: var(--text-muted); }
.member-chip.unbridged :deep(.v-icon) { color: var(--text-muted); }

.member-name {
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head-actions { display: flex; gap: 8px; }

.imp-body { padding: 20px 24px; }
.imp-lede {
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.7;
  margin: 0 0 20px;
}
.imp-field { margin-bottom: 18px; }
.imp-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-soft);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.imp-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.imp-file-row { display: flex; gap: 8px; align-items: center; }

.imp-report {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-top: 16px;
}
.imp-extra {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--surface-2);
  border-radius: 6px;
  font-size: 12px;
}
.imp-extra-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 3px 0;
  color: var(--text-soft);
}
.imp-stat {
  background: var(--surface-2);
  border-radius: 8px;
  padding: 10px 12px;
  text-align: left;
}
.imp-stat-label { font-size: 11px; color: var(--text-muted); }
.imp-stat-num { font-size: 22px; font-weight: 700; color: var(--text); line-height: 1.1; margin-top: 2px; }
.imp-stat-sub { font-size: 10px; color: var(--text-muted); margin-top: 4px; }

.imp-bridge { margin-top: 14px; }
.imp-warn-text { font-size: 12px; margin-top: 4px; }

.imp-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  background: var(--surface-2);
}

</style>
