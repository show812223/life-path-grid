<script setup lang="ts">
import { NCard, NSelect, NButton, NTag, NCollapseTransition } from 'naive-ui'
import type { BirthDate, GridData, Connection } from '~/shared/types'
import { useLifePathCalculator } from '~/composables/useLifePathCalculator'
import { getZodiacByDate } from '~/shared/constants/zodiacData'
import { getNumberMeaning } from '~/shared/constants/numberMeanings'
import { getCompatibility } from '~/shared/constants/compatibilityMeanings'

interface Props {
  personALifePath: number
  personAGrid: GridData
  personAConnections: Connection[]
  personAMissing: number[]
}

const props = defineProps<Props>()

const { calculate } = useLifePathCalculator()

const currentYear = new Date().getFullYear()

// Person B date input
const selectedYear = ref(1990)
const selectedMonth = ref(1)
const selectedDay = ref(1)
const showResult = ref(false)
const showDetails = ref(false)

const years = computed(() => {
  const r = []
  for (let y = currentYear; y >= 1900; y--) r.push({ value: y, label: `${y} 年` })
  return r
})
const months = computed(() => {
  const r = []
  for (let m = 1; m <= 12; m++) r.push({ value: m, label: `${m} 月` })
  return r
})
const days = computed(() => {
  const r = []
  const max = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
  for (let d = 1; d <= max; d++) r.push({ value: d, label: `${d} 日` })
  return r
})

watch([selectedYear, selectedMonth], () => {
  const max = new Date(selectedYear.value, selectedMonth.value, 0).getDate()
  if (selectedDay.value > max) selectedDay.value = max
})

// Person B result
const personBResult = ref<ReturnType<typeof calculate> | null>(null)

function handleCompare() {
  const date: BirthDate = { year: selectedYear.value, month: selectedMonth.value, day: selectedDay.value }
  const zodiac = getZodiacByDate(date.month, date.day)
  personBResult.value = calculate(date, zodiac, null)
  showResult.value = true
}

// Compatibility computed
const compatibility = computed(() => {
  if (!personBResult.value) return null
  return getCompatibility(props.personALifePath, personBResult.value.lifePathNumber)
})

const personAMeaning = computed(() => getNumberMeaning(props.personALifePath))
const personBMeaning = computed(() => personBResult.value ? getNumberMeaning(personBResult.value.lifePathNumber) : null)

// Shared & complementary numbers
const sharedNumbers = computed(() => {
  if (!personBResult.value) return []
  const shared: number[] = []
  for (let i = 1; i <= 9; i++) {
    if (props.personAGrid[i].count > 0 && personBResult.value.gridData[i].count > 0) {
      shared.push(i)
    }
  }
  return shared
})

const complementary = computed(() => {
  if (!personBResult.value) return { aFillsB: [], bFillsA: [] }
  const aFillsB: number[] = []
  const bFillsA: number[] = []
  for (let i = 1; i <= 9; i++) {
    const aHas = props.personAGrid[i].count > 0
    const bHas = personBResult.value.gridData[i].count > 0
    if (aHas && !bHas) aFillsB.push(i)
    if (bHas && !aHas) bFillsA.push(i)
  }
  return { aFillsB, bFillsA }
})

// Shared & unique connections
const connectionComparison = computed(() => {
  if (!personBResult.value) return { shared: [], uniqueA: [], uniqueB: [] }
  const aActive = new Set(props.personAConnections.filter(c => c.isActive).map(c => c.id))
  const bActive = new Set(personBResult.value.connections.filter(c => c.isActive).map(c => c.id))
  const shared = [...aActive].filter(id => bActive.has(id))
  const uniqueA = [...aActive].filter(id => !bActive.has(id))
  const uniqueB = [...bActive].filter(id => !aActive.has(id))
  return { shared, uniqueA, uniqueB }
})

function getConnName(id: string): string {
  const conn = props.personAConnections.find(c => c.id === id) || personBResult.value?.connections.find(c => c.id === id)
  return conn?.name || id
}

function getScoreColor(score: number): 'success' | 'info' | 'warning' | 'error' | 'primary' {
  if (score >= 5) return 'success'
  if (score >= 4) return 'info'
  if (score >= 3) return 'warning'
  return 'error'
}

function getScoreStars(score: number): string {
  return '★'.repeat(score) + '☆'.repeat(5 - score)
}
</script>

<template>
  <NCard class="compatibility" :bordered="false">
    <div class="section-header">
      <Icon icon="mdi:heart-multiple" class="w-5 h-5 mr-2 text-secondary" />
      <span class="section-title">配對分析</span>
    </div>

    <p class="intro-text">輸入另一個人的生日，比較兩人的九宮格相容性。</p>

    <!-- Person B date input -->
    <div class="grid grid-cols-12 gap-3 mb-4">
      <div class="col-span-4">
        <NSelect v-model:value="selectedYear" :options="years" size="small" :virtual-scroll="false" />
      </div>
      <div class="col-span-3">
        <NSelect v-model:value="selectedMonth" :options="months" size="small" />
      </div>
      <div class="col-span-3">
        <NSelect v-model:value="selectedDay" :options="days" size="small" />
      </div>
      <div class="col-span-2">
        <NButton type="primary" size="small" block @click="handleCompare">
          比較
        </NButton>
      </div>
    </div>

    <!-- Result -->
    <Transition name="fade-up">
      <div v-if="showResult && personBResult && compatibility" class="result-section">
        <!-- Score header -->
        <div class="score-header">
          <div class="person-badge">
            <span class="person-number">{{ personALifePath }}</span>
            <span class="person-label">{{ personAMeaning?.name || '' }}</span>
          </div>
          <div class="score-center">
            <NTag :type="getScoreColor(compatibility.score)" size="large">
              {{ compatibility.type }}
            </NTag>
            <div class="score-stars">{{ getScoreStars(compatibility.score) }}</div>
          </div>
          <div class="person-badge">
            <span class="person-number">{{ personBResult.lifePathNumber }}</span>
            <span class="person-label">{{ personBMeaning?.name || '' }}</span>
          </div>
        </div>

        <p class="compatibility-desc">{{ compatibility.description }}</p>

        <!-- Details toggle -->
        <button class="disclosure-button text-sm" @click="showDetails = !showDetails">
          <span class="flex items-center">
            <Icon icon="mdi:chart-box-outline" class="w-4 h-4 mr-2" />
            詳細比較
          </span>
          <Icon
            :icon="showDetails ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            class="w-5 h-5 text-text-muted"
          />
        </button>
        <NCollapseTransition :show="showDetails">
          <div class="details-section">
            <!-- Shared numbers -->
            <div class="detail-block">
              <h4 class="detail-title">
                <Icon icon="mdi:set-center" class="w-4 h-4 mr-1 text-success" />
                共同擁有的數字（{{ sharedNumbers.length }}）
              </h4>
              <div class="number-tags">
                <NTag v-for="n in sharedNumbers" :key="n" type="success" size="small" class="m-0.5">{{ n }}</NTag>
                <span v-if="sharedNumbers.length === 0" class="text-text-muted text-sm">無</span>
              </div>
            </div>

            <!-- Complementary -->
            <div class="detail-block">
              <h4 class="detail-title">
                <Icon icon="mdi:swap-horizontal" class="w-4 h-4 mr-1 text-info" />
                互補數字
              </h4>
              <div class="complement-row">
                <div>
                  <span class="complement-label">你填補對方的缺數：</span>
                  <NTag v-for="n in complementary.aFillsB" :key="n" type="info" size="small" class="m-0.5">{{ n }}</NTag>
                  <span v-if="complementary.aFillsB.length === 0" class="text-text-muted text-sm">無</span>
                </div>
                <div class="mt-1">
                  <span class="complement-label">對方填補你的缺數：</span>
                  <NTag v-for="n in complementary.bFillsA" :key="n" type="primary" size="small" class="m-0.5">{{ n }}</NTag>
                  <span v-if="complementary.bFillsA.length === 0" class="text-text-muted text-sm">無</span>
                </div>
              </div>
            </div>

            <!-- Connection comparison -->
            <div class="detail-block">
              <h4 class="detail-title">
                <Icon icon="mdi:vector-line" class="w-4 h-4 mr-1 text-accent" />
                連線比較
              </h4>
              <div v-if="connectionComparison.shared.length > 0" class="conn-row">
                <span class="conn-label">共同連線：</span>
                <NTag v-for="id in connectionComparison.shared" :key="id" type="success" size="small" class="m-0.5">{{ getConnName(id) }}</NTag>
              </div>
              <div v-if="connectionComparison.uniqueA.length > 0" class="conn-row">
                <span class="conn-label">你獨有：</span>
                <NTag v-for="id in connectionComparison.uniqueA" :key="id" type="info" size="small" class="m-0.5">{{ getConnName(id) }}</NTag>
              </div>
              <div v-if="connectionComparison.uniqueB.length > 0" class="conn-row">
                <span class="conn-label">對方獨有：</span>
                <NTag v-for="id in connectionComparison.uniqueB" :key="id" type="warning" size="small" class="m-0.5">{{ getConnName(id) }}</NTag>
              </div>
            </div>
          </div>
        </NCollapseTransition>
      </div>
    </Transition>
  </NCard>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.compatibility {
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

.result-section {
  @apply mt-4;
}

.score-header {
  @apply flex items-center justify-center gap-6 mb-4;
}

.person-badge {
  @apply flex flex-col items-center;
}

.person-number {
  @apply inline-flex items-center justify-center w-12 h-12
         font-serif text-xl font-bold text-white rounded-2xl;
  background: linear-gradient(135deg, #B88888, #D4A5A5);
  box-shadow: 0 4px 12px rgba(184, 136, 136, 0.3);
}

.person-label {
  @apply text-xs text-text-muted mt-1;
}

.score-center {
  @apply flex flex-col items-center gap-1;
}

.score-stars {
  @apply text-lg tracking-wider;
  color: #C5A467;
}

.compatibility-desc {
  @apply text-sm text-text-primary leading-relaxed text-center mb-4 px-4;
}

.disclosure-button {
  @apply flex w-full items-center justify-between px-4 py-3
         text-left font-medium text-text-primary
         bg-surface-variant rounded-soft
         transition-all duration-200 cursor-pointer
         hover:bg-surface-variant/80;
}

.details-section {
  @apply mt-3 space-y-4;
}

.detail-block {
  @apply p-3 rounded-soft;
  background: rgba(0, 0, 0, 0.02);
}

.detail-title {
  @apply flex items-center font-serif text-sm font-semibold text-text-primary mb-2;
}

.number-tags {
  @apply flex flex-wrap items-center;
}

.complement-row {
  @apply text-sm;
}

.complement-label {
  @apply text-text-muted text-xs mr-1;
}

.conn-row {
  @apply flex flex-wrap items-center gap-1 mb-1;
}

.conn-label {
  @apply text-text-muted text-xs;
}

.fade-up-enter-active,
.fade-up-leave-active {
  @apply transition-all duration-300;
}

.fade-up-enter-from {
  @apply opacity-0 translate-y-3;
}
</style>
