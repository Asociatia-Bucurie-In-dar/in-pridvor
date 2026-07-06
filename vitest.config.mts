import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
    // translate.ts reads GOOGLE_AI_STUDIO_KEY at module load; provide a dummy so
    // it initializes under test (the SDK itself is mocked in the tests).
    env: { GOOGLE_AI_STUDIO_KEY: 'test-key' },
  },
})
