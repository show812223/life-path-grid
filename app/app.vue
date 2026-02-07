<script setup lang="ts">
import { NConfigProvider, NMessageProvider, darkTheme } from 'naive-ui'
import { useNaiveTheme } from '~/composables/useNaiveTheme'
import { useDarkMode } from '~/composables/useDarkMode'

const { themeOverrides } = useNaiveTheme()
const { isDark } = useDarkMode()
</script>

<template>
  <NConfigProvider :theme="isDark ? darkTheme : undefined" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <DarkModeToggle />
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </NMessageProvider>
  </NConfigProvider>
</template>
