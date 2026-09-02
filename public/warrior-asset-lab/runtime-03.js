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

window.addEventListener('pagehide', () => {
  cancelAnimationFrame(animationFrameId)
  resizeObserver?.disconnect()
  disposeCurrentAsset()
  renderer?.dispose()
})

boot()
