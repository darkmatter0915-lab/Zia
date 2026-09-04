import { mkdir, cp, readFile, writeFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { inspectGlb, ASSET_PATH } from '../src/warrior-asset-lab/asset-io.js'
await mkdir('public/vendor/three', { recursive: true })
for (const [from, to] of [['draco/gltf', 'draco'], ['basis', 'basis']]) await cp(`node_modules/three/examples/jsm/libs/${from}`, `public/vendor/three/${to}`, { recursive: true })
await cp('node_modules/three/LICENSE', 'public/vendor/three/LICENSE')
let manifest = { path: ASSET_PATH, present: false, status: 'WAITING_FOR_WARRIOR_ASSET', bytes: 0, sha256: null }
try {
  await stat(`public/${ASSET_PATH}`)
  const bytes = await readFile(`public/${ASSET_PATH}`)
  inspectGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  manifest = { path: ASSET_PATH, present: true, status: 'PENDING_RUNTIME_VALIDATION', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
} catch (error) { if (error.code !== 'ENOENT') throw error }
await mkdir('public/warrior-asset-lab', { recursive: true })
await writeFile('public/warrior-asset-lab/asset-status.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(`Warrior asset: ${manifest.status}; same-version decoder files copied.`)
