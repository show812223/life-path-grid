<script setup lang="ts">
import type { FilterCondition, FilterCtx, FilterDimension } from '~/composables/filterTypes'
import FilterConditionCard from './FilterConditionCard.vue'

defineProps<{
  groupId: string
  conditions: FilterCondition[]
  ctx: FilterCtx | null
  availableDimensions: readonly FilterDimension[]
  isFirstActive: boolean
}>()

const emit = defineEmits<{
  (e: 'update-condition', conditionId: string, patch: Partial<FilterCondition>): void
  (e: 'remove-condition', conditionId: string): void
  (e: 'add-condition', dimensionId: string): void
  (e: 'remove-group'): void
}>()

const showAddMenu = ref(false)
</script>

<template>
  <div class="or-group">
    <div class="or-label">OR</div>
    <div class="or-body">
      <FilterConditionCard
        v-for="(c, i) in conditions"
        :key="c.id"
        :condition="c"
        :ctx="ctx"
        :is-first-active="isFirstActive && i === 0"
        @update="(p) => emit('update-condition', c.id, p)"
        @remove="emit('remove-condition', c.id)"
      />

      <v-menu v-model="showAddMenu">
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="text" size="small" prepend-icon="mdi-plus" class="or-add">
            加入 OR 條件
          </v-btn>
        </template>
        <v-list density="compact" max-height="320">
          <v-list-item
            v-for="d in availableDimensions"
            :key="d.id"
            @click="emit('add-condition', d.id); showAddMenu = false"
          >
            <v-list-item-title>{{ d.label }}</v-list-item-title>
            <v-list-item-subtitle class="t-mono" style="font-size: 10px">{{ d.id }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
    <v-btn icon="mdi-close" variant="text" size="x-small" class="or-remove" @click="emit('remove-group')" />
  </div>
</template>

<style scoped>
.or-group {
  position: relative;
  border: 1.5px dashed var(--primary);
  border-radius: 8px;
  padding: 8px 32px 8px 36px;
  background: var(--primary-soft);
}
.or-label {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 10px;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 0.08em;
}
.or-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.or-add { align-self: flex-start; }
.or-remove {
  position: absolute;
  top: 6px;
  right: 6px;
}
</style>
