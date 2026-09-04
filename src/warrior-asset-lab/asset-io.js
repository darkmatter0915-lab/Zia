export const ASSET_PATH = 'assets/characters/warrior/warrior.glb'
export const MAX_BYTES = 64 * 1024 * 1024
export class AssetError extends Error {
  constructor(code, message) { super(message); this.name = 'AssetError'; this.code = code }
}
export function inspectGlb(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20 || buffer.byteLength > MAX_BYTES) throw new AssetError('ASSET_INVALID', 'GLB 大小不符安全限制')
  const view = new DataView(buffer)
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) throw new AssetError('ASSET_INVALID', 'GLB 2.0 header 或長度不符')
  let json, offset = 12, count = 0
  while (offset < buffer.byteLength) {
    if (offset + 8 > buffer.byteLength) throw new AssetError('ASSET_INVALID', 'GLB chunk header 不完整')
    const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true)
    if (length % 4 || offset + 8 + length > buffer.byteLength) throw new AssetError('ASSET_INVALID', 'GLB chunk 範圍錯誤')
    if (!count && type !== 0x4e4f534a) throw new AssetError('ASSET_INVALID', '首個 chunk 必須為 JSON')
    if (type === 0x4e4f534a) {
      if (json) throw new AssetError('ASSET_INVALID', 'GLB 重複 JSON')
      try { json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset + 8, length))) }
      catch { throw new AssetError('ASSET_INVALID', 'GLB JSON 無法解析') }
    }
    offset += length + 8; count++
  }
  if (json?.asset?.version !== '2.0') throw new AssetError('ASSET_INVALID', 'glTF asset.version 不是 2.0')
  for (const item of [...(json.buffers || []), ...(json.images || [])]) if (item.uri && !item.uri.startsWith('data:')) throw new AssetError('ASSET_INVALID', 'GLB 貼圖與 buffer 須內嵌，禁止外部 URL')
  return json
}
async function get(url, signal) {
  let response
  try { response = await fetch(url, { signal, cache: 'no-store', credentials: 'same-origin' }) }
  catch (error) { if (signal.aborted) throw error; throw new AssetError('ASSET_NETWORK_ERROR', '網路讀取失敗，不代表缺少資產') }
  if (response.status === 404 || response.status === 410) throw new AssetError('ASSET_MISSING', '資產不存在')
  if (!response.ok) throw new AssetError('ASSET_HTTP_ERROR', `HTTP ${response.status}，不可判定為缺少資產`)
  return response
}
export async function readManifest(base, signal) {
  let response
  try { response = await get(`${base}warrior-asset-lab/asset-status.json`, signal) }
  catch (error) { if (error.code === 'ASSET_MISSING') throw new AssetError('ASSET_MANIFEST_MISSING', '部署未包含資產狀態 JSON'); throw error }
  let manifest
  try { manifest = await response.json() } catch { throw new AssetError('ASSET_MANIFEST_INVALID', '資產狀態 JSON 無法解析') }
  if (manifest.path !== ASSET_PATH || typeof manifest.present !== 'boolean') throw new AssetError('ASSET_MANIFEST_INVALID', '資產狀態格式不符')
  return manifest
}
export async function readVerifiedGlb(base, manifest, signal) {
  if (!manifest.present) throw new AssetError('ASSET_MISSING', 'WAITING_FOR_WARRIOR_ASSET')
  if (!Number.isInteger(manifest.bytes) || manifest.bytes < 20 || manifest.bytes > MAX_BYTES) throw new AssetError('ASSET_INVALID', '資產大小不合法')
  const response = await get(`${base}${ASSET_PATH}`, signal), reader = response.body?.getReader()
  if (!reader) throw new AssetError('ASSET_NETWORK_ERROR', 'GLB stream 不可用')
  const parts = []; let length = 0
  while (true) {
    const { done, value } = await reader.read(); if (done) break
    length += value.byteLength
    if (length > manifest.bytes || length > MAX_BYTES) { await reader.cancel(); throw new AssetError('ASSET_INVALID', 'GLB 超過宣告大小') }
    parts.push(value)
  }
  if (length !== manifest.bytes) throw new AssetError('ASSET_INVALID', 'GLB 下載不完整')
  const bytes = new Uint8Array(length); let offset = 0
  for (const part of parts) { bytes.set(part, offset); offset += part.length }
  inspectGlb(bytes.buffer)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const sha = [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, '0')).join('')
  if (sha !== manifest.sha256) throw new AssetError('ASSET_HASH_MISMATCH', 'GLB 與部署 SHA-256 不符，拒絕舊快取')
  return bytes.buffer
}
