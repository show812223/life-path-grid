// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Nuxt 4 directory structure
  future: {
    compatibilityVersion: 4
  },

  // CSS - 直接引入 Tailwind CSS
  css: ['~/assets/styles/tailwind.css'],

  // PostCSS configuration
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {}
    }
  },

  // App configuration
  app: {
    head: {
      title: '生命靈數九宮格計算器',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: '透過生命靈數九宮格探索您的命運密碼'
        }
      ],
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg'
        },
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: '/favicon.ico'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: ''
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;500;600;700&display=swap'
        }
      ]
    }
  }
})
