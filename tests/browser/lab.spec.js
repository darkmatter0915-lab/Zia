import { test, expect } from '@playwright/test'
const base = process.env.LAB_URL || 'http://127.0.0.1:4173/Zia/'
async function ready(page) { await page.goto(base + 'warrior-asset-lab/'); await expect(page.locator('#engineBadge')).toHaveText('ENGINE_READY'); await expect(page.locator('#assetBadge')).toHaveText('WAITING_FOR_WARRIOR_ASSET') }
async function frames(page) { return Number(await page.locator('#assetCanvas').getAttribute('data-frames')) }

test('DEBUG rendering, 15 waiting metrics, same-origin requests', async ({ page }, info) => {
 const errors = [], requests = []
 page.on('pageerror', (e) => errors.push(e.message)); page.on('request', (r) => requests.push(r.url()))
 await page.setViewportSize({ width: 1280, height: 720 }); await ready(page)
 await expect.poll(() => frames(page)).toBeGreaterThan(0)
 await expect(page.locator('.metric-row')).toHaveCount(15)
 await expect(page.locator('.metric-state.state-waiting')).toHaveCount(15)
 await expect(page.locator('#animationControls button:enabled')).toHaveCount(0)
 expect(errors).toEqual([])
 expect(requests.every((url) => new URL(url).origin === new URL(base).origin)).toBeTruthy()
 expect(requests.some((url) => /premium-pack|runtime-0|warrior\.glb/.test(url))).toBeFalsy()
 await page.screenshot({ path: `test-results/${info.project.name}-DEBUG-PC.png` })
})
for (const size of [{ width: 932, height: 430 }, { width: 844, height: 390 }, { width: 640, height: 360 }]) {
 test(`landscape ${size.width}, simulated safe areas and 44px targets`, async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: size, hasTouch: true, isMobile: true, serviceWorkers: 'block' })
  const page = await context.newPage(); await ready(page)
  await page.evaluate(() => { document.documentElement.style.setProperty('--safe-left', '47px'); document.documentElement.style.setProperty('--safe-right', '47px'); document.documentElement.style.setProperty('--safe-bottom', '21px') })
  await page.waitForTimeout(100)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  for (const selector of ['#touchLeft', '#touchRight', '#retryAssetButton', '#resetCameraButton']) {
   const box = await page.locator(selector).boundingBox()
   expect(box.x).toBeGreaterThanOrEqual(47); expect(box.x + box.width).toBeLessThanOrEqual(size.width - 47)
   expect(box.y + box.height).toBeLessThanOrEqual(size.height - 21); expect(box.height).toBeGreaterThanOrEqual(44)
  }
  await page.locator('[data-metric="drawCalls"]').scrollIntoViewIfNeeded(); await expect(page.locator('[data-metric="drawCalls"]')).toBeVisible()
  await page.locator('.validator-panel').evaluate((node) => node.scrollTop = 0)
  await page.screenshot({ path: `test-results/${info.project.name}-DEBUG-mobile-emulated-${size.width}.png` })
  await context.close()
 })
}
test('portrait overlay disappears on landscape rotation', async ({ page }) => {
 await page.setViewportSize({ width: 390, height: 844 }); await ready(page); await expect(page.locator('.orientation-gate')).toBeVisible()
 await page.setViewportSize({ width: 844, height: 390 }); await expect(page.locator('.orientation-gate')).toBeHidden(); await expect(page.locator('#retryAssetButton')).toBeEnabled()
})
test('independent simultaneous touch contacts and cancellation', async ({ browser, browserName }) => {
 test.skip(browserName !== 'chromium', 'CDP multi-touch injection is Chromium-only; no physical iPhone claim')
 const context = await browser.newContext({ viewport: { width: 932, height: 430 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' })
 const page = await context.newPage(); await ready(page)
 const session = await context.newCDPSession(page)
 const l = await page.locator('#touchLeft').boundingBox(), r = await page.locator('#touchRight').boundingBox()
 const left = { x: l.x + l.width / 2, y: l.y + l.height / 2, id: 1 }, right = { x: r.x + r.width / 2, y: r.y + r.height / 2, id: 2 }
 await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left, right] })
 await expect(page.locator('#touchResult')).toHaveText('DEBUG TOUCH: 2 | L:1 R:1')
 // CDP touchMove moves the given contact; it does not lift a stationary second finger.
 await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...left, x: left.x + 4 }] })
 await expect(page.locator('#touchResult')).toHaveText('DEBUG TOUCH: 2 | L:1 R:1')
 await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
 await expect(page.locator('#touchResult')).toHaveText('DEBUG TOUCH: 0 | L:0 R:0')
 await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [left] })
 await expect(page.locator('#touchResult')).toHaveText('DEBUG TOUCH: 1 | L:1 R:0')
 await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
 await expect(page.locator('#touchResult')).toHaveText('DEBUG TOUCH: 0 | L:0 R:0')
 await context.close()
})
test('HTTP500 is not absence', async ({ page }) => {
 await page.route('**/asset-status.json', (r) => r.fulfill({ status: 500, body: 'server error' }))
 await page.goto(base + 'warrior-asset-lab/'); await expect(page.locator('#assetBadge')).toHaveText('ASSET_HTTP_ERROR'); await expect(page.locator('#retryAssetButton')).toBeEnabled()
})
test('invalid manifest is explicit', async ({ page }) => {
 await page.route('**/asset-status.json', (r) => r.fulfill({ body: '<html>error</html>', contentType: 'text/html' }))
 await page.goto(base + 'warrior-asset-lab/'); await expect(page.locator('#assetBadge')).toHaveText('ASSET_MANIFEST_INVALID')
})
test('malformed bytes never become a GLB preview', async ({ page }) => {
 await page.route('**/asset-status.json', (r) => r.fulfill({ json: { path: 'assets/characters/warrior/warrior.glb', present: true, bytes: 64, sha256: 'invalid-test' } }))
 await page.route('**/warrior.glb', (r) => r.fulfill({ body: Buffer.alloc(64), contentType: 'model/gltf-binary' }))
 await page.goto(base + 'warrior-asset-lab/'); await expect(page.locator('#assetBadge')).toHaveText('ASSET_INVALID'); await expect(page.locator('#animationControls button:enabled')).toHaveCount(0)
})
test('BFCache lifecycle resumes rendering', async ({ page }) => {
 await ready(page)
 await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
 const before = await frames(page)
 await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
 await expect.poll(() => frames(page)).toBeGreaterThan(before)
})
test('WebGL loss and restoration resume rendering', async ({ page }) => {
 await ready(page)
 await page.evaluate(() => { window.contextTest = document.getElementById('assetCanvas').getContext('webgl2').getExtension('WEBGL_lose_context'); window.contextTest.loseContext() })
 await expect(page.locator('#engineBadge')).toHaveText('WEBGL_CONTEXT_LOST'); await page.waitForTimeout(150)
 await page.evaluate(() => window.contextTest.restoreContext()); await expect(page.locator('#engineBadge')).toHaveText('ENGINE_READY')
 const before = await frames(page); await expect.poll(() => frames(page)).toBeGreaterThan(before)
})
test('four retired game URLs redirect, no old scripts', async ({ page }) => {
 const requests = []; page.on('request', (r) => requests.push(r.url()))
 for (const path of ['dungeon-reborn/', 'dungeon-reborn/game/', 'dungeon-reborn/play.html', 'dungeon-reborn/mobile-v4/ios.html']) {
  await page.goto(base + path); await expect(page).toHaveURL(/\/warrior-asset-lab\/$/); await expect(page.locator('#engineBadge')).toHaveText('ENGINE_READY')
 }
 expect(requests.some((url) => /premium-pack|runtime-0/.test(url))).toBeFalsy()
})
