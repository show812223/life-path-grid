<script setup lang="ts">
import type { UseCobieFilterReturn, FilterMode } from '~/composables/useCobieFilter'

const props = defineProps<{ filter: UseCobieFilterReturn }>()

const MODE_LABELS: Record<Exclude<FilterMode, null>, string> = {
  floor: '樓層',
  space: '空間',
  type: '類型',
  system: '系統'
}
const MODES: Array<Exclude<FilterMode, null>> = ['floor', 'space', 'type', 'system']

const search = ref('')

watch(
  () => props.filter.pendingMode.value,
  () => { search.value = '' }
)

const filteredOptions = computed(() => {
  const q = search.value.trim().toLowerCase()
  const opts = props.filter.pendingOptions.value
  if (!q) return opts
  return opts.filter(o => o.toLowerCase().includes(q))
})

const onChipClick = (m: Exclude<FilterMode, null>) => {
  if (props.filter.pendingMode.value === m) {
    props.filter.setPendingMode(null)
  } else {
    props.filter.setPendingMode(m)
  }
}

const chipCount = (m: Exclude<FilterMode, null>) => {
  return props.filter.pendingMode.value === m ? props.filter.pendingSelected.value.size : 0
}

const showEmptyMode = computed(() =>
  props.filter.pendingMode.value !== null && props.filter.pendingOptions.value.length === 0
)
</script>

<template>
  <div class="filter-panel">
    <header class="filter-head">
      <h3 class="filter-title">篩選</h3>
      <v-spacer />
      <span v-if="filter.appliedMode.value" class="filter-badge t-mono">
        {{ filter.hitCount.value }} / {{ filter.totalCount.value }}
      </span>
    </header>

    <v-divider />

    <div v-if="filter.indexLoading.value" class="loading">
      <v-progress-circular indeterminate size="20" width="2" />
      <span>載入索引中…</span>
    </div>

    <template v-else>
      <div class="chip-row">
        <v-chip
          v-for="m in MODES"
          :key="m"
          :color="filter.pendingMode.value === m ? 'primary' : undefined"
          :variant="filter.pendingMode.value === m ? 'flat' : 'tonal'"
          size="small"
          @click="onChipClick(m)"
        >
          {{ MODE_LABELS[m] }}<template v-if="chipCount(m) > 0"> · {{ chipCount(m) }}</template>
        </v-chip>
      </div>

      <div v-if="filter.pendingMode.value" class="options-section">
        <div class="options-head">
          <v-btn
            size="x-small"
            variant="text"
            :disabled="filter.pendingOptions.value.length === 0"
            @click="filter.selectAllPending()"
          >全選</v-btn>
          <v-btn
            size="x-small"
            variant="text"
            :disabled="filter.pendingSelected.value.size === 0"
            @click="filter.clearPendingSelection()"
          >清空</v-btn>
        </div>
        <v-text-field
          v-model="search"
          density="compact"
          variant="outlined"
          placeholder="搜尋…"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
          class="options-search"
        />
        <div v-if="showEmptyMode" class="empty-mode">
          無 {{ MODE_LABELS[filter.pendingMode.value!] }} 資料
        </div>
        <div v-else class="options-list">
          <v-checkbox
            v-for="opt in filteredOptions"
            :key="opt"
            :model-value="filter.pendingSelected.value.has(opt)"
            :label="opt"
            density="compact"
            hide-details
            color="primary"
            @update:model-value="filter.togglePending(opt)"
          />
        </div>
      </div>

      <div class="apply-row">
        <v-btn
          size="small"
          variant="text"
          :disabled="filter.appliedMode.value === null && filter.pendingMode.value === null && filter.pendingSelected.value.size === 0"
          @click="filter.clear()"
        >清除</v-btn>
        <v-spacer />
        <v-btn
          size="small"
          color="primary"
          variant="flat"
          :disabled="!filter.canApply.value"
          @click="filter.apply()"
        >
          篩選<span v-if="filter.canApply.value" class="dirty-dot" />
        </v-btn>
      </div>

      <v-divider v-if="filter.appliedMode.value" />

      <div v-if="filter.appliedMode.value" class="results">
        <div class="results-head">結果（{{ filter.hitCount.value }}）</div>
        <div v-if="filter.hitsAsList.value.length === 0" class="empty-hits">
          此條件下無命中
        </div>
        <div v-else class="results-list">
          <div
            v-for="item in filter.hitsAsList.value"
            :key="item.extId"
            class="result-row"
            @click="filter.focusOne(item.extId)"
          >
            <span class="result-name">{{ item.name || '(未命名)' }}</span>
            <span v-if="item.typeName" class="result-type">{{ item.typeName }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.filter-panel { display: flex; flex-direction: column; height: 100%; }
.filter-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; }
.filter-title { font-size: 13px; font-weight: 700; margin: 0; }
.filter-badge { font-size: 11px; color: var(--primary); }
.loading {
  padding: 16px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}
.chip-row { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px; }
.options-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 12px 8px;
  flex: 1;
  min-height: 0;
}
.options-head { display: flex; gap: 4px; }
.options-search :deep(input) { font-size: 12px; }
.options-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: 4px;
  padding: 4px 8px;
  max-height: 260px;
}
.options-list :deep(.v-selection-control) { min-height: 24px; }
.options-list :deep(.v-label) { font-size: 12px; }
.empty-mode { padding: 12px; text-align: center; font-size: 12px; color: var(--text-muted); }
.apply-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 6px;
}
.dirty-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #fff;
  margin-left: 6px;
}
.results { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.results-head { padding: 8px 12px; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.results-list { flex: 1; overflow-y: auto; }
.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  border-top: 1px solid var(--border, rgba(0,0,0,0.04));
}
.result-row:hover { background: var(--surface-2); }
.result-name { word-break: break-word; }
.result-type { color: var(--text-muted); font-size: 11px; flex-shrink: 0; }
.empty-hits { padding: 12px; text-align: center; font-size: 12px; color: var(--text-muted); }
</style>
