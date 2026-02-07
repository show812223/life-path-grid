<script setup lang="ts">
import { NCard, NCollapseTransition, NTag } from 'naive-ui'
import type { TalentNumbers } from '~/shared/types'
import { getTalentNumberMeaning } from '~/shared/constants/numberMeanings'

interface Props {
  talentNumbers: TalentNumbers
}

const props = defineProps<Props>()

const talentDetails = computed(() => {
  return props.talentNumbers.numbers.map((num) => ({
    number: num,
    meaning: getTalentNumberMeaning(num)
  }))
})

const expandedPanels = ref<Record<number, boolean>>({})

function togglePanel(num: number) {
  expandedPanels.value[num] = !expandedPanels.value[num]
}
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

    <!-- 天賦數解釋 -->
    <div class="talent-meanings mt-4 space-y-2">
      <div
        v-for="item in talentDetails"
        :key="item.number"
        class="meaning-panel"
      >
        <button
          class="disclosure-button"
          @click="togglePanel(item.number)"
        >
          <div class="panel-title">
            <span class="panel-number">{{ item.number }}</span>
            <span class="panel-name">{{ item.meaning?.name }}</span>
          </div>
          <Icon
            :icon="expandedPanels[item.number] ? 'mdi:chevron-up' : 'mdi:chevron-down'"
            class="w-5 h-5 text-text-muted"
          />
        </button>
        <NCollapseTransition :show="expandedPanels[item.number]">
          <div class="meaning-content">
            <p class="description">{{ item.meaning?.description }}</p>
            <div class="talent-tags">
              <NTag
                v-for="talent in item.meaning?.talents"
                :key="talent"
                type="info"
                size="small"
                class="m-1"
              >
                {{ talent }}
              </NTag>
            </div>
          </div>
        </NCollapseTransition>
      </div>
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

.disclosure-button {
  @apply flex w-full items-center justify-between px-4 py-3
         text-left font-medium text-text-primary
         bg-surface-variant rounded-soft
         transition-all duration-200 cursor-pointer
         hover:bg-surface-variant/80;
}

.meaning-panel {
  @apply overflow-hidden rounded-soft;
}

.panel-title {
  @apply flex items-center gap-3;
}

.panel-number {
  @apply inline-flex items-center justify-center w-7 h-7
         font-serif text-sm font-semibold text-lavender
         bg-lavender/25 rounded-lg;
}

.panel-name {
  @apply font-medium text-text-primary;
}

.meaning-content {
  @apply px-4 py-3;
}

.meaning-content .description {
  @apply text-text-primary leading-relaxed mb-3;
}

.talent-tags {
  @apply flex flex-wrap;
}
</style>
