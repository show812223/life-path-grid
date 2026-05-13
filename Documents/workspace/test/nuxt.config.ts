export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  future: { compatibilityVersion: 4 },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL ?? '/',
    head: {
      title: 'FM Viewer · 設施管理系統',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&family=Noto+Sans+TC:wght@400;500;600;700&display=swap'
        },
        { rel: 'stylesheet', href: 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css' }
      ],
      script: [
        { src: 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js' }
      ]
    }
  },
  modules: ['vuetify-nuxt-module'],
  vuetify: {
    vuetifyOptions: {
      defaults: {
        VBtn: { rounded: 'lg', flat: true },
        VCard: { rounded: 'lg', flat: true, border: true },
        VTextField: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
        VSelect: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
        VAutocomplete: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
        VList: { density: 'comfortable' },
        VNavigationDrawer: { elevation: 0 },
        VAppBar: { elevation: 0, flat: true },
        VChip: { rounded: 'sm' }
      },
      theme: {
        defaultTheme: 'fm',
        themes: {
          fm: {
            dark: false,
            colors: {
              background: '#F7F8FA',
              surface: '#FFFFFF',
              'surface-bright': '#FFFFFF',
              'surface-variant': '#F1F5F9',
              'on-surface-variant': '#475569',
              primary: '#2563EB',
              'on-primary': '#FFFFFF',
              'primary-darken-1': '#1D4ED8',
              secondary: '#0E7C7B',
              accent: '#0891B2',
              'on-surface': '#0F172A',
              'on-background': '#0F172A',
              error: '#DC2626',
              warning: '#D97706',
              info: '#0284C7',
              success: '#16A34A',
              'grey-darken-4': '#0F172A',
              'grey-darken-3': '#334155',
              'grey-darken-2': '#475569',
              'grey-darken-1': '#64748B',
              'grey': '#94A3B8',
              'grey-lighten-1': '#CBD5E1',
              'grey-lighten-2': '#E2E8F0',
              'grey-lighten-3': '#F1F5F9',
              'grey-lighten-4': '#F8FAFC'
            },
            variables: {
              'border-color': '#0F172A',
              'border-opacity': 0.08,
              'high-emphasis-opacity': 0.92,
              'medium-emphasis-opacity': 0.62,
              'disabled-opacity': 0.38
            }
          }
        }
      }
    }
  },
  css: [
    '@mdi/font/css/materialdesignicons.css',
    '~/assets/styles/global.css'
  ]
})
