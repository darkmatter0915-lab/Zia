import { defineConfig } from '@playwright/test'
export default defineConfig({
 testDir: './tests/browser', timeout: 45000, expect: { timeout: 15000 }, workers: 1,
 reporter: [['list'], ['json', { outputFile: 'test-results/browser-report.json' }]],
 use: { baseURL: process.env.LAB_URL || 'http://127.0.0.1:4173/Zia/', serviceWorkers: 'block', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
 projects: [
  { name: 'chromium', use: { browserName: 'chromium', launchOptions: { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } } },
  { name: 'webkit', use: { browserName: 'webkit' } },
 ],
 webServer: process.env.LAB_URL ? undefined : { command: 'npm run preview -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173/Zia/' },
})
