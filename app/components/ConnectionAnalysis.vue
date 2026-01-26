<script setup lang="ts">
import type { Connection } from '~/shared/types'
import { getConnectionMeaning } from '~/shared/constants/connectionMeanings'

interface Props {
  connections: Connection[]
}

const props = defineProps<Props>()

const activeConnections = computed(() => props.connections.filter((c) => c.isActive))
const inactiveConnections = computed(() => props.connections.filter((c) => !c.isActive))

function getConnectionDetails(conn: Connection) {
  return getConnectionMeaning(conn.id)
}

// 展開狀態
const expandedConnections = ref<Record<string, boolean>>({})
const showInactiveConnections = ref(false)

function toggleConnection(id: string) {
  expandedConnections.value[id] = !expandedConnections.value[id]
}
</script>

<template>
  <div class="connection-analysis glass-card">
    <div class="section-header">
      <Icon icon="mdi:vector-line" class="w-5 h-5 mr-2 text-accent" />
      <span class="section-title">連線分析</span>
      <span class="chip chip-primary ml-2 text-sm">
        {{ activeConnections.length }} / {{ connections.length }}
      </span>
    </div>

    <div v-if="activeConnections.length === 0" class="no-connections">
      <Icon icon="mdi:link-variant-off" class="w-12 h-12 text-text-muted" />
      <p>目前沒有形成任何連線</p>
    </div>

    <div v-else class="connections-list">
      <div class="connections-grid">
        <!-- 已形成的連線 -->
        <div
          v-for="conn in activeConnections"
          :key="conn.id"
          class="connection-card active"
        >
          <div class="connection-header">
            <span class="connection-name">{{ conn.name }}</span>
            <span class="connection-numbers">{{ conn.numbers.join(' - ') }}</span>
          </div>
          <div class="connection-type">
            <span
              :class="[
                'chip text-xs',
                conn.type === 'diagonal' ? 'chip-lavender' : 'chip-primary'
              ]"
            >
              {{ conn.type === 'horizontal' ? '橫線' : conn.type === 'vertical' ? '縱線' : '斜線' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 連線詳細解讀 -->
      <div class="mt-4 space-y-2">
        <div
          v-for="conn in activeConnections"
          :key="conn.id"
          class="meaning-panel"
        >
          <button
            class="disclosure-button"
            @click="toggleConnection(conn.id)"
          >
            <div class="panel-title">
              <Icon icon="mdi:check-circle" class="w-4 h-4 mr-2 text-accent" />
              <span>{{ conn.name }}</span>
              <span class="numbers-label">（{{ conn.numbers.join('-') }}）</span>
            </div>
            <Icon
              :icon="expandedConnections[conn.id] ? 'mdi:chevron-up' : 'mdi:chevron-down'"
              class="w-5 h-5 text-text-muted"
            />
          </button>
          <Transition name="slide-fade">
            <div v-if="expandedConnections[conn.id]" class="meaning-content">
              <p class="description">{{ getConnectionDetails(conn)?.description }}</p>
              <div class="traits">
                <span
                  v-for="trait in getConnectionDetails(conn)?.traits"
                  :key="trait"
                  class="chip chip-accent m-1"
                >
                  {{ trait }}
                </span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- 未形成的連線（摺疊顯示） -->
    <div v-if="inactiveConnections.length > 0" class="mt-4">
      <button
        class="disclosure-button inactive-title"
        @click="showInactiveConnections = !showInactiveConnections"
      >
        <div class="flex items-center">
          <Icon icon="mdi:link-variant-off" class="w-4 h-4 mr-2 text-text-muted" />
          <span>未形成的連線（{{ inactiveConnections.length }}條）</span>
        </div>
        <Icon
          :icon="showInactiveConnections ? 'mdi:chevron-up' : 'mdi:chevron-down'"
          class="w-5 h-5 text-text-muted"
        />
      </button>
      <Transition name="slide-fade">
        <div v-if="showInactiveConnections" class="inactive-list">
          <div
            v-for="conn in inactiveConnections"
            :key="conn.id"
            class="inactive-item"
          >
            <span class="conn-name">{{ conn.name }}</span>
            <span class="conn-numbers">{{ conn.numbers.join(' - ') }}</span>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.connection-analysis {
  @apply p-5;
}

.section-header {
  @apply flex items-center mb-4;
}

.section-title {
  @apply font-serif text-lg font-semibold text-text-primary;
}

.no-connections {
  @apply flex flex-col items-center p-6 text-center;
}

.no-connections p {
  @apply mt-3 text-text-muted;
}

.connections-grid {
  @apply grid gap-3;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.connection-card {
  @apply p-3 rounded-soft transition-all duration-300;
}

.connection-card.active {
  background: linear-gradient(135deg, rgba(212, 165, 165, 0.12) 0%, rgba(157, 195, 183, 0.08) 100%);
  @apply border-2 border-primary-light;
}

.connection-card .connection-header {
  @apply flex flex-col gap-1;
}

.connection-card .connection-name {
  @apply font-serif text-base font-semibold text-text-primary;
}

.connection-card .connection-numbers {
  @apply text-sm text-text-muted;
}

.connection-card .connection-type {
  @apply mt-2;
}

.meaning-panel {
  @apply overflow-hidden rounded-soft;
}

.panel-title {
  @apply flex items-center text-text-primary;
}

.panel-title .numbers-label {
  @apply text-text-muted ml-1;
}

.meaning-content {
  @apply px-4 py-3;
}

.meaning-content .description {
  @apply text-text-primary leading-relaxed mb-3;
}

.meaning-content .traits {
  @apply flex flex-wrap;
}

.inactive-title {
  @apply text-text-muted bg-surface-variant;
}

.inactive-list {
  @apply flex flex-wrap gap-2 mt-2 px-4 py-3;
}

.inactive-item {
  @apply flex items-center gap-2 px-3 py-2
         bg-surface-variant border border-border rounded-[10px] opacity-70;
}

.inactive-item .conn-name {
  @apply text-sm text-text-primary;
}

.inactive-item .conn-numbers {
  @apply text-xs text-text-muted;
}
</style>
