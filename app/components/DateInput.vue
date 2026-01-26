<script setup lang="ts">
import type { BirthDate, ZodiacSign } from '~/shared/types'
import { getZodiacByDate } from '~/shared/constants/zodiacData'

const emit = defineEmits<{
  calculate: [date: BirthDate, zodiac: ZodiacSign]
}>()

// 當前年份
const currentYear = new Date().getFullYear()

// 年份選項
const years = computed(() => {
  const result = []
  for (let y = currentYear; y >= 1900; y--) {
    result.push({ value: y, label: `${y} 年` })
  }
  return result
})

// 月份選項
const months = computed(() => {
  const result = []
  for (let m = 1; m <= 12; m++) {
    result.push({ value: m, label: `${m} 月` })
  }
  return result
})

// 日期選項（根據年月動態計算）
const days = computed(() => {
  const result = []
  const maxDay = getDaysInMonth(selectedYear.value, selectedMonth.value)
  for (let d = 1; d <= maxDay; d++) {
    result.push({ value: d, label: `${d} 日` })
  }
  return result
})

// 選擇的日期
const selectedYear = ref<number>(1990)
const selectedMonth = ref<number>(1)
const selectedDay = ref<number>(1)

// 從生日自動推算的星座
const autoZodiac = computed(() => getZodiacByDate(selectedMonth.value, selectedDay.value))

// 使用者選擇的星座（預設為自動推算）
const selectedZodiac = ref<ZodiacSign>(autoZodiac.value)

// 計算當月天數
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// 監聽年月變化，調整日期
watch([selectedYear, selectedMonth], () => {
  const maxDay = getDaysInMonth(selectedYear.value, selectedMonth.value)
  if (selectedDay.value > maxDay) {
    selectedDay.value = maxDay
  }
})

// 監聽月日變化，自動更新星座
watch([selectedMonth, selectedDay], () => {
  selectedZodiac.value = autoZodiac.value
})

// 觸發計算
function handleCalculate() {
  emit(
    'calculate',
    {
      year: selectedYear.value,
      month: selectedMonth.value,
      day: selectedDay.value
    },
    selectedZodiac.value
  )
}
</script>

<template>
  <div class="date-input-container">
    <div class="grid grid-cols-12 gap-4 items-center">
      <div class="col-span-12 sm:col-span-4 md:col-span-3">
        <label class="input-label">年份</label>
        <UiBaseSelect
          v-model="selectedYear"
          :options="years"
          placeholder="選擇年份"
        />
      </div>
      <div class="col-span-6 sm:col-span-4 md:col-span-2">
        <label class="input-label">月份</label>
        <UiBaseSelect
          v-model="selectedMonth"
          :options="months"
          placeholder="選擇月份"
        />
      </div>
      <div class="col-span-6 sm:col-span-4 md:col-span-2">
        <label class="input-label">日期</label>
        <UiBaseSelect
          v-model="selectedDay"
          :options="days"
          placeholder="選擇日期"
        />
      </div>
      <div class="col-span-12 sm:col-span-12 md:col-span-5">
        <label class="input-label md:opacity-0">計算</label>
        <button
          class="btn btn-primary w-full py-3"
          @click="handleCalculate"
        >
          <Icon icon="mdi:sparkles" class="w-5 h-5 mr-2" />
          開始計算
        </button>
      </div>
    </div>

    <!-- 星座選擇器 -->
    <div class="mt-4">
      <ZodiacSelector
        v-model="selectedZodiac"
        :auto-zodiac="autoZodiac"
      />
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.date-input-container {
  @apply py-4;
}

.input-label {
  @apply block text-base font-medium text-text-muted mb-2;
}
</style>
