<script setup lang="ts">
import type { SelectedElement } from '~/components/ForgeViewer.client.vue'
import { useCobieFilter } from '~/composables/useCobieFilter'
import CobieFilterPanel from '~/components/CobieFilterPanel.vue'
import CobieFilterStatusBar from '~/components/CobieFilterStatusBar.vue'

const viewerRef = ref<any | null>(null)

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()

await loadManifest()
const manifest = useManifest()

const model = computed(() =>
  manifest.value?.models?.find(m => m.id === route.params.id)
)

const currentViewId = ref<string>(
  (route.query.view as string) || model.value?.views[0]?.id || ''
)

const currentView = computed(() =>
  model.value?.views.find(v => v.id === currentViewId.value)
)

watch(currentViewId, (id) => {
  router.replace({ query: { view: id } })
})

if (!model.value) {
  throw createError({ statusCode: 404, statusMessage: '找不到模型' })
}

const selectedElement = ref<SelectedElement | null>(null)
const railOpen = ref(true)
const railTab = ref<'cobie' | 'docs' | 'props' | 'filter'>('cobie')

const onSelect = (el: SelectedElement | null) => {
  selectedElement.value = el
}

// COBie extraction from model
const modelId = computed(() => String(route.params.id))
const store = useCobieStore()
const extractStatus = ref<'idle' | 'running' | 'done' | 'error'>('idle')
const extractMsg = ref('')
const extractMeta = ref<Awaited<ReturnType<typeof store.getMeta>>>()

const refreshMeta = async () => {
  extractMeta.value = await store.getMeta(modelId.value)
}
await refreshMeta()

const runExtraction = async (viewer: any) => {
  extractStatus.value = 'running'
  try {
    const result = await extractCobie(
      viewer,
      modelId.value,
      model.value?.name,
      msg => { extractMsg.value = msg }
    )
    await store.replaceForModel(modelId.value, result)
    await refreshMeta()
    extractStatus.value = 'done'
  } catch (e: any) {
    extractMsg.value = e?.message ?? String(e)
    extractStatus.value = 'error'
  }
}

const isolationActive = ref(false)

const focusElements = async (viewer: any, externalIds: string[]) => {
  // 篩選器啟用且有命中時，不 isolate（保留 ghost 層），只 select + fitToView
  if (filter.shouldSuppressIsolate.value) {
    const mapping: Record<string, number> = await new Promise(resolve => {
      viewer.model.getExternalIdMapping(
        (m: Record<string, number>) => resolve(m),
        () => resolve({})
      )
    })
    const dbIds = externalIds.map(extId => mapping[extId]).filter((id): id is number => typeof id === 'number')
    if (dbIds.length === 0) return
    viewer.select(dbIds)
    viewer.fitToView(dbIds)
    if (dbIds.length === 1) {
      viewer.getProperties(dbIds[0], (result: any) => {
        selectedElement.value = {
          dbId: dbIds[0],
          externalId: result.externalId,
          name: result.name,
          properties: (result.properties ?? []).filter((p: any) => !p.hidden && p.displayValue !== '')
        }
      })
    }
    return
  }

  const model = viewer.model
  if (!model || externalIds.length === 0) return

  const mapping: Record<string, number> = await new Promise(resolve => {
    model.getExternalIdMapping(
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
  isolationActive.value = true

  // populate right rail with first match
  if (dbIds.length === 1) {
    viewer.getProperties(dbIds[0], (result: any) => {
      selectedElement.value = {
        dbId: dbIds[0],
        externalId: result.externalId,
        name: result.name,
        properties: (result.properties ?? []).filter((p: any) => !p.hidden && p.displayValue !== '')
      }
    })
  }
}

const clearIsolation = () => {
  const v = (window as any).__viewer
  if (!v) return
  v.isolate([])
  v.clearSelection()
  selectedElement.value = null
  isolationActive.value = false
}

const onViewerReady = async (viewer: any) => {
  ;(window as any).__viewer = viewer
  viewerRef.value = viewer

  let extIds: string[] = []

  // 1. URL query param (small selections)
  const focus = route.query.focus
  if (typeof focus === 'string' && focus) {
    extIds = decodeURIComponent(focus).split(',').filter(Boolean)
  }

  // 2. sessionStorage (large selections, passed in from /cobie)
  if (extIds.length === 0) {
    try {
      const key = `viewer:focus:${modelId.value}`
      const raw = sessionStorage.getItem(key)
      if (raw) {
        extIds = JSON.parse(raw) as string[]
        sessionStorage.removeItem(key)
      }
    } catch {}
  }

  if (extIds.length > 0) {
    await focusElements(viewer, extIds)
  }
}

const reExtract = async () => {
  const v = (window as any).__viewer
  if (v) await runExtraction(v)
}

const onHighlight = async (externalIds: string[]) => {
  const v = (window as any).__viewer
  if (v && externalIds.length > 0) await focusElements(v, externalIds)
}

import type { CobieDiagnostic } from '~/composables/extractCobie'
const diagnostic = ref<CobieDiagnostic | null>(null)
const diagnosticOpen = ref(false)
const runDiagnostic = async () => {
  const v = (window as any).__viewer
  if (!v) return
  diagnostic.value = await inspectCobie(v)
  diagnosticOpen.value = true
}

const docCount = ref(0)
// Doc count placeholder; documents tab is empty until separate ingestion is added.

const filter = useCobieFilter({ modelId, viewer: viewerRef })
</script>

<template>
  <div class="viewer-page">

    <header class="viewer-head">
      <div class="head-left">
        <NuxtLink to="/" class="back-btn" title="返回模型清單">
          <v-icon icon="mdi-arrow-left" size="18" />
        </NuxtLink>
        <h1 class="model-title">{{ model?.name }}</h1>
      </div>

      <div class="head-right">
        <v-select
          v-if="model && model.views.length > 1"
          v-model="currentViewId"
          :items="model.views"
          item-title="name"
          item-value="id"
          style="width: 200px"
          density="compact"
          variant="outlined"
          hide-details
        />

        <v-btn
          v-if="isolationActive"
          variant="tonal"
          color="warning"
          size="small"
          prepend-icon="mdi-eye-off-outline"
          @click="clearIsolation"
        >
          顯示全部
        </v-btn>

        <div
          class="extract-status"
          :class="extractStatus === 'running' ? 'running' : (extractMeta ? extractMeta.source : 'idle')"
          :title="extractMeta
            ? `${extractMeta.source === 'xlsx' ? 'XLSX 匯入' : '模型抽取'} · ${extractMeta.componentCount} 件 · ${extractMeta.extractedAt}`
            : (extractStatus === 'running' ? `解析中：${extractMsg}` : '尚無 COBie 資料')"
        >
          <v-progress-circular
            v-if="extractStatus === 'running'"
            indeterminate size="12" width="2" color="primary"
          />
          <v-icon
            v-else-if="extractMeta"
            :icon="extractMeta.source === 'xlsx' ? 'mdi-file-table-outline' : 'mdi-database-check-outline'"
            size="14"
          />
          <v-icon v-else icon="mdi-database-off-outline" size="14" />
          <span v-if="extractMeta" class="t-mono">{{ extractMeta.componentCount }}</span>
        </div>

        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn
              icon="mdi-dots-vertical"
              variant="text"
              size="small"
              title="COBie 操作"
              v-bind="menuProps"
            />
          </template>
          <v-list density="compact">
            <v-list-item
              prepend-icon="mdi-database-import-outline"
              title="從模型抽取 COBie"
              @click="reExtract"
            />
            <v-list-item
              prepend-icon="mdi-bug-outline"
              title="COBie 屬性診斷"
              @click="runDiagnostic"
            />
            <v-divider />
            <v-list-item
              prepend-icon="mdi-file-table-outline"
              title="匯入 / 比對 XLSX"
              to="/cobie"
            />
          </v-list>
        </v-menu>

        <v-btn
          :icon="railOpen ? 'mdi-dock-right' : 'mdi-information-outline'"
          variant="text"
          size="small"
          :title="railOpen ? '收合面板' : '展開面板'"
          @click="railOpen = !railOpen"
        />
      </div>
    </header>

    <div class="viewer-body" :class="{ 'rail-collapsed': !railOpen }">

      <main class="canvas-area">
        <ClientOnly>
          <ForgeViewer
            v-if="currentView"
            :svf-url="currentView.svf"
            :key="currentView.svf"
            @select="onSelect"
            @ready="onViewerReady"
          />
        </ClientOnly>
        <CobieFilterStatusBar v-if="!railOpen" :filter="filter" />
      </main>

      <aside v-if="railOpen" class="rail">
        <div class="rail-tabs">
          <button
            class="rail-tab"
            :class="{ active: railTab === 'cobie' }"
            @click="railTab = 'cobie'"
          >
            <v-icon icon="mdi-database-outline" size="16" />
            <span>COBie 資料</span>
          </button>
          <button
            class="rail-tab"
            :class="{ active: railTab === 'docs' }"
            @click="railTab = 'docs'"
          >
            <v-icon icon="mdi-file-document-outline" size="16" />
            <span>設備文件</span>
            <v-chip
              v-if="docCount > 0"
              size="x-small"
              color="primary"
              variant="flat"
              class="tab-badge"
            >
              {{ docCount }}
            </v-chip>
          </button>
          <button
            class="rail-tab"
            :class="{ active: railTab === 'props' }"
            @click="railTab = 'props'"
          >
            <v-icon icon="mdi-information-outline" size="16" />
            <span>物件詳細</span>
          </button>
          <button
            class="rail-tab"
            :class="{ active: railTab === 'filter' }"
            @click="railTab = 'filter'"
          >
            <v-icon icon="mdi-filter-variant" size="16" />
            <span>篩選</span>
          </button>
        </div>

        <div class="rail-content">
          <CobiePanel
            v-if="railTab === 'cobie'"
            :element="selectedElement"
            :model-id="modelId"
            @highlight="onHighlight"
          />
          <DocumentList v-else-if="railTab === 'docs'" :element="selectedElement" :model-id="modelId" />
          <PropertyPanel v-else-if="railTab === 'props'" :element="selectedElement" />
          <CobieFilterPanel v-else-if="railTab === 'filter'" :filter="filter" />
        </div>
      </aside>
    </div>

    <!-- COBie diagnostic dialog -->
    <v-dialog v-model="diagnosticOpen" max-width="720">
      <v-card>
        <v-toolbar density="compact" flat>
          <v-icon icon="mdi-bug-outline" class="mx-3" />
          <v-toolbar-title>COBie 屬性掃描結果</v-toolbar-title>
          <v-btn icon="mdi-close" variant="text" @click="diagnosticOpen = false" />
        </v-toolbar>
        <v-divider />
        <div v-if="diagnostic" class="diag-body">
          <div class="diag-stats">
            <div class="diag-stat">
              <div class="diag-stat-label">構件總數</div>
              <div class="diag-stat-num t-mono">{{ diagnostic.totalDbIds }}</div>
            </div>
            <div class="diag-stat">
              <div class="diag-stat-label">含 COBie 標記</div>
              <div class="diag-stat-num t-mono">{{ diagnostic.elementsWithCobie }}</div>
            </div>
            <div class="diag-stat">
              <div class="diag-stat-label">不同屬性鍵</div>
              <div class="diag-stat-num t-mono">{{ diagnostic.paramKeys.length }}</div>
            </div>
          </div>

          <v-data-table
            :headers="[
              { title: '屬性鍵', key: 'key' },
              { title: '出現次數', key: 'count', align: 'end' },
              { title: '樣本值', key: 'sample' }
            ]"
            :items="diagnostic.paramKeys"
            :items-per-page="20"
            density="compact"
          >
            <template #item.key="{ item }">
              <span class="t-mono diag-key">{{ item.key }}</span>
            </template>
            <template #item.count="{ item }">
              <span class="t-mono">{{ item.count }}</span>
            </template>
            <template #item.sample="{ item }">
              <span class="t-mono diag-sample">{{ item.sample }}</span>
            </template>
          </v-data-table>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.viewer-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.viewer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  height: 56px;
  flex-shrink: 0;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--text-soft);
  transition: background 160ms, color 160ms;
}
.back-btn:hover { background: var(--surface-2); color: var(--text); }

.model-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 360px;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.extract-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--surface-2);
  font-size: 11px;
  color: var(--text-soft);
}
.extract-status.model { color: #16A34A; }
.extract-status.xlsx { color: var(--primary); }
.extract-status.running { background: var(--primary-soft); color: var(--primary); }
.extract-status.idle { color: var(--text-muted); }

.diag-body { padding: 16px; }
.diag-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.diag-stat {
  background: var(--surface-2);
  border-radius: 8px;
  padding: 12px 14px;
}
.diag-stat-label { font-size: 11px; color: var(--text-muted); letter-spacing: 0.04em; }
.diag-stat-num { font-size: 22px; font-weight: 700; color: var(--text); margin-top: 2px; }
.diag-key { font-size: 12px; color: var(--text); }
.diag-sample { font-size: 11px; color: var(--text-muted); }

.viewer-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 380px;
  min-height: 0;
  transition: grid-template-columns 280ms cubic-bezier(0.22, 1, 0.36, 1);
}
.viewer-body.rail-collapsed { grid-template-columns: 1fr 0; }

.canvas-area {
  position: relative;
  background: var(--surface-2);
  overflow: hidden;
}

.rail {
  background: var(--surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rail-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.rail-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-soft);
  position: relative;
  transition: color 160ms;
}
.rail-tab:hover { color: var(--text); }
.rail-tab.active { color: var(--primary); }
.rail-tab.active::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: -1px;
  height: 2px;
  background: var(--primary);
  border-radius: 1px;
}

.tab-badge {
  min-width: 18px !important;
  height: 18px !important;
  padding: 0 6px !important;
  font-size: 10px !important;
}

.rail-content {
  flex: 1;
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .viewer-body { grid-template-columns: 1fr 320px; }
}
@media (max-width: 760px) {
  .viewer-body { grid-template-columns: 1fr; }
  .rail { display: none; }
}
</style>
