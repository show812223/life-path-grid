<script setup lang="ts">
interface Props {
  adSlot?: string
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal'
  fullWidthResponsive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  adSlot: '',
  adFormat: 'auto',
  fullWidthResponsive: true
})

const runtimeConfig = useRuntimeConfig()
const adClient = computed(() => runtimeConfig.public.adsenseId || 'ca-pub-XXXXXXXXXXXXXXXX')

const isProduction = computed(() => process.env.NODE_ENV === 'production')

onMounted(() => {
  if (isProduction.value && props.adSlot) {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      console.error('AdSense error:', e)
    }
  }
})
</script>

<template>
  <div class="google-ad-container">
    <!-- 開發環境預覽 -->
    <div v-if="!isProduction || !adSlot" class="ad-placeholder">
      <div class="ad-placeholder-content">
        <Icon icon="mdi:advertisements" class="ad-icon" />
        <span class="ad-text">廣告區域</span>
        <span class="ad-hint">（正式環境顯示 Google AdSense）</span>
      </div>
    </div>

    <!-- 正式環境廣告 -->
    <ins
      v-else
      class="adsbygoogle"
      style="display: block"
      :data-ad-client="adClient"
      :data-ad-slot="adSlot"
      :data-ad-format="adFormat"
      :data-full-width-responsive="fullWidthResponsive"
    />
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.google-ad-container {
  @apply w-full my-6;
}

.ad-placeholder {
  @apply w-full min-h-[100px] rounded-lg border-2 border-dashed border-primary/30;
  @apply flex items-center justify-center;
  @apply bg-gradient-to-r from-primary/5 to-accent/5;
}

.ad-placeholder-content {
  @apply flex flex-col items-center gap-2 text-text-muted;
}

.ad-icon {
  @apply w-8 h-8 text-primary/50;
}

.ad-text {
  @apply text-sm font-medium;
}

.ad-hint {
  @apply text-xs opacity-60;
}

/* 響應式廣告樣式 */
.adsbygoogle {
  @apply w-full;
}
</style>
