<script setup lang="ts">
const route = useRoute()

const navItems = [
  { title: '模型', icon: 'mdi-cube-outline', to: '/', activeOn: ['/', '/viewer'] },
  { title: 'COBie 資料', icon: 'mdi-database-outline', to: '/cobie', activeOn: ['/cobie'] }
]

const isActive = (item: any) => {
  if (item.activeOn) {
    return item.activeOn.some((p: string) => p === '/' ? route.path === '/' : route.path.startsWith(p))
  }
  return route.path === item.to
}

await loadManifest()
const manifest = useManifest()
</script>

<template>
  <v-app>
    <v-navigation-drawer permanent width="208" class="app-rail">
      <div class="rail-brand">
        <v-icon icon="mdi-domain" size="20" color="primary" />
        <div class="brand-name">{{ manifest?.project || 'FM Viewer' }}</div>
      </div>

      <v-list nav class="rail-list">
        <v-list-item
          v-for="item in navItems"
          :key="item.title"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
          :active="isActive(item)"
          color="primary"
          rounded="lg"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <slot />
    </v-main>
  </v-app>
</template>

<style scoped>
.app-rail {
  background: var(--surface) !important;
  border-right: 1px solid var(--border) !important;
}

.rail-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  height: 56px;
  border-bottom: 1px solid var(--border);
}

.brand-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail-list { padding: 12px 10px; }
</style>
