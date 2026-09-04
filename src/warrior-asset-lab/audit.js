import { Vector3, Quaternion, PropertyBinding, AnimationMixer, LoopRepeat, LoopOnce } from 'three'

export const NAMES = ['Idle', 'Run', 'Attack1', 'Attack2', 'Attack3', 'Dodge', 'Hit', 'Death']
const normalize = (name) => String(name || '').toLowerCase().replace(/[ _-]/g, '')

export function strictAnimationMap(clips) {
  const map = new Map()
  for (const name of NAMES) {
    const matches = clips.filter((clip) => normalize(clip.name) === normalize(name))
    if (matches.length !== 1) continue
    const clip = matches[0]
    if (!Number.isFinite(clip.duration) || clip.duration <= 0 || !clip.tracks.length || !clip.validate()) continue
    map.set(name, { clip, loop: name === 'Idle' || name === 'Run' })
  }
  return map
}

// This samples Root and its ancestors, never assumes that an unidentified rig is in-place.
export function auditRootMotion(root, clips) {
  root.updateMatrixWorld(true)
  const node = root.getObjectByName('Root') || root.getObjectByName('Warrior_Root')
  const result = { maxHorizontalDrift: null, maxRotation: null, inspectedTracks: 0, unresolved: 0, clipDetails: [], state: 'warn' }
  if (!node || !clips.length) return result
  const targets = new Set()
  for (let current = node; current; current = current.parent) { targets.add(current); if (current === root) break }
  let maxScale = 0
  result.maxHorizontalDrift = 0
  result.maxRotation = 0
  for (const clip of clips) {
    let drift = 0, rotation = 0, count = 0
    for (const track of clip.tracks) {
      let parsed, target
      try { parsed = PropertyBinding.parseTrackName(track.name); target = PropertyBinding.findNode(root, parsed.nodeName) }
      catch { result.unresolved++; continue }
      if (!target) { result.unresolved++; continue }
      if (!targets.has(target) || !['position', 'quaternion', 'scale'].includes(parsed.propertyName)) continue
      if (!track.validate()) { result.unresolved++; continue }
      count++; result.inspectedTracks++
      const interpolant = track.createInterpolant()
      const first = Array.from(interpolant.evaluate(0))
      const times = new Set(track.times)
      const samples = Math.min(600, Math.max(2, Math.ceil(clip.duration * 60)))
      for (let i = 0; i <= samples; i++) times.add(clip.duration * i / samples)
      for (const time of times) {
        const value = interpolant.evaluate(time)
        if (![...value].every(Number.isFinite)) { result.unresolved++; break }
        if (parsed.propertyName === 'position') {
          const delta = new Vector3(value[0] - first[0], value[1] - first[1], value[2] - first[2])
          if (target.parent) delta.applyMatrix4(target.parent.matrixWorld).sub(new Vector3().applyMatrix4(target.parent.matrixWorld))
          drift = Math.max(drift, Math.hypot(delta.x, delta.z))
        } else if (parsed.propertyName === 'quaternion') {
          rotation = Math.max(rotation, new Quaternion().fromArray(first).angleTo(new Quaternion().fromArray(value)))
        } else maxScale = Math.max(maxScale, ...Array.from(value).slice(0, 3).map((v, i) => Math.abs(v - first[i])))
      }
    }
    result.maxHorizontalDrift = Math.max(result.maxHorizontalDrift, drift)
    result.maxRotation = Math.max(result.maxRotation, rotation)
    result.clipDetails.push({ name: clip.name, drift, rotation, trackCount: count })
  }
  result.state = result.maxHorizontalDrift > 0.02 || result.maxRotation > Math.PI / 180 || maxScale > 0.001 ? 'fail' : result.unresolved ? 'warn' : 'pass'
  return result
}

export function createAnimationController(root, map, onChange = () => {}) {
  const mixer = new AnimationMixer(root), actions = new Map()
  let current = null, retired = []
  for (const [name, entry] of map) {
    const action = mixer.clipAction(entry.clip)
    action.setLoop(entry.loop ? LoopRepeat : LoopOnce, entry.loop ? Infinity : 1)
    action.clampWhenFinished = !entry.loop
    actions.set(name, action)
  }
  function play(name, fade = 0.16) {
    const next = actions.get(name)
    if (!next) return false
    if (current === name && next.isRunning()) return true
    const previous = actions.get(current)
    retired = retired.filter((item) => item.action !== next)
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play()
    if (previous && previous !== next) {
      previous.crossFadeTo(next, fade, false)
      retired.push({ action: previous, remaining: fade })
    }
    current = name; onChange(name); return true
  }
  function finished(event) {
    if (event.action === actions.get(current) && current !== 'Death' && actions.has('Idle')) play('Idle')
  }
  mixer.addEventListener('finished', finished)
  return {
    mixer, actions, play,
    get current() { return current },
    update(delta) {
      mixer.update(delta)
      retired = retired.filter((item) => {
        item.remaining -= delta
        if (item.remaining > 0) return true
        if (item.action !== actions.get(current)) item.action.stop()
        return false
      })
    },
    dispose() { mixer.removeEventListener('finished', finished); mixer.stopAllAction(); mixer.uncacheRoot(root); retired = [] },
  }
}

export function attachTouchDiagnostic(left, right, output) {
  const active = new Map(), abort = new AbortController(), options = { signal: abort.signal }
  function render() {
    const sides = new Set(active.values())
    output.textContent = `DEBUG TOUCH: ${active.size} | L:${Number(sides.has('L'))} R:${Number(sides.has('R'))}`
    for (const [node, side] of [[left, 'L'], [right, 'R']]) node.classList.toggle('pressed', sides.has(side))
  }
  function clear() { active.clear(); render() }
  for (const [node, side] of [[left, 'L'], [right, 'R']]) {
    node.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      if (event.pointerType === 'mouse' && event.button !== 0) return
      active.set(event.pointerId, side)
      node.setPointerCapture(event.pointerId)
      render()
    }, options)
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) node.addEventListener(type, (event) => { active.delete(event.pointerId); render() }, options)
  }
  window.addEventListener('blur', clear, options)
  window.addEventListener('pagehide', clear, options)
  window.addEventListener('orientationchange', clear, options)
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear() }, options)
  render()
  return { clear, dispose() { clear(); abort.abort() } }
}
