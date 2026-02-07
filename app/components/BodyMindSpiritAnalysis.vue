<script setup lang="ts">
import { NCard, NTag } from 'naive-ui'
import type { BodyMindSpiritAnalysis } from '~/shared/types'

interface Props {
  analysis: BodyMindSpiritAnalysis
}

const props = defineProps<Props>()

const dimensions = computed(() => [
  {
    key: 'body',
    label: '身（物質/行動）',
    icon: 'mdi:run',
    color: 'success',
    numbers: '1 - 4 - 7',
    count: props.analysis.body.count,
    description: '代表物質世界、行動力、務實能力。涵蓋生存、財務、體能與執行力。'
  },
  {
    key: 'mind',
    label: '心（情感/溝通）',
    icon: 'mdi:head-heart-outline',
    color: 'info',
    numbers: '2 - 5 - 8',
    count: props.analysis.mind.count,
    description: '代表情感世界、溝通表達、心理力量。涵蓋人際關係、情緒管理與心智成長。'
  },
  {
    key: 'spirit',
    label: '靈（創意/直覺）',
    icon: 'mdi:meditation',
    color: 'warning',
    numbers: '3 - 6 - 9',
    count: props.analysis.spirit.count,
    description: '代表靈性世界、創造力、直覺。涵蓋想像力、藝術天賦、靈性成長與更高視野。'
  }
])

const total = computed(() =>
  props.analysis.body.count + props.analysis.mind.count + props.analysis.spirit.count
)

function getPercentage(count: number): number {
  if (total.value === 0) return 0
  return Math.round((count / total.value) * 100)
}

const dominantLabel = computed(() => {
  const labels: Record<string, string> = {
    body: '偏重物質/行動',
    mind: '偏重情感/溝通',
    spirit: '偏重靈性/創意',
    balanced: '身心靈平衡'
  }
  return labels[props.analysis.dominant]
})

const dominantType = computed(() => {
  const types: Record<string, 'success' | 'info' | 'warning' | 'primary'> = {
    body: 'success',
    mind: 'info',
    spirit: 'warning',
    balanced: 'primary'
  }
  return types[props.analysis.dominant]
})
</script>

<template>
  <NCard class="bms-analysis" :bordered="false">
    <div class="section-header">
      <Icon icon="mdi:yin-yang" class="w-5 h-5 mr-2 text-accent" />
      <span class="section-title">身心靈分析</span>
      <NTag :type="dominantType" size="small" class="ml-2">
        {{ dominantLabel }}
      </NTag>
    </div>

    <div class="dimensions-grid">
      <div
        v-for="dim in dimensions"
        :key="dim.key"
        class="dimension-card"
        :class="{ dominant: analysis.dominant === dim.key }"
      >
        <div class="dim-header">
          <Icon :icon="dim.icon" class="w-5 h-5" :class="`text-${dim.color}`" />
          <span class="dim-label">{{ dim.label }}</span>
        </div>
        <div class="dim-numbers">{{ dim.numbers }}</div>
        <div class="dim-bar-container">
          <div
            class="dim-bar"
            :class="`bar-${dim.color}`"
            :style="{ width: `${getPercentage(dim.count)}%` }"
          />
        </div>
        <div class="dim-stats">
          <span class="dim-count">{{ dim.count }} 圈</span>
          <span class="dim-percent">{{ getPercentage(dim.count) }}%</span>
        </div>
        <p class="dim-description">{{ dim.description }}</p>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.bms-analysis {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.section-header {
  @apply flex items-center mb-4;
}

.section-title {
  @apply font-serif text-lg font-semibold text-text-primary;
}

.dimensions-grid {
  @apply grid grid-cols-1 sm:grid-cols-3 gap-4;
}

.dimension-card {
  @apply p-4 rounded-soft transition-all duration-300;
  background: rgba(0, 0, 0, 0.02);
  border: 2px solid transparent;
}

.dimension-card.dominant {
  background: linear-gradient(135deg, rgba(212, 165, 165, 0.1) 0%, rgba(157, 195, 183, 0.08) 100%);
  @apply border-primary-light;
}

.dim-header {
  @apply flex items-center gap-2 mb-2;
}

.dim-label {
  @apply font-serif text-sm font-semibold text-text-primary;
}

.dim-numbers {
  @apply text-xs text-text-muted mb-3;
}

.dim-bar-container {
  @apply w-full h-2.5 rounded-full mb-2;
  background: rgba(0, 0, 0, 0.06);
}

.dim-bar {
  @apply h-full rounded-full transition-all duration-500;
  min-width: 4px;
}

.bar-success {
  background: linear-gradient(90deg, #8FB996, #6a9b72);
}

.bar-info {
  background: linear-gradient(90deg, #7EACC1, #5a8fa8);
}

.bar-warning {
  background: linear-gradient(90deg, #C5A467, #a88d50);
}

.dim-stats {
  @apply flex justify-between text-sm mb-2;
}

.dim-count {
  @apply font-semibold text-text-primary;
}

.dim-percent {
  @apply text-text-muted;
}

.dim-description {
  @apply text-xs text-text-muted leading-relaxed mt-1 mb-0;
}
</style>
