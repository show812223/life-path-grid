<script setup lang="ts">
import { NCard, NTag, NCollapseTransition } from 'naive-ui'
import type { BirthDate, ZodiacSign, PersonalYearNumber, PersonalMonthNumber, PersonalDayNumber, BodyMindSpiritAnalysis, LifeCycleNumbers, SecretCycleNumber, FiveElementsAnalysis } from '~/shared/types'
import { useLifePathCalculator } from '~/composables/useLifePathCalculator'
import { useHistory } from '~/composables/useHistory'
import { getZodiacNumberMeaning } from '~/shared/constants/zodiacNumberMeanings'

const { result, calculate, calcPersonalYear, calcPersonalMonth, calcPersonalDay, calcBodyMindSpirit, calcLifeCycles, calcSecretCycle, calcFiveElements } = useLifePathCalculator()
const { addRecord } = useHistory()

const hasResult = computed(() => result.value !== null)
const isLoading = ref(false)

// 儲存生日與星座資訊以供流年數計算
const birthDate = ref<BirthDate | null>(null)
const selectedZodiac = ref<ZodiacSign | null>(null)
const personalYear = ref<PersonalYearNumber | null>(null)
const personalMonth = ref<PersonalMonthNumber | null>(null)
const personalDay = ref<PersonalDayNumber | null>(null)
const bodyMindSpirit = ref<BodyMindSpiritAnalysis | null>(null)
const lifeCycles = ref<LifeCycleNumbers | null>(null)
const secretCycle = ref<SecretCycleNumber | null>(null)
const fiveElements = ref<FiveElementsAnalysis | null>(null)
const currentYear = new Date().getFullYear()
const now = new Date()

// 星座數解釋展開狀態
const showZodiacMeaning = ref(false)

const zodiacNumberMeaning = computed(() => {
  if (!result.value?.zodiacNumber) return null
  return getZodiacNumberMeaning(result.value.zodiacNumber)
})

function updatePersonalMonthDay(pyNumber: number) {
  const pmResult = calcPersonalMonth(pyNumber, now.getMonth() + 1)
  personalMonth.value = pmResult
  const pdResult = calcPersonalDay(pmResult.number, now.getDate())
  personalDay.value = pdResult
}

async function handleCalculate(date: BirthDate, zodiac: ZodiacSign) {
  isLoading.value = true

  // 短暫延遲以顯示 loading 動畫
  await new Promise(resolve => setTimeout(resolve, 800))

  birthDate.value = date
  selectedZodiac.value = zodiac
  // 計算當年流年數
  const pyResult = calcPersonalYear(date.month, date.day, currentYear)
  personalYear.value = pyResult
  // 計算流月與流日
  updatePersonalMonthDay(pyResult.number)
  // 計算主命數與九宮格（包含流年數）
  calculate(date, zodiac, pyResult.number)
  // 計算身心靈與生命週期
  if (result.value) {
    bodyMindSpirit.value = calcBodyMindSpirit(result.value.gridData)
    // 計算秘密循環數
    secretCycle.value = calcSecretCycle(result.value.lifePathNumber, pyResult.number)
    // 計算五行
    fiveElements.value = calcFiveElements(result.value.gridData)
    // 記錄歷史
    addRecord(date, zodiac, result.value.lifePathNumber)
  }
  lifeCycles.value = calcLifeCycles(date)

  isLoading.value = false
}

function handleChangeYear(year: number) {
  if (birthDate.value && selectedZodiac.value) {
    const pyResult = calcPersonalYear(birthDate.value.month, birthDate.value.day, year)
    personalYear.value = pyResult
    // 重新計算流月流日
    updatePersonalMonthDay(pyResult.number)
    // 重新計算九宮格以包含新的流年數
    calculate(birthDate.value, selectedZodiac.value, pyResult.number)
    // 更新身心靈分析與秘密循環數
    if (result.value) {
      bodyMindSpirit.value = calcBodyMindSpirit(result.value.gridData)
      secretCycle.value = calcSecretCycle(result.value.lifePathNumber, pyResult.number)
      fiveElements.value = calcFiveElements(result.value.gridData)
    }
  }
}

function handleHistorySelect(date: BirthDate, zodiac: ZodiacSign) {
  handleCalculate(date, zodiac)
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
        <HistoryPanel @select="handleHistorySelect" />
      </NCard>

      <!-- 結果區域 -->
      <Transition name="fade-up">
        <div v-if="hasResult && result" class="results-section">
          <!-- 匯出按鈕 -->
          <div class="flex justify-end mb-2">
            <ExportButton target-selector=".results-section" />
          </div>

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

            <!-- 右側：核心數字 -->
            <div class="lg:col-span-7 xl:col-span-8">
              <LifePathNumber
                :number="result.lifePathNumber"
                :is-master-number="result.isMasterNumber"
                :calculation-steps="result.calculationSteps"
                class="mb-6"
              />

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <!-- 星座資訊（含解釋） -->
                <NCard v-if="result.zodiacInfo" class="zodiac-info" :bordered="false">
                  <div class="section-header mb-2">
                    <Icon :icon="`mdi:zodiac-${result.zodiacInfo.sign}`" class="w-5 h-5 mr-2 text-info" />
                    <span class="section-title-sm">星座數</span>
                  </div>
                  <div class="zodiac-display">
                    <span class="zodiac-name">{{ result.zodiacInfo.name }}</span>
                    <span class="zodiac-date-range">（{{ result.zodiacInfo.dateRange }}）</span>
                    <NTag type="info" size="small" class="ml-2">
                      {{ result.zodiacNumber }}
                    </NTag>
                  </div>
                  <!-- 星座數解釋 -->
                  <div v-if="zodiacNumberMeaning" class="mt-3">
                    <button class="zodiac-detail-btn" @click="showZodiacMeaning = !showZodiacMeaning">
                      <span class="flex items-center text-sm">
                        <Icon icon="mdi:information-outline" class="w-4 h-4 mr-2" />
                        {{ zodiacNumberMeaning.name }}
                      </span>
                      <Icon
                        :icon="showZodiacMeaning ? 'mdi:chevron-up' : 'mdi:chevron-down'"
                        class="w-5 h-5 text-text-muted"
                      />
                    </button>
                    <NCollapseTransition :show="showZodiacMeaning">
                      <div class="zodiac-meaning-content">
                        <p>{{ zodiacNumberMeaning.description }}</p>
                        <div class="zodiac-traits">
                          <NTag
                            v-for="trait in zodiacNumberMeaning.traits"
                            :key="trait"
                            type="info"
                            size="small"
                            class="m-0.5"
                          >
                            {{ trait }}
                          </NTag>
                        </div>
                      </div>
                    </NCollapseTransition>
                  </div>
                </NCard>

                <!-- 流年數 -->
                <PersonalYearNumber
                  v-if="personalYear"
                  :personal-year="personalYear"
                  :personal-month="personalMonth"
                  :personal-day="personalDay"
                  :secret-cycle="secretCycle"
                  @change-year="handleChangeYear"
                />
              </div>

              <!-- 生日數 + 制約數 -->
              <BirthdayConditioningNumber
                :birthday-number="result.birthdayNumber"
                :conditioning-number="result.conditioningNumber"
                class="mb-6"
              />

              <TalentNumbers
                :talent-numbers="result.talentNumbers"
                class="mb-6"
              />

              <MissingNumbers
                :missing-numbers="result.missingNumbers"
              />
            </div>
          </div>

          <!-- 全息三角形 -->
          <div class="mt-6">
            <HolographicTriangle
              :life-path-number="result.lifePathNumber"
              :birthday-number="result.birthdayNumber.number"
              :talent-numbers="result.talentNumbers.numbers"
              :conditioning-number="result.conditioningNumber.number"
            />
          </div>

          <!-- 身心靈分析 -->
          <div v-if="bodyMindSpirit" class="mt-6">
            <BodyMindSpiritAnalysis :analysis="bodyMindSpirit" />
          </div>

          <!-- 五行分析 -->
          <div v-if="fiveElements" class="mt-6">
            <FiveElementsAnalysis :analysis="fiveElements" />
          </div>

          <!-- 圈數解讀 -->
          <div class="mt-6">
            <CircleCountAnalysis :grid-data="result.gridData" />
          </div>

          <!-- 連線分析 -->
          <div class="mt-6">
            <ConnectionAnalysis
              :connections="result.connections"
              :secondary-connections="result.secondaryConnections"
            />
          </div>

          <!-- 生命週期數 -->
          <div v-if="lifeCycles" class="mt-6">
            <LifeCycleNumbers :life-cycles="lifeCycles" />
          </div>

          <!-- 高峰數與挑戰數 -->
          <div class="mt-6">
            <PinnacleChallenge
              :pinnacle-numbers="result.pinnacleNumbers"
              :challenge-numbers="result.challengeNumbers"
            />
          </div>

          <!-- 英文姓名靈數 + 成熟數 -->
          <div class="mt-6">
            <NameNumerology :life-path-number="result.lifePathNumber" />
          </div>

          <!-- 配對分析 -->
          <div class="mt-6">
            <CompatibilityAnalysis
              :person-a-life-path="result.lifePathNumber"
              :person-a-grid="result.gridData"
              :person-a-connections="result.connections"
              :person-a-missing="result.missingNumbers"
            />
          </div>

          <!-- 主命數詳細解讀 -->
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

.section-title-sm {
  @apply font-serif text-base font-semibold text-text-primary;
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

.zodiac-detail-btn {
  @apply flex w-full items-center justify-between px-3 py-2.5
         text-left font-medium text-text-primary
         bg-surface-variant rounded-soft
         transition-all duration-200 cursor-pointer
         hover:bg-surface-variant/80;
}

.zodiac-meaning-content {
  @apply px-3 py-3 text-sm text-text-primary leading-relaxed;
}

.zodiac-traits {
  @apply flex flex-wrap mt-2;
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
