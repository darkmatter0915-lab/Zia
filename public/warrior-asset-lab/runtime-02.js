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
  const emissiveMaterials = materials.filter((material) => Boolean(material.emissiveMap))
  const triangleCount = countTriangles(root)
  const weaponMeshes = findNamedNodes(root, /(great[ _-]?sword|weapon[ _-]?.*sword|sword[ _-]?.*weapon|^weapon$|^greatsword$)/i, true)
  const weaponSockets = findNamedNodes(root, /(weapon[ _-]?socket[ _-]?r|weaponsocketr|socket[ _-]?weapon|right[ _-]?hand[ _-]?socket)/i)
  const boundingBox = new THREE.Box3().setFromObject(root)
  const boundingSize = boundingBox.getSize(new THREE.Vector3())
  const boundingCenter = boundingBox.getCenter(new THREE.Vector3())
  const rootScale = root.getWorldScale(new THREE.Vector3())
  const pivotVerticalError = Math.abs(boundingBox.min.y)
  const pivotHorizontalError = Math.hypot(boundingCenter.x, boundingCenter.z)
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

  const scaleIsOne = ['x', 'y', 'z'].every((axis) => Math.abs(rootScale[axis] - 1) <= 0.001)
  const heightLooksHuman = boundingSize.y >= 1.4 && boundingSize.y <= 3
  metrics.scale = {
    value: formatVector(rootScale),
    detail: `角色高度 ${boundingSize.y.toFixed(3)} m，預期 root scale 1,1,1`,
    state: scaleIsOne && heightLooksHuman ? 'pass' : scaleIsOne || heightLooksHuman ? 'warn' : 'fail',
  }
  metrics.pivot = {
    value: `Y ${boundingBox.min.y.toFixed(3)} m`,
    detail: `腳底誤差 ${pivotVerticalError.toFixed(3)} m，水平中心誤差 ${pivotHorizontalError.toFixed(3)} m`,
    state: classifyMetric(pivotVerticalError <= 0.03 && pivotHorizontalError <= 0.08, pivotVerticalError <= 0.1 && pivotHorizontalError <= 0.2),
  }
  metrics.rootMotion = {
    value: `${rootMotion.maxHorizontalDrift.toFixed(3)} m`,
    detail: rootMotion.inspectedTracks
      ? `${rootMotion.inspectedTracks} root position track(s) inspected`
      : '未偵測根骨 position track，視為 In-place；仍需人工播放確認',
    state: classifyMetric(rootMotion.maxHorizontalDrift <= 0.02, rootMotion.maxHorizontalDrift <= 0.05),
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
  if (!renderer || !scene || !camera || !activeGltf) {
    return { value: '0', detail: '沒有已載入資產', state: 'fail' }
  }

  const previousDebugVisibility = debugRoot.visible
  const previousSkeletonVisibility = skeletonHelper?.visible ?? false
  debugRoot.visible = false
  if (skeletonHelper) skeletonHelper.visible = false

  renderer.info.reset()
  renderer.render(scene, camera)
  const calls = renderer.info.render.calls

  debugRoot.visible = previousDebugVisibility
  if (skeletonHelper) skeletonHelper.visible = previousSkeletonVisibility

  return {
    value: `${calls}`,
    detail: '只計算正式 GLB 渲染；建議角色加武器不超過 6 calls',
    state: classifyMetric(calls > 0 && calls <= 6, calls > 0 && calls <= 10),
  }
}

function createMixerController(root, animationMap) {
  const mixer = new THREE.AnimationMixer(root)
  const actions = new Map()
  let current = null

  for (const [canonical, entry] of animationMap) {
    const action = mixer.clipAction(entry.clip)
    action.enabled = true
    action.clampWhenFinished = !entry.loop
    action.setLoop(entry.loop ? THREE.LoopRepeat : THREE.LoopOnce, entry.loop ? Infinity : 1)
    actions.set(canonical, { ...entry, action })
  }

  const updateButtons = (name) => {
    for (const button of elements.animationControls.querySelectorAll('button')) {
      const available = actions.has(button.dataset.animation)
      button.disabled = !available
      button.className = `animation-button${available ? ' available' : ''}${button.dataset.animation === name ? ' active' : ''}`
    }
  }

  const play = (canonical, fade = 0.18) => {
    const next = actions.get(canonical)
    if (!next) return false
    if (current?.canonical === canonical && next.action.isRunning()) return true

    const previous = current
    next.action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play()
    if (previous && previous.action !== next.action) {
      previous.action.crossFadeTo(next.action, fade, true)
    }
    current = { canonical, ...next }
    updateButtons(canonical)
    log(`AnimationMixer play: ${canonical} -> ${next.clip.name}`)
    return true
  }

  mixer.addEventListener('finished', () => {
    if (current && !current.loop && actions.has('Idle')) play('Idle', 0.12)
  })

  updateButtons('')
  if (actions.has('Idle')) play('Idle', 0)

  return {
    mixer,
    actions,
    play,
    update: (delta) => mixer.update(delta),
    dispose: () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(root)
    },
  }
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

