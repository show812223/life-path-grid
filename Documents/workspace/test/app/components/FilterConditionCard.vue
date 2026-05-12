<script setup lang="ts">
import type { FilterCondition, FilterDimension, FilterCtx } from '~/composables/filterTypes'
import { REGISTRY } from '~/composables/filterRegistry'

const props = defineProps<{
  condition: FilterCondition
  ctx: FilterCtx | null
  isFirstActive: boolean
}>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<FilterCondition>): void
  (e: 'remove'): void
}>()

// 4 個固定的「篩選類型」對應到底層 dimensionId
const FILTER_TYPES = [
  { title: '樓層', value: 'floor.name' },
  { title: '空間', value: 'space.name' },
  { title: '設備類型', value: 'type.name' },
  { title: '設備系統', value: 'system.name' }
] as const

const dim = computed<FilterDimension | null>(() =>
  props.condition.dimensionId ? REGISTRY[props.condition.dimensionId] ?? null : null
)

const valueOptions = computed<string[]>(() => {
  if (!dim.value || !props.ctx) return []
  try {
    return dim.value.loadOptions(props.ctx)
  } catch {
    return []
  }
})

const showExpandHint = computed(() =>
  props.isFirstActive && props.condition.dimensionId === 'type.name' &&
  Array.isArray(props.condition.value) && props.condition.value.length > 0
)

const onTypeChange = (newDimId: string) => {
  // 切換篩選類型時清掉舊值，op 固定 in
  emit('update', { dimensionId: newDimId, op: 'in', value: undefined })
}

const onValueChange = (v: string[] | null) => {
  emit('update', { value: v ?? [] })
}
</script>

<template>
  <div class="cond-card">
    <div class="cond-row">
      <span class="cond-label">篩選類型</span>
      <v-select
        :model-value="condition.dimensionId || null"
        :items="FILTER_TYPES"
        item-title="title"
        item-value="value"
        placeholder="選擇類型…"
        density="compact"
        variant="outlined"
        hide-details
        @update:model-value="onTypeChange"
      />
      <v-btn icon="mdi-close" variant="text" size="x-small" aria-label="移除條件" @click="emit('remove')" />
    </div>

    <div v-if="condition.dimensionId" class="cond-row">
      <span class="cond-label">篩選值</span>
      <v-autocomplete
        :model-value="(condition.value as string[]) ?? []"
        :items="valueOptions"
        multiple
        chips
        closable-chips
        placeholder="挑選一個或多個…"
        density="compact"
        variant="outlined"
        hide-details
        @update:model-value="onValueChange"
      />
    </div>

    <div v-if="showExpandHint" class="cond-hint">
      <v-icon icon="mdi-expand-all-outline" size="12" />
      已自動展開同類別構件
    </div>
  </div>
</template>

<style scoped>
.cond-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cond-row {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  align-items: center;
  gap: 8px;
}
.cond-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-soft);
}
.cond-hint {
  font-size: 11px;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 78px;
}
</style>
