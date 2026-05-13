export interface ModelView {
  id: string
  name: string
  svf: string
}

export interface ModelMeta {
  format?: string
  area?: string
  level?: string
  [key: string]: string | undefined
}

export interface ModelEntry {
  id: string
  name: string
  subtitle?: string
  description?: string
  thumbnail?: string
  meta?: ModelMeta
  views: ModelView[]
}

export interface Manifest {
  project: string
  subtitle?: string
  client?: string
  studio?: string
  deliveryDate?: string
  version?: string
  description?: string
  models: ModelEntry[]
}

export const useManifest = () => {
  return useState<Manifest | null>('manifest', () => null)
}

export const loadManifest = async () => {
  const state = useManifest()
  if (state.value) return state.value
  const { data } = await useAsyncData<Manifest>('manifest', () =>
    $fetch<Manifest>('/api/manifest')
  )
  if (data.value) state.value = data.value
  return state.value
}
