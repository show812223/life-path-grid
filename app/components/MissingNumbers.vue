<script setup lang="ts">
import { NCard, NCollapseTransition } from 'naive-ui'
import { getMissingNumberMeaning } from '~/shared/constants/numberMeanings'

interface Props {
  missingNumbers: number[]
}

const props = defineProps<Props>()

const missingDetails = computed(() => {
  return props.missingNumbers.map((num) => ({
    number: num,
    meaning: getMissingNumberMeaning(num)
  }))
})

// 各個缺數的展開狀態
const expandedPanels = ref<Record<number, boolean>>({})

function togglePanel(num: number) {
  expandedPanels.value[num] = !expandedPanels.value[num]
}
</script>

<template>
  <NCard class="missing-numbers" :bordered="false">
    <div class="section-header">
      <Icon icon="mdi:alert-circle-outline" class="w-5 h-5 mr-2 text-warning" />
      <span class="section-title">缺數分析</span>
    </div>

    <div v-if="missingNumbers.length === 0" class="no-missing">
      <Icon icon="mdi:check-circle" class="w-12 h-12 text-success" />
      <p>恭喜！您的九宮格沒有缺數，數字能量完整。</p>
    </div>

    <div v-else class="missing-list">
      <div class="missing-tags">
        <span
          v-for="num in missingNumbers"
          :key="num"
          class="missing-number-tag"
        >
          {{ num }}
        </span>
      </div>

      <div class="mt-4 space-y-2">
        <div
          v-for="item in missingDetails"
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
              <div class="suggestion">
                <Icon icon="mdi:lightbulb-outline" class="w-4 h-4 mr-1 text-primary flex-shrink-0 mt-0.5" />
                <span><strong>建議：</strong>{{ item.meaning?.suggestion }}</span>
              </div>
              <div v-if="item.meaning" class="remediation-grid">
                <div class="remedy-item">
                  <Icon icon="mdi:palette" class="w-4 h-4 text-accent flex-shrink-0" />
                  <div>
                    <span class="remedy-label">幸運色</span>
                    <span class="remedy-value">{{ item.meaning.luckyColor }}</span>
                  </div>
                </div>
                <div class="remedy-item">
                  <Icon icon="mdi:diamond-stone" class="w-4 h-4 text-info flex-shrink-0" />
                  <div>
                    <span class="remedy-label">水晶</span>
                    <span class="remedy-value">{{ item.meaning.crystal }}</span>
                  </div>
                </div>
                <div class="remedy-item">
                  <Icon icon="mdi:flower-outline" class="w-4 h-4 text-success flex-shrink-0" />
                  <div>
                    <span class="remedy-label">精油</span>
                    <span class="remedy-value">{{ item.meaning.essentialOil }}</span>
                  </div>
                </div>
              </div>
            </div>
          </NCollapseTransition>
        </div>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.missing-numbers {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.section-header {
  @apply flex items-center mb-4;
}

.section-title {
  @apply font-serif text-lg font-semibold text-text-primary;
}

.no-missing {
  @apply flex flex-col items-center p-6 text-center;
}

.no-missing p {
  @apply mt-3 text-text-muted;
}

.missing-tags {
  @apply flex flex-wrap gap-2;
}

.missing-number-tag {
  @apply inline-flex items-center justify-center min-w-9 h-9 px-3
         font-serif text-lg font-semibold text-text-muted
         bg-surface-variant border-2 border-dashed border-border rounded-[10px]
         transition-all duration-300 hover:border-primary hover:bg-primary/10;
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
         font-serif text-sm font-semibold text-secondary
         bg-secondary/25 rounded-lg;
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

.meaning-content .suggestion {
  @apply flex items-start p-3 text-sm text-text-primary
         bg-surface-variant rounded-[10px] leading-relaxed;
}

.remediation-grid {
  @apply grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3;
}

.remedy-item {
  @apply flex items-start gap-2 p-2.5 rounded-[10px];
  background: rgba(0, 0, 0, 0.02);
}

.remedy-item div {
  @apply flex flex-col;
}

.remedy-label {
  @apply text-xs text-text-muted;
}

.remedy-value {
  @apply text-sm font-medium text-text-primary;
}
</style>
