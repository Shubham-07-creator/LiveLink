import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],
  webServer: [
    {
      command: 'node backend/src/app.js',
      url: 'http://localhost:8000/health',
      reuseExistingServer: true,
      env: {
        RUN_SERVER: 'true',
        PORT: '8000',
        CLIENT_URLS: 'http://localhost:3000'
      }
    },
    {
      command: 'node tests/e2e/serveFrontend.js',
      url: 'http://localhost:3000',
      reuseExistingServer: true
    }
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    channel: 'chrome',
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--disable-blink-features=AutomationControlled'
      ]
    }
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        permissions: ['camera', 'microphone']
      }
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
        permissions: ['camera', 'microphone']
      }
    },
    {
      name: 'network-chaos',
      testMatch: 'tests/e2e/networkChaos.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        permissions: ['camera', 'microphone']
      }
    }
  ]
});
