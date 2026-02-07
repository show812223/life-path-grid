<script setup lang="ts">
import { NCard, NTag, NCollapseTransition, NButton } from 'naive-ui'
import type { NameNumerology, MaturityNumber } from '~/shared/types'
import { getExpressionMeaning, getSoulUrgeMeaning, getPersonalityMeaning } from '~/shared/constants/nameNumerologyMeanings'
import { useLifePathCalculator } from '~/composables/useLifePathCalculator'

interface Props {
  lifePathNumber: number
}

const props = defineProps<Props>()

const { calcNameNumerology, calcMaturityNumber } = useLifePathCalculator()

const nameInput = ref('')
const nameResult = ref<NameNumerology | null>(null)
const maturity = ref<MaturityNumber | null>(null)

const showExpression = ref(false)
const showSoulUrge = ref(false)
const showPersonality = ref(false)
const showMaturity = ref(false)
const showCalc = ref(false)

function handleCalculate() {
  if (!nameInput.value.trim()) return
  nameResult.value = calcNameNumerology(nameInput.value.trim())
  maturity.value = calcMaturityNumber(props.lifePathNumber, nameResult.value.expressionNumber)
}

const expressionMeaning = computed(() => nameResult.value ? getExpressionMeaning(nameResult.value.expressionNumber) : null)
const soulUrgeMeaning = computed(() => nameResult.value ? getSoulUrgeMeaning(nameResult.value.soulUrgeNumber) : null)
const personalityMeaning = computed(() => nameResult.value ? getPersonalityMeaning(nameResult.value.personalityNumber) : null)
</script>

<template>
  <NCard class="name-numerology" :bordered="false">
    <div class="section-header mb-4">
      <Icon icon="mdi:alphabetical-variant" class="w-5 h-5 mr-2 text-lavender" />
      <span class="section-title">英文姓名靈數</span>
    </div>

    <div class="name-input-area">
      <input
        v-model="nameInput"
        type="text"
        class="name-input"
        placeholder="請輸入英文全名（如 John Smith）"
        @keyup.enter="handleCalculate"
      >
      <NButton type="primary" size="small" :disabled="!nameInput.trim()" @click="handleCalculate">
        計算
      </NButton>
    </div>

    <Transition name="fade">
      <div v-if="nameResult" class="mt-4">
        <!-- 三個數字 -->
        <div class="number-row">
          <div class="number-card expression">
            <span class="num-label">表達數</span>
            <span class="num-value">{{ nameResult.expressionNumber }}</span>
            <span v-if="expressionMeaning" class="num-name">{{ expressionMeaning.name }}</span>
          </div>
          <div class="number-card soul-urge">
            <span class="num-label">靈魂渴望數</span>
            <span class="num-value">{{ nameResult.soulUrgeNumber }}</span>
            <span v-if="soulUrgeMeaning" class="num-name">{{ soulUrgeMeaning.name }}</span>
          </div>
          <div class="number-card personality">
            <span class="num-label">人格數</span>
            <span class="num-value">{{ nameResult.personalityNumber }}</span>
            <span v-if="personalityMeaning" class="num-name">{{ personalityMeaning.name }}</span>
          </div>
        </div>

        <!-- 成熟數 -->
        <div v-if="maturity" class="number-row mt-3">
          <div class="number-card maturity">
            <span class="num-label">成熟數</span>
            <span class="num-value">{{ maturity.number }}</span>
            <span class="num-name">主命數 + 表達數</span>
          </div>
        </div>

        <!-- 表達數解讀 -->
        <div v-if="expressionMeaning" class="mt-3">
          <button class="disclosure-button text-sm" @click="showExpression = !showExpression">
            <span class="flex items-center">
              <Icon icon="mdi:account-voice" class="w-4 h-4 mr-2" />
              表達數解讀
            </span>
            <Icon :icon="showExpression ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 text-text-muted" />
          </button>
          <NCollapseTransition :show="showExpression">
            <div class="meaning-section">
              <p class="meaning-description">{{ expressionMeaning.description }}</p>
            </div>
          </NCollapseTransition>
        </div>

        <!-- 靈魂渴望數解讀 -->
        <div v-if="soulUrgeMeaning" class="mt-2">
          <button class="disclosure-button text-sm" @click="showSoulUrge = !showSoulUrge">
            <span class="flex items-center">
              <Icon icon="mdi:heart-outline" class="w-4 h-4 mr-2" />
              靈魂渴望數解讀
            </span>
            <Icon :icon="showSoulUrge ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 text-text-muted" />
          </button>
          <NCollapseTransition :show="showSoulUrge">
            <div class="meaning-section">
              <p class="meaning-description">{{ soulUrgeMeaning.description }}</p>
            </div>
          </NCollapseTransition>
        </div>

        <!-- 人格數解讀 -->
        <div v-if="personalityMeaning" class="mt-2">
          <button class="disclosure-button text-sm" @click="showPersonality = !showPersonality">
            <span class="flex items-center">
              <Icon icon="mdi:account-outline" class="w-4 h-4 mr-2" />
              人格數解讀
            </span>
            <Icon :icon="showPersonality ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 text-text-muted" />
          </button>
          <NCollapseTransition :show="showPersonality">
            <div class="meaning-section">
              <p class="meaning-description">{{ personalityMeaning.description }}</p>
            </div>
          </NCollapseTransition>
        </div>

        <!-- 成熟數解讀 -->
        <div v-if="maturity" class="mt-2">
          <button class="disclosure-button text-sm" @click="showMaturity = !showMaturity">
            <span class="flex items-center">
              <Icon icon="mdi:flower-tulip-outline" class="w-4 h-4 mr-2" />
              成熟數解讀
            </span>
            <Icon :icon="showMaturity ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 text-text-muted" />
          </button>
          <NCollapseTransition :show="showMaturity">
            <div class="meaning-section">
              <p class="meaning-description">
                成熟數代表人生後半段（約 45 歲以後）的發展方向與內在驅動力。
                你的成熟數為 {{ maturity.number }}，意味著在人生成熟階段，你將更加展現此數字的特質。
              </p>
              <div class="calculation-steps mt-2">
                <div v-for="(step, i) in maturity.calculationSteps" :key="i" class="step-item">
                  {{ step }}
                </div>
              </div>
            </div>
          </NCollapseTransition>
        </div>

        <!-- 計算過程 -->
        <div class="mt-2">
          <button class="disclosure-button text-sm" @click="showCalc = !showCalc">
            <span class="flex items-center">
              <Icon icon="mdi:calculator" class="w-4 h-4 mr-2" />
              計算過程
            </span>
            <Icon :icon="showCalc ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 text-text-muted" />
          </button>
          <NCollapseTransition :show="showCalc">
            <div class="calculation-steps mt-2">
              <div class="step-label">表達數（全部字母）</div>
              <div v-for="(step, i) in nameResult.calculationSteps.expression" :key="'e' + i" class="step-item">
                {{ step }}
              </div>
              <div class="step-label mt-2">靈魂渴望數（母音）</div>
              <div v-for="(step, i) in nameResult.calculationSteps.soulUrge" :key="'s' + i" class="step-item">
                {{ step }}
              </div>
              <div class="step-label mt-2">人格數（子音）</div>
              <div v-for="(step, i) in nameResult.calculationSteps.personality" :key="'p' + i" class="step-item">
                {{ step }}
              </div>
            </div>
          </NCollapseTransition>
        </div>
      </div>
    </Transition>
  </NCard>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.name-numerology {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.section-header {
  @apply flex items-center;
}

.section-title {
  @apply font-serif text-lg font-semibold text-text-primary;
}

.name-input-area {
  @apply flex gap-3 items-center;
}

.name-input {
  @apply flex-1 px-4 py-2.5 text-base text-text-primary
         bg-surface border-2 border-border rounded-soft
         outline-none transition-all duration-200;
  font-family: var(--font-sans);
}

.name-input:focus {
  @apply border-primary;
  box-shadow: 0 0 0 3px rgba(212, 165, 165, 0.2);
}

.name-input::placeholder {
  @apply text-text-muted;
}

.number-row {
  @apply flex justify-center gap-4 flex-wrap;
}

.number-card {
  @apply flex flex-col items-center px-5 py-3 rounded-soft min-w-[100px];
}

.number-card.expression {
  background: rgba(197, 180, 227, 0.12);
}

.number-card.soul-urge {
  background: rgba(212, 165, 165, 0.12);
}

.number-card.personality {
  background: rgba(157, 195, 183, 0.12);
}

.number-card.maturity {
  background: rgba(232, 196, 162, 0.12);
}

.num-label {
  @apply text-xs text-text-muted mb-1;
}

.num-value {
  @apply font-serif text-2xl font-bold text-text-primary;
}

.num-name {
  @apply text-xs text-text-muted mt-0.5;
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

.meaning-description {
  @apply text-sm text-text-primary leading-relaxed;
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

.fade-enter-active,
.fade-leave-active {
  @apply transition-opacity duration-300;
}

.fade-enter-from,
.fade-leave-to {
  @apply opacity-0;
}
</style>
