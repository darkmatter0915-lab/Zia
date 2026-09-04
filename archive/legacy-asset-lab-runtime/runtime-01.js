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

async function assetExists(url) {
  try {
    const response = await fetch(`${url}?preflight=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      credentials: 'same-origin',
    })
    return response.ok
  } catch (error) {
    log(`Asset preflight failed: ${error instanceof Error ? error.message : String(error)}`, 'warn')
    return false
  }
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

  const exists = await assetExists(ASSET_URL)
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
  const requestUrl = `${ASSET_URL}?asset-lab=${Date.now()}`

  try {
    const gltf = await loader.loadAsync(requestUrl, (event) => {
      if (!event.lengthComputable) return
      setLoading(true, '下載 warrior.glb', (event.loaded / event.total) * 100)
    })

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
    setBadge(elements.assetBadge, report.hasFailures ? 'ASSET_VALIDATION_FAILED' : 'ASSET_VALIDATED', report.hasFailures ? 'fail' : 'ready')
    elements.viewportTitle.textContent = 'FORMAL GLB LOADED • FIXED 3/4 VIEW'
    elements.reportTitle.textContent = report.hasFailures ? 'warrior.glb 需要修正' : 'warrior.glb 通過目前檢查'
    log(`warrior.glb loaded: ${formatNumber(report.raw.triangleCount)} triangles`)
  } catch (error) {
    console.error(error)
    setLoading(false)
    setBadge(elements.assetBadge, 'WARRIOR_ASSET_INVALID', 'fail')
    elements.reportTitle.textContent = 'warrior.glb 載入失敗'
    elements.waitingCard.hidden = false
    elements.waitingCard.querySelector('strong').textContent = 'WARRIOR_ASSET_INVALID'
    elements.waitingCard.querySelector('p').textContent = '檔案存在，但 GLTFLoader 無法解析。請檢查 GLB、壓縮擴充與貼圖封裝。'
    log(error instanceof Error ? error.stack || error.message : String(error), 'error')
  } finally {
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

function buildAnimationMap(clips) {
  const result = new Map()
  const used = new Set()

  for (const expected of EXPECTED_ANIMATIONS) {
    const match = clips.find((clip) => {
      if (used.has(clip.uuid)) return false
      const normalized = normalizeName(clip.name)
      return expected.aliases.some((alias) => normalized === normalizeName(alias))
    }) || clips.find((clip) => {
      if (used.has(clip.uuid)) return false
      const normalized = normalizeName(clip.name)
      return expected.aliases.some((alias) => normalized.includes(normalizeName(alias)))
    })

    if (match) {
      used.add(match.uuid)
      result.set(expected.canonical, { clip: match, loop: expected.loop })
    }
  }

  return result
}

function analyzeRootMotion(root, clips) {
  const bones = []
  root.traverse((node) => {
    if (node.isBone) bones.push(node)
  })

  const rootCandidates = new Set()
  for (const bone of bones) {
    if (!bone.parent?.isBone || /^(root|warriorroot|armature)$/i.test(normalizeName(bone.name))) {
      rootCandidates.add(normalizeName(bone.name))
    }
  }
  rootCandidates.add(normalizeName(root.name))
  rootCandidates.add('root')
  rootCandidates.add('warriorroot')
  rootCandidates.add('armature')

  let maxHorizontalDrift = 0
  const clipDetails = []
  let inspectedTracks = 0

  for (const clip of clips) {
    let clipDrift = 0
    let clipTrackCount = 0

    for (const track of clip.tracks) {
      if (!track.name.endsWith('.position')) continue
      let parsed
      try {
        parsed = THREE.PropertyBinding.parseTrackName(track.name)
      } catch {
        parsed = { nodeName: track.name.split('.')[0].split('/').pop() }
      }
      const targetName = normalizeName(parsed.nodeName || track.name.split('.')[0].split('/').pop())
      if (!rootCandidates.has(targetName)) continue
      if (track.getValueSize() !== 3 || track.values.length < 6) continue

      clipTrackCount += 1
      inspectedTracks += 1
      const firstX = track.values[0]
      const firstZ = track.values[2]
      for (let index = 0; index < track.values.length; index += 3) {
        const dx = track.values[index] - firstX
        const dz = track.values[index + 2] - firstZ
        clipDrift = Math.max(clipDrift, Math.hypot(dx, dz))
      }
    }

    maxHorizontalDrift = Math.max(maxHorizontalDrift, clipDrift)
    clipDetails.push({ name: clip.name, drift: clipDrift, trackCount: clipTrackCount })
  }

  return { maxHorizontalDrift, inspectedTracks, clipDetails }
}

