<script setup lang="ts">
declare global {
  interface Window {
    Autodesk: any
  }
}

export interface ElementProperty {
  displayName: string
  displayValue: any
  displayCategory?: string
}

export interface SelectedElement {
  dbId: number
  externalId?: string
  name: string
  properties: ElementProperty[]
}

const props = defineProps<{
  svfUrl: string
  focusExternalIds?: string[]
}>()
const emit = defineEmits<{
  select: [element: SelectedElement | null]
  ready: [viewer: any]
}>()

const isReady = ref(false)

const containerRef = ref<HTMLDivElement>()
let viewer: any = null
const loading = ref(true)
const error = ref<string | null>(null)

const waitForAutodesk = () =>
  new Promise<void>((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      if (typeof window.Autodesk !== 'undefined') return resolve()
      if (Date.now() - start > 10000) return reject(new Error('Autodesk Viewer 載入逾時'))
      setTimeout(tick, 50)
    }
    tick()
  })

const fetchProperties = (dbId: number): Promise<SelectedElement | null> =>
  new Promise(resolve => {
    viewer.getProperties(
      dbId,
      (result: any) => {
        resolve({
          dbId,
          externalId: result.externalId,
          name: result.name ?? `Element ${dbId}`,
          properties: (result.properties ?? []).filter(
            (p: any) => !p.hidden && p.displayValue !== ''
          )
        })
      },
      () => resolve(null)
    )
  })

const onSelectionChanged = async (event: any) => {
  const dbIds: number[] = event.dbIdArray ?? []
  if (dbIds.length === 0) return emit('select', null)
  const el = await fetchProperties(dbIds[0])
  emit('select', el)
}

const focusExternal = async (externalIds: string[]) => {
  if (!viewer || !viewer.model || externalIds.length === 0) return
  const mapping: Record<string, number> = await new Promise(resolve => {
    viewer.model.getExternalIdMapping(
      (m: Record<string, number>) => resolve(m),
      () => resolve({})
    )
  })
  const dbIds = externalIds
    .map(extId => mapping[extId])
    .filter((id): id is number => typeof id === 'number')
  if (dbIds.length === 0) return
  viewer.isolate(dbIds)
  viewer.select(dbIds)
  viewer.fitToView(dbIds)
}

// react to focus prop changes after the viewer is ready
watch(
  () => props.focusExternalIds,
  async (ids) => {
    if (isReady.value && ids?.length) await focusExternal(ids)
  },
  { deep: true }
)

const initViewer = async () => {
  loading.value = true
  error.value = null
  try {
    await waitForAutodesk()

    const options = { env: 'Local', offline: true }
    await new Promise<void>(resolve =>
      window.Autodesk.Viewing.Initializer(options, () => resolve())
    )

    viewer = new window.Autodesk.Viewing.GuiViewer3D(containerRef.value!)
    const code = viewer.start()
    if (code > 0) throw new Error(`Viewer 啟動失敗 (code ${code})`)

    const absoluteUrl = props.svfUrl.startsWith('http')
      ? props.svfUrl
      : window.location.origin + props.svfUrl
    await new Promise<void>((resolve, reject) => {
      viewer.loadModel(
        absoluteUrl,
        {},
        () => resolve(),
        (err: any) => reject(new Error(`模型載入失敗: ${err}`))
      )
    })

    viewer.addEventListener(
      window.Autodesk.Viewing.SELECTION_CHANGED_EVENT,
      onSelectionChanged
    )

    isReady.value = true
    emit('ready', viewer)

    // apply any pending focus
    if (props.focusExternalIds?.length) {
      await focusExternal(props.focusExternalIds)
    }
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
}

onMounted(initViewer)

onBeforeUnmount(() => {
  if (viewer) {
    viewer.removeEventListener(
      window.Autodesk.Viewing.SELECTION_CHANGED_EVENT,
      onSelectionChanged
    )
    viewer.finish()
    viewer = null
  }
})
</script>

<template>
  <div class="viewer-wrap">
    <div ref="containerRef" class="viewer" />

    <Transition name="fade">
      <div v-if="loading" class="loader">
        <div class="loader-spinner">
          <svg viewBox="0 0 32 32" class="loader-svg">
            <circle cx="16" cy="16" r="12" stroke="currentColor" stroke-opacity="0.15" stroke-width="2" fill="none" />
            <circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="2" fill="none"
                    stroke-dasharray="20 200" stroke-linecap="round" class="loader-arc" />
          </svg>
        </div>
        <div class="loader-text">載入模型中…</div>
      </div>
    </Transition>

    <div v-if="error" class="error-overlay">
      <v-card class="pa-6 text-center" max-width="420">
        <v-icon icon="mdi-alert-circle-outline" size="40" color="error" class="mb-3" />
        <div class="error-title">無法載入模型</div>
        <div class="error-msg">{{ error }}</div>
      </v-card>
    </div>
  </div>
</template>

<style scoped>
.viewer-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}
.viewer {
  width: 100%;
  height: 100%;
}

.loader {
  position: absolute;
  inset: 0;
  background: var(--surface-2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 4;
}

.loader-spinner {
  width: 40px;
  height: 40px;
  color: var(--primary);
}
.loader-svg { width: 100%; height: 100%; }

.loader-arc {
  transform-origin: 16px 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.loader-text {
  font-size: 13px;
  color: var(--text-soft);
  font-weight: 500;
}

.fade-enter-active, .fade-leave-active { transition: opacity 300ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.error-overlay {
  position: absolute;
  inset: 0;
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 5;
}

.error-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}

.error-msg {
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.6;
}
</style>
