import { APP_SCHEMA_VERSION, createDefaultState } from './data.js'
import { deepClone, STORAGE_KEY, uid } from './utils.js'

function mergeDefaults(defaultValue, savedValue) {
  if (Array.isArray(defaultValue)) {
    return Array.isArray(savedValue) ? savedValue : defaultValue
  }

  if (defaultValue && typeof defaultValue === 'object') {
    const source = savedValue && typeof savedValue === 'object' && !Array.isArray(savedValue)
      ? savedValue
      : {}

    return Object.fromEntries(
      Object.entries(defaultValue).map(([key, value]) => [key, mergeDefaults(value, source[key])]),
    )
  }

  return savedValue ?? defaultValue
}

function normalizeState(candidate) {
  const defaults = createDefaultState()
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return defaults

  const merged = mergeDefaults(defaults, candidate)
  merged.meta.schemaVersion = APP_SCHEMA_VERSION
  merged.meta.updatedAt = new Date().toISOString()
  return merged
}

export function createStore() {
  const listeners = new Set()
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('zia-state') : null
  let storageAvailable = true
  let state

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    state = raw ? normalizeState(JSON.parse(raw)) : createDefaultState()
  } catch {
    storageAvailable = false
    state = createDefaultState()
  }

  const notify = () => listeners.forEach((listener) => listener(state))

  const persist = ({ broadcast = true } = {}) => {
    state.meta.updatedAt = new Date().toISOString()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      storageAvailable = true
    } catch {
      storageAvailable = false
    }

    if (broadcast) channel?.postMessage(state)
  }

  channel?.addEventListener('message', (event) => {
    state = normalizeState(event.data)
    persist({ broadcast: false })
    notify()
  })

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return
    try {
      state = normalizeState(JSON.parse(event.newValue))
      notify()
    } catch {
      // Ignore malformed data from another tab.
    }
  })

  return {
    getState() {
      return state
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    update(mutator, activity) {
      const draft = deepClone(state)
      mutator(draft)

      if (activity?.text) {
        draft.activity.unshift({
          id: uid('activity'),
          text: activity.text,
          route: activity.route ?? 'overview',
          createdAt: new Date().toISOString(),
        })
        draft.activity = draft.activity.slice(0, 50)
      }

      state = normalizeState(draft)
      persist()
      notify()
    },

    replace(candidate, activityText = '已匯入資料備份') {
      const next = normalizeState(candidate)
      next.activity.unshift({
        id: uid('activity'),
        text: activityText,
        route: 'settings',
        createdAt: new Date().toISOString(),
      })
      next.activity = next.activity.slice(0, 50)
      state = next
      persist()
      notify()
    },

    reset() {
      state = createDefaultState()
      persist()
      notify()
    },

    exportData() {
      return deepClone(state)
    },

    storageStatus() {
      const bytes = new Blob([JSON.stringify(state)]).size
      return { available: storageAvailable, bytes }
    },

    destroy() {
      channel?.close()
      listeners.clear()
    },
  }
}
