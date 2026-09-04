import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { strictAnimationMap, auditRootMotion, createAnimationController, attachTouchDiagnostic } from './audit.js'
import { readManifest, readVerifiedGlb } from './asset-io.js'

const THREE_VERSION = '0.185.1'
const BUILD_ID = __LAB_BUILD__
const BASE_URL = import.meta.env.BASE_URL
const ASSET_RELATIVE_PATH = 'assets/characters/warrior/warrior.glb'
const ASSET_URL = `${BASE_URL}${ASSET_RELATIVE_PATH}`
const DRACO_DECODER_PATH = `${BASE_URL}vendor/three/draco/`
const KTX2_TRANSCODER_PATH = `${BASE_URL}vendor/three/basis/`



const EXPECTED_ANIMATIONS = [
  { canonical: 'Idle', aliases: ['idle', 'stand', 'breathing'], loop: true },
  { canonical: 'Run', aliases: ['run', 'running', 'jog'], loop: true },
  { canonical: 'Attack1', aliases: ['attack1', 'attack01', 'attacka', 'combo1', 'slash1'], loop: false },
  { canonical: 'Attack2', aliases: ['attack2', 'attack02', 'attackb', 'combo2', 'slash2'], loop: false },
  { canonical: 'Attack3', aliases: ['attack3', 'attack03', 'attackc', 'combo3', 'slash3'], loop: false },
  { canonical: 'Dodge', aliases: ['dodge', 'roll', 'evade'], loop: false },
  { canonical: 'Hit', aliases: ['hit', 'hurt', 'damage', 'impact'], loop: false },
  { canonical: 'Death', aliases: ['death', 'dead', 'die'], loop: false },
]

const METRICS = [
  ['skinnedMesh', 'SkinnedMesh'],
  ['skeleton', 'Skeleton'],
  ['bones', 'Bone 數量'],
  ['animations', 'Animation Clips'],
  ['triangles', 'Triangle 數量'],
  ['materials', 'Materials'],
  ['textures', 'Textures'],
  ['emissive', 'Emissive Map'],
  ['weaponMesh', 'Weapon Mesh'],
  ['weaponSocket', 'Weapon Socket'],
  ['boundingBox', 'Bounding Box'],
  ['scale', 'Scale'],
  ['pivot', 'Pivot'],
  ['rootMotion', 'Root Motion'],
  ['drawCalls', 'Draw Calls'],
]

const $ = (selector) => document.querySelector(selector)
const elements = {
  canvas: $('#assetCanvas'),
  canvasHost: $('#canvasHost'),
  engineBadge: $('#engineBadge'),
  assetBadge: $('#assetBadge'),
  viewportTitle: $('#viewportTitle'),
  retryAssetButton: $('#retryAssetButton'),
  resetCameraButton: $('#resetCameraButton'),
  loadingOverlay: $('#loadingOverlay'),
  loadingLabel: $('#loadingLabel'),
  loadingFill: $('#loadingFill'),
  rendererError: $('#rendererError'),
  rendererErrorMessage: $('#rendererErrorMessage'),
  assetPathLabel: $('#assetPathLabel'),
  rendererFacts: $('#rendererFacts'),
  reportTitle: $('#reportTitle'),
  scoreBadge: $('#scoreBadge'),
  loaderGltf: $('#loaderGltf'),
  loaderDraco: $('#loaderDraco'),
  loaderKtx: $('#loaderKtx'),
  loaderMeshopt: $('#loaderMeshopt'),
  waitingCard: $('#waitingCard'),
  validationTimestamp: $('#validationTimestamp'),
  metricsList: $('#metricsList'),
  animationSummary: $('#animationSummary'),
  animationControls: $('#animationControls'),
  validatorLog: $('#validatorLog'),
  copyReportButton: $('#copyReportButton'),
}

const metricNodes = new Map()
let renderer
let scene
let camera
let assetRoot
let debugRoot
let mixerController = null
let skeletonHelper = null
let activeGltf = null
let animationFrameId = 0
let lastFrameTime = performance.now()
let resizeObserver = null
let debugCameraHome = null
let cameraHome = null
let reportSnapshot = null
let assetLoadGeneration = 0
let currentManifest, touchDiagnostic
let suspended = false, contextUnavailable = false, disposed = false, frameCount = 0

function initializeStaticUi() {
  elements.assetPathLabel.textContent = `public/${ASSET_RELATIVE_PATH}`
  elements.scoreBadge.textContent = `0 / ${METRICS.length}`

  const fragment = document.createDocumentFragment()
  for (const [id, label] of METRICS) {
    const row = document.createElement('div')
    row.className = 'metric-row'
    row.dataset.metric = id

    const term = document.createElement('dt')
    term.textContent = label

    const description = document.createElement('dd')
    const value = document.createElement('span')
    value.textContent = 'WAITING_FOR_ASSET'
    const detail = document.createElement('small')
    detail.textContent = '正式 GLB 尚未放入'
    description.append(value, detail)

    const state = document.createElement('span')
    state.className = 'metric-state state-waiting'
    state.textContent = 'WAIT'

    row.append(term, description, state)
    fragment.append(row)
    metricNodes.set(id, { row, value, detail, state })
  }
  elements.metricsList.append(fragment)

  for (const animation of EXPECTED_ANIMATIONS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'animation-button'
    button.textContent = animation.canonical
    button.disabled = true
    button.dataset.animation = animation.canonical
    button.addEventListener('click', () => mixerController?.play(animation.canonical))
    elements.animationControls.append(button)
  }

  elements.retryAssetButton.addEventListener('click', () => loadWarriorAsset())
  elements.resetCameraButton.addEventListener('click', () => resetCamera())
  elements.copyReportButton.addEventListener('click', () => copyReport())
}

function setBadge(element, text, state) {
  element.textContent = text
  element.className = `status-badge status-${state}`
}

function setMetric(id, { value, detail = '', state = 'waiting' }) {
  const node = metricNodes.get(id)
  if (!node) return
  node.value.textContent = String(value)
  node.detail.textContent = detail
  node.state.className = `metric-state state-${state}`
  node.state.textContent = state === 'pass' ? 'PASS' : state === 'fail' ? 'FAIL' : state === 'warn' ? 'WARN' : 'WAIT'
}

function setLoading(visible, label = '', progress = 0) {
  elements.loadingOverlay.hidden = !visible
  if (label) elements.loadingLabel.textContent = label
  elements.loadingFill.style.width = `${Math.max(3, Math.min(100, progress))}%`
}

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('zh-TW', { hour12: false })
  const prefix = type === 'error' ? 'ERROR' : type === 'warn' ? 'WARN ' : 'INFO '
  const next = `[${timestamp}] ${prefix} ${message}`
  elements.validatorLog.textContent = `${elements.validatorLog.textContent}\n${next}`.trim()
  elements.validatorLog.scrollTop = elements.validatorLog.scrollHeight
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/mixamo\.com/gi, '')
    .replace(/[^a-z0-9]/g, '')
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

function formatVector(vector, digits = 3) {
  return `${vector.x.toFixed(digits)}, ${vector.y.toFixed(digits)}, ${vector.z.toFixed(digits)}`
}

function classifyMetric(condition, warningCondition = false) {
  if (condition) return 'pass'
  return warningCondition ? 'warn' : 'fail'
}

async function importThreeStack() {
  await MeshoptDecoder.ready
  for (const element of [elements.loaderGltf, elements.loaderDraco, elements.loaderKtx, elements.loaderMeshopt]) {
    element.classList.add('ready')
    element.title = '同站點引擎已整合；正式壓縮 GLB 尚待驗收'
  }
  log('Pinned npm Three.js and loaders ready; no runtime CDN')
}

function createRenderer() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: elements.canvas,
      antialias: true,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    })
  } catch (error) {
    showRendererError(error)
    throw error
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0x050409, 1)
  renderer.setPixelRatio(getTargetPixelRatio())

  elements.canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    contextUnavailable = true; cancelAnimationFrame(animationFrameId); touchDiagnostic?.clear()
    log('WebGL context lost', 'error')
    setBadge(elements.engineBadge, 'WEBGL_CONTEXT_LOST', 'fail')
  })

  elements.canvas.addEventListener('webglcontextrestored', () => {
    contextUnavailable = false; startRenderLoop()
    log('WebGL context restored')
    setBadge(elements.engineBadge, 'ENGINE_READY', 'ready')
    resizeRenderer()
  })
}

function getTargetPixelRatio() {
  const mobile = matchMedia('(pointer: coarse)').matches
  return Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2)
}

function showRendererError(error) {
  elements.rendererError.hidden = false
  elements.rendererErrorMessage.textContent = error instanceof Error ? error.message : String(error)
  setBadge(elements.engineBadge, 'WEBGL_RENDERER_FAILED', 'fail')
}

function createScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050409)
  scene.fog = new THREE.FogExp2(0x050409, 0.034)

  camera = new THREE.PerspectiveCamera(30, 1, 0.05, 150)
  camera.position.set(8.4, 7.2, 8.4)
  camera.lookAt(0, 1.05, 0)
  debugCameraHome = captureCameraState()
  cameraHome = debugCameraHome

  assetRoot = new THREE.Group()
  assetRoot.name = 'WarriorAssetRoot'
  scene.add(assetRoot)

  debugRoot = new THREE.Group()
  debugRoot.name = 'DEBUG_HELPERS'
  scene.add(debugRoot)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshStandardMaterial({ color: 0x15131a, roughness: 0.92, metalness: 0.08 }),
  )
  ground.name = 'DEBUG_GROUND_PLANE'
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  debugRoot.add(ground)

  const grid = new THREE.GridHelper(18, 18, 0x6f426f, 0x2f2935)
  grid.name = 'DEBUG_GRID_HELPER'
  grid.position.y = 0.004
  grid.material.transparent = true
  grid.material.opacity = 0.48
  debugRoot.add(grid)

  const originRing = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.47, 48),
    new THREE.MeshBasicMaterial({ color: 0xd5a75a, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
  )
  originRing.name = 'DEBUG_PIVOT_MARKER'
  originRing.rotation.x = -Math.PI / 2
  originRing.position.y = 0.012
  debugRoot.add(originRing)

  const hemisphere = new THREE.HemisphereLight(0x8a78a8, 0x160d0d, 1.25)
  hemisphere.name = 'DEBUG_HEMISPHERE_LIGHT'
  scene.add(hemisphere)

  const keyLight = new THREE.DirectionalLight(0xffd2a0, 4.1)
  keyLight.name = 'DEBUG_KEY_LIGHT'
  keyLight.position.set(5.4, 8.8, 4.2)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far = 32
  keyLight.shadow.camera.left = -7
  keyLight.shadow.camera.right = 7
  keyLight.shadow.camera.top = 7
  keyLight.shadow.camera.bottom = -7
  keyLight.shadow.bias = -0.00025
  scene.add(keyLight)

  const rimLight = new THREE.PointLight(0x9e35ef, 16, 16, 2)
  rimLight.name = 'DEBUG_PURPLE_RIM_LIGHT'
  rimLight.position.set(-4.2, 4.8, -3.6)
  scene.add(rimLight)

  const emberLight = new THREE.PointLight(0xe13732, 10, 12, 2)
  emberLight.name = 'DEBUG_RED_FILL_LIGHT'
  emberLight.position.set(3.2, 2.4, -3.4)
  scene.add(emberLight)
}

function captureCameraState() {
  return {
    position: camera.position.clone(),
    quaternion: camera.quaternion.clone(),
    near: camera.near,
    far: camera.far,
  }
}

function applyCameraState(state) {
  if (!state || !camera) return
  camera.position.copy(state.position)
  camera.quaternion.copy(state.quaternion)
  camera.near = state.near
  camera.far = state.far
  camera.updateProjectionMatrix()
}

function resetCamera() {
  applyCameraState(cameraHome)
}

function frameAsset(object, boundingBox) {
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
}

function resizeRenderer() {
  if (!renderer || !camera || disposed || contextUnavailable) return
  const width = Math.max(1, elements.canvasHost.clientWidth)
  const height = Math.max(1, elements.canvasHost.clientHeight)
  const ratio = getTargetPixelRatio()
  renderer.setPixelRatio(ratio)
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  if (activeGltf) frameAsset(activeGltf.scene, new THREE.Box3().setFromObject(activeGltf.scene, true))
  updateRendererFacts()
}

function updateRendererFacts() {
  if (!renderer) return
  const context = renderer.getContext()
  const rendererName = context.getParameter(context.RENDERER) || 'WebGL'
  elements.rendererFacts.innerHTML = ''
  const facts = [
    `Renderer: ${rendererName}`,
    `Pixel ratio: ${renderer.getPixelRatio().toFixed(2)}`,
    `Shadow: ${renderer.shadowMap.enabled ? 'PCF Soft' : 'Off'}`,
  ]
  for (const fact of facts) {
    const span = document.createElement('span')
    span.textContent = fact
    elements.rendererFacts.append(span)
  }
}

function startRenderLoop() {
  cancelAnimationFrame(animationFrameId)
  lastFrameTime = performance.now()

  const render = (now) => {
    if (disposed || suspended || contextUnavailable || document.hidden) return
    const delta = Math.min((now - lastFrameTime) / 1000, 0.05)
    lastFrameTime = now
    mixerController?.update(delta)
    renderer.render(scene, camera)
    if (++frameCount % 15 === 0) elements.canvas.dataset.frames = String(frameCount)
    animationFrameId = requestAnimationFrame(render)
  }

  animationFrameId = requestAnimationFrame(render)
}


function createLoader() {
  const manager = new THREE.LoadingManager()
  manager.onStart = () => setLoading(true, '讀取 warrior.glb', 5)
  manager.onProgress = (_url, loaded, total) => {
    const progress = total > 0 ? (loaded / total) * 100 : 32
    setLoading(true, `載入資源 ${loaded} / ${total}`, progress)
  }
  manager.onError = (url) => log(`Loader dependency failed: ${url}`, 'error')

  const dracoLoader = new DRACOLoader(manager)
  dracoLoader.setDecoderPath(DRACO_DECODER_PATH)
  dracoLoader.setWorkerLimit(matchMedia('(pointer: coarse)').matches ? 2 : 4)

  const ktx2Loader = new KTX2Loader(manager)
  ktx2Loader.setTranscoderPath(KTX2_TRANSCODER_PATH)
  ktx2Loader.setWorkerLimit(matchMedia('(pointer: coarse)').matches ? 2 : 4)
  ktx2Loader.detectSupport(renderer)

  const loader = new GLTFLoader(manager)
  loader.setDRACOLoader(dracoLoader)
  loader.setKTX2Loader(ktx2Loader)
  loader.setMeshoptDecoder(MeshoptDecoder)

  return { loader, dracoLoader, ktx2Loader }
}

async function assetExists() {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 20000)
  try { currentManifest = await readManifest(BASE_URL, abort.signal); return currentManifest.present }
  finally { clearTimeout(timer) }
}

function setWaitingState() {
  setLoading(false)
  const waitingTitle = elements.waitingCard.querySelector('strong')
  const waitingCopy = elements.waitingCard.querySelector('p')
  if (waitingTitle) waitingTitle.textContent = 'WAITING_FOR_WARRIOR_ASSET'
  if (waitingCopy) waitingCopy.textContent = '目前未放入正式角色。此頁只顯示工程用 DEBUG 地板、Grid 與光源，不會建立假 GLB、primitive 人形或退役角色實作。'
  setBadge(elements.assetBadge, 'WAITING_FOR_WARRIOR_ASSET', 'waiting')
  elements.viewportTitle.textContent = 'DEBUG SCENE • NO CHARACTER ASSET'
  elements.reportTitle.textContent = '等待正式 warrior.glb'
  elements.waitingCard.hidden = false
  elements.validationTimestamp.textContent = '尚未驗證'
  elements.scoreBadge.textContent = `0 / ${METRICS.length}`
  elements.animationSummary.textContent = `0 / ${EXPECTED_ANIMATIONS.length}`
  elements.copyReportButton.disabled = true
  reportSnapshot = null

  for (const [id] of METRICS) {
    setMetric(id, { value: 'WAITING_FOR_ASSET', detail: '正式 GLB 尚未放入', state: 'waiting' })
  }

  for (const button of elements.animationControls.querySelectorAll('button')) {
    button.disabled = true
    button.className = 'animation-button'
  }

  log(`WAITING_FOR_WARRIOR_ASSET: public/${ASSET_RELATIVE_PATH}`)
}

async function loadWarriorAsset() {
  const generation = ++assetLoadGeneration
  disposeCurrentAsset()
  setWaitingState()
  elements.retryAssetButton.disabled = true
  setLoading(true, '檢查正式資產路徑', 8)

  let exists
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
  }
  if (generation !== assetLoadGeneration) return

  if (!exists) {
    elements.retryAssetButton.disabled = false
    setWaitingState()
    return
  }

  setBadge(elements.assetBadge, 'WARRIOR_ASSET_LOADING', 'loading')
  elements.waitingCard.hidden = true
  elements.reportTitle.textContent = '載入並驗證 warrior.glb'

  const { loader, dracoLoader, ktx2Loader } = createLoader()
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 25000)

  try {
    const bytes = await readVerifiedGlb(BASE_URL, currentManifest, abort.signal)
    const parsing = loader.parseAsync(bytes, BASE_URL + 'assets/characters/warrior/')
    parsing.then((gltf) => { if (abort.signal.aborted || generation !== assetLoadGeneration || disposed) disposeGltf(gltf) }, () => {})
    const gltf = await Promise.race([parsing, new Promise((_, reject) => {
      if (abort.signal.aborted) reject(new Error('GLB load timeout'))
      else abort.signal.addEventListener('abort', () => reject(new Error('GLB load timeout')), { once: true })
    })])

    if (generation !== assetLoadGeneration) {
      disposeGltf(gltf)
      return
    }

    activeGltf = gltf
    assetRoot.add(gltf.scene)
    prepareAssetForPreview(gltf.scene)
    const report = validateGltf(gltf)
    const boundingBox = report.raw.boundingBox
    frameAsset(gltf.scene, boundingBox)
    mixerController = createMixerController(gltf.scene, report.raw.animationMap)
    const drawCallResult = measureAssetDrawCalls()
    report.metrics.drawCalls = drawCallResult
    renderValidationReport(report)

    setLoading(false)
    setBadge(elements.assetBadge, report.hasFailures ? 'ASSET_VALIDATION_FAILED' : report.warnings ? 'ASSET_REVIEW_REQUIRED' : 'TECHNICAL_CHECKS_PASSED', report.hasFailures ? 'fail' : report.warnings ? 'waiting' : 'ready')
    elements.viewportTitle.textContent = 'GLB PREVIEW • NOT ART APPROVAL'
    elements.reportTitle.textContent = report.hasFailures ? 'warrior.glb 需要修正' : '技術報告；美術待人工驗收'
    log(`warrior.glb loaded: ${formatNumber(report.raw.triangleCount)} triangles`)
  } catch (error) {
    console.error(error)
    setLoading(false)
    setBadge(elements.assetBadge, error.code || 'WARRIOR_ASSET_INVALID', 'fail')
    elements.reportTitle.textContent = 'warrior.glb 載入失敗'
    elements.waitingCard.hidden = false
    elements.waitingCard.querySelector('strong').textContent = 'WARRIOR_ASSET_INVALID'
    elements.waitingCard.querySelector('p').textContent = '檔案存在，但 GLTFLoader 無法解析。請檢查 GLB、壓縮擴充與貼圖封裝。'
    log(error instanceof Error ? error.stack || error.message : String(error), 'error')
  } finally {
    clearTimeout(timer)
    dracoLoader.dispose()
    ktx2Loader.dispose()
    elements.retryAssetButton.disabled = false
  }
}

function prepareAssetForPreview(root) {
  root.traverse((node) => {
    if (!node.isMesh) return
    node.castShadow = true
    node.receiveShadow = true
  })

  skeletonHelper = new THREE.SkeletonHelper(root)
  skeletonHelper.name = 'DEBUG_SKELETON_HELPER'
  skeletonHelper.visible = false
  scene.add(skeletonHelper)
}

function getMaterials(root) {
  const materials = new Map()
  root.traverse((node) => {
    if (!node.isMesh || !node.material) return
    const list = Array.isArray(node.material) ? node.material : [node.material]
    for (const material of list) materials.set(material.uuid, material)
  })
  return [...materials.values()]
}

function getTextures(materials) {
  const textures = new Map()
  for (const material of materials) {
    for (const [slot, value] of Object.entries(material)) {
      if (!value?.isTexture) continue
      const current = textures.get(value.uuid) || { texture: value, slots: new Set(), materials: new Set() }
      current.slots.add(slot)
      current.materials.add(material.name || material.type)
      textures.set(value.uuid, current)
    }
  }
  return [...textures.values()]
}

function countTriangles(root) {
  let triangleCount = 0
  root.traverse((node) => {
    if (!node.isMesh || !node.geometry) return
    const geometry = node.geometry
    const count = geometry.index?.count ?? geometry.attributes.position?.count ?? 0
    const instanceMultiplier = node.isInstancedMesh ? node.count : 1
    triangleCount += (count / 3) * instanceMultiplier
  })
  return triangleCount
}

function findNamedNodes(root, pattern, meshOnly = false) {
  const matches = []
  root.traverse((node) => {
    if (meshOnly && !node.isMesh) return
    if (pattern.test(node.name || '')) matches.push(node)
  })
  return matches
}

function buildAnimationMap(clips) { return strictAnimationMap(clips) }

function analyzeRootMotion(root, clips) { return auditRootMotion(root, clips) }

function validateGltf(gltf) {
  const root = gltf.scene
  root.updateMatrixWorld(true)
  const skinnedMeshes = []
  const skeletons = new Map()
  const bones = new Map()

  root.traverse((node) => {
    if (node.isSkinnedMesh) {
      skinnedMeshes.push(node)
      if (node.skeleton) skeletons.set(node.skeleton.uuid, node.skeleton)
    }
    if (node.isBone) bones.set(node.uuid, node)
  })

  const materials = getMaterials(root)
  const textures = getTextures(materials)
  const emissiveMaterials = materials.filter((material) => material.emissiveMap && material.emissive?.getHex() !== 0 && material.emissiveIntensity > 0)
  const triangleCount = countTriangles(root)
  const weaponMeshes = findNamedNodes(root, /(great[ _-]?sword|weapon[ _-]?.*sword|sword[ _-]?.*weapon|^weapon$|^greatsword$)/i, true)
  const weaponSockets = findNamedNodes(root, /(weapon[ _-]?socket[ _-]?r|weaponsocketr|socket[ _-]?weapon|right[ _-]?hand[ _-]?socket)/i)
  const boundingBox = new THREE.Box3().setFromObject(root, true)
  const boundingSize = boundingBox.getSize(new THREE.Vector3())
  const boundingCenter = boundingBox.getCenter(new THREE.Vector3())
  const rootScale = root.getWorldScale(new THREE.Vector3())
  const body = root.getObjectByName('SK_Warrior_Body')
  const bodyBox = body ? new THREE.Box3().setFromObject(body, true) : null
  const leftFoot = root.getObjectByName('Foot_L'), rightFoot = root.getObjectByName('Foot_R')
  const pivotKnown = bodyBox && !bodyBox.isEmpty() && leftFoot && rightFoot
  const feet = pivotKnown ? leftFoot.getWorldPosition(new THREE.Vector3()).add(rightFoot.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5) : null
  const pivotVerticalError = pivotKnown ? Math.abs(bodyBox.min.y) : Infinity
  const pivotHorizontalError = feet ? Math.hypot(feet.x, feet.z) : Infinity
  const rootMotion = analyzeRootMotion(root, gltf.animations)
  const animationMap = buildAnimationMap(gltf.animations)

  const metrics = {}
  metrics.skinnedMesh = {
    value: `${skinnedMeshes.length}`,
    detail: skinnedMeshes.length ? skinnedMeshes.map((mesh) => mesh.name || '(unnamed)').join(', ') : '找不到 SkinnedMesh',
    state: skinnedMeshes.length > 0 ? 'pass' : 'fail',
  }
  metrics.skeleton = {
    value: `${skeletons.size}`,
    detail: skeletons.size ? 'Skeleton 已連接至 SkinnedMesh' : '未偵測 Skeleton',
    state: skeletons.size > 0 ? 'pass' : 'fail',
  }
  metrics.bones = {
    value: `${bones.size}`,
    detail: '建議 50 到 80 bones，披風另含 4 到 8 bones',
    state: classifyMetric(bones.size >= 50 && bones.size <= 88, bones.size > 0),
  }
  metrics.animations = {
    value: `${animationMap.size} / ${EXPECTED_ANIMATIONS.length}`,
    detail: gltf.animations.length ? gltf.animations.map((clip) => `${clip.name} ${clip.duration.toFixed(2)}s`).join(' | ') : '沒有 Animation Clip',
    state: animationMap.size === EXPECTED_ANIMATIONS.length ? 'pass' : 'fail',
  }
  metrics.triangles = {
    value: formatNumber(triangleCount),
    detail: '角色與武器總計建議不超過 60,000 triangles',
    state: classifyMetric(triangleCount > 0 && triangleCount <= 60000, triangleCount > 0 && triangleCount <= 90000),
  }
  metrics.materials = {
    value: `${materials.length}`,
    detail: materials.length ? materials.map((material) => material.name || material.type).join(', ') : '沒有材質',
    state: classifyMetric(materials.length > 0 && materials.length <= 4, materials.length > 0 && materials.length <= 6),
  }
  metrics.textures = {
    value: `${textures.length}`,
    detail: textures.length
      ? textures.map(({ texture, slots }) => `${texture.name || '(unnamed)'} [${[...slots].join(',')}]`).join(' | ')
      : '未偵測 Texture',
    state: classifyMetric(textures.length > 0 && textures.length <= 16, textures.length > 0),
  }
  metrics.emissive = {
    value: `${emissiveMaterials.length}`,
    detail: emissiveMaterials.length ? emissiveMaterials.map((material) => material.name || material.type).join(', ') : '紅色裂紋必須使用 Emissive Map',
    state: emissiveMaterials.length > 0 ? 'pass' : 'fail',
  }
  metrics.weaponMesh = {
    value: `${weaponMeshes.length}`,
    detail: weaponMeshes.length ? weaponMeshes.map((node) => node.name).join(', ') : '找不到獨立 Greatsword / Weapon Mesh',
    state: weaponMeshes.length > 0 ? 'pass' : 'fail',
  }

  const weaponAttachedToSocket = weaponMeshes.some((mesh) => {
    let current = mesh.parent
    while (current) {
      if (weaponSockets.includes(current)) return true
      current = current.parent
    }
    return false
  })
  metrics.weaponSocket = {
    value: `${weaponSockets.length}`,
    detail: weaponSockets.length
      ? `${weaponSockets.map((node) => node.name).join(', ')}${weaponAttachedToSocket ? ' | Weapon linked' : ' | Weapon 未掛在 Socket 下'}`
      : '找不到 WeaponSocket_R',
    state: weaponSockets.length > 0 && weaponAttachedToSocket ? 'pass' : weaponSockets.length > 0 ? 'warn' : 'fail',
  }
  metrics.boundingBox = {
    value: formatVector(boundingSize),
    detail: `min(${formatVector(boundingBox.min)}) max(${formatVector(boundingBox.max)})`,
    state: boundingBox.isEmpty() ? 'fail' : 'pass',
  }

  const transformNodes = new Set([root, ...root.children])
  root.traverse((node) => { if (['Warrior', 'Warrior_Root', 'Armature', 'Root'].includes(node.name)) transformNodes.add(node) })
  const scaleIsOne = [...transformNodes].every((node) => ['x', 'y', 'z'].every((axis) => Number.isFinite(node.scale[axis]) && Math.abs(node.scale[axis] - 1) <= 0.001))
  const heightLooksHuman = bodyBox && bodyBox.getSize(new THREE.Vector3()).y >= 1.4 && bodyBox.getSize(new THREE.Vector3()).y <= 3
  metrics.scale = {
    value: formatVector(rootScale),
    detail: `角色高度 ${boundingSize.y.toFixed(3)} m，預期 root scale 1,1,1`,
    state: !scaleIsOne ? 'fail' : heightLooksHuman ? 'pass' : 'warn',
  }
  metrics.pivot = {
    value: pivotKnown ? 'Y ' + bodyBox.min.y.toFixed(3) + ' m / XZ ' + pivotHorizontalError.toFixed(3) + ' m' : 'MANUAL_REVIEW',
    detail: '以身體腳底及 Foot_L/R 中點估計，不以大劍/披風改變的全身中心判定；須人工中立姿勢確認',
    state: pivotKnown && pivotVerticalError <= 0.03 && pivotHorizontalError <= 0.08 ? 'pass' : 'warn',
  }
  metrics.rootMotion = {
    value: rootMotion.maxHorizontalDrift === null ? 'UNVERIFIED' : rootMotion.maxHorizontalDrift.toFixed(4) + ' m',
    detail: 'Root與祖先取樣；旋轉 ' + String(rootMotion.maxRotation) + ' rad；未解析 ' + rootMotion.unresolved + ' 軌。無明確Root不得通過。',
    state: rootMotion.state,
  }
  metrics.drawCalls = {
    value: 'MEASURING',
    detail: '只計算正式 GLB，不含 DEBUG Grid / Plane',
    state: 'waiting',
  }

  const failed = Object.values(metrics).filter((metric) => metric.state === 'fail').length
  const warnings = Object.values(metrics).filter((metric) => metric.state === 'warn').length

  return {
    metrics,
    hasFailures: failed > 0,
    failed,
    warnings,
    raw: {
      skinnedMeshes,
      skeletons,
      bones,
      materials,
      textures,
      emissiveMaterials,
      triangleCount,
      weaponMeshes,
      weaponSockets,
      boundingBox,
      boundingSize,
      boundingCenter,
      rootScale,
      rootMotion,
      animationMap,
    },
  }
}

function measureAssetDrawCalls() {
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
}

function createMixerController(root, animationMap) {
  const controller = createAnimationController(root, animationMap, (name) => {
    for (const button of elements.animationControls.querySelectorAll('button')) {
      button.disabled = !animationMap.has(button.dataset.animation)
      button.className = 'animation-button' + (button.disabled ? '' : ' available') + (button.dataset.animation === name ? ' active' : '')
    }
  })
  controller.play('Idle', 0)
  return controller
}

function renderValidationReport(report) {
  let passed = 0
  let failed = 0
  let warnings = 0

  for (const [id] of METRICS) {
    const metric = report.metrics[id]
    setMetric(id, metric)
    if (metric.state === 'pass') passed += 1
    if (metric.state === 'fail') failed += 1
    if (metric.state === 'warn') warnings += 1
  }

  report.hasFailures = failed > 0
  report.failed = failed
  report.warnings = warnings
  const mappedAnimations = report.raw.animationMap.size
  elements.scoreBadge.textContent = `${passed} / ${METRICS.length}`
  elements.animationSummary.textContent = `${mappedAnimations} / ${EXPECTED_ANIMATIONS.length}`
  elements.validationTimestamp.textContent = new Date().toLocaleString('zh-TW', { hour12: false })
  elements.waitingCard.hidden = true

  for (const button of elements.animationControls.querySelectorAll('button')) {
    const available = report.raw.animationMap.has(button.dataset.animation)
    button.disabled = !available
    button.classList.toggle('available', available)
  }

  const summary = {
    build: BUILD_ID,
    visualApproval: false,
    disclaimer: '技術篩查不等於美術、商用權利、穿模與iPhone效能驗收',
    manifest: currentManifest,
    asset: `public/${ASSET_RELATIVE_PATH}`,
    validatedAt: new Date().toISOString(),
    score: { passed, total: METRICS.length, warnings, failed },
    metrics: Object.fromEntries(METRICS.map(([id]) => [id, report.metrics[id]])),
    animationMapping: Object.fromEntries(
      [...report.raw.animationMap].map(([canonical, entry]) => [canonical, {
        clip: entry.clip.name,
        duration: Number(entry.clip.duration.toFixed(4)),
        loop: entry.loop,
      }]),
    ),
    rootMotion: report.raw.rootMotion.clipDetails,
  }

  reportSnapshot = summary
  elements.copyReportButton.disabled = false
  elements.validatorLog.textContent = JSON.stringify(summary, null, 2)
}

async function copyReport() {
  if (!reportSnapshot) return
  try {
    await navigator.clipboard.writeText(JSON.stringify(reportSnapshot, null, 2))
    log('Validation report copied')
  } catch (error) {
    log(`Copy failed: ${error instanceof Error ? error.message : String(error)}`, 'warn')
  }
}

function disposeMaterial(material) {
  for (const value of Object.values(material)) {
    if (value?.isTexture) value.dispose()
  }
  material.dispose?.()
}

function disposeGltf(gltf) {
  gltf?.scene?.traverse((node) => {
    if (!node.isMesh) return
    node.geometry?.dispose?.()
    if (Array.isArray(node.material)) node.material.forEach(disposeMaterial)
    else if (node.material) disposeMaterial(node.material)
  })
}


function disposeCurrentAsset() {
  mixerController?.dispose()
  mixerController = null

  if (skeletonHelper) {
    scene?.remove(skeletonHelper)
    skeletonHelper.dispose?.()
    skeletonHelper = null
  }

  if (activeGltf) {
    assetRoot?.remove(activeGltf.scene)
    disposeGltf(activeGltf)
    activeGltf = null
  }

  elements.resetCameraButton.disabled = true
  cameraHome = debugCameraHome
  if (camera && debugCameraHome) applyCameraState(debugCameraHome)
}

async function boot() {
  initializeStaticUi()
  touchDiagnostic = attachTouchDiagnostic($('#touchLeft'), $('#touchRight'), $('#touchResult'))
  elements.retryAssetButton.disabled = true
  setLoading(true, '載入 Three.js 工程模組', 4)

  try {
    await importThreeStack()
    createRenderer()
    createScene()
    resizeRenderer()
    startRenderLoop()

    resizeObserver = new ResizeObserver(() => resizeRenderer())
    resizeObserver.observe(elements.canvasHost)
    window.visualViewport?.addEventListener('resize', resizeRenderer)
    window.addEventListener('orientationchange', () => setTimeout(resizeRenderer, 120))

    setBadge(elements.engineBadge, 'ENGINE_READY', 'ready')
    setLoading(false)
    updateRendererFacts()
    log('Renderer, fixed 3/4 camera, lights, shadow and resize pipeline ready')
    await loadWarriorAsset()
  } catch (error) {
    console.error(error)
    setLoading(false)
    showRendererError(error)
    log(error instanceof Error ? error.stack || error.message : String(error), 'error')
  }
}

window.addEventListener('pagehide', (event) => {
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
