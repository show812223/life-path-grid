<script setup lang="ts">
import { NButton } from 'naive-ui'

interface Props {
  targetSelector?: string
}

const props = withDefaults(defineProps<Props>(), {
  targetSelector: '.results-section'
})

const isExporting = ref(false)

async function handleExport() {
  if (isExporting.value) return
  isExporting.value = true

  try {
    const target = document.querySelector(props.targetSelector) as HTMLElement
    if (!target) return

    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(target, {
      backgroundColor: '#FDF8F5',
      scale: 2,
      useCORS: true,
      logging: false
    })

    const link = document.createElement('a')
    link.download = `命盤_${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  catch (err) {
    console.error('Export failed:', err)
  }
  finally {
    isExporting.value = false
  }
}
</script>

<template>
  <NButton
    size="small"
    quaternary
    :loading="isExporting"
    class="export-btn"
    @click="handleExport"
  >
    <template #icon>
      <Icon icon="mdi:download" class="w-4 h-4" />
    </template>
    {{ isExporting ? '匯出中...' : '匯出圖片' }}
  </NButton>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.export-btn {
  @apply text-text-muted;
}
</style>
