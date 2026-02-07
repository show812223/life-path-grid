<script setup lang="ts">
import { NCard, NTag, NCollapseTransition } from 'naive-ui'
import type { FiveElementsAnalysis } from '~/shared/types'
import { ELEMENT_INFO, GENERATING_CYCLE } from '~/shared/constants/fiveElementsMeanings'

interface Props {
  analysis: FiveElementsAnalysis
}

const props = defineProps<Props>()

const showDetails = ref(false)

const totalCount = computed(() => {
  const e = props.analysis.elements
  return e.water.count + e.wood.count + e.fire.count + e.earth.count + e.metal.count
})

function getPercentage(count: number): number {
  if (totalCount.value === 0) return 0
  return Math.round((count / totalCount.value) * 100)
}

const elementEntries = computed(() => {
  const order = ['木', '火', '土', '金', '水']
  const keyMap: Record<string, keyof typeof props.analysis.elements> = {
    '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water'
  }
  return order.map(name => ({
    name,
    info: ELEMENT_INFO[name],
    count: props.analysis.elements[keyMap[name]].count,
    numbers: props.analysis.elements[keyMap[name]].numbers
  }))
})
</script>

<template>
  <NCard class="five-elements" :bordered="false">
    <div class="section-header mb-4">
      <Icon icon="mdi:yin-yang" class="w-5 h-5 mr-2 text-info" />
      <span class="section-title">五行分析</span>
    </div>

    <!-- 五行圓環 -->
    <div class="cycle-display">
      <div
        v-for="(entry, i) in elementEntries"
        :key="entry.name"
        class="element-node"
      >
        <div class="element-circle" :style="{ borderColor: entry.info.color, opacity: entry.count > 0 ? 1 : 0.4 }">
          <Icon :icon="entry.info.icon" class="w-5 h-5" :style="{ color: entry.info.color }" />
          <span class="element-count" :style="{ color: entry.info.color }">{{ entry.count }}</span>
        </div>
        <span class="element-name">{{ entry.name }}</span>
        <span v-if="i < elementEntries.length - 1" class="cycle-arrow">→</span>
      </div>
    </div>

    <!-- 柱狀圖 -->
    <div class="bar-chart mt-4">
      <div v-for="entry in elementEntries" :key="entry.name" class="bar-row">
        <span class="bar-label">
          <Icon :icon="entry.info.icon" class="w-4 h-4 mr-1" :style="{ color: entry.info.color }" />
          {{ entry.name }}
        </span>
        <div class="bar-track">
          <div
            class="bar-fill"
            :style="{ width: `${getPercentage(entry.count)}%`, backgroundColor: entry.info.color }"
          />
        </div>
        <span class="bar-value">{{ entry.count }}</span>
      </div>
    </div>

    <!-- 主導與缺乏 -->
    <div class="summary mt-4">
      <div class="summary-item">
        <NTag type="success" size="small">
          主導：{{ analysis.dominant }}
        </NTag>
      </div>
      <div v-if="analysis.weak.length > 0" class="summary-item">
        <NTag type="warning" size="small">
          缺乏：{{ analysis.weak.join('、') }}
        </NTag>
      </div>
      <div v-else class="summary-item">
        <NTag type="info" size="small">五行齊全</NTag>
      </div>
    </div>

    <!-- 詳細解讀 -->
    <button class="disclosure-button text-sm mt-3" @click="showDetails = !showDetails">
      <span class="flex items-center">
        <Icon icon="mdi:information-outline" class="w-4 h-4 mr-2" />
        五行詳解
      </span>
      <Icon :icon="showDetails ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 text-text-muted" />
    </button>
    <NCollapseTransition :show="showDetails">
      <div class="details-content">
        <div v-for="entry in elementEntries" :key="entry.name" class="element-detail">
          <div class="element-detail-header">
            <Icon :icon="entry.info.icon" class="w-4 h-4 mr-1" :style="{ color: entry.info.color }" />
            <span class="font-semibold">{{ entry.name }}</span>
            <span class="text-text-muted ml-1">（數字 {{ entry.numbers.join('、') }}）</span>
          </div>
          <p class="element-desc">{{ entry.info.description }}</p>
          <p v-if="entry.count >= 3" class="element-note excess">{{ entry.info.excess }}</p>
          <p v-else-if="entry.count === 0" class="element-note deficient">{{ entry.info.deficient }}</p>
        </div>
      </div>
    </NCollapseTransition>
  </NCard>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.five-elements {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.section-header {
  @apply flex items-center;
}

.section-title {
  @apply font-serif text-lg font-semibold text-text-primary;
}

.cycle-display {
  @apply flex items-center justify-center flex-wrap gap-1;
}

.element-node {
  @apply flex items-center gap-1;
}

.element-circle {
  @apply flex flex-col items-center justify-center
         w-14 h-14 rounded-full border-2 bg-surface;
}

.element-count {
  @apply text-xs font-bold mt-0.5;
}

.element-name {
  @apply text-xs text-text-muted;
}

.cycle-arrow {
  @apply text-text-muted text-xs mx-1;
}

.bar-chart {
  @apply space-y-2;
}

.bar-row {
  @apply flex items-center gap-3;
}

.bar-label {
  @apply flex items-center text-sm text-text-primary w-12;
}

.bar-track {
  @apply flex-1 h-4 bg-surface-variant rounded-full overflow-hidden;
}

.bar-fill {
  @apply h-full rounded-full transition-all duration-500;
  min-width: 4px;
}

.bar-value {
  @apply text-sm text-text-muted w-6 text-right;
}

.summary {
  @apply flex gap-2 flex-wrap;
}

.disclosure-button {
  @apply flex w-full items-center justify-between px-4 py-3
         text-left font-medium text-text-primary
         bg-surface-variant rounded-soft
         transition-all duration-200 cursor-pointer
         hover:bg-surface-variant/80;
}

.details-content {
  @apply px-3 py-3 space-y-4;
}

.element-detail-header {
  @apply flex items-center text-sm text-text-primary mb-1;
}

.element-desc {
  @apply text-sm text-text-muted leading-relaxed mb-1;
}

.element-note {
  @apply text-xs leading-relaxed px-3 py-2 rounded-[10px];
}

.element-note.excess {
  @apply bg-warning/10 text-warning;
}

.element-note.deficient {
  @apply bg-info/10 text-info;
}
</style>
