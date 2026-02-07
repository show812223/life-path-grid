<script setup lang="ts">
import { useDarkMode } from '~/composables/useDarkMode'

const { isDark, toggle } = useDarkMode()
</script>

<template>
  <button class="dark-mode-toggle" :title="isDark ? '切換至淺色模式' : '切換至深色模式'" @click="toggle">
    <Icon :icon="isDark ? 'mdi:weather-sunny' : 'mdi:weather-night'" class="toggle-icon" />
  </button>
</template>

<style scoped>
@reference "../assets/styles/tailwind.css";

.dark-mode-toggle {
  @apply fixed top-4 right-4 z-50
         w-10 h-10 rounded-full
         flex items-center justify-center
         cursor-pointer border-none
         transition-all duration-300;
  background: var(--color-surface-variant);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark-mode-toggle:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.toggle-icon {
  @apply w-5 h-5;
  color: var(--color-text-primary);
}
</style>
