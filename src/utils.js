export const STORAGE_KEY = 'zia-control-center-v1'

export function uid(prefix = 'item') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function deepClone(value) {
  if (globalThis.structuredClone) return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

export function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export const escapeAttr = escapeHTML

export function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function todayISO() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function formatCurrency(value, currency = 'TWD', maximumFractionDigits = 0) {
  const number = toNumber(value)
  try {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency,
      maximumFractionDigits,
    }).format(number)
  } catch {
    return `${currency} ${number.toLocaleString('zh-TW')}`
  }
}

export function formatNumber(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('zh-TW', { maximumFractionDigits }).format(toNumber(value))
}

export function formatDate(value, options = {}) {
  if (!value) return '未設定'
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(date)
}

export function formatDateTime(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function dueLabel(value) {
  if (!value) return '無期限'
  const today = todayISO()
  if (value === today) return '今天'

  const start = new Date(`${today}T12:00:00`)
  const end = new Date(`${value}T12:00:00`)
  const diff = Math.round((end - start) / 86_400_000)

  if (diff === 1) return '明天'
  if (diff === -1) return '昨天'
  if (diff < 0) return `逾期 ${Math.abs(diff)} 天`
  if (diff <= 7) return `${diff} 天後`
  return formatDate(value, { year: undefined })
}

export function isOverdue(value, done = false) {
  return Boolean(value && !done && value < todayISO())
}

export function calculateTripSpent(tripId, itinerary = []) {
  return itinerary
    .filter((item) => item.tripId === tripId)
    .reduce((total, item) => total + toNumber(item.cost), 0)
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('讀取檔案失敗'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsText(file)
  })
}

export function bytesLabel(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export function routeFromHash(validRoutes, fallback = 'overview') {
  const route = location.hash.replace(/^#\/?/, '').split('?')[0]
  return validRoutes.includes(route) ? route : fallback
}

export function compareDateTime(a, b) {
  return `${a.date ?? ''} ${a.time ?? ''}`.localeCompare(`${b.date ?? ''} ${b.time ?? ''}`)
}
