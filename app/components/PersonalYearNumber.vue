<script setup lang="ts">
import { NSelect, NCard, NTag, NCollapseTransition } from 'naive-ui'
import type { PersonalYearNumber, PersonalMonthNumber, PersonalDayNumber, SecretCycleNumber } from '~/shared/types'
import { getPersonalYearMeaning } from '~/shared/constants/personalYearMeanings'
import { getSecretCycleMeaning } from '~/shared/constants/secretCycleMeanings'

interface Props {
  personalYear: PersonalYearNumber
  personalMonth: PersonalMonthNumber | null
  personalDay: PersonalDayNumber | null
  secretCycle: SecretCycleNumber | null
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
const showMeaning = ref(true)
const showMonthDayCalc = ref(false)

const yearMeaning = computed(() => getPersonalYearMeaning(props.personalYear.number))
const monthMeaning = computed(() => props.personalMonth ? getPersonalYearMeaning(props.personalMonth.number) : null)
const dayMeaning = computed(() => props.personalDay ? getPersonalYearMeaning(props.personalDay.number) : null)
const secretCycleMeaning = computed(() => props.secretCycle ? getSecretCycleMeaning(props.secretCycle.number) : null)
const showSecretCycle = ref(false)
</script>

<template>
  <NCard class="personal-year" :bordered="false">
    <div class="section-header mb-3">
      <Icon icon="mdi:calendar-clock" class="w-5 h-5 mr-2 text-warning" />
      <span class="section-title">流年數</span>
    </div>

    <!-- 年份選擇 -->
    <div class="year-selector mb-4">
      <NSelect
        :value="selectedYear"
        :options="yearOptions"
        @update:value="handleYearChange"
      />
    </div>

    <!-- 流年數顯示 -->
    <div class="year-display">
      <div class="year-number">
        <span class="number-value">{{ personalYear.number }}</span>
      </div>
      <div v-if="yearMeaning" class="year-name">{{ yearMeaning.name }}</div>

      <!-- 流月 + 流日 小卡 -->
      <div v-if="personalMonth || personalDay" class="month-day-row">
        <div v-if="personalMonth" class="mini-card">
          <span class="mini-label">流月</span>
          <span class="mini-number">{{ personalMonth.number }}</span>
          <span v-if="monthMeaning" class="mini-name">{{ monthMeaning.name }}</span>
        </div>
        <div v-if="personalDay" class="mini-card">
          <span class="mini-label">流日</span>
          <span class="mini-number">{{ personalDay.number }}</span>
          <span v-if="dayMeaning" class="mini-name">{{ dayMeaning.name }}</span>
        </div>
      </div>

      <!-- 秘密循環數 -->
      <div v-if="secretCycle" class="month-day-row mt-2">
        <div class="mini-card secret-cycle-card">
          <span class="mini-label">秘密循環數</span>
          <span class="mini-number secret-cycle-number">{{ secretCycle.number }}</span>
          <span v-if="secretCycleMeaning" class="mini-name">{{ secretCycleMeaning.name }}</span>
        </div>
      </div>

      <!-- 秘密循環數解釋 -->
      <div v-if="secretCycleMeaning" class="mt-2">
        <button class="disclosure-button text-sm" @click="showSecretCycle = !showSecretCycle">
          <span class="flex items-center">
            <Icon icon="mdi:eye-circle-outline" class="w-4 h-4 mr-2" />
            秘密循環數解讀
          </span>
          <Icon
            :icon="showSecretCycle ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            class="w-5 h-5 text-text-muted"
          />
        </button>
        <NCollapseTransition :show="showSecretCycle">
          <div class="meaning-section">
            <p class="meaning-description">{{ secretCycleMeaning.description }}</p>
            <div class="calculation-steps mt-2">
              <div
                v-for="(step, i) in secretCycle.calculationSteps"
                :key="'sc' + i"
                class="step-item"
              >
                {{ step }}
              </div>
            </div>
          </div>
        </NCollapseTransition>
      </div>

      <!-- 流年數解釋 -->
      <div v-if="yearMeaning" class="mt-3">
        <button class="disclosure-button text-sm" @click="showMeaning = !showMeaning">
          <span class="flex items-center">
            <Icon icon="mdi:information-outline" class="w-4 h-4 mr-2" />
            年度解讀
          </span>
          <Icon
            :icon="showMeaning ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            class="w-5 h-5 text-text-muted"
          />
        </button>
        <NCollapseTransition :show="showMeaning">
          <div class="meaning-section">
            <div class="theme-badge">{{ yearMeaning.theme }}</div>
            <p class="meaning-description">{{ yearMeaning.description }}</p>
            <div class="advice-box">
              <Icon icon="mdi:lightbulb-outline" class="w-4 h-4 mr-1 text-warning flex-shrink-0 mt-0.5" />
              <span><strong>建議：</strong>{{ yearMeaning.advice }}</span>
            </div>
          </div>
        </NCollapseTransition>
      </div>

      <!-- 流月流日計算過程 -->
      <div v-if="personalMonth || personalDay" class="mt-2">
        <button
          class="disclosure-button text-sm"
          @click="showMonthDayCalc = !showMonthDayCalc"
        >
          <span class="flex items-center">
            <Icon icon="mdi:calendar-month" class="w-4 h-4 mr-2" />
            流月 / 流日計算
          </span>
          <Icon
            :icon="showMonthDayCalc ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            class="w-5 h-5 text-text-muted"
          />
        </button>
        <NCollapseTransition :show="showMonthDayCalc">
          <div class="calculation-steps mt-2">
            <div v-if="personalMonth" class="mb-2">
              <div class="step-label">流月數（{{ personalMonth.targetMonth }} 月）</div>
              <div
                v-for="(step, i) in personalMonth.calculationSteps"
                :key="'m' + i"
                class="step-item"
              >
                {{ step }}
              </div>
            </div>
            <div v-if="personalDay">
              <div class="step-label">流日數（{{ personalDay.targetDay }} 日）</div>
              <div
                v-for="(step, i) in personalDay.calculationSteps"
                :key="'d' + i"
                class="step-item"
              >
                {{ step }}
              </div>
            </div>
          </div>
        </NCollapseTransition>
      </div>

      <!-- 流年計算過程 -->
      <div class="mt-2">
        <button
          class="disclosure-button text-sm"
          @click="showCalculation = !showCalculation"
        >
          <span class="flex items-center">
            <Icon icon="mdi:calculator" class="w-4 h-4 mr-2" />
            流年計算過程
          </span>
          <Icon
            :icon="showCalculation ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            class="w-5 h-5 text-text-muted transition-transform duration-200"
          />
        </button>
        <NCollapseTransition :show="showCalculation">
          <div class="calculation-steps mt-2">
            <div
              v-for="(step, index) in personalYear.calculationSteps"
              :key="index"
              class="step-item"
            >
              {{ step }}
            </div>
          </div>
        </NCollapseTransition>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.personal-year {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

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

.year-name {
  @apply font-serif text-base font-semibold text-text-primary mb-1;
}

.month-day-row {
  @apply flex justify-center gap-4 mt-3;
}

.mini-card {
  @apply flex flex-col items-center px-4 py-2.5 rounded-soft;
  background: rgba(0, 0, 0, 0.03);
}

.mini-label {
  @apply text-xs text-text-muted mb-1;
}

.mini-number {
  @apply font-serif text-xl font-bold text-accent;
}

.mini-name {
  @apply text-xs text-text-muted mt-0.5;
}

.secret-cycle-card {
  background: rgba(197, 164, 103, 0.08);
}

.secret-cycle-number {
  color: #C5A467;
}

.disclosure-button {
  @apply flex w-full items-center justify-between px-4 py-3
         text-left font-medium text-text-primary
         bg-surface-variant rounded-soft
         transition-all duration-200 cursor-pointer
         hover:bg-surface-variant/80;
}

.meaning-section {
  @apply px-3 py-3 text-left;
}

.theme-badge {
  @apply inline-block px-3 py-1 mb-3 text-xs font-medium text-warning
         bg-warning/15 rounded-full;
}

.meaning-description {
  @apply text-sm text-text-primary leading-relaxed mb-3;
}

.advice-box {
  @apply flex items-start p-3 text-sm text-text-primary
         bg-surface-variant rounded-[10px] leading-relaxed;
}

.calculation-steps {
  @apply font-sans text-xs text-text-muted;
}

.step-label {
  @apply text-xs font-semibold text-text-primary mb-1;
}

.step-item {
  @apply py-1 border-b border-border;
}

.step-item:last-child {
  @apply border-b-0 font-semibold text-success;
}
</style>
