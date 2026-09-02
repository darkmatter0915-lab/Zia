
const THREE_VERSION = '0.185.1'
const BUILD_ID = 'warrior-asset-lab-20260903-1'
const BASE_URL = window.__WAL_BASE_URL__
const ASSET_RELATIVE_PATH = 'assets/characters/warrior/warrior.glb'
const ASSET_URL = `${BASE_URL}${ASSET_RELATIVE_PATH}`
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
const KTX2_TRANSCODER_PATH = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/libs/basis/`

const MODULE_URLS = {
  three: `https://esm.sh/three@${THREE_VERSION}?target=es2022`,
  gltf: `https://esm.sh/three@${THREE_VERSION}/examples/jsm/loaders/GLTFLoader.js?target=es2022`,
  draco: `https://esm.sh/three@${THREE_VERSION}/examples/jsm/loaders/DRACOLoader.js?target=es2022`,
  ktx2: `https://esm.sh/three@${THREE_VERSION}/examples/jsm/loaders/KTX2Loader.js?target=es2022`,
  meshopt: `https://esm.sh/three@${THREE_VERSION}/examples/jsm/libs/meshopt_decoder.module.js?target=es2022`,
}

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
let THREE
let GLTFLoader
let DRACOLoader
let KTX2Loader
let MeshoptDecoder
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
  log(`Loading Three.js r${THREE_VERSION} modules`)
  const [threeModule, gltfModule, dracoModule, ktx2Module, meshoptModule] = await Promise.all([
    import(/* @vite-ignore */ MODULE_URLS.three),
    import(/* @vite-ignore */ MODULE_URLS.gltf),
    import(/* @vite-ignore */ MODULE_URLS.draco),
    import(/* @vite-ignore */ MODULE_URLS.ktx2),
    import(/* @vite-ignore */ MODULE_URLS.meshopt),
  ])

  THREE = threeModule
  GLTFLoader = gltfModule.GLTFLoader
  DRACOLoader = dracoModule.DRACOLoader
  KTX2Loader = ktx2Module.KTX2Loader
  MeshoptDecoder = meshoptModule.MeshoptDecoder

  if (!THREE?.WebGLRenderer || !GLTFLoader || !DRACOLoader || !KTX2Loader || !MeshoptDecoder) {
    throw new Error('Three.js loader stack incomplete')
  }

  await MeshoptDecoder.ready
  elements.loaderGltf.classList.add('ready')
  elements.loaderDraco.classList.add('ready')
  elements.loaderKtx.classList.add('ready')
  elements.loaderMeshopt.classList.add('ready')
  log('GLTFLoader, DRACOLoader, KTX2Loader and MeshoptDecoder ready')
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
    log('WebGL context lost', 'error')
    setBadge(elements.engineBadge, 'WEBGL_CONTEXT_LOST', 'fail')
  })

  elements.canvas.addEventListener('webglcontextrestored', () => {
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
  const size = boundingBox.getSize(new THREE.Vector3())
  const center = boundingBox.getCenter(new THREE.Vector3())
  const maxDimension = Math.max(size.x, size.y, size.z, 1)
  const fovRadians = THREE.MathUtils.degToRad(camera.fov)
  const fitDistance = maxDimension / (2 * Math.tan(fovRadians / 2))
  const direction = new THREE.Vector3(1, 0.82, 1).normalize()
  const target = center.clone().add(new THREE.Vector3(0, size.y * 0.06, 0))

  camera.position.copy(target).add(direction.multiplyScalar(fitDistance * 1.34))
  camera.near = Math.max(0.02, fitDistance / 100)
  camera.far = Math.max(100, fitDistance * 12)
  camera.lookAt(target)
  camera.updateProjectionMatrix()
  cameraHome = captureCameraState()
  elements.resetCameraButton.disabled = false
}

function resizeRenderer() {
  if (!renderer || !camera) return
  const width = Math.max(1, elements.canvasHost.clientWidth)
  const height = Math.max(1, elements.canvasHost.clientHeight)
  const ratio = getTargetPixelRatio()
  renderer.setPixelRatio(ratio)
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
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
    const delta = Math.min((now - lastFrameTime) / 1000, 0.05)
    lastFrameTime = now
    mixerController?.update(delta)
    renderer.render(scene, camera)
    animationFrameId = requestAnimationFrame(render)
  }

  animationFrameId = requestAnimationFrame(render)
}

