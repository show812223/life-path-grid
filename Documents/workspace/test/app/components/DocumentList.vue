<script setup lang="ts">
import type { SelectedElement } from './ForgeViewer.client.vue'

defineProps<{
  element: SelectedElement | null
  modelId: string
}>()
</script>

<template>
  <div class="docs">
    <div class="empty">
      <div class="empty-icon">
        <v-icon icon="mdi-file-document-outline" size="32" color="grey-lighten-1" />
      </div>
      <div class="empty-title">尚未連結文件</div>
      <div class="empty-text">
        設備文件需另行匯入（PDF / 規格書 / 保固文件等）<br />
        模型內嵌參數通常不含文件附件
      </div>
      <v-chip size="x-small" variant="tonal" color="warning" class="mt-3">
        待後續匯入流程
      </v-chip>
    </div>
  </div>
</template>

<style scoped>
.docs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}

.empty-text {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.7;
}
</style>
