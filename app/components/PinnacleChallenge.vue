<script setup lang="ts">
import { NCard, NCollapseTransition } from 'naive-ui'
import type { PinnacleNumbers, ChallengeNumbers } from '~/shared/types'
import { getPinnacleNumberMeaning, getChallengeNumberMeaning } from '~/shared/constants/numberMeanings'

interface Props {
  pinnacleNumbers: PinnacleNumbers
  challengeNumbers: ChallengeNumbers
}

const props = defineProps<Props>()

const showPinnacleCalc = ref(false)
const showChallengeCalc = ref(false)
const expandedPinnacles = ref<Record<number, boolean>>({})
const expandedChallenges = ref<Record<number, boolean>>({})

function togglePinnacle(index: number) {
  expandedPinnacles.value[index] = !expandedPinnacles.value[index]
}

function toggleChallenge(index: number) {
  expandedChallenges.value[index] = !expandedChallenges.value[index]
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- 高峰數 -->
    <NCard class="pinnacle-card" :bordered="false">
      <div class="section-header">
        <Icon icon="mdi:mountain" class="w-5 h-5 mr-2 text-primary" />
        <span class="section-title">高峰數</span>
      </div>
      <p class="intro-text">人生四大階段的主題能量</p>

      <div class="number-timeline">
        <div
          v-for="(p, index) in pinnacleNumbers.pinnacles"
          :key="index"
          class="timeline-item"
        >
          <button class="timeline-button" @click="togglePinnacle(index)">
            <div class="timeline-left">
              <span class="timeline-number pinnacle-bg">{{ p.number }}</span>
              <div class="timeline-info">
                <span class="timeline-label">第{{ index + 1 }}高峰</span>
                <span class="timeline-range">{{ p.ageRange }}</span>
              </div>
            </div>
            <Icon
              :icon="expandedPinnacles[index] ? 'mdi:chevron-up' : 'mdi:chevron-down'"
              class="w-5 h-5 text-text-muted"
            />
          </button>
          <NCollapseTransition :show="expandedPinnacles[index]">
            <div class="timeline-detail">
              <p>{{ getPinnacleNumberMeaning(p.number)?.description }}</p>
            </div>
          </NCollapseTransition>
        </div>
      </div>

      <div class="mt-3">
        <button class="disclosure-button text-sm" @click="showPinnacleCalc = !showPinnacleCalc">
          <span class="flex items-center">
            <Icon icon="mdi:calculator" class="w-4 h-4 mr-2" />
            計算過程
          </span>
          <Icon
            :icon="showPinnacleCalc ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            class="w-5 h-5 text-text-muted"
          />
        </button>
        <NCollapseTransition :show="showPinnacleCalc">
          <div class="calc-steps">
            <div v-for="(step, i) in pinnacleNumbers.calculationSteps" :key="i" class="step-item">
              {{ step }}
            </div>
          </div>
        </NCollapseTransition>
      </div>
    </NCard>

    <!-- 挑戰數 -->
    <NCard class="challenge-card" :bordered="false">
      <div class="section-header">
        <Icon icon="mdi:sword-cross" class="w-5 h-5 mr-2 text-warning" />
        <span class="section-title">挑戰數</span>
      </div>
      <p class="intro-text">人生需要克服的課題</p>

      <div class="number-timeline">
        <div
          v-for="(c, index) in challengeNumbers.challenges"
          :key="index"
          class="timeline-item"
          :class="{ 'main-challenge': c.label === '主要挑戰' }"
        >
          <button class="timeline-button" @click="toggleChallenge(index)">
            <div class="timeline-left">
              <span class="timeline-number challenge-bg">{{ c.number }}</span>
              <div class="timeline-info">
                <span class="timeline-label">{{ c.label }}</span>
                <span v-if="c.label === '主要挑戰'" class="main-badge">核心</span>
              </div>
            </div>
            <Icon
              :icon="expandedChallenges[index] ? 'mdi:chevron-up' : 'mdi:chevron-down'"
              class="w-5 h-5 text-text-muted"
            />
          </button>
          <NCollapseTransition :show="expandedChallenges[index]">
            <div class="timeline-detail">
              <p>{{ getChallengeNumberMeaning(c.number)?.description }}</p>
            </div>
          </NCollapseTransition>
        </div>
      </div>

      <div class="mt-3">
        <button class="disclosure-button text-sm" @click="showChallengeCalc = !showChallengeCalc">
          <span class="flex items-center">
            <Icon icon="mdi:calculator" class="w-4 h-4 mr-2" />
            計算過程
          </span>
          <Icon
            :icon="showChallengeCalc ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            class="w-5 h-5 text-text-muted"
          />
        </button>
        <NCollapseTransition :show="showChallengeCalc">
          <div class="calc-steps">
            <div v-for="(step, i) in challengeNumbers.calculationSteps" :key="i" class="step-item">
              {{ step }}
            </div>
          </div>
        </NCollapseTransition>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.pinnacle-card,
.challenge-card {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.section-header {
  @apply flex items-center mb-2;
}

.section-title {
  @apply font-serif text-lg font-semibold text-text-primary;
}

.intro-text {
  @apply text-sm text-text-muted mb-4;
}

.number-timeline {
  @apply space-y-2;
}

.timeline-item {
  @apply overflow-hidden rounded-soft;
}

.timeline-button {
  @apply flex w-full items-center justify-between px-4 py-3
         text-left font-medium text-text-primary
         bg-surface-variant rounded-soft
         transition-all duration-200 cursor-pointer
         hover:bg-surface-variant/80;
}

.main-challenge .timeline-button {
  @apply border-l-3 border-l-warning;
}

.timeline-left {
  @apply flex items-center gap-3;
}

.timeline-number {
  @apply inline-flex items-center justify-center w-9 h-9
         font-serif text-base font-bold text-text-primary rounded-xl;
}

.pinnacle-bg {
  background: linear-gradient(135deg, #D4A5A5, #E8C4A2);
}

.challenge-bg {
  background: linear-gradient(135deg, #E8C4A2, #D4C7A8);
}

.timeline-info {
  @apply flex flex-col;
}

.timeline-label {
  @apply text-sm font-medium text-text-primary;
}

.timeline-range {
  @apply text-xs text-text-muted;
}

.main-badge {
  @apply text-xs text-warning font-semibold;
}

.timeline-detail {
  @apply px-4 py-3 text-sm text-text-primary leading-relaxed;
}

.disclosure-button {
  @apply flex w-full items-center justify-between px-4 py-2.5
         text-left font-medium text-text-primary
         bg-surface-variant rounded-soft
         transition-all duration-200 cursor-pointer
         hover:bg-surface-variant/80;
}

.calc-steps {
  @apply mt-2 text-xs text-text-muted;
}

.step-item {
  @apply py-1 px-4 border-b border-border;
}

.step-item:last-child {
  @apply border-b-0 font-semibold text-success;
}
</style>
