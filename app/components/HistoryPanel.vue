<script setup lang="ts">
import { NTag, NButton } from 'naive-ui'
import { useHistory } from '~/composables/useHistory'
import type { BirthDate, ZodiacSign } from '~/shared/types'

const emit = defineEmits<{
  select: [date: BirthDate, zodiac: ZodiacSign]
}>()

const { records, removeRecord, clearAll } = useHistory()

const showPanel = ref(false)

function formatDate(d: BirthDate): string {
  return `${d.year}/${String(d.month).padStart(2, '0')}/${String(d.day).padStart(2, '0')}`
}

function handleSelect(record: typeof records.value[number]) {
  emit('select', record.birthDate, record.zodiacSign)
  showPanel.value = false
}
</script>

<template>
  <div class="history-panel">
    <button
      v-if="records.length > 0"
      class="history-toggle"
      @click="showPanel = !showPanel"
    >
      <Icon icon="mdi:history" class="w-4 h-4 mr-1" />
      <span>歷史紀錄（{{ records.length }}）</span>
      <Icon
        :icon="showPanel ? 'mdi:chevron-up' : 'mdi:chevron-down'"
        class="w-4 h-4 ml-1"
      />
    </button>

    <Transition name="slide-fade">
      <div v-if="showPanel && records.length > 0" class="history-list">
        <div class="history-actions">
          <NButton size="tiny" quaternary type="error" @click="clearAll">
            <template #icon>
              <Icon icon="mdi:delete-outline" class="w-3.5 h-3.5" />
            </template>
            清除全部
          </NButton>
        </div>

        <div
          v-for="record in records"
          :key="record.id"
          class="history-item"
          @click="handleSelect(record)"
        >
          <div class="item-info">
            <span class="item-date">{{ formatDate(record.birthDate) }}</span>
            <NTag size="small" type="primary" class="ml-2">
              {{ record.lifePathNumber }}
            </NTag>
            <span v-if="record.label" class="item-label">{{ record.label }}</span>
          </div>
          <button class="item-remove" @click.stop="removeRecord(record.id)">
            <Icon icon="mdi:close" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.history-panel {
  @apply mt-3;
}

.history-toggle {
  @apply flex items-center text-sm text-text-muted
         cursor-pointer transition-colors duration-200
         hover:text-text-primary;
  background: none;
  border: none;
}

.history-list {
  @apply mt-2 p-3 bg-surface-variant rounded-soft space-y-1;
}

.history-actions {
  @apply flex justify-end mb-1;
}

.history-item {
  @apply flex items-center justify-between px-3 py-2
         rounded-[10px] cursor-pointer
         transition-all duration-200
         hover:bg-surface;
}

.item-info {
  @apply flex items-center;
}

.item-date {
  @apply text-sm font-medium text-text-primary;
}

.item-label {
  @apply text-xs text-text-muted ml-2;
}

.item-remove {
  @apply p-1 text-text-muted hover:text-primary
         transition-colors duration-200 cursor-pointer;
  background: none;
  border: none;
}

.slide-fade-enter-active {
  @apply transition-all duration-300;
}

.slide-fade-leave-active {
  @apply transition-all duration-200;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  @apply opacity-0 -translate-y-2;
}
</style>
