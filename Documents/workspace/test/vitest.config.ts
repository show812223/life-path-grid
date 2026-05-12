import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
      '~~': path.resolve(__dirname)
    }
  }
})
