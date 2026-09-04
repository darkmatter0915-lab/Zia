import './style.css'
import './hardening.css'
const base = import.meta.env.BASE_URL
import('./lab.js').catch((error) => {
 const badge = document.getElementById('engineBadge'); badge.textContent = 'ENGINE_LOAD_FAILED'; badge.className = 'status-badge status-fail'
 document.getElementById('loadingOverlay').hidden = true
 document.getElementById('rendererError').hidden = false
 document.getElementById('rendererErrorMessage').textContent = error.message
})
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch(() => {})
