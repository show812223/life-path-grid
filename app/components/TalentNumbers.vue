<script setup lang="ts">
import { NCard } from 'naive-ui'
import type { TalentNumbers } from '~/shared/types'

interface Props {
  talentNumbers: TalentNumbers
}

defineProps<Props>()
</script>

<template>
  <NCard class="talent-numbers" :bordered="false">
    <div class="section-header mb-3">
      <Icon icon="mdi:lightbulb-on" class="w-5 h-5 mr-2 text-accent" />
      <span class="section-title">天賦數</span>
    </div>

    <div class="talent-display">
      <div class="talent-calculation">
        <span class="original-sum">{{ talentNumbers.originalSum }}</span>
        <template v-if="!talentNumbers.isSingleDigit">
          <Icon icon="mdi:arrow-right" class="w-4 h-4 mx-2 text-text-muted" />
          <div class="talent-digits">
            <span
              v-for="(digit, index) in talentNumbers.numbers"
              :key="index"
              class="talent-digit"
            >
              {{ digit }}
            </span>
          </div>
        </template>
      </div>

      <p class="talent-note mt-3">
        <template v-if="talentNumbers.isSingleDigit">
          您的總和為個位數，天賦數即為此數字本身
        </template>
        <template v-else>
          天賦數為主命數計算過程中，最後縮減前的數字
        </template>
      </p>
    </div>
  </NCard>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.talent-numbers {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.section-header {
  @apply flex items-center;
}

.section-title {
  @apply font-serif text-base font-semibold text-text-primary;
}

.talent-display {
  @apply text-center;
}

.talent-calculation {
  @apply flex items-center justify-center gap-2;
}

.original-sum {
  @apply font-serif text-3xl font-bold text-lavender;
}

.talent-digits {
  @apply flex gap-2;
}

.talent-digit {
  @apply inline-flex items-center justify-center min-w-10 h-10
         font-serif text-xl font-bold text-text-primary
         rounded-xl;
  background: linear-gradient(135deg, #C5B4E3, #D4C7EC);
  box-shadow: 0 4px 12px rgba(197, 180, 227, 0.35);
}

.talent-note {
  @apply text-sm text-text-muted m-0;
}
</style>
