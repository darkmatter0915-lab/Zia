import test from 'node:test'
import assert from 'node:assert/strict'
import { Group, Object3D, AnimationClip, VectorKeyframeTrack, QuaternionKeyframeTrack } from 'three'
import { NAMES, strictAnimationMap, auditRootMotion, createAnimationController } from '../../src/warrior-asset-lab/audit.js'
import { inspectGlb, readManifest, AssetError, ASSET_PATH } from '../../src/warrior-asset-lab/asset-io.js'
// Logic fixtures only: no Mesh, no fake character and no exported GLB.
function rig() { const scene = new Group(); scene.name = 'Warrior'; const root = new Object3D(); root.name = 'Root'; scene.add(root); scene.updateMatrixWorld(true); return scene }
function clip(name, track = new VectorKeyframeTrack('Root.position', [0, 1], [0, 0, 0, 0, 0, 0])) { return new AnimationClip(name, 1, [track]) }
test('all exact clip names map', () => assert.equal(strictAnimationMap(NAMES.map((n) => clip(n))).size, 8))
test('separator alias maps', () => assert.ok(strictAnimationMap([clip('Attack_1')]).has('Attack1')))
test('substrings rejected', () => assert.equal(strictAnimationMap([clip('White'), clip('RunAttack'), clip('Attack10')]).size, 0))
test('ambiguous duplicate rejected', () => assert.equal(strictAnimationMap([clip('Idle'), clip('idle')]).size, 0))
test('empty clip rejected', () => assert.equal(strictAnimationMap([new AnimationClip('Idle', 1, [])]).size, 0))
test('Death holds final pose', () => { const a = createAnimationController(rig(), strictAnimationMap([clip('Idle'), clip('Death')])); a.play('Death'); a.update(2); assert.equal(a.current, 'Death'); a.dispose() })
test('Attack returns to Idle', () => { const a = createAnimationController(rig(), strictAnimationMap([clip('Idle'), clip('Attack1')])); a.play('Attack1'); a.update(2); assert.equal(a.current, 'Idle'); a.dispose() })
test('unknown root cannot pass', () => assert.equal(auditRootMotion(new Group(), [clip('Idle')]).state, 'warn'))
test('known static root passes technical sampling', () => assert.equal(auditRootMotion(rig(), [clip('Idle')]).state, 'pass'))
test('root displacement fails', () => assert.equal(auditRootMotion(rig(), [clip('Run', new VectorKeyframeTrack('Root.position', [0, 1], [0, 0, 0, 1, 0, 0]))]).state, 'fail'))
test('ancestor displacement fails', () => assert.equal(auditRootMotion(rig(), [clip('Run', new VectorKeyframeTrack('Warrior.position', [0, 1], [0, 0, 0, 0, 0, 1]))]).state, 'fail'))
test('root rotation fails', () => assert.equal(auditRootMotion(rig(), [clip('Dodge', new QuaternionKeyframeTrack('Root.quaternion', [0, 1], [0, 0, 0, 1, 0, 1, 0, 0]))]).state, 'fail'))
test('unresolved target needs review', () => assert.equal(auditRootMotion(rig(), [clip('Run', new VectorKeyframeTrack('Missing.position', [0, 1], [0, 0, 0, 0, 0, 0]))]).state, 'warn'))
test('HTML is not GLB', () => assert.throws(() => inspectGlb(new TextEncoder().encode('<html>Not a GLB file.</html>').buffer), AssetError))
test('truncated bytes rejected', () => assert.throws(() => inspectGlb(new ArrayBuffer(8)), AssetError))
test('absence is explicit and only one request', async (t) => { let n = 0; t.mock.method(globalThis, 'fetch', async () => { n++; return new Response(JSON.stringify({ path: ASSET_PATH, present: false })) }); assert.equal((await readManifest('/Zia/', new AbortController().signal)).present, false); assert.equal(n, 1) })
test('HTTP500 is not missing', async (t) => { t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 500 })); await assert.rejects(readManifest('/Zia/', new AbortController().signal), (e) => e.code === 'ASSET_HTTP_ERROR') })
test('offline is not missing', async (t) => { t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline') }); await assert.rejects(readManifest('/Zia/', new AbortController().signal), (e) => e.code === 'ASSET_NETWORK_ERROR') })
