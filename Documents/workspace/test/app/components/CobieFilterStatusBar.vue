<script setup lang="ts">
import type { UseCobieFilterReturn, FilterMode } from '~/composables/useCobieFilter'

const props = defineProps<{ filter: UseCobieFilterReturn }>()

const MODE_LABELS: Record<Exclude<FilterMode, null>, string> = {
  floor: '樓層',
  space: '空間',
  type: '類型',
  system: '系統'
}

const show = computed(() => props.filter.appliedMode.value !== null)
const label = computed(() => {
  const m = props.filter.appliedMode.value
  return m ? MODE_LABELS[m] : ''
})
</script>

<template>
  <div v-if="show" class="status-bar">
    <v-icon icon="mdi-filter-variant" size="14" color="primary" />
    <span class="t-label">{{ label }}</span>
    <span class="t-mono">{{ filter.appliedSelected.value.size }} 已選</span>
    <span class="t-mono divider">·</span>
    <span class="t-mono">{{ filter.hitCount.value }} 件</span>
    <v-btn
      icon="mdi-close"
      variant="text"
      size="x-small"
      title="清除篩選"
      @click="filter.clear()"
    />
  </div>
</template>

<style scoped>
.status-bar {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  font-size: 12px;
}
.divider { color: var(--text-muted); }
</style>
