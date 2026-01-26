<script setup lang="ts">
import { getNumberMeaning } from '~/shared/constants/numberMeanings'

interface Props {
  number: number
  isMasterNumber: boolean
  calculationSteps: string[]
}

const props = defineProps<Props>()

const meaning = computed(() => getNumberMeaning(props.number))
</script>

<template>
  <div class="life-path-number glass-card" :class="{ 'master-number': isMasterNumber }">
    <div class="number-badge" v-if="isMasterNumber">
      <Icon icon="mdi:star" class="w-4 h-4" />
      大師數
    </div>
    <div class="number-display">{{ number }}</div>
    <div class="number-title">{{ meaning?.name || '' }}</div>
    <div class="keywords">
      <span
        v-for="keyword in meaning?.keywords"
        :key="keyword"
        class="chip chip-primary m-1"
      >
        {{ keyword }}
      </span>
    </div>
    <hr class="divider" />
    <div class="calculation-section">
      <div class="section-title-small">計算過程</div>
      <div class="calculation-steps">
        <div v-for="(step, index) in calculationSteps" :key="index" class="step">
          {{ step }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.life-path-number {
  @apply relative flex flex-col items-center justify-center p-6 text-center;
}

.number-badge {
  @apply absolute top-3 right-3 flex items-center gap-1 px-3 py-1
         text-xs font-semibold text-lavender
         bg-lavender/20 border border-lavender/40 rounded-full;
}

.number-display {
  @apply font-serif text-6xl font-bold leading-none;
  background: linear-gradient(135deg, #B88888, #D4A5A5, #E8C4A2);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 4px rgba(212, 165, 165, 0.3));
}

.master-number .number-display {
  background: linear-gradient(135deg, #C5B4E3, #D4A5A5, #E8C4A2);
  -webkit-background-clip: text;
  background-clip: text;
}

.number-title {
  @apply font-serif text-2xl font-semibold text-text-primary mt-2;
}

.keywords {
  @apply mt-3;
}

.divider {
  @apply w-full my-4 border-t border-border;
}

.calculation-section {
  @apply w-full text-left;
}

.section-title-small {
  @apply text-sm font-medium text-text-muted mb-2;
}

.calculation-steps {
  @apply font-sans;
}

.calculation-steps .step {
  @apply px-3 py-1.5 mb-1 text-sm text-text-primary
         bg-surface-variant rounded-[10px] border-l-[3px] border-l-primary;
}

@media (max-width: 600px) {
  .number-display {
    @apply text-5xl;
  }

  .number-title {
    @apply text-xl;
  }
}
</style>
