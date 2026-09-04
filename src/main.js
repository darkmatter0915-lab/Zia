import './style.css'
import './workspace.css'
import { WorkspaceApp as ZiaApp } from './workspace.js'
import { createStore } from './store.js'

const root = document.querySelector('#app')

if (!root) {
  throw new Error('找不到 Zia 掛載節點')
}

const store = createStore()
const app = new ZiaApp(root, store)
app.mount()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch((error) => {
      console.warn('Zia service worker registration failed:', error)
    })
  })
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => app.destroy())
}
