import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

test('activation removes only stale Zia caches', async () => {
  const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
  const listeners = new Map()
  const deleted = []
  const cacheNames = ['zia-runtime-v0', 'zia-runtime-v1', 'another-app-v3']

  const self = {
    registration: { scope: 'https://example.test/Zia/' },
    location: { origin: 'https://example.test' },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
  }
  const caches = {
    keys: async () => cacheNames,
    delete: async (name) => {
      deleted.push(name)
      return true
    },
  }

  vm.runInNewContext(source, { URL, self, caches })

  let activation
  listeners.get('activate')({ waitUntil: (promise) => { activation = promise } })
  await activation

  assert.deepEqual(deleted, ['zia-runtime-v0'])
})
