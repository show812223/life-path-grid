<script setup lang="ts">
import { NSelect, NButton } from 'naive-ui'
import type { BirthDate, ZodiacSign } from '~/shared/types'
import { getZodiacByDate } from '~/shared/constants/zodiacData'

interface Props {
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

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

// 觸發計算
function handleCalculate() {
  emit(
    'calculate',
    {
      year: selectedYear.value,
      month: selectedMonth.value,
      day: selectedDay.value
    },
    autoZodiac.value
  )
}
</script>

<template>
  <div class="date-input-container">
    <div class="grid grid-cols-12 gap-4 items-center">
      <div class="col-span-12 sm:col-span-4 md:col-span-3">
        <label class="input-label">年份</label>
        <NSelect
          v-model:value="selectedYear"
          :options="years"
          placeholder="選擇年份"
          :virtual-scroll="false"
        />
      </div>
      <div class="col-span-6 sm:col-span-4 md:col-span-2">
        <label class="input-label">月份</label>
        <NSelect
          v-model:value="selectedMonth"
          :options="months"
          placeholder="選擇月份"
        />
      </div>
      <div class="col-span-6 sm:col-span-4 md:col-span-2">
        <label class="input-label">日期</label>
        <NSelect
          v-model:value="selectedDay"
          :options="days"
          placeholder="選擇日期"
        />
      </div>
      <div class="col-span-12 sm:col-span-12 md:col-span-5">
        <label class="input-label md:opacity-0">計算</label>
        <NButton
          type="primary"
          block
          :loading="props.loading"
          @click="handleCalculate"
        >
          <template #icon>
            <Icon icon="mdi:sparkles" class="w-5 h-5" />
          </template>
          {{ props.loading ? '計算中...' : '開始計算' }}
        </NButton>
      </div>
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
