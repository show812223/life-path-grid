<script setup lang="ts">
const legends = [
  { source: 'innate', label: '先天數', description: '出生日期的數字' },
  { source: 'lifePath', label: '主命數', description: '生命軌跡數' },
  { source: 'talent', label: '天賦數', description: '潛能天賦數' },
  { source: 'zodiac', label: '星座數', description: '星座對應數' },
  { source: 'personalYear', label: '流年數', description: '年度運勢數' }
]
</script>

<template>
  <div class="grid-legend">
    <div class="legend-title">
      <Icon icon="mdi:palette" class="w-4 h-4 mr-1" />
      數字來源圖例
    </div>
    <div class="legend-items">
      <div
        v-for="legend in legends"
        :key="legend.source"
        class="legend-item"
      >
        <span class="legend-chip" :class="legend.source">1</span>
        <div class="legend-text">
          <span class="legend-label">{{ legend.label }}</span>
          <span class="legend-desc">{{ legend.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.grid-legend {
  @apply p-3 px-4 bg-surface-variant border border-border rounded-soft mt-4;
}

.legend-title {
  @apply flex items-center text-xs text-text-muted mb-3;
}

.legend-items {
  @apply grid grid-cols-2 gap-3;
}

.legend-item {
  @apply flex items-center gap-2;
}

.legend-chip {
  @apply inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5
         text-[0.7rem] font-semibold text-text-primary rounded-xl;
}

/* 先天數 - 玫瑰粉漸層 */
.legend-chip.innate {
  background: linear-gradient(135deg, #D4A5A5, #C5B4E3);
  box-shadow: 0 2px 8px rgba(212, 165, 165, 0.3);
}

/* 主命數 - 蜜桃奶油漸層 */
.legend-chip.lifePath {
  background: linear-gradient(135deg, #E8C4A2, #F5D5C8);
  box-shadow: 0 2px 8px rgba(232, 196, 162, 0.3);
}

/* 天賦數 - 薰衣草紫漸層 */
.legend-chip.talent {
  background: linear-gradient(135deg, #C5B4E3, #D4C7EC);
  box-shadow: 0 2px 8px rgba(197, 180, 227, 0.3);
}

/* 星座數 - 柔和藍漸層 */
.legend-chip.zodiac {
  background: linear-gradient(135deg, #A7C4D4, #BDD4E3);
  box-shadow: 0 2px 8px rgba(167, 196, 212, 0.3);
}

/* 流年數 - 療癒綠漸層 */
.legend-chip.personalYear {
  background: linear-gradient(135deg, #8FB996, #A8CCAF);
  box-shadow: 0 2px 8px rgba(143, 185, 150, 0.3);
}

.legend-text {
  @apply flex flex-col;
}

.legend-label {
  @apply text-xs font-semibold text-text-primary;
}

.legend-desc {
  @apply text-[0.7rem] text-text-muted;
}

@media (max-width: 400px) {
  .legend-items {
    @apply grid-cols-1;
  }
}
</style>
