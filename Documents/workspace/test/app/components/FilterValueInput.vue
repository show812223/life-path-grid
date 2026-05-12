<script setup lang="ts">
import type { FilterCondition, FilterDimension, FilterCtx } from '~/composables/filterTypes'

const props = defineProps<{
  condition: FilterCondition
  dimension: FilterDimension
  ctx: FilterCtx | null
}>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<FilterCondition>): void
}>()

const options = computed(() =>
  props.ctx && props.dimension.loadOptions ? props.dimension.loadOptions(props.ctx) : []
)

const attrNamesList = computed(() => {
  if (props.dimension.id !== 'attr' || !props.ctx) return []
  return props.dimension.loadOptions(props.ctx)
})

const setValue = (value: any) => emit('update', { value })
const setAttrName = (attrName: string) => emit('update', { attrName, value: undefined })
const setAttrValue = (raw: string) =>
  emit('update', { value: { attrName: props.condition.attrName, value: raw } })
</script>

<template>
  <div v-if="dimension.id === 'attr'" class="attr-input">
    <v-autocomplete
      :model-value="condition.attrName"
      :items="attrNamesList"
      placeholder="屬性名稱"
      density="compact"
      variant="outlined"
      hide-details
      @update:model-value="setAttrName"
    />
    <v-text-field
      v-if="condition.attrName"
      :model-value="(condition.value as any)?.value ?? ''"
      :placeholder="condition.op === 'contains' ? '包含值…' : '值'"
      density="compact"
      variant="outlined"
      hide-details
      @update:model-value="setAttrValue"
    />
  </div>

  <v-autocomplete
    v-else-if="condition.op === 'in'"
    :model-value="condition.value ?? []"
    :items="options"
    multiple chips closable-chips
    density="compact"
    variant="outlined"
    placeholder="挑選一個或多個…"
    hide-details
    @update:model-value="setValue"
  />

  <div v-else-if="condition.op === 'range'" class="range-input">
    <v-text-field
      :model-value="(condition.value as any)?.min ?? ''"
      placeholder="最小"
      type="number"
      density="compact" variant="outlined" hide-details
      @update:model-value="(v) => setValue({ ...(condition.value ?? {}), min: v === '' ? undefined : Number(v) })"
    />
    <span>—</span>
    <v-text-field
      :model-value="(condition.value as any)?.max ?? ''"
      placeholder="最大"
      type="number"
      density="compact" variant="outlined" hide-details
      @update:model-value="(v) => setValue({ ...(condition.value ?? {}), max: v === '' ? undefined : Number(v) })"
    />
  </div>

  <div v-else-if="condition.op === 'dateRange'" class="range-input">
    <v-text-field
      :model-value="(condition.value as any)?.from ?? ''"
      placeholder="起" type="date"
      density="compact" variant="outlined" hide-details
      @update:model-value="(v) => setValue({ ...(condition.value ?? {}), from: v || undefined })"
    />
    <span>—</span>
    <v-text-field
      :model-value="(condition.value as any)?.to ?? ''"
      placeholder="迄" type="date"
      density="compact" variant="outlined" hide-details
      @update:model-value="(v) => setValue({ ...(condition.value ?? {}), to: v || undefined })"
    />
  </div>

  <v-text-field
    v-else-if="condition.op === 'contains'"
    :model-value="condition.value ?? ''"
    placeholder="包含…"
    density="compact" variant="outlined" hide-details
    @update:model-value="setValue"
  />

  <v-autocomplete
    v-else
    :model-value="condition.value ?? null"
    :items="options"
    placeholder="挑選…"
    density="compact" variant="outlined" hide-details clearable
    @update:model-value="setValue"
  />
</template>

<style scoped>
.attr-input, .range-input {
  display: flex;
  gap: 6px;
  align-items: center;
}
.range-input span { color: var(--text-muted); font-size: 12px; }
</style>
