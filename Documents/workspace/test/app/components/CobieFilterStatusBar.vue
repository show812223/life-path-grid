<script setup lang="ts">
import type { UseCobieFilterReturn } from '~/composables/useCobieFilter'

const props = defineProps<{ filter: UseCobieFilterReturn }>()

const show = computed(() => props.filter.enabled.value && props.filter.result.value.active)
const hitCount = computed(() => {
  const r = props.filter.result.value
  return r.active ? r.finalSet.size : 0
})
const totalCount = computed(() => props.filter.ctx.value?.components.length ?? 0)
</script>

<template>
  <div v-if="show" class="status-bar">
    <v-icon icon="mdi-filter-variant" size="14" color="primary" />
    <span class="t-label">篩選</span>
    <span class="t-mono">{{ hitCount }} / {{ totalCount }} 件</span>
    <v-btn variant="text" size="x-small" @click="filter.clearAll()">清除</v-btn>
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
  padding: 4px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  font-size: 12px;
}
</style>
