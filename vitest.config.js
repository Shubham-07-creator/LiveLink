import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.{test,spec}.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'backend/src/**/*.js',
        'frontend/src/utils/**/*.js',
        'frontend/src/theme.js',
        'frontend/src/tokens.js',
        'frontend/src/hooks/useStats.js',
        'frontend/src/hooks/usePeers.js'
      ],
      exclude: [
        '**/node_modules/**',
        '**/build/**',
        '**/dist/**',
        '**/*.test.js',
        '**/*.spec.js'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70
      }
    }
  }
});
