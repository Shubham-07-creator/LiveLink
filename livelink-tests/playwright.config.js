const { defineConfig } = require('@playwright/test');
const cfg = require('./config');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: 1, // a test that passes only on retry is reported as FLAKY
  reporter: [['list'], ['./helpers/reporter.js'], ['html', { open: 'never' }]],
  use: {
    baseURL: cfg.BASE_URL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: false,
    channel: 'chrome',
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },
  projects: [{ name: 'chromium', use: { channel: 'chrome' } }],
});
