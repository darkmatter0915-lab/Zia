import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const html = readFileSync('dist/warrior-asset-lab/index.html', 'utf8')
assert.match(html, /WAITING_FOR_WARRIOR_ASSET/)
assert.match(html, /\/Zia\/assets\//)
assert.doesNotMatch(html, /esm\.sh|cdn\.jsdelivr/)
for (const p of ['draco/draco_wasm_wrapper.js', 'draco/draco_decoder.wasm', 'basis/basis_transcoder.js', 'basis/basis_transcoder.wasm', 'LICENSE']) assert.ok(existsSync(`dist/vendor/three/${p}`), p)
function walk(p) { return readdirSync(p, { withFileTypes: true }).flatMap((f) => f.isDirectory() ? walk(join(p, f.name)) : [join(p, f.name)]) }
assert.ok(!walk('dist').some((p) => /premium-pack|runtime-0|archive/.test(p)))
for (const p of ['index.html', 'play.html', 'game/index.html', 'mobile-v4/ios.html']) assert.ok(existsSync(`dist/dungeon-reborn/${p}`))
const manifest = JSON.parse(readFileSync('dist/warrior-asset-lab/asset-status.json', 'utf8'))
assert.equal(manifest.present, existsSync('dist/assets/characters/warrior/warrior.glb'))
console.log('BUILD_VERIFIED: /Zia/, same-origin decoders, no legacy, ' + manifest.status)
