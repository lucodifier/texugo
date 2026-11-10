import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 90_000,
    hookTimeout: 90_000,
    fileParallelism: false,
    poolOptions: {
      threads: { singleThread: true }
    }
  },
  resolve: {
    alias: {
      '@shared': resolve('shared')
    }
  }
})
