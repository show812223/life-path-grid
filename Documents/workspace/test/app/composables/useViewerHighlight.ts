// 動態取 THREE.Vector4：Forge global 提供
declare const THREE: any

const COLOR_HIT = () => new THREE.Vector4(1.0, 0.55, 0.0, 0.9)

const mappingCache = new WeakMap<object, Record<string, number>>()

async function getMapping(viewer: any): Promise<Record<string, number>> {
  const model = viewer?.model
  if (!model) return {}
  const cached = mappingCache.get(model)
  if (cached) return cached
  const map = await new Promise<Record<string, number>>(resolve => {
    model.getExternalIdMapping(
      (m: Record<string, number>) => resolve(m),
      () => resolve({})
    )
  })
  mappingCache.set(model, map)
  return map
}

export interface UseViewerHighlight {
  applyHighlight(
    viewer: any,
    externalIds: Set<string>,
    opts?: { emptyMode?: 'showAll' | 'hideAll' }
  ): Promise<{ hitDbIds: number[]; missing: number }>
  clearHighlight(viewer: any): void
  fitToHighlight(viewer: any): Promise<void>
  resetForNewModel(): void
}

export function useViewerHighlight(): UseViewerHighlight {
  let lastHitDbIds: number[] = []

  async function applyHighlight(
    viewer: any,
    externalIds: Set<string>,
    opts: { emptyMode?: 'showAll' | 'hideAll' } = {}
  ) {
    const emptyMode = opts.emptyMode ?? 'showAll'
    const map = await getMapping(viewer)
    const dbIds: number[] = []
    for (const e of externalIds) {
      const n = map[e]
      if (typeof n === 'number') dbIds.push(n)
    }
    viewer.clearThemingColors(viewer.model)
    if (dbIds.length === 0) {
      if (emptyMode === 'hideAll') viewer.hideAll?.()
      else viewer.isolate([])
      lastHitDbIds = []
      return { hitDbIds: [], missing: externalIds.size }
    }
    viewer.showAll?.()
    viewer.isolate(dbIds)
    const color = COLOR_HIT()
    for (const id of dbIds) viewer.setThemingColor(id, color, viewer.model)
    lastHitDbIds = dbIds
    return { hitDbIds: dbIds, missing: externalIds.size - dbIds.length }
  }

  function clearHighlight(viewer: any) {
    viewer.clearThemingColors(viewer.model)
    viewer.showAll?.()
    viewer.isolate([])
    lastHitDbIds = []
  }

  async function fitToHighlight(viewer: any) {
    if (lastHitDbIds.length === 0) return
    viewer.fitToView(lastHitDbIds)
  }

  function resetForNewModel() {
    lastHitDbIds = []
  }

  return { applyHighlight, clearHighlight, fitToHighlight, resetForNewModel }
}
