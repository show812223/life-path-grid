<script setup lang="ts">
import type { SelectedElement } from '~/components/ForgeViewer.client.vue'
import { useCobieStore, type ExtractedComponent, type ExtractedType, type ExtractedSpace } from '~/composables/useCobieStore'

const props = defineProps<{
  element: SelectedElement | null
  modelId: string
}>()

const emit = defineEmits<{
  focus: [dbId: number]
}>()

const store = useCobieStore()

const component = ref<ExtractedComponent | undefined>()
const type = ref<ExtractedType | undefined>()
const space = ref<ExtractedSpace | undefined>()
const systemNames = ref<string[]>([])
const loading = ref(false)

const reload = async () => {
  component.value = undefined
  type.value = undefined
  space.value = undefined
  systemNames.value = []
  const extId = props.element?.externalId
  if (!extId || !props.modelId) return
  loading.value = true
  try {
    const comp = await store.getComponent(props.modelId, extId)
    component.value = comp
    if (!comp) return
    if (comp.typeName) type.value = await store.getType(props.modelId, comp.typeName)
    if (comp.space) space.value = await store.getSpace(props.modelId, comp.space)
    const sysList = await store.listSystems(props.modelId)
    systemNames.value = sysList
      .filter(s => s.componentExternalIds?.includes(extId))
      .map(s => s.name)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.element?.externalId, props.modelId] as const,
  reload,
  { immediate: true }
)

const fields = computed(() => {
  const c = component.value
  if (!c) return []
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Name', value: c.name || '—' },
    { label: 'Type', value: c.typeName || '—' },
    { label: 'Space', value: c.space || '—' },
    { label: 'Floor', value: space.value?.floorName || '—' },
    { label: 'System', value: systemNames.value.length ? systemNames.value.join('、') : '—' }
  ]
  if (type.value?.category) rows.push({ label: 'Type Category', value: type.value.category })
  if (type.value?.manufacturer) rows.push({ label: 'Manufacturer', value: type.value.manufacturer })
  if (type.value?.modelNumber) rows.push({ label: 'Model Number', value: type.value.modelNumber })
  if (c.tagNumber) rows.push({ label: 'Tag Number', value: c.tagNumber })
  if (c.serialNumber) rows.push({ label: 'Serial Number', value: c.serialNumber })
  if (c.assetIdentifier) rows.push({ label: 'Asset Identifier', value: c.assetIdentifier })
  if (c.installationDate) rows.push({ label: 'Installation Date', value: c.installationDate })
  if (c.warrantyStartDate) rows.push({ label: 'Warranty Start', value: c.warrantyStartDate })
  if (c.description) rows.push({ label: 'Description', value: c.description })
  return rows
})
</script>

<template>
  <div class="inspect-panel">
    <header class="inspect-head">
      <h3 class="inspect-title">檢查項目</h3>
    </header>
    <v-divider />

    <div v-if="!element" class="placeholder">
      <v-icon icon="mdi-cursor-default-click-outline" size="32" color="grey-lighten-1" />
      <div>在 3D 中點選元件</div>
    </div>

    <div v-else-if="loading" class="placeholder">
      <v-progress-circular indeterminate size="20" width="2" />
      <div>查詢中…</div>
    </div>

    <div v-else-if="!component" class="placeholder">
      <v-icon icon="mdi-database-off-outline" size="32" color="grey-lighten-1" />
      <div>此元件未在 COBie 資料表中</div>
      <div class="hint">extId：<code>{{ element.externalId }}</code></div>
    </div>

    <div v-else class="rows">
      <div
        v-for="row in fields"
        :key="row.label"
        class="row"
        :class="{ clickable: row.label === 'Name' && element }"
        @click="row.label === 'Name' && element ? emit('focus', element.dbId) : undefined"
      >
        <div class="row-label">{{ row.label }}</div>
        <div class="row-value">
          {{ row.value }}
          <v-icon
            v-if="row.label === 'Name' && element"
            icon="mdi-crosshairs-gps"
            size="14"
            class="row-icon"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inspect-panel { display: flex; flex-direction: column; height: 100%; }
.inspect-head { padding: 10px 12px; }
.inspect-title { font-size: 13px; font-weight: 700; margin: 0; }
.placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}
.hint { font-size: 11px; color: var(--text-muted); }
.hint code {
  background: var(--surface-2);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  word-break: break-all;
}
.rows {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.row {
  display: flex;
  gap: 10px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border, rgba(0,0,0,0.04));
  font-size: 12px;
}
.row-label {
  flex: 0 0 110px;
  color: var(--text-muted);
  font-weight: 600;
}
.row-value {
  flex: 1;
  word-break: break-word;
  display: flex;
  align-items: center;
  gap: 6px;
}
.row.clickable { cursor: pointer; }
.row.clickable:hover { background: var(--surface-2); }
.row.clickable .row-value { color: var(--primary); }
.row-icon { opacity: 0.7; }
</style>
