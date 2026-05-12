<script setup lang="ts">
import type { FilterCondition, FilterDimension, FilterCtx } from '~/composables/filterTypes'
import { REGISTRY } from '~/composables/filterRegistry'
import FilterValueInput from './FilterValueInput.vue'

const props = defineProps<{
  condition: FilterCondition
  ctx: FilterCtx | null
  isFirstActive: boolean
}>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<FilterCondition>): void
  (e: 'remove'): void
}>()

const dim = computed<FilterDimension>(() => REGISTRY[props.condition.dimensionId])
const showExpandHint = computed(() =>
  props.isFirstActive && props.condition.dimensionId === 'type.name'
)
</script>

<template>
  <div class="cond-card">
    <div class="cond-head">
      <span class="cond-dim">{{ dim?.label ?? condition.dimensionId }}</span>
      <v-select
        :model-value="condition.op"
        :items="dim?.ops ?? []"
        density="compact" variant="plain" hide-details
        style="width: 96px"
        @update:model-value="(op) => emit('update', { op, value: undefined })"
      />
      <v-spacer />
      <v-btn icon="mdi-close" variant="text" size="x-small" @click="emit('remove')" />
    </div>
    <FilterValueInput
      :condition="condition"
      :dimension="dim"
      :ctx="ctx"
      @update="(p) => emit('update', p)"
    />
    <div v-if="showExpandHint" class="cond-hint">
      <v-icon icon="mdi-expand-all-outline" size="12" />
      自動展開為同 Type.Category
    </div>
  </div>
</template>

<style scoped>
.cond-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cond-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cond-dim {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.cond-hint {
  font-size: 11px;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
