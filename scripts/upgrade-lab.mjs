// One-time source migration. The workflow commits the resulting readable files,
// then this script is removed. It is never shipped or executed by the browser.
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs'
const read = (p) => readFileSync(p, 'utf8')
const write = (p, s) => { mkdirSync(p.slice(0, p.lastIndexOf('/')) || '.', { recursive: true }); writeFileSync(p, s) }
let source = [0, 1, 2, 3].map((n) => read(`public/warrior-asset-lab/runtime-0${n}.js`)).join('\n')
function replaceFunction(name, replacement) {
  const pattern = new RegExp(`(?:^|\\n)(?:async )?function ${name}\\(`)
  const match = pattern.exec(source)
  if (!match) throw new Error(`Missing migration anchor: ${name}`)
  const start = match.index + (source[match.index] === '\n' ? 1 : 0)
  const next = /\n(?:async )?function /.exec(source.slice(start + 1))
  if (!next) throw new Error(`Missing function boundary: ${name}`)
  const end = start + 1 + next.index
  source = source.slice(0, start) + replacement + '\n' + source.slice(end)
}
const imports = `import * as THREE from 'three'\nimport { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'\nimport { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'\nimport { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'\nimport { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'\nimport { strictAnimationMap, auditRootMotion, createAnimationController, attachTouchDiagnostic } from './audit.js'\nimport { readManifest, readVerifiedGlb } from './asset-io.js'\n`
source = source.replace(/const MODULE_URLS = \{[\s\S]*?\n\}/, '')
source = source.replace(/let (THREE|GLTFLoader|DRACOLoader|KTX2Loader|MeshoptDecoder)\n/g, '')
source = source.replace('window.__WAL_BASE_URL__', 'import.meta.env.BASE_URL')
source = source.replace("const BUILD_ID = 'warrior-asset-lab-20260903-1'", 'const BUILD_ID = __LAB_BUILD__')
source = source.replace(/const DRACO_DECODER_PATH = .*\n/, "const DRACO_DECODER_PATH = `${BASE_URL}vendor/three/draco/`\n")
source = source.replace(/const KTX2_TRANSCODER_PATH = .*\n/, "const KTX2_TRANSCODER_PATH = `${BASE_URL}vendor/three/basis/`\n")
source = source.replace('let assetLoadGeneration = 0', 'let assetLoadGeneration = 0\nlet currentManifest, touchDiagnostic\nlet suspended = false, contextUnavailable = false, disposed = false, frameCount = 0')
replaceFunction('importThreeStack', `async function importThreeStack() {
  await MeshoptDecoder.ready
  for (const element of [elements.loaderGltf, elements.loaderDraco, elements.loaderKtx, elements.loaderMeshopt]) {
    element.classList.add('ready')
    element.title = '同站點引擎已整合；正式壓縮 GLB 尚待驗收'
  }
  log('Pinned npm Three.js and loaders ready; no runtime CDN')
}`)
replaceFunction('buildAnimationMap', 'function buildAnimationMap(clips) { return strictAnimationMap(clips) }')
replaceFunction('analyzeRootMotion', 'function analyzeRootMotion(root, clips) { return auditRootMotion(root, clips) }')
replaceFunction('createMixerController', `function createMixerController(root, animationMap) {
  const controller = createAnimationController(root, animationMap, (name) => {
    for (const button of elements.animationControls.querySelectorAll('button')) {
      button.disabled = !animationMap.has(button.dataset.animation)
      button.className = 'animation-button' + (button.disabled ? '' : ' available') + (button.dataset.animation === name ? ' active' : '')
    }
  })
  controller.play('Idle', 0)
  return controller
}`)
replaceFunction('assetExists', `async function assetExists() {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 20000)
  try { currentManifest = await readManifest(BASE_URL, abort.signal); return currentManifest.present }
  finally { clearTimeout(timer) }
}`)
source = source.replace('const exists = await assetExists(ASSET_URL)', `let exists
  try { exists = await assetExists() }
  catch (error) {
    if (generation !== assetLoadGeneration || disposed) return
    setLoading(false)
    setBadge(elements.assetBadge, error.code || 'ASSET_TIMEOUT', 'fail')
    elements.waitingCard.hidden = false
    elements.waitingCard.querySelector('strong').textContent = error.code || 'ASSET_TIMEOUT'
    elements.waitingCard.querySelector('p').textContent = error.message
    log(error.message, 'error')
    elements.retryAssetButton.disabled = false
    return
  }`)
source = source.replace("const requestUrl = `${ASSET_URL}?asset-lab=${Date.now()}`", `const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 25000)`)
const loadStart = source.indexOf('    const gltf = await loader.loadAsync(')
const loadEnd = source.indexOf('\n\n    if (generation', loadStart)
if (loadStart < 0 || loadEnd < 0) throw new Error('Missing loadAsync anchor')
source = source.slice(0, loadStart) + `    const bytes = await readVerifiedGlb(BASE_URL, currentManifest, abort.signal)
    const parsing = loader.parseAsync(bytes, BASE_URL + 'assets/characters/warrior/')
    parsing.then((gltf) => { if (abort.signal.aborted || generation !== assetLoadGeneration || disposed) disposeGltf(gltf) }, () => {})
    const gltf = await Promise.race([parsing, new Promise((_, reject) => {
      if (abort.signal.aborted) reject(new Error('GLB load timeout'))
      else abort.signal.addEventListener('abort', () => reject(new Error('GLB load timeout')), { once: true })
    })])` + source.slice(loadEnd)
source = source.replace('    dracoLoader.dispose()\n    ktx2Loader.dispose()', '    clearTimeout(timer)\n    dracoLoader.dispose()\n    ktx2Loader.dispose()')
source = source.replace("setBadge(elements.assetBadge, report.hasFailures ? 'ASSET_VALIDATION_FAILED' : 'ASSET_VALIDATED', report.hasFailures ? 'fail' : 'ready')", "setBadge(elements.assetBadge, report.hasFailures ? 'ASSET_VALIDATION_FAILED' : report.warnings ? 'ASSET_REVIEW_REQUIRED' : 'TECHNICAL_CHECKS_PASSED', report.hasFailures ? 'fail' : report.warnings ? 'waiting' : 'ready')")
source = source.replace("elements.viewportTitle.textContent = 'FORMAL GLB LOADED • FIXED 3/4 VIEW'", "elements.viewportTitle.textContent = 'GLB PREVIEW • NOT ART APPROVAL'")
source = source.replace("'warrior.glb 通過目前檢查'", "'技術報告；美術待人工驗收'")
source = source.replace("setBadge(elements.assetBadge, 'WARRIOR_ASSET_INVALID', 'fail')", "setBadge(elements.assetBadge, error.code || 'WARRIOR_ASSET_INVALID', 'fail')")
source = source.replace('  const emissiveMaterials = materials.filter((material) => Boolean(material.emissiveMap))', '  const emissiveMaterials = materials.filter((material) => material.emissiveMap && material.emissive?.getHex() !== 0 && material.emissiveIntensity > 0)')
source = source.replace('new THREE.Box3().setFromObject(root)', 'new THREE.Box3().setFromObject(root, true)')
source = source.replace('  const pivotVerticalError = Math.abs(boundingBox.min.y)\n  const pivotHorizontalError = Math.hypot(boundingCenter.x, boundingCenter.z)', `  const body = root.getObjectByName('SK_Warrior_Body')
  const bodyBox = body ? new THREE.Box3().setFromObject(body, true) : null
  const leftFoot = root.getObjectByName('Foot_L'), rightFoot = root.getObjectByName('Foot_R')
  const pivotKnown = bodyBox && !bodyBox.isEmpty() && leftFoot && rightFoot
  const feet = pivotKnown ? leftFoot.getWorldPosition(new THREE.Vector3()).add(rightFoot.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5) : null
  const pivotVerticalError = pivotKnown ? Math.abs(bodyBox.min.y) : Infinity
  const pivotHorizontalError = feet ? Math.hypot(feet.x, feet.z) : Infinity`)
source = source.replace("  const scaleIsOne = ['x', 'y', 'z'].every((axis) => Math.abs(rootScale[axis] - 1) <= 0.001)", `  const transformNodes = new Set([root, ...root.children])
  root.traverse((node) => { if (['Warrior', 'Warrior_Root', 'Armature', 'Root'].includes(node.name)) transformNodes.add(node) })
  const scaleIsOne = [...transformNodes].every((node) => ['x', 'y', 'z'].every((axis) => Number.isFinite(node.scale[axis]) && Math.abs(node.scale[axis] - 1) <= 0.001))`)
source = source.replace('const heightLooksHuman = boundingSize.y >= 1.4 && boundingSize.y <= 3', 'const heightLooksHuman = bodyBox && bodyBox.getSize(new THREE.Vector3()).y >= 1.4 && bodyBox.getSize(new THREE.Vector3()).y <= 3')
source = source.replace("state: scaleIsOne && heightLooksHuman ? 'pass' : scaleIsOne || heightLooksHuman ? 'warn' : 'fail'", "state: !scaleIsOne ? 'fail' : heightLooksHuman ? 'pass' : 'warn'")
const pivotStart = source.indexOf('  metrics.pivot = {'), pivotEnd = source.indexOf('  metrics.drawCalls = {', pivotStart)
source = source.slice(0, pivotStart) + `  metrics.pivot = {
    value: pivotKnown ? 'Y ' + bodyBox.min.y.toFixed(3) + ' m / XZ ' + pivotHorizontalError.toFixed(3) + ' m' : 'MANUAL_REVIEW',
    detail: '以身體腳底及 Foot_L/R 中點估計，不以大劍/披風改變的全身中心判定；須人工中立姿勢確認',
    state: pivotKnown && pivotVerticalError <= 0.03 && pivotHorizontalError <= 0.08 ? 'pass' : 'warn',
  }
  metrics.rootMotion = {
    value: rootMotion.maxHorizontalDrift === null ? 'UNVERIFIED' : rootMotion.maxHorizontalDrift.toFixed(4) + ' m',
    detail: 'Root與祖先取樣；旋轉 ' + String(rootMotion.maxRotation) + ' rad；未解析 ' + rootMotion.unresolved + ' 軌。無明確Root不得通過。',
    state: rootMotion.state,
  }
` + source.slice(pivotEnd)
source = source.replace('    build: BUILD_ID,', "    build: BUILD_ID,\n    visualApproval: false,\n    disclaimer: '技術篩查不等於美術、商用權利、穿模與iPhone效能驗收',\n    manifest: currentManifest,")
replaceFunction('measureAssetDrawCalls', `function measureAssetDrawCalls() {
  if (!activeGltf) return { value: 'UNVERIFIED', detail: '尚無正式資產', state: 'waiting' }
  const old = { debug: debugRoot.visible, skeleton: skeletonHelper?.visible, reset: renderer.info.autoReset, shadow: renderer.shadowMap.enabled }
  try {
    debugRoot.visible = false
    if (skeletonHelper) skeletonHelper.visible = false
    renderer.info.autoReset = false
    renderer.shadowMap.enabled = false
    renderer.info.reset(); renderer.render(scene, camera)
    const mainCalls = renderer.info.render.calls
    renderer.shadowMap.enabled = true; renderer.shadowMap.needsUpdate = true
    renderer.info.reset(); renderer.render(scene, camera)
    return { value: mainCalls + ' / ' + renderer.info.render.calls, detail: '主pass / 含陰影pass；排除DEBUG，不是FPS保證', state: mainCalls > 0 && mainCalls <= 6 ? 'pass' : 'warn' }
  } finally {
    debugRoot.visible = old.debug
    if (skeletonHelper) skeletonHelper.visible = old.skeleton
    renderer.info.autoReset = old.reset; renderer.shadowMap.enabled = old.shadow; renderer.info.reset()
  }
}`)
replaceFunction('frameAsset', `function frameAsset(object, boundingBox) {
  if (boundingBox.isEmpty() || ![...boundingBox.min, ...boundingBox.max].every(Number.isFinite)) return
  const center = boundingBox.getCenter(new THREE.Vector3())
  const radius = Math.max(0.5, boundingBox.getSize(new THREE.Vector3()).length() / 2)
  const vertical = THREE.MathUtils.degToRad(camera.fov)
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect)
  const distance = radius / Math.sin(Math.min(vertical, horizontal) / 2) * 1.12
  camera.position.copy(center).addScaledVector(new THREE.Vector3(1, 0.82, 1).normalize(), distance)
  camera.near = Math.max(0.02, distance / 200); camera.far = Math.max(100, distance * 10)
  camera.lookAt(center); camera.updateProjectionMatrix()
  cameraHome = captureCameraState(); elements.resetCameraButton.disabled = false
}`)
source = source.replace('if (!renderer || !camera) return', 'if (!renderer || !camera || disposed || contextUnavailable) return')
source = source.replace('  updateRendererFacts()\n}', '  if (activeGltf) frameAsset(activeGltf.scene, new THREE.Box3().setFromObject(activeGltf.scene, true))\n  updateRendererFacts()\n}')
source = source.replace("    log('WebGL context lost', 'error')", "    contextUnavailable = true; cancelAnimationFrame(animationFrameId); touchDiagnostic?.clear()\n    log('WebGL context lost', 'error')")
source = source.replace("    log('WebGL context restored')", "    contextUnavailable = false; startRenderLoop()\n    log('WebGL context restored')")
source = source.replace('  const render = (now) => {', '  const render = (now) => {\n    if (disposed || suspended || contextUnavailable || document.hidden) return')
source = source.replace('    renderer.render(scene, camera)\n    animationFrameId', '    renderer.render(scene, camera)\n    if (++frameCount % 15 === 0) elements.canvas.dataset.frames = String(frameCount)\n    animationFrameId')
source = source.replace('  initializeStaticUi()\n', "  initializeStaticUi()\n  touchDiagnostic = attachTouchDiagnostic($('#touchLeft'), $('#touchRight'), $('#touchResult'))\n  elements.retryAssetButton.disabled = true\n")
const lifecycleStart = source.indexOf("window.addEventListener('pagehide'")
if (lifecycleStart < 0) throw new Error('Missing lifecycle anchor')
source = source.slice(0, lifecycleStart) + `window.addEventListener('pagehide', (event) => {
  suspended = true; cancelAnimationFrame(animationFrameId); touchDiagnostic?.clear()
  if (event.persisted) return
  disposed = true; assetLoadGeneration++; resizeObserver?.disconnect()
  disposeCurrentAsset(); touchDiagnostic?.dispose(); renderer?.dispose()
})
window.addEventListener('pageshow', () => {
  if (disposed) return
  suspended = false; resizeRenderer(); if (renderer) startRenderLoop()
})
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAnimationFrame(animationFrameId)
  else if (renderer && !disposed && !suspended && !contextUnavailable) startRenderLoop()
})
boot()
`
write('src/warrior-asset-lab/lab.js', imports + source)
write('src/warrior-asset-lab/main.js', `import './style.css'\nimport './hardening.css'\nconst base = import.meta.env.BASE_URL\nimport('./lab.js').catch((error) => {\n const badge = document.getElementById('engineBadge'); badge.textContent = 'ENGINE_LOAD_FAILED'; badge.className = 'status-badge status-fail'\n document.getElementById('loadingOverlay').hidden = true\n document.getElementById('rendererError').hidden = false\n document.getElementById('rendererErrorMessage').textContent = error.message\n})\nif ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch(() => {})\n`)
let html = read('warrior-asset-lab/index.html').replace("script-src 'self' 'wasm-unsafe-eval' https://esm.sh", "script-src 'self' 'wasm-unsafe-eval'").replace("connect-src 'self' https://esm.sh https://cdn.jsdelivr.net https://www.gstatic.com", "connect-src 'self'")
html = html.replace('Grid / Plane / Helper only', '僅工程地板；不是遊戲美術').replace('id="retryAssetButton" class="tool-button" type="button"', 'id="retryAssetButton" class="tool-button" type="button" disabled')
html = html.replace('<div id="rendererError"', '<div class="touch-diagnostic"><button id="touchLeft" type="button">左手測試</button><output id="touchResult">DEBUG TOUCH</output><button id="touchRight" type="button">右手測試</button></div>\n            <div id="rendererError"')
html = html.replace('class="orientation-gate" aria-hidden="true"', 'class="orientation-gate" role="status"')
write('warrior-asset-lab/index.html', html)
mkdirSync('archive', { recursive: true })
renameSync('public/dungeon-reborn', 'archive/legacy-dungeon-reborn')
renameSync('public/warrior-asset-lab', 'archive/legacy-asset-lab-runtime')
write('src/warrior-asset-lab/redirect.js', 'location.replace(`${import.meta.env.BASE_URL}warrior-asset-lab/`)\n')
const oldPages = ['dungeon-reborn/index.html', 'dungeon-reborn/play.html', 'dungeon-reborn/game/index.html', 'dungeon-reborn/mobile-v4/ios.html']
for (const path of oldPages) write(path, '<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>地下城重生｜工程入口</title></head><body><p>舊版已退役，正式角色尚待交付。</p><a href="%BASE_URL%warrior-asset-lab/">Warrior Asset Lab</a><script type="module" src="/src/warrior-asset-lab/redirect.js"></script></body></html>\n')
write('vite.config.js', `import { resolve } from 'node:path'\nimport { defineConfig } from 'vite'\nexport default defineConfig({\n base: '/Zia/',\n define: { __LAB_BUILD__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 12) || 'local-hardening') },\n build: { target: 'es2020', sourcemap: true, rollupOptions: { input: Object.fromEntries(${JSON.stringify(['index.html', 'warrior-asset-lab/index.html', ...oldPages])}.map((path, i) => ['page' + i, resolve(import.meta.dirname, path)])) } }\n})\n`)
const pkg = JSON.parse(read('package.json'))
pkg.engines.node = '>=22.12.0'
pkg.dependencies = { ...pkg.dependencies, three: '0.185.1' }
pkg.devDependencies['@playwright/test'] = '1.58.2'
Object.assign(pkg.scripts, { predev: 'node scripts/prepare-lab.mjs', prebuild: 'node scripts/prepare-lab.mjs', test: 'node --test tests/unit/*.test.js', 'test:browser': 'playwright test', 'verify:dist': 'node scripts/verify-lab-build.mjs' })
write('package.json', JSON.stringify(pkg, null, 2) + '\n')
let check = read('scripts/check.mjs')
check = check.replace(/const assetLabRuntimeFiles = \[[\s\S]*?\]\n/, "const assetLabRuntimeFiles = ['src/warrior-asset-lab/lab.js', 'src/warrior-asset-lab/audit.js', 'src/warrior-asset-lab/asset-io.js']\n")
const start = check.indexOf('  if (!assetLabRuntimeFiles.every('), end = check.indexOf('\n}', start)
check = check.slice(0, start) + check.slice(end)
write('scripts/check.mjs', check)
write('.gitignore', read('.gitignore') + '\npublic/vendor/\npublic/warrior-asset-lab/asset-status.json\ntest-results/\nplaywright-report/\n')
console.log('Source migration complete: normal JS modules, legacy archived, no GLB created.')
