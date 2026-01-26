<script setup lang="ts">
import type { ZodiacSign, ZodiacInfo } from '~/shared/types'
import { ZODIAC_INFO, ZODIAC_ICONS } from '~/shared/constants/zodiacData'

interface Props {
  modelValue: ZodiacSign
  autoZodiac: ZodiacSign
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: ZodiacSign]
}>()

// 選擇的星座
const selectedZodiac = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 是否與自動推算相同
const isAutoSelected = computed(() => props.modelValue === props.autoZodiac)

// 是否展開選擇器
const showSelector = ref(false)

// 取得星座資訊
function getInfo(sign: ZodiacSign): ZodiacInfo | undefined {
  return ZODIAC_INFO.find((z) => z.sign === sign)
}

// 選擇星座
function selectZodiac(sign: ZodiacSign) {
  selectedZodiac.value = sign
  showSelector.value = false
}

// 重置為自動推算
function resetToAuto() {
  selectedZodiac.value = props.autoZodiac
  showSelector.value = false
}
</script>

<template>
  <div class="zodiac-selector">
    <!-- 當前星座顯示 -->
    <div class="current-zodiac" @click="showSelector = !showSelector">
      <div class="zodiac-info-display">
        <Icon :icon="ZODIAC_ICONS[selectedZodiac]" class="w-4 h-4 mr-2" />
        <span class="zodiac-label">星座數：</span>
        <span class="zodiac-name">{{ getInfo(selectedZodiac)?.name }}</span>
        <span class="zodiac-date">（{{ getInfo(selectedZodiac)?.dateRange }}）</span>
        <span class="chip chip-info ml-2 text-xs">
          {{ getInfo(selectedZodiac)?.number }}
        </span>
        <span
          v-if="isAutoSelected"
          class="chip chip-success ml-2 text-xs"
        >
          自動偵測
        </span>
      </div>
      <button class="btn btn-text text-sm">
        {{ showSelector ? '收起' : '變更' }}
        <Icon :icon="showSelector ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-4 h-4 ml-1" />
      </button>
    </div>

    <!-- 星座選擇器（可展開） -->
    <Transition name="slide-fade">
      <div v-if="showSelector" class="zodiac-grid">
        <button
          v-if="!isAutoSelected"
          class="zodiac-btn reset-btn"
          @click="resetToAuto"
        >
          <Icon icon="mdi:refresh" class="w-4 h-4 mr-1" />
          重置
        </button>
        <button
          v-for="zodiac in ZODIAC_INFO"
          :key="zodiac.sign"
          :class="['zodiac-btn', selectedZodiac === zodiac.sign ? 'selected' : '']"
          @click="selectZodiac(zodiac.sign)"
        >
          <Icon :icon="ZODIAC_ICONS[zodiac.sign]" class="w-4 h-4 mr-1" />
          {{ zodiac.name }}
          <span class="zodiac-number">{{ zodiac.number }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.zodiac-selector {
  @apply py-2;
}

.current-zodiac {
  @apply flex items-center justify-between flex-wrap gap-2 px-4 py-3
         bg-surface-variant border-2 border-border rounded-soft cursor-pointer
         transition-all duration-200 hover:border-primary-light;
}

.zodiac-info-display {
  @apply flex items-center flex-wrap gap-1;
}

.zodiac-label {
  @apply text-sm text-text-muted;
}

.zodiac-name {
  @apply text-sm font-semibold text-accent;
}

.zodiac-date {
  @apply text-xs text-text-muted;
}

.zodiac-grid {
  @apply grid gap-2 mt-3 p-4 bg-surface-variant border border-border rounded-soft;
  grid-template-columns: repeat(6, 1fr);
}

.zodiac-btn {
  @apply relative flex items-center justify-center px-1 py-2 text-xs
         text-text-primary border-2 border-border rounded-soft bg-surface
         transition-all duration-200 hover:border-primary-light;
}

.zodiac-btn.selected {
  @apply border-primary bg-primary/10;
}

.zodiac-btn .zodiac-number {
  @apply absolute -top-1 -right-1 min-w-4 h-4 px-1
         text-[0.6rem] font-bold text-text-primary
         flex items-center justify-center rounded-lg;
  background: linear-gradient(135deg, #A7C4D4, #BDD4E3);
}

.zodiac-btn.reset-btn {
  @apply col-span-2 bg-success/10 border-success/40 text-text-primary;
}

.zodiac-btn.reset-btn .zodiac-number {
  @apply hidden;
}

@media (max-width: 900px) {
  .zodiac-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .zodiac-btn.reset-btn {
    @apply col-span-2;
  }
}

@media (max-width: 600px) {
  .zodiac-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .zodiac-btn {
    @apply text-[0.7rem];
  }

  .zodiac-btn.reset-btn {
    @apply col-span-3;
  }
}
</style>
