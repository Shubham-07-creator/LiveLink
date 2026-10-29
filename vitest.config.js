import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      mongoose: path.resolve(__dirname, 'backend/node_modules/mongoose'),
      express: path.resolve(__dirname, 'backend/node_modules/express'),
      cors: path.resolve(__dirname, 'backend/node_modules/cors'),
      helmet: path.resolve(__dirname, 'backend/node_modules/helmet'),
      'cookie-parser': path.resolve(__dirname, 'backend/node_modules/cookie-parser'),
      compression: path.resolve(__dirname, 'backend/node_modules/compression'),
      jsonwebtoken: path.resolve(__dirname, 'backend/node_modules/jsonwebtoken'),
      bcrypt: path.resolve(__dirname, 'backend/node_modules/bcrypt'),
      nanoid: path.resolve(__dirname, 'backend/node_modules/nanoid'),
      pino: path.resolve(__dirname, 'backend/node_modules/pino'),
      'http-status': path.resolve(__dirname, 'backend/node_modules/http-status'),
      zod: path.resolve(__dirname, 'backend/node_modules/zod'),
      'express-rate-limit': path.resolve(__dirname, 'backend/node_modules/express-rate-limit'),
      'google-auth-library': path.resolve(__dirname, 'backend/node_modules/google-auth-library'),
      'socket.io': path.resolve(__dirname, 'backend/node_modules/socket.io'),
      'socket.io-client': path.resolve(__dirname, 'frontend/node_modules/socket.io-client')
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.{test,spec}.js'],
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
