import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createDefaultState, APP_SCHEMA_VERSION } from '../src/data.js'
import { agenda, renderHome } from '../src/workspace-home.js'
import { todayISO, STORAGE_KEY } from '../src/utils.js'

const fixture = () => {
  const state = createDefaultState()
  state.tasks = [
    { id: 'old', title: 'Overdue', due: '2000-01-01', done: false, priority: 'low' },
    { id: 'today', title: 'Today', due: todayISO(), done: false, priority: 'high' },
    { id: 'future', title: 'Future', due: '2099-01-01', done: false },
    { id: 'nodate', title: 'No date', due: '', done: false },
    { id: 'done', title: 'Done', due: todayISO(), done: true },
  ]
  return state
}
test('Focus includes overdue and today, not future or completed tasks', () => {
  assert.deepEqual(agenda(fixture()).map(t => t.id), ['old', 'today'])
})
test('Today filter excludes overdue items', () => {
  assert.deepEqual(agenda(fixture(), 'today').map(t => t.id), ['today'])
})
test('All open tasks includes undated tasks last', () => {
  assert.deepEqual(agenda(fixture(), 'all').map(t => t.id), ['old', 'today', 'future', 'nodate'])
})
test('Rendering never mutates saved records', () => {
  const state = fixture(), before = JSON.stringify(state)
  renderHome({ state, homeFilter: 'all' })
  assert.equal(JSON.stringify(state), before)
})
test('User titles and attribute values are escaped', () => {
  const state = fixture()
  state.settings.name = '<script>alert(1)</script>'
  state.tasks[0].title = '<img src=x onerror=alert(1)>'
  state.tasks[0].id = '" onclick="alert(1)'
  const html = renderHome({ state })
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('<img src=x'))
  assert.ok(html.includes('&lt;img'))
  assert.ok(!html.includes('data-id="" onclick='))
})
test('Empty collections render without false portfolio values', () => {
  const state = createDefaultState()
  state.tasks = []; state.restaurant.inventory = []; state.restaurant.checklist = []
  state.travel.trips = []; state.games = []; state.notes = []; state.activity = []
  const html = renderHome({ state })
  assert.ok(html.includes('尚未建立庫存品項'))
  assert.ok(html.includes('沒有待辦'))
  assert.ok(!html.includes('NaN'))
})
test('Storage schema and key remain unchanged', () => {
  assert.equal(APP_SCHEMA_VERSION, 1)
  assert.equal(STORAGE_KEY, 'zia-control-center-v1')
})
test('Service worker preserves unrelated caches and independent routes', () => {
  const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
  assert.ok(sw.includes("key.startsWith('zia-runtime-')"))
  assert.ok(sw.includes('dungeon-reborn|warrior-asset-lab'))
})
