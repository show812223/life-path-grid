<script setup lang="ts">
import type { UseCobieFilterReturn } from '~/composables/useCobieFilter'
import FilterConditionCard from './FilterConditionCard.vue'
import FilterOrGroupCard from './FilterOrGroupCard.vue'
import { isConditionActive } from '~/composables/filterEngine'

const props = defineProps<{ filter: UseCobieFilterReturn }>()

const showAddMenu = ref(false)
const showOrMenu = ref(false)

const hitCount = computed(() => {
  const r = props.filter.result.value
  return r.active ? r.finalSet.size : 0
})
const totalCount = computed(() =>
  props.filter.ctx.value ? props.filter.ctx.value.components.length : 0
)
const missingCount = computed(() => {
  const r = props.filter.result.value
  return r.active ? r.missingInModel : 0
})

const firstActiveItemKey = computed<string | null>(() => {
  for (const item of props.filter.chain.value.items) {
    if (item.kind === 'single') {
      if (isConditionActive(item.condition)) return item.condition.id
    } else {
      if (item.conditions.some(isConditionActive)) return item.id
    }
  }
  return null
})

const onCopyExtIds = async () => {
  const text = props.filter.exportExtIds()
  if (!text) return
  await navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="filter-panel">
    <header class="filter-head">
      <h3 class="filter-title">篩選器</h3>
      <v-spacer />
      <span class="filter-badge t-mono">{{ hitCount }} / {{ totalCount }}</span>
      <v-btn icon="mdi-broom" variant="text" size="small" title="清除全部" @click="filter.clearAll()" />
    </header>

    <v-divider />

    <div class="filter-body">
      <v-switch
        :model-value="filter.enabled.value"
        @update:model-value="(v) => filter.enabled.value = !!v"
        label="套用到模型"
        color="primary"
        density="compact"
        hide-details
        class="filter-toggle"
      />

      <div v-if="filter.chain.value.items.length === 0" class="empty">
        <v-icon icon="mdi-filter-variant-plus" size="32" color="grey-lighten-1" />
        <div>尚無條件，點下方「+」加入</div>
      </div>

      <template v-else>
        <template v-for="item in filter.chain.value.items" :key="item.kind === 'single' ? item.condition.id : item.id">
          <FilterConditionCard
            v-if="item.kind === 'single'"
            :condition="item.condition"
            :ctx="filter.ctx.value"
            :is-first-active="firstActiveItemKey === item.condition.id"
            @update="(p) => filter.updateCondition(item.condition.id, p)"
            @remove="filter.removeItem(item.condition.id)"
          />
          <FilterOrGroupCard
            v-else
            :group-id="item.id"
            :conditions="item.conditions"
            :ctx="filter.ctx.value"
            :available-dimensions="filter.availableDimensions"
            :is-first-active="firstActiveItemKey === item.id"
            @update-condition="(cid, p) => filter.updateCondition(cid, p)"
            @remove-condition="(cid) => filter.removeConditionFromGroup(item.id, cid)"
            @add-condition="(dim) => filter.addConditionToGroup(item.id, dim)"
            @remove-group="filter.removeItem(item.id)"
          />
        </template>
      </template>

      <div class="add-row">
        <v-menu v-model="showAddMenu">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="tonal" size="small" prepend-icon="mdi-plus">加入條件 (AND)</v-btn>
          </template>
          <v-list density="compact" max-height="320">
            <v-list-item
              v-for="d in filter.availableDimensions"
              :key="d.id"
              @click="filter.addCondition(d.id); showAddMenu = false"
            >
              <v-list-item-title>{{ d.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-menu v-model="showOrMenu">
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" size="small" prepend-icon="mdi-plus">OR 群組</v-btn>
          </template>
          <v-list density="compact" max-height="320">
            <v-list-item
              v-for="d in filter.availableDimensions"
              :key="d.id"
              @click="filter.addOrGroup(d.id); showOrMenu = false"
            >
              <v-list-item-title>{{ d.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <v-divider />

    <footer v-if="filter.result.value.active" class="filter-foot">
      <div v-if="missingCount > 0" class="warn">
        <v-icon icon="mdi-alert" size="14" />
        {{ missingCount }} 件未在模型中找到
      </div>
      <div v-if="filter.result.value.emptyAtStep != null" class="error">
        <v-icon icon="mdi-close-circle" size="14" />
        此條件後無命中
      </div>
      <div class="foot-actions">
        <v-btn size="small" variant="text" prepend-icon="mdi-crosshairs-gps" @click="filter.fitToHits()">Fit to view</v-btn>
        <v-btn size="small" variant="text" prepend-icon="mdi-content-copy" :disabled="hitCount === 0" @click="onCopyExtIds">複製 ExtIDs</v-btn>
      </div>
      <div v-if="filter.hitsGroupedByType.value.length" class="hits-by-type">
        <div v-for="g in filter.hitsGroupedByType.value" :key="g.typeName" class="hits-group">
          <div class="hits-group-title">
            <span>{{ g.typeName }}</span>
            <span class="t-mono">{{ g.components.length }}</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.filter-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.filter-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}
.filter-title { font-size: 13px; font-weight: 700; margin: 0; }
.filter-badge { font-size: 11px; color: var(--primary); }
.filter-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.filter-toggle { margin-bottom: 4px; }
.empty {
  padding: 24px 8px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}
.add-row {
  display: flex;
  gap: 6px;
  padding-top: 4px;
}
.filter-foot {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.warn { color: #B45309; display: flex; align-items: center; gap: 4px; }
.error { color: #B91C1C; display: flex; align-items: center; gap: 4px; }
.foot-actions { display: flex; gap: 4px; }
.hits-by-type {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hits-group-title {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  background: var(--surface-2);
  border-radius: 4px;
  font-size: 11px;
}
</style>
