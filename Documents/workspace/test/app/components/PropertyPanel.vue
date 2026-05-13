<script setup lang="ts">
import type { SelectedElement } from './ForgeViewer.client.vue'

const props = defineProps<{
  element: SelectedElement | null
}>()

const search = ref('')

interface Group {
  category: string
  items: { name: string; value: any }[]
}

const grouped = computed<Group[]>(() => {
  if (!props.element) return []
  const groups: Record<string, { name: string; value: any }[]> = {}
  const q = search.value.trim().toLowerCase()
  for (const p of props.element.properties) {
    if (q && !p.displayName.toLowerCase().includes(q)) continue
    const cat = p.displayCategory || '一般'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push({ name: p.displayName, value: p.displayValue })
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([category, items]) => ({ category, items }))
})

const totalCount = computed(() => props.element?.properties?.length || 0)
const expanded = ref<Record<string, boolean>>({})

const toggle = (cat: string) => {
  expanded.value[cat] = !(expanded.value[cat] ?? true)
}
const isOpen = (cat: string) => expanded.value[cat] ?? true

const copiedCat = ref<string | null>(null)
const copySection = async (g: Group) => {
  const obj: Record<string, any> = {}
  for (const item of g.items) obj[item.name] = item.value
  try {
    await navigator.clipboard.writeText(JSON.stringify(obj, null, 2))
    copiedCat.value = g.category
    setTimeout(() => { if (copiedCat.value === g.category) copiedCat.value = null }, 1200)
  } catch {}
}
</script>

<template>
  <div class="pp">

    <div v-if="!element" class="empty">
      <div class="empty-icon">
        <v-icon icon="mdi-cursor-default-click-outline" size="32" color="grey-lighten-1" />
      </div>
      <div class="empty-title">尚未選取構件</div>
      <div class="empty-text">點擊模型上任一構件以查看詳細屬性</div>
    </div>

    <template v-else>
      <div class="pp-head">
        <div class="pp-name-row">
          <v-icon icon="mdi-information-outline" size="18" color="primary" class="mr-2" />
          <div class="pp-name-text">
            <div class="pp-name">{{ element.name }}</div>
            <div class="pp-id t-mono">dbId · {{ element.dbId }}</div>
          </div>
        </div>

        <v-text-field
          v-model="search"
          placeholder="搜尋屬性"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          single-line
          clearable
        />

        <div class="pp-stat">
          <v-chip size="x-small" variant="tonal" color="primary" class="t-mono">
            {{ totalCount }} 項屬性
          </v-chip>
        </div>
      </div>

      <div class="pp-body">
        <section
          v-for="g in grouped"
          :key="g.category"
          class="pp-section"
        >
          <div class="pp-section-head-row">
            <button class="pp-section-head" @click="toggle(g.category)">
              <v-icon
                :icon="isOpen(g.category) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
                size="18"
                color="grey-darken-1"
              />
              <span class="pp-section-title">{{ g.category }}</span>
              <span class="pp-section-count t-mono">{{ g.items.length }}</span>
            </button>
            <v-btn
              :icon="copiedCat === g.category ? 'mdi-check' : 'mdi-content-copy'"
              variant="text"
              size="x-small"
              :title="copiedCat === g.category ? '已複製' : '複製為 JSON'"
              :aria-label="`複製 ${g.category} 為 JSON`"
              class="pp-section-copy"
              @click.stop="copySection(g)"
            />
          </div>

          <div v-if="isOpen(g.category)" class="pp-rows">
            <div v-for="(item, i) in g.items" :key="i" class="pp-row">
              <div class="pp-row-name">{{ item.name }}</div>
              <div class="pp-row-value">{{ item.value }}</div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pp {
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
.empty-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.empty-text { font-size: 12px; color: var(--text-muted); line-height: 1.6; }

.pp-head {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.pp-name-row { display: flex; align-items: flex-start; }
.pp-name-text { flex: 1; min-width: 0; }
.pp-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
  word-break: break-word;
}
.pp-id { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.pp-stat { display: flex; }

.pp-body { flex: 1; overflow-y: auto; padding: 8px 0; }

.pp-section { border-bottom: 1px solid var(--border); }
.pp-section:last-child { border-bottom: none; }

.pp-section-head-row {
  display: flex;
  align-items: center;
  padding-right: 12px;
  transition: background 140ms;
}
.pp-section-head-row:hover { background: var(--surface-2); }
.pp-section-head-row:hover .pp-section-copy { opacity: 1; }

.pp-section-head {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.pp-section-copy {
  opacity: 0;
  transition: opacity 140ms;
}
.pp-section-copy:focus-visible { opacity: 1; }

.pp-section-title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 0.02em;
}

.pp-section-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--surface-2);
  padding: 1px 6px;
  border-radius: 4px;
}

.pp-rows { padding: 4px 20px 14px; }

.pp-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
  border-top: 1px dashed var(--border);
  font-size: 12px;
}
.pp-row:first-child { border-top: 0; }

.pp-row-name {
  color: var(--text-muted);
  font-weight: 400;
  font-size: 11px;
  word-break: break-all;
  line-height: 1.4;
}

.pp-row-value {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--text);
  word-break: break-word;
  line-height: 1.5;
}
</style>
