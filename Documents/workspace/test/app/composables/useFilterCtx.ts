import { ref, watch, unref, type Ref } from 'vue'
import type {
  ExtractedComponent,
  ExtractedType,
  ExtractedSpace,
  ExtractedFloor,
  ExtractedZone,
  ExtractedSystem,
  ExtractedAttribute
} from './useCobieStore'
import type { FilterCtx } from './filterTypes'
import { getDim } from './filterRegistry'
import { useCobieStore } from './useCobieStore'

type MaybeRef<T> = T | Ref<T>

const addToMap = <K, V>(m: Map<K, Set<V>>, k: K, v: V) => {
  let s = m.get(k); if (!s) { s = new Set<V>(); m.set(k, s) }; s.add(v)
}
const pushToMap = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
  const arr = m.get(k); if (arr) arr.push(v); else m.set(k, [v])
}

export interface BuildInput {
  modelId: string
  components: ExtractedComponent[]
  types: ExtractedType[]
  spaces: ExtractedSpace[]
  floors: ExtractedFloor[]
  zones: ExtractedZone[]
  systems: ExtractedSystem[]
  attributes: ExtractedAttribute[]
}

export function buildFilterCtx(input: BuildInput): FilterCtx {
  const byExternalId = new Map<string, ExtractedComponent>()
  const bySpace = new Map<string, Set<string>>()
  const byType = new Map<string, Set<string>>()
  const byFloor = new Map<string, Set<string>>()
  const byZone = new Map<string, Set<string>>()
  const bySystem = new Map<string, Set<string>>()
  const attributesIndex = new Map<string, ExtractedAttribute[]>()

  for (const c of input.components) {
    byExternalId.set(c.externalId, c)
    if (c.space) addToMap(bySpace, c.space, c.externalId)
    if (c.typeName) addToMap(byType, c.typeName, c.externalId)
  }
  for (const s of input.spaces) {
    if (!s.floorName) continue
    for (const id of bySpace.get(s.name) ?? []) addToMap(byFloor, s.floorName, id)
  }
  for (const z of input.zones) {
    for (const sn of z.spaceNames) {
      for (const id of bySpace.get(sn) ?? []) addToMap(byZone, z.name, id)
    }
  }
  for (const sys of input.systems) {
    for (const id of sys.componentExternalIds) addToMap(bySystem, sys.name, id)
  }
  for (const a of input.attributes) {
    if (!a.sheetName || !a.rowName) continue
    const k = `${a.sheetName.trim().toLowerCase()}::${a.rowName.trim().toLowerCase()}`
    pushToMap(attributesIndex, k, a)
  }

  return {
    modelId: input.modelId,
    components: input.components,
    byExternalId,
    types: new Map(input.types.map(t => [t.name, t])),
    spaces: new Map(input.spaces.map(s => [s.name, s])),
    floors: new Map(input.floors.map(f => [f.name, f])),
    zones: input.zones,
    systems: input.systems,
    attributesIndex,
    bySpace, byFloor, byZone, bySystem, byType,
    dim: getDim
  }
}

export function useFilterCtx(modelId: MaybeRef<string>) {
  const ctx = ref<FilterCtx | null>(null)
  const loading = ref(false)
  const store = useCobieStore()
  let token = 0

  const reload = async () => {
    const my = ++token
    loading.value = true
    const id = unref(modelId)
    if (!id) { loading.value = false; return }
    try {
      const [components, types, spaces, floors, zones, systems, attributes] = await Promise.all([
        store.listComponents(id),
        store.listTypes(id),
        store.listSpaces(id),
        store.listFloors(id),
        store.listZones(id),
        store.listSystems(id),
        store.listAttributes(id)
      ])
      if (my !== token) return
      ctx.value = buildFilterCtx({
        modelId: id, components, types, spaces, floors, zones, systems, attributes
      })
    } catch (e) {
      if (my === token) console.error('[useFilterCtx] reload failed:', e)
    } finally {
      if (my === token) loading.value = false
    }
  }

  watch(() => unref(modelId), reload, { immediate: true })

  return { ctx, loading, reload }
}
