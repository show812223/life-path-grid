<script setup lang="ts">
import { NCard, NTag, NCollapseTransition } from 'naive-ui'
import type { Connection, SecondaryConnection } from '~/shared/types'
import { getConnectionMeaning, getSecondaryConnectionMeaning } from '~/shared/constants/connectionMeanings'

interface Props {
  connections: Connection[]
  secondaryConnections: SecondaryConnection[]
}

const props = defineProps<Props>()

const activeConnections = computed(() => props.connections.filter((c) => c.isActive))
const inactiveConnections = computed(() => props.connections.filter((c) => !c.isActive))
const activeSecondaryConnections = computed(() => props.secondaryConnections.filter((c) => c.isActive))

function getConnectionDetails(conn: Connection) {
  return getConnectionMeaning(conn.id)
}

function getSecondaryConnectionDetails(conn: SecondaryConnection) {
  return getSecondaryConnectionMeaning(conn.id)
}

// 展開狀態
const expandedConnections = ref<Record<string, boolean>>({})
const expandedSecondaryConnections = ref<Record<string, boolean>>({})
const showInactiveConnections = ref(false)

function toggleConnection(id: string) {
  expandedConnections.value[id] = !expandedConnections.value[id]
}

function toggleSecondaryConnection(id: string) {
  expandedSecondaryConnections.value[id] = !expandedSecondaryConnections.value[id]
}
</script>

<template>
  <NCard class="connection-analysis" :bordered="false">
    <div class="section-header">
      <Icon icon="mdi:vector-line" class="w-5 h-5 mr-2 text-accent" />
      <span class="section-title">連線分析</span>
      <NTag type="primary" size="small" class="ml-2">
        {{ activeConnections.length }} / {{ connections.length }}
      </NTag>
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
            <NTag
              :type="conn.type === 'diagonal' ? 'default' : 'primary'"
              size="small"
              :color="conn.type === 'diagonal' ? { color: 'rgba(197, 180, 227, 0.2)', textColor: '#9B8AC4' } : undefined"
            >
              {{ conn.type === 'horizontal' ? '橫線' : conn.type === 'vertical' ? '縱線' : '斜線' }}
            </NTag>
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
          <NCollapseTransition :show="expandedConnections[conn.id]">
            <div class="meaning-content">
              <p class="description">{{ getConnectionDetails(conn)?.description }}</p>
              <div class="traits">
                <NTag
                  v-for="trait in getConnectionDetails(conn)?.traits"
                  :key="trait"
                  type="success"
                  size="small"
                  class="m-1"
                >
                  {{ trait }}
                </NTag>
              </div>
              <div class="frequency-section">
                <div class="frequency-item">
                  <span class="frequency-dot green" />
                  <span class="frequency-label">高頻表現</span>
                  <NTag v-if="getConnectionDetails(conn)?.highFreqName" type="success" size="small" class="ml-2">
                    {{ getConnectionDetails(conn)?.highFreqName }}
                  </NTag>
                </div>
                <p class="frequency-description">{{ getConnectionDetails(conn)?.highFrequency }}</p>
              </div>
              <div class="frequency-section">
                <div class="frequency-item">
                  <span class="frequency-dot orange" />
                  <span class="frequency-label">低頻表現</span>
                  <NTag v-if="getConnectionDetails(conn)?.lowFreqName" type="warning" size="small" class="ml-2">
                    {{ getConnectionDetails(conn)?.lowFreqName }}
                  </NTag>
                </div>
                <p class="frequency-description">{{ getConnectionDetails(conn)?.lowFrequency }}</p>
              </div>
            </div>
          </NCollapseTransition>
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
      <NCollapseTransition :show="showInactiveConnections">
        <div class="inactive-list">
          <div
            v-for="conn in inactiveConnections"
            :key="conn.id"
            class="inactive-item"
          >
            <span class="conn-name">{{ conn.name }}</span>
            <span class="conn-numbers">{{ conn.numbers.join(' - ') }}</span>
          </div>
        </div>
      </NCollapseTransition>
    </div>

    <!-- 副連線 -->
    <div v-if="activeSecondaryConnections.length > 0" class="mt-4">
      <div class="section-header">
        <Icon icon="mdi:vector-polyline" class="w-5 h-5 mr-2 text-accent" />
        <span class="section-title">副連線</span>
        <NTag type="primary" size="small" class="ml-2">
          {{ activeSecondaryConnections.length }}
        </NTag>
      </div>

      <div class="space-y-2">
        <div
          v-for="conn in activeSecondaryConnections"
          :key="conn.id"
          class="meaning-panel"
        >
          <button
            class="disclosure-button"
            @click="toggleSecondaryConnection(conn.id)"
          >
            <div class="panel-title">
              <Icon icon="mdi:check-circle" class="w-4 h-4 mr-2 text-accent" />
              <span>{{ conn.name }}</span>
              <span class="numbers-label">（{{ conn.numbers.join('-') }}）</span>
            </div>
            <Icon
              :icon="expandedSecondaryConnections[conn.id] ? 'mdi:chevron-up' : 'mdi:chevron-down'"
              class="w-5 h-5 text-text-muted"
            />
          </button>
          <NCollapseTransition :show="expandedSecondaryConnections[conn.id]">
            <div class="meaning-content">
              <p class="description">{{ getSecondaryConnectionDetails(conn)?.description }}</p>
              <div class="traits">
                <NTag
                  v-for="trait in getSecondaryConnectionDetails(conn)?.traits"
                  :key="trait"
                  type="success"
                  size="small"
                  class="m-1"
                >
                  {{ trait }}
                </NTag>
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

.connection-analysis {
  @apply backdrop-blur-sm;
  background: rgba(255, 251, 248, 0.85) !important;
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
  @apply flex flex-wrap mb-3;
}

.frequency-section {
  @apply mt-3;
}

.frequency-item {
  @apply flex items-center gap-2 mb-1;
}

.frequency-dot {
  @apply w-2.5 h-2.5 rounded-full flex-shrink-0;
}

.frequency-dot.green {
  @apply bg-success;
}

.frequency-dot.orange {
  @apply bg-warning;
}

.frequency-label {
  @apply text-sm font-medium text-text-primary;
}

.frequency-description {
  @apply text-sm text-text-muted leading-relaxed ml-[18px] mb-0;
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
