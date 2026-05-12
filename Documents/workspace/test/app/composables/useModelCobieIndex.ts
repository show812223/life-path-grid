import { ref, type Ref } from 'vue'

export interface CobieIndexEntry {
  floor?: string
  space?: string
  typeName?: string
  system?: string
  dbId: number
  name: string
}

export interface CobieIndex {
  byExtId: Map<string, CobieIndexEntry>
  byFloor: Map<string, Set<string>>
  bySpace: Map<string, Set<string>>
  byType: Map<string, Set<string>>
  bySystem: Map<string, Set<string>>
}

const FIELD_TO_DISPLAY = {
  floor: 'COBie.Floor.Name',
  space: 'COBie.Component.Space',
  typeName: 'COBie.Type.Name',
  system: 'COBie.System.Name'
} as const

const emptyIndex = (): CobieIndex => ({
  byExtId: new Map(),
  byFloor: new Map(),
  bySpace: new Map(),
  byType: new Map(),
  bySystem: new Map()
})

const addToReverse = (m: Map<string, Set<string>>, k: string, v: string) => {
  let s = m.get(k)
  if (!s) { s = new Set(); m.set(k, s) }
  s.add(v)
}

const normalizeValue = (raw: any): string | undefined => {
  if (raw == null) return undefined
  const s = String(raw).trim()
  return s ? s : undefined
}

const enumAllDbIds = (tree: any): number[] => {
  const ids: number[] = []
  const visited = new Set<number>()
  const root = tree.getRootId()
  const walk = (id: number) => {
    if (visited.has(id)) return
    visited.add(id)
    tree.enumNodeChildren(id, (child: number) => {
      ids.push(child)
      walk(child)
    }, false)
  }
  walk(root)
  return ids
}

const waitForObjectTree = (model: any): Promise<any> =>
  new Promise((resolve, reject) => {
    if (typeof model.getObjectTree === 'function') {
      model.getObjectTree(
        (tree: any) => resolve(tree),
        (err: any) => reject(err)
      )
    } else {
      // Test mocks expose getInstanceTree() synchronously.
      const tree = model.getInstanceTree?.()
      if (tree) resolve(tree)
      else reject(new Error('no instance tree'))
    }
  })

export async function scanModel(model: any): Promise<CobieIndex> {
  const idx = emptyIndex()
  if (!model) return idx
  let tree: any
  try {
    tree = await waitForObjectTree(model)
  } catch {
    return idx
  }
  if (!tree) return idx
  const dbIds = enumAllDbIds(tree)
  if (dbIds.length === 0) return idx

  const results: any[] = await new Promise((resolve, reject) => {
    model.getBulkProperties2(
      dbIds,
      {},
      (res: any[]) => resolve(res),
      (err: any) => reject(err)
    )
  })

  // Debug: dump unique COBie displayName seen so we can align to actual model schema
  const seenDisplayNames = new Map<string, { count: number; sample: any }>()
  for (const r of results) {
    if (!r?.properties) continue
    for (const p of r.properties) {
      if (typeof p.displayName !== 'string') continue
      if (!p.displayName.startsWith('COBie')) continue
      const entry = seenDisplayNames.get(p.displayName)
      if (entry) entry.count++
      else seenDisplayNames.set(p.displayName, { count: 1, sample: p.displayValue })
    }
  }
  console.log('[useModelCobieIndex] COBie displayNames in model:',
    [...seenDisplayNames.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([k, v]) => `${k} (${v.count}, e.g. "${v.sample}")`)
  )

  for (const r of results) {
    const extId: string | undefined = r?.externalId
    if (!extId || !r?.properties) continue

    const fields: Partial<CobieIndexEntry> = {}
    for (const p of r.properties) {
      if (typeof p.displayName !== 'string') continue
      for (const [key, displayName] of Object.entries(FIELD_TO_DISPLAY)) {
        if (p.displayName === displayName) {
          const v = normalizeValue(p.displayValue)
          if (v) (fields as any)[key] = v
        }
      }
    }

    if (!fields.floor && !fields.space && !fields.typeName && !fields.system) continue

    const entry: CobieIndexEntry = {
      ...fields,
      dbId: r.dbId,
      name: typeof r.name === 'string' ? r.name : ''
    }
    idx.byExtId.set(extId, entry)
    if (fields.floor) addToReverse(idx.byFloor, fields.floor, extId)
    if (fields.space) addToReverse(idx.bySpace, fields.space, extId)
    if (fields.typeName) addToReverse(idx.byType, fields.typeName, extId)
    if (fields.system) addToReverse(idx.bySystem, fields.system, extId)
  }
  return idx
}

const modelCache = new WeakMap<object, CobieIndex>()

export interface UseModelCobieIndex {
  index: Ref<CobieIndex | null>
  loading: Ref<boolean>
  build(viewer: any): Promise<void>
  reset(): void
}

export function useModelCobieIndex(): UseModelCobieIndex {
  const index = ref<CobieIndex | null>(null)
  const loading = ref(false)

  async function build(viewer: any): Promise<void> {
    const model = viewer?.model
    if (!model) { index.value = null; return }
    const cached = modelCache.get(model)
    if (cached) { index.value = cached; return }
    loading.value = true
    try {
      const idx = await scanModel(model)
      modelCache.set(model, idx)
      index.value = idx
      console.log('[useModelCobieIndex] built', {
        total: idx.byExtId.size,
        floors: idx.byFloor.size,
        spaces: idx.bySpace.size,
        types: idx.byType.size,
        systems: idx.bySystem.size
      })
    } catch (e) {
      console.error('[useModelCobieIndex] scan failed:', e)
      index.value = null
    } finally {
      loading.value = false
    }
  }

  function reset() {
    index.value = null
  }

  return { index, loading, build, reset }
}
