import './style.css'

const BASE_URL = import.meta.env.BASE_URL
const RUNTIME_FILES = [
  'warrior-asset-lab/runtime-00.js',
  'warrior-asset-lab/runtime-01.js',
  'warrior-asset-lab/runtime-02.js',
  'warrior-asset-lab/runtime-03.js',
]

window.__WAL_BASE_URL__ = BASE_URL

function loadClassicScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${BASE_URL}${path}`
    script.async = false
    script.dataset.warriorAssetLabRuntime = path
    script.addEventListener('load', resolve, { once: true })
    script.addEventListener('error', () => reject(new Error(`Runtime load failed: ${path}`)), { once: true })
    document.head.append(script)
  })
}

async function loadRuntime() {
  try {
    for (const file of RUNTIME_FILES) await loadClassicScript(file)
  } catch (error) {
    console.error(error)
    const badge = document.querySelector('#engineBadge')
    const errorPanel = document.querySelector('#rendererError')
    const errorMessage = document.querySelector('#rendererErrorMessage')
    if (badge) {
      badge.textContent = 'ENGINE_LOAD_FAILED'
      badge.className = 'status-badge status-fail'
    }
    if (errorMessage) errorMessage.textContent = error instanceof Error ? error.message : String(error)
    if (errorPanel) errorPanel.hidden = false
  }
}

loadRuntime()
