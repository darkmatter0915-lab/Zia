import test from 'node:test'
import assert from 'node:assert/strict'
import { ZiaApp } from '../src/app.js'

function actionTarget(action, { overlay = false } = {}) {
  const target = {
    dataset: { action },
    matches(selector) {
      return overlay && selector === '.overlay[data-action]'
    },
  }
  target.closest = () => target
  return target
}

function appWithOpenEditor() {
  return {
    editor: { type: 'task' },
    renderCount: 0,
    render() {
      this.renderCount += 1
    },
  }
}

test('clicking editor content does not trigger the backdrop action', () => {
  const app = appWithOpenEditor()
  const overlay = actionTarget('closeEditor', { overlay: true })
  const innerContent = { closest: () => overlay }

  ZiaApp.prototype.handleClick.call(app, { target: innerContent })

  assert.deepEqual(app.editor, { type: 'task' })
  assert.equal(app.renderCount, 0)
})

test('an action inside the editor reaches the delegated click handler', () => {
  const app = appWithOpenEditor()
  const closeButton = actionTarget('closeEditor')

  ZiaApp.prototype.handleClick.call(app, { target: closeButton })

  assert.equal(app.editor, null)
  assert.equal(app.renderCount, 1)
})

test('clicking the backdrop still closes the editor', () => {
  const app = appWithOpenEditor()
  const overlay = actionTarget('closeEditor', { overlay: true })

  ZiaApp.prototype.handleClick.call(app, { target: overlay })

  assert.equal(app.editor, null)
  assert.equal(app.renderCount, 1)
})
