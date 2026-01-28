<script setup lang="ts">
import { NCard, NTag } from 'naive-ui'
import type { BirthDate, ZodiacSign, PersonalYearNumber } from '~/shared/types'
import { useLifePathCalculator } from '~/composables/useLifePathCalculator'

const { result, calculate, calcPersonalYear } = useLifePathCalculator()

const hasResult = computed(() => result.value !== null)
const isLoading = ref(false)

// 儲存生日與星座資訊以供流年數計算
const birthDate = ref<BirthDate | null>(null)
const selectedZodiac = ref<ZodiacSign | null>(null)
const personalYear = ref<PersonalYearNumber | null>(null)
const currentYear = new Date().getFullYear()

async function handleCalculate(date: BirthDate, zodiac: ZodiacSign) {
  isLoading.value = true

  // 短暫延遲以顯示 loading 動畫
  await new Promise(resolve => setTimeout(resolve, 800))

  birthDate.value = date
  selectedZodiac.value = zodiac
  // 計算當年流年數
  const pyResult = calcPersonalYear(date.month, date.day, currentYear)
  personalYear.value = pyResult
  // 計算主命數與九宮格（包含流年數）
  calculate(date, zodiac, pyResult.number)

  isLoading.value = false
}

function handleChangeYear(year: number) {
  if (birthDate.value && selectedZodiac.value) {
    const pyResult = calcPersonalYear(birthDate.value.month, birthDate.value.day, year)
    personalYear.value = pyResult
    // 重新計算九宮格以包含新的流年數
    calculate(birthDate.value, selectedZodiac.value, pyResult.number)
  }
}
</script>

<template>
  <div class="page-container">
    <div class="container mx-auto px-4 py-8">
      <!-- 標題區域 -->
      <div class="header-section text-center mb-8">
        <h1 class="main-title">生命靈數九宮格</h1>
        <p class="subtitle">探索您的命運密碼</p>
      </div>

      <!-- 日期輸入 -->
      <NCard class="input-section mb-8" :bordered="false">
        <DateInput :loading="isLoading" @calculate="handleCalculate" />
      </NCard>

      <!-- 結果區域 -->
      <Transition name="fade-up">
        <div v-if="hasResult && result" class="results-section">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <!-- 左側：九宮格 -->
            <div class="lg:col-span-5 xl:col-span-4">
              <NCard class="mb-6" :bordered="false">
                <template #header>
                  <div class="section-header">
                    <Icon icon="mdi:grid" class="w-5 h-5 mr-2 text-primary" />
                    <span class="section-title">九宮格</span>
                  </div>
                </template>
                <LifePathGrid
                  :grid-data="result.gridData"
                  :connections="result.connections"
                />
                <GridLegend />
              </NCard>
            </div>

            <!-- 右側：主命數 + 天賦數 + 缺數 -->
            <div class="lg:col-span-7 xl:col-span-8">
              <LifePathNumber
                :number="result.lifePathNumber"
                :is-master-number="result.isMasterNumber"
                :calculation-steps="result.calculationSteps"
                class="mb-6"
              />

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <TalentNumbers
                  :talent-numbers="result.talentNumbers"
                  class="mb-6"
                />

                <!-- 星座資訊 -->
                <NCard v-if="result.zodiacInfo" class="zodiac-info mb-6" :bordered="false">
                  <div class="section-header mb-2">
                    <Icon :icon="`mdi:zodiac-${result.zodiacInfo.sign}`" class="w-5 h-5 mr-2 text-info" />
                    <span class="section-title">星座數</span>
                  </div>
                  <div class="zodiac-display">
                    <span class="zodiac-name">{{ result.zodiacInfo.name }}</span>
                    <span class="zodiac-date-range">（{{ result.zodiacInfo.dateRange }}）</span>
                    <NTag type="info" size="small" class="ml-2">
                      {{ result.zodiacNumber }}
                    </NTag>
                  </div>
                </NCard>

                <!-- 流年數 -->
                <PersonalYearNumber
                  v-if="personalYear"
                  :personal-year="personalYear"
                  class="mb-6"
                  @change-year="handleChangeYear"
                />
              </div>

              <MissingNumbers
                :missing-numbers="result.missingNumbers"
              />
            </div>
          </div>

          <!-- 連線分析與數字意義 -->
          <div class="mt-6">
            <ConnectionAnalysis :connections="result.connections" />
          </div>

          <div class="mt-6">
            <NumberMeaning :number="result.lifePathNumber" />
          </div>
        </div>
      </Transition>

      <!-- 未計算時的提示 -->
      <Transition name="fade">
        <div v-if="!hasResult" class="placeholder-section text-center">
          <Icon icon="mdi:sparkles" class="w-20 h-20 mb-4 text-primary floating-icon" />
          <p class="placeholder-text">請選擇您的出生日期，開始探索命運密碼</p>
        </div>
      </Transition>

      <!-- 頁尾 -->
      <div class="footer-section text-center mt-12">
        <p class="footer-text">生命靈數九宮格計算器</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.page-container {
  @apply relative min-h-screen z-[1];
}

.header-section {
  @apply mb-8;
}

.main-title {
  @apply font-serif text-4xl font-bold mb-2;
  background: linear-gradient(135deg, #B88888, #D4A5A5, #E8C4A2, #9DC3B7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  @apply text-lg text-text-muted tracking-wider;
}

.input-section {
  @apply max-w-3xl mx-auto backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.results-section {
  @apply max-w-6xl mx-auto;
}

.section-header {
  @apply flex items-center;
}

.section-title {
  @apply font-serif text-lg font-semibold;
}

.zodiac-info {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.zodiac-info .zodiac-display {
  @apply flex items-center flex-wrap gap-1;
}

.zodiac-info .zodiac-name {
  @apply text-xl font-semibold text-accent;
}

.zodiac-info .zodiac-date-range {
  @apply text-sm text-text-muted;
}

.placeholder-section {
  @apply py-20 px-5;
}

.floating-icon {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.placeholder-text {
  @apply text-lg text-text-muted;
}

.footer-section {
  @apply p-6;
}

.footer-text {
  @apply text-sm text-text-muted;
}

/* 過渡動畫 */
.fade-up-enter-active,
.fade-up-leave-active {
  @apply transition-all duration-500;
}

.fade-up-enter-from {
  @apply opacity-0 translate-y-5;
}

.fade-up-leave-to {
  @apply opacity-0 -translate-y-5;
}

@media (max-width: 600px) {
  .main-title {
    @apply text-2xl;
  }

  .subtitle {
    @apply text-base;
  }
}
</style>
