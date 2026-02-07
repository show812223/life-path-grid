<script setup lang="ts">
import { NCard, NTag, NCollapseTransition } from 'naive-ui'
import type { LifeCycleNumbers } from '~/shared/types'
import { getLifeCycleMeaning } from '~/shared/constants/numberMeanings'

interface Props {
  lifeCycles: LifeCycleNumbers
}

const props = defineProps<Props>()

const showCalculation = ref(false)

const cycles = computed(() => [
  {
    label: '早期週期',
    sublabel: '月份 → 成長基礎',
    icon: 'mdi:sprout',
    color: 'success',
    ...props.lifeCycles.earlyCycle,
    meaning: getLifeCycleMeaning(props.lifeCycles.earlyCycle.number)
  },
  {
    label: '中期週期',
    sublabel: '日期 → 核心發展',
    icon: 'mdi:account-star',
    color: 'info',
    ...props.lifeCycles.middleCycle,
    meaning: getLifeCycleMeaning(props.lifeCycles.middleCycle.number)
  },
  {
    label: '晚期週期',
    sublabel: '年份 → 人生收穫',
    icon: 'mdi:tree',
    color: 'warning',
    ...props.lifeCycles.lateCycle,
    meaning: getLifeCycleMeaning(props.lifeCycles.lateCycle.number)
  }
])
</script>

<template>
  <NCard class="life-cycles" :bordered="false">
    <div class="section-header">
      <Icon icon="mdi:timeline-clock-outline" class="w-5 h-5 mr-2 text-accent" />
      <span class="section-title">生命週期數</span>
    </div>

    <div class="cycles-grid">
      <div
        v-for="cycle in cycles"
        :key="cycle.label"
        class="cycle-card"
      >
        <div class="cycle-header">
          <Icon :icon="cycle.icon" class="w-5 h-5" :class="`text-${cycle.color}`" />
          <div class="cycle-label-group">
            <span class="cycle-label">{{ cycle.label }}</span>
            <span class="cycle-sublabel">{{ cycle.sublabel }}</span>
          </div>
        </div>

        <div class="cycle-number-display">
          <span class="cycle-number" :class="`number-${cycle.color}`">{{ cycle.number }}</span>
        </div>

        <div class="cycle-age">
          <NTag size="small" :bordered="false">{{ cycle.ageRange }}</NTag>
        </div>

        <div v-if="cycle.meaning" class="cycle-meaning">
          <p class="cycle-name">{{ cycle.meaning.name }}</p>
          <p class="cycle-desc">{{ cycle.meaning.description }}</p>
        </div>
      </div>
    </div>

    <!-- 計算過程 -->
    <div class="mt-4">
      <button
        class="disclosure-button text-sm"
        @click="showCalculation = !showCalculation"
      >
        <span class="flex items-center">
          <Icon icon="mdi:calculator" class="w-4 h-4 mr-2" />
          計算過程
        </span>
        <Icon
          :icon="showCalculation ? 'mdi:chevron-up' : 'mdi:chevron-down'"
          class="w-5 h-5 text-text-muted"
        />
      </button>
      <NCollapseTransition :show="showCalculation">
        <div class="calculation-steps mt-2">
          <div
            v-for="(step, index) in lifeCycles.calculationSteps"
            :key="index"
            class="step-item"
          >
            {{ step }}
          </div>
        </div>
      </NCollapseTransition>
    </div>
  </NCard>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.life-cycles {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.section-header {
  @apply flex items-center mb-4;
}

.section-title {
  @apply font-serif text-lg font-semibold text-text-primary;
}

.cycles-grid {
  @apply grid grid-cols-1 sm:grid-cols-3 gap-4;
}

.cycle-card {
  @apply p-4 rounded-soft text-center;
  background: rgba(0, 0, 0, 0.02);
}

.cycle-header {
  @apply flex items-center gap-2 mb-3 justify-center;
}

.cycle-label-group {
  @apply flex flex-col text-left;
}

.cycle-label {
  @apply font-serif text-sm font-semibold text-text-primary;
}

.cycle-sublabel {
  @apply text-xs text-text-muted;
}

.cycle-number-display {
  @apply flex justify-center mb-2;
}

.cycle-number {
  @apply inline-flex items-center justify-center w-14 h-14
         font-serif text-2xl font-bold text-white rounded-2xl;
}

.number-success {
  background: linear-gradient(135deg, #8FB996, #6a9b72);
  box-shadow: 0 4px 16px rgba(143, 185, 150, 0.35);
}

.number-info {
  background: linear-gradient(135deg, #7EACC1, #5a8fa8);
  box-shadow: 0 4px 16px rgba(126, 172, 193, 0.35);
}

.number-warning {
  background: linear-gradient(135deg, #C5A467, #a88d50);
  box-shadow: 0 4px 16px rgba(197, 164, 103, 0.35);
}

.cycle-age {
  @apply mb-3;
}

.cycle-meaning {
  @apply text-left;
}

.cycle-name {
  @apply font-serif text-sm font-semibold text-text-primary mb-1;
}

.cycle-desc {
  @apply text-xs text-text-muted leading-relaxed mb-0;
}

.disclosure-button {
  @apply flex w-full items-center justify-between px-4 py-3
         text-left font-medium text-text-primary
         bg-surface-variant rounded-soft
         transition-all duration-200 cursor-pointer
         hover:bg-surface-variant/80;
}

.calculation-steps {
  @apply font-sans text-xs text-text-muted;
}

.step-item {
  @apply py-1 border-b border-border;
}

.step-item:last-child {
  @apply border-b-0 font-semibold text-success;
}
</style>
