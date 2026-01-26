<script setup lang="ts">
import type { PersonalYearNumber } from '~/shared/types'

interface Props {
  personalYear: PersonalYearNumber
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'change-year': [year: number]
}>()

// 年份選項（前後 5 年）
const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const options = []
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    options.push({ value: y, label: `${y} 年` })
  }
  return options
})

const selectedYear = ref(currentYear)

function handleYearChange(value: number) {
  selectedYear.value = value
  emit('change-year', value)
}

// 監聽 props 變化同步 selectedYear
watch(() => props.personalYear.targetYear, (newYear) => {
  selectedYear.value = newYear
}, { immediate: true })

// 摺疊面板狀態
const showCalculation = ref(false)
</script>

<template>
  <div class="personal-year glass-card p-4">
    <div class="section-header mb-3">
      <Icon icon="mdi:calendar-clock" class="w-5 h-5 mr-2 text-warning" />
      <span class="section-title">流年數</span>
    </div>

    <!-- 年份選擇 -->
    <div class="year-selector mb-4">
      <UiBaseSelect
        :model-value="selectedYear"
        :options="yearOptions"
        @update:model-value="handleYearChange"
      />
    </div>

    <!-- 流年數顯示 -->
    <div class="year-display">
      <div class="year-number">
        <span class="number-value">{{ personalYear.number }}</span>
      </div>

      <!-- 計算過程 -->
      <div class="mt-3">
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
            class="w-5 h-5 text-text-muted transition-transform duration-200"
          />
        </button>
        <Transition name="slide-fade">
          <div v-if="showCalculation" class="calculation-steps mt-2">
            <div
              v-for="(step, index) in personalYear.calculationSteps"
              :key="index"
              class="step-item"
            >
              {{ step }}
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.section-header {
  @apply flex items-center;
}

.section-title {
  @apply font-serif text-base font-semibold text-text-primary;
}

.year-selector {
  @apply max-w-[140px] mx-auto;
}

.year-display {
  @apply text-center;
}

.year-number {
  @apply flex justify-center mb-2;
}

.number-value {
  @apply inline-flex items-center justify-center min-w-16 h-16
         font-serif text-3xl font-bold text-text-primary rounded-2xl;
  background: linear-gradient(135deg, #8FB996, #A8CCAF);
  box-shadow: 0 4px 16px rgba(143, 185, 150, 0.35);
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
