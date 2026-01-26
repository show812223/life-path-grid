<script setup lang="ts">
import type { NumberSources } from '~/shared/types'

interface Props {
  number: number
  count: number
  sources: NumberSources
}

const props = withDefaults(defineProps<Props>(), {
  sources: () => ({ innate: 0, lifePath: 0, talent: 0, zodiac: 0, personalYear: 0 })
})

const hasNumber = computed(() => props.count > 0)

// 生成帶顏色標記的 chips
interface ChipData {
  value: number
  source: string
  index: number
}

const chips = computed(() => {
  const result: ChipData[] = []
  let index = 0

  // 先天數 - 紫粉漸層
  for (let i = 0; i < props.sources.innate; i++) {
    result.push({ value: props.number, source: 'innate', index: index++ })
  }

  // 主命數 - 金色
  for (let i = 0; i < props.sources.lifePath; i++) {
    result.push({ value: props.number, source: 'lifePath', index: index++ })
  }

  // 天賦數 - 粉色
  for (let i = 0; i < props.sources.talent; i++) {
    result.push({ value: props.number, source: 'talent', index: index++ })
  }

  // 星座數 - 青色
  for (let i = 0; i < props.sources.zodiac; i++) {
    result.push({ value: props.number, source: 'zodiac', index: index++ })
  }

  // 流年數 - 綠色
  for (let i = 0; i < props.sources.personalYear; i++) {
    result.push({ value: props.number, source: 'personalYear', index: index++ })
  }

  return result
})
</script>

<template>
  <div class="grid-cell" :class="{ 'has-number': hasNumber }">
    <span class="cell-number">{{ number }}</span>
    <div v-if="hasNumber" class="cell-chips">
      <span
        v-for="chip in chips"
        :key="chip.index"
        class="number-chip"
        :class="chip.source"
      >
        {{ chip.value }}
      </span>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.grid-cell {
  @apply relative flex flex-col items-center justify-center
         bg-surface border-2 border-border rounded-2xl aspect-square p-2
         transition-all duration-300;
}

.grid-cell:hover {
  @apply border-primary-light;
  box-shadow: 0 4px 16px rgba(212, 165, 165, 0.2);
  transform: translateY(-2px);
}

.grid-cell.has-number {
  @apply border-primary;
  background: linear-gradient(135deg, rgba(212, 165, 165, 0.1) 0%, rgba(232, 196, 162, 0.1) 100%);
}

.cell-number {
  @apply font-serif text-2xl font-semibold text-border opacity-50;
}

.grid-cell.has-number .cell-number {
  @apply text-primary-dark opacity-100;
}

.cell-chips {
  @apply flex flex-wrap gap-1 justify-center mt-1;
}

.number-chip {
  @apply inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5
         text-[0.7rem] font-semibold text-text-primary rounded-xl
         transition-transform duration-200 hover:scale-110;
}

/* 先天數 - 玫瑰粉漸層 */
.number-chip.innate {
  background: linear-gradient(135deg, #D4A5A5, #C5B4E3);
  box-shadow: 0 2px 8px rgba(212, 165, 165, 0.3);
}

/* 主命數 - 蜜桃奶油漸層 */
.number-chip.lifePath {
  background: linear-gradient(135deg, #E8C4A2, #F5D5C8);
  box-shadow: 0 2px 8px rgba(232, 196, 162, 0.3);
}

/* 天賦數 - 薰衣草紫漸層 */
.number-chip.talent {
  background: linear-gradient(135deg, #C5B4E3, #D4C7EC);
  box-shadow: 0 2px 8px rgba(197, 180, 227, 0.3);
}

/* 星座數 - 柔和藍漸層 */
.number-chip.zodiac {
  background: linear-gradient(135deg, #A7C4D4, #BDD4E3);
  box-shadow: 0 2px 8px rgba(167, 196, 212, 0.3);
}

/* 流年數 - 療癒綠漸層 */
.number-chip.personalYear {
  background: linear-gradient(135deg, #8FB996, #A8CCAF);
  box-shadow: 0 2px 8px rgba(143, 185, 150, 0.3);
}

@media (max-width: 600px) {
  .cell-number {
    @apply text-xl;
  }

  .number-chip {
    @apply min-w-[18px] h-[18px] text-[0.6rem];
  }
}
</style>
