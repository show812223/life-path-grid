<script setup lang="ts">
import { NCard, NCollapseTransition } from 'naive-ui'
import type { BirthdayNumber, ConditioningNumber } from '~/shared/types'
import { getBirthdayNumberMeaning, getConditioningNumberMeaning } from '~/shared/constants/numberMeanings'

interface Props {
  birthdayNumber: BirthdayNumber
  conditioningNumber: ConditioningNumber
}

const props = defineProps<Props>()

const birthdayMeaning = computed(() => getBirthdayNumberMeaning(props.birthdayNumber.number))
const conditioningMeaning = computed(() => getConditioningNumberMeaning(props.conditioningNumber.number))

const showBirthdayDetail = ref(false)
const showConditioningDetail = ref(false)
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <!-- 生日數 -->
    <NCard class="number-card" :bordered="false">
      <div class="section-header mb-3">
        <Icon icon="mdi:cake-variant" class="w-5 h-5 mr-2 text-primary" />
        <span class="section-title">生日數</span>
      </div>
      <div class="number-display">
        <span class="number-value primary-bg">{{ birthdayNumber.number }}</span>
        <span v-if="birthdayMeaning" class="number-name">{{ birthdayMeaning.name }}</span>
      </div>
      <p class="note">代表他人眼中的你</p>

      <div class="mt-3">
        <button class="disclosure-button" @click="showBirthdayDetail = !showBirthdayDetail">
          <span class="flex items-center text-sm">
            <Icon icon="mdi:information-outline" class="w-4 h-4 mr-2" />
            詳細解讀
          </span>
          <Icon
            :icon="showBirthdayDetail ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            class="w-5 h-5 text-text-muted"
          />
        </button>
        <NCollapseTransition :show="showBirthdayDetail">
          <div class="detail-content">
            <p>{{ birthdayMeaning?.description }}</p>
            <div class="calc-steps">
              <div v-for="(step, i) in birthdayNumber.calculationSteps" :key="i" class="step-item">
                {{ step }}
              </div>
            </div>
          </div>
        </NCollapseTransition>
      </div>
    </NCard>

    <!-- 制約數 -->
    <NCard class="number-card" :bordered="false">
      <div class="section-header mb-3">
        <Icon icon="mdi:filter-outline" class="w-5 h-5 mr-2 text-secondary" />
        <span class="section-title">制約數</span>
      </div>
      <div class="number-display">
        <span class="number-value secondary-bg">{{ conditioningNumber.number }}</span>
        <span v-if="conditioningMeaning" class="number-name">{{ conditioningMeaning.name }}</span>
      </div>
      <p class="note">童年形塑的心智模式</p>

      <div class="mt-3">
        <button class="disclosure-button" @click="showConditioningDetail = !showConditioningDetail">
          <span class="flex items-center text-sm">
            <Icon icon="mdi:information-outline" class="w-4 h-4 mr-2" />
            詳細解讀
          </span>
          <Icon
            :icon="showConditioningDetail ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            class="w-5 h-5 text-text-muted"
          />
        </button>
        <NCollapseTransition :show="showConditioningDetail">
          <div class="detail-content">
            <p>{{ conditioningMeaning?.description }}</p>
            <div class="calc-steps">
              <div v-for="(step, i) in conditioningNumber.calculationSteps" :key="i" class="step-item">
                {{ step }}
              </div>
            </div>
          </div>
        </NCollapseTransition>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.number-card {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.section-header {
  @apply flex items-center;
}

.section-title {
  @apply font-serif text-base font-semibold text-text-primary;
}

.number-display {
  @apply flex flex-col items-center gap-1;
}

.number-value {
  @apply inline-flex items-center justify-center min-w-14 h-14
         font-serif text-2xl font-bold text-text-primary rounded-2xl;
}

.primary-bg {
  background: linear-gradient(135deg, #D4A5A5, #E8C4A2);
  box-shadow: 0 4px 12px rgba(212, 165, 165, 0.35);
}

.secondary-bg {
  background: linear-gradient(135deg, #9DC3B7, #B8D8CF);
  box-shadow: 0 4px 12px rgba(157, 195, 183, 0.35);
}

.number-name {
  @apply font-serif text-base font-semibold text-text-primary;
}

.note {
  @apply text-xs text-text-muted text-center mt-2 mb-0;
}

.disclosure-button {
  @apply flex w-full items-center justify-between px-4 py-2.5
         text-left font-medium text-text-primary
         bg-surface-variant rounded-soft
         transition-all duration-200 cursor-pointer
         hover:bg-surface-variant/80;
}

.detail-content {
  @apply px-4 py-3 text-sm text-text-primary leading-relaxed;
}

.calc-steps {
  @apply mt-3 text-xs text-text-muted;
}

.step-item {
  @apply py-1 border-b border-border;
}

.step-item:last-child {
  @apply border-b-0 font-semibold text-success;
}
</style>
