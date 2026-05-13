<script setup lang="ts">
await loadManifest()
const manifest = useManifest()

const search = ref('')

const filtered = computed(() => {
  if (!manifest.value) return []
  if (!search.value) return manifest.value.models
  const q = search.value.toLowerCase()
  return manifest.value.models.filter(m =>
    m.name.toLowerCase().includes(q) ||
    (m.subtitle?.toLowerCase().includes(q))
  )
})
</script>

<template>
  <div class="page">
    <v-text-field
      v-model="search"
      placeholder="搜尋模型…"
      prepend-inner-icon="mdi-magnify"
      density="compact"
      variant="solo-filled"
      flat
      single-line
      clearable
      hide-details
      class="search"
    />

    <v-card class="models-card" flat>
      <v-list>
        <v-list-item
          v-for="(m, i) in filtered"
          :key="m.id"
          :to="`/viewer/${m.id}`"
          :border="i > 0 ? 'top' : undefined"
          class="model-row"
        >
          <template #prepend>
            <div class="thumb">
              <img v-if="m.thumbnail" :src="m.thumbnail" :alt="m.name" />
              <v-icon v-else icon="mdi-cube-outline" color="grey-lighten-1" size="28" />
            </div>
          </template>

          <v-list-item-title class="row-name">{{ m.name }}</v-list-item-title>
          <v-list-item-subtitle class="row-desc">
            {{ m.description || m.subtitle }}
          </v-list-item-subtitle>

          <template #append>
            <v-icon icon="mdi-chevron-right" color="grey-lighten-1" />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <div v-if="filtered.length === 0" class="empty">
      沒有符合的模型
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 32px 40px;
  max-width: 1280px;
  margin: 0 auto;
}

.search {
  max-width: 320px;
  margin-bottom: 16px;
}

.models-card { overflow: hidden; }

.model-row { padding: 14px 20px; min-height: 0; }

.thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: var(--surface-2);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }

.row-name {
  font-size: 14px !important;
  font-weight: 600 !important;
  color: var(--text);
  margin-bottom: 2px;
}
.row-desc {
  font-size: 12px !important;
  color: var(--text-muted) !important;
  line-height: 1.5;
}

.empty {
  padding: 80px 20px;
  text-align: center;
  font-size: 14px;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .page { padding: 20px; }
}
</style>
