<script setup lang="ts">
import { NCard, NCollapseTransition } from 'naive-ui'

interface Props {
  lifePathNumber: number
  birthdayNumber: number
  talentNumbers: number[]
  conditioningNumber: number
}

const props = defineProps<Props>()

const showDetails = ref(true)

// 三角形三個頂點的數字
// 上方：主命數、左下：生日數、右下：天賦數
// 中心：制約數
</script>

<template>
  <NCard class="holographic-triangle" :bordered="false">
    <div class="section-header mb-4">
      <Icon icon="mdi:triangle-outline" class="w-5 h-5 mr-2 text-primary" />
      <span class="section-title">全息三角形</span>
    </div>

    <!-- SVG 三角形 -->
    <div class="triangle-container">
      <svg viewBox="0 0 300 260" class="triangle-svg">
        <!-- 連線 -->
        <line x1="150" y1="30" x2="40" y2="220" class="triangle-line" />
        <line x1="150" y1="30" x2="260" y2="220" class="triangle-line" />
        <line x1="40" y1="220" x2="260" y2="220" class="triangle-line" />

        <!-- 中心到頂點的虛線 -->
        <line x1="150" y1="140" x2="150" y2="30" class="triangle-line-dashed" />
        <line x1="150" y1="140" x2="40" y2="220" class="triangle-line-dashed" />
        <line x1="150" y1="140" x2="260" y2="220" class="triangle-line-dashed" />

        <!-- 上方：主命數 -->
        <circle cx="150" cy="30" r="24" class="node-circle top" />
        <text x="150" y="36" text-anchor="middle" class="node-text">{{ lifePathNumber }}</text>

        <!-- 左下：生日數 -->
        <circle cx="40" cy="220" r="24" class="node-circle left" />
        <text x="40" y="226" text-anchor="middle" class="node-text">{{ birthdayNumber }}</text>

        <!-- 右下：天賦數 -->
        <circle cx="260" cy="220" r="24" class="node-circle right" />
        <text x="260" y="226" text-anchor="middle" class="node-text">{{ talentNumbers.join('') }}</text>

        <!-- 中心：制約數 -->
        <circle cx="150" cy="140" r="20" class="node-circle center" />
        <text x="150" y="146" text-anchor="middle" class="node-text center-text">{{ conditioningNumber }}</text>

        <!-- 標籤 -->
        <text x="150" y="72" text-anchor="middle" class="label-text">主命數</text>
        <text x="40" y="256" text-anchor="middle" class="label-text">生日數</text>
        <text x="260" y="256" text-anchor="middle" class="label-text">天賦數</text>
        <text x="150" y="172" text-anchor="middle" class="label-text">制約數</text>
      </svg>
    </div>

    <!-- 解讀 -->
    <button class="disclosure-button text-sm mt-3" @click="showDetails = !showDetails">
      <span class="flex items-center">
        <Icon icon="mdi:information-outline" class="w-4 h-4 mr-2" />
        三角形解讀
      </span>
      <Icon :icon="showDetails ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 text-text-muted" />
    </button>
    <NCollapseTransition :show="showDetails">
      <div class="details-content">
        <div class="detail-item">
          <span class="detail-label">▲ 頂點（主命數 {{ lifePathNumber }}）</span>
          <span class="detail-desc">代表人生使命與核心能量，是整體三角形的指引方向。</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">◣ 左下（生日數 {{ birthdayNumber }}）</span>
          <span class="detail-desc">代表與生俱來的天賦特質，是你最自然的表達方式。</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">◢ 右下（天賦數 {{ talentNumbers.join(', ') }}）</span>
          <span class="detail-desc">代表後天發展的才能方向，是你可以培養的強項。</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">● 中心（制約數 {{ conditioningNumber }}）</span>
          <span class="detail-desc">代表需要克服的課題，平衡三個頂點能量的關鍵。</span>
        </div>
      </div>
    </NCollapseTransition>
  </NCard>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.holographic-triangle {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
}

.section-header {
  @apply flex items-center;
}

.section-title {
  @apply font-serif text-lg font-semibold text-text-primary;
}

.triangle-container {
  @apply flex justify-center;
}

.triangle-svg {
  @apply w-full max-w-[320px];
}

.triangle-line {
  stroke: var(--color-primary-light);
  stroke-width: 2;
  fill: none;
}

.triangle-line-dashed {
  stroke: var(--color-border);
  stroke-width: 1;
  stroke-dasharray: 4, 4;
  fill: none;
}

.node-circle {
  fill: var(--color-surface);
  stroke-width: 2.5;
}

.node-circle.top {
  stroke: var(--color-primary);
}

.node-circle.left {
  stroke: var(--color-accent);
}

.node-circle.right {
  stroke: var(--color-lavender);
}

.node-circle.center {
  stroke: var(--color-warning);
}

.node-text {
  fill: var(--color-text-primary);
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 700;
}

.center-text {
  font-size: 14px;
}

.label-text {
  fill: var(--color-text-muted);
  font-family: var(--font-sans);
  font-size: 11px;
}

.disclosure-button {
  @apply flex w-full items-center justify-between px-4 py-3
         text-left font-medium text-text-primary
         bg-surface-variant rounded-soft
         transition-all duration-200 cursor-pointer
         hover:bg-surface-variant/80;
}

.details-content {
  @apply px-3 py-3 space-y-3;
}

.detail-item {
  @apply flex flex-col;
}

.detail-label {
  @apply text-sm font-semibold text-text-primary mb-0.5;
}

.detail-desc {
  @apply text-sm text-text-muted leading-relaxed;
}
</style>
