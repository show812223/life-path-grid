<script setup lang="ts">
import { NCard, NCollapseTransition } from 'naive-ui'
import type { GridData } from '~/shared/types'
import { getCircleCountMeaning, getNumberMeaning } from '~/shared/constants/numberMeanings'

interface Props {
  gridData: GridData
}

const props = defineProps<Props>()

const circleData = computed(() => {
  const items = []
  for (let i = 1; i <= 9; i++) {
    const count = props.gridData[i]?.count || 0
    const meaning = getCircleCountMeaning(count)
    const numberMeaning = getNumberMeaning(i)
    items.push({
      number: i,
      count,
      label: meaning.label,
      description: meaning.description,
      numberName: numberMeaning?.name || ''
    })
  }
  return items
})

const expandedPanels = ref<Record<number, boolean>>({})

function togglePanel(num: number) {
  expandedPanels.value[num] = !expandedPanels.value[num]
}

function getCountColor(count: number): string {
  if (count === 0) return 'text-text-muted'
  if (count === 1) return 'text-warning'
  if (count === 2) return 'text-success'
  if (count === 3) return 'text-info'
  return 'text-error'
}

function getCountBg(count: number): string {
  if (count === 0) return 'bg-surface-variant'
  if (count === 1) return 'bg-warning/15'
  if (count === 2) return 'bg-success/15'
  if (count === 3) return 'bg-info/15'
  return 'bg-error/15'
}
</script>

<template>
  <NCard class="circle-count-analysis" :bordered="false">
    <div class="section-header">
      <Icon icon="mdi:circle-multiple" class="w-5 h-5 mr-2 text-primary" />
      <span class="section-title">圈數解讀</span>
    </div>

    <p class="intro-text">每個數字在九宮格中出現的次數（圈數）代表該能量的強度。</p>

    <div class="circle-grid">
      <div
        v-for="item in circleData"
        :key="item.number"
        class="circle-item"
        :class="getCountBg(item.count)"
      >
        <span class="item-number">{{ item.number }}</span>
        <span class="item-circles" :class="getCountColor(item.count)">
          <template v-if="item.count === 0">-</template>
          <template v-else>
            <span v-for="c in item.count" :key="c">●</span>
          </template>
        </span>
        <span class="item-label" :class="getCountColor(item.count)">{{ item.label }}</span>
      </div>
    </div>

    <div class="mt-4 space-y-2">
      <div
        v-for="item in circleData"
        :key="item.number"
        class="meaning-panel"
      >
        <button
          class="disclosure-button"
          @click="togglePanel(item.number)"
        >
          <div class="panel-title">
            <span class="panel-number" :class="getCountBg(item.count)">{{ item.number }}</span>
            <span class="panel-name">{{ item.label }}</span>
            <span class="panel-count" :class="getCountColor(item.count)">{{ item.count }} 圈</span>
          </div>
          <Icon
            :icon="expandedPanels[item.number] ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            class="w-5 h-5 text-text-muted"
          />
        </button>
        <NCollapseTransition :show="expandedPanels[item.number]">
          <div class="meaning-content">
            <p class="description">{{ item.description }}</p>
          </div>
        </NCollapseTransition>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.circle-count-analysis {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.section-header {
  @apply flex items-center mb-4;
}

.section-title {
  @apply font-serif text-lg font-semibold text-text-primary;
}

.intro-text {
  @apply text-sm text-text-muted mb-4;
}

.circle-grid {
  @apply grid grid-cols-3 gap-2;
}

.circle-item {
  @apply flex flex-col items-center p-3 rounded-soft;
}

.item-number {
  @apply font-serif text-lg font-bold text-text-primary;
}

.item-circles {
  @apply text-xs my-1 tracking-wider;
}

.item-label {
  @apply text-xs font-medium;
}

.disclosure-button {
  @apply flex w-full items-center justify-between px-4 py-3
         text-left font-medium text-text-primary
         bg-surface-variant rounded-soft
         transition-all duration-200 cursor-pointer
         hover:bg-surface-variant/80;
}

.meaning-panel {
  @apply overflow-hidden rounded-soft;
}

.panel-title {
  @apply flex items-center gap-3;
}

.panel-number {
  @apply inline-flex items-center justify-center w-7 h-7
         font-serif text-sm font-semibold rounded-lg;
}

.panel-name {
  @apply font-medium text-text-primary;
}

.panel-count {
  @apply text-sm font-medium;
}

.meaning-content {
  @apply px-4 py-3;
}

.meaning-content .description {
  @apply text-text-primary leading-relaxed;
}
</style>
