<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { useNaiveTheme } from '~/composables/useNaiveTheme'

const { themeOverrides } = useNaiveTheme()
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </NMessageProvider>
  </NConfigProvider>
</template>
