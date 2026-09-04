import { ZiaApp } from './app.js'
import { NAV_ITEMS } from './data.js'
import { renderView } from './views.js'
import { escapeHTML as h, escapeAttr as a } from './utils.js'
import { icon } from './workspace-icons.js'
import { renderHome } from './workspace-home.js'

const primaryRoutes = ['overview', 'tasks', 'restaurant', 'travel']
const routeLabel = route => NAV_ITEMS.find(item => item.id === route)?.label || '總覽'
const focusable = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]'
function focusKey(node) {
  if (!node || node === document.body) return null
  return { id: node.id, name: node.getAttribute('name'), action: node.dataset?.action, type: node.dataset?.type, item: node.dataset?.id, route: node.dataset?.route, toggle: node.dataset?.toggle, filter: node.dataset?.filter }
}
function findFocus(root, key) {
  if (!key) return null
  return [...root.querySelectorAll(focusable)].find(node => {
    if (key.id) return node.id === key.id
    if (key.name) return node.getAttribute('name') === key.name
    if (key.toggle) return node.dataset.toggle === key.toggle && node.dataset.id === key.item
    return key.action && node.dataset.action === key.action && node.dataset.type === key.type && node.dataset.id === key.item && node.dataset.route === key.route && node.dataset.filter === key.filter
  })
}

/** Presentation layer only. Existing CRUD, storage keys and data schema remain intact. */
export class WorkspaceApp extends ZiaApp {
  applyPreferences() {
    super.applyPreferences()
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.content = this.state.settings.theme === 'light' ? '#f5f5f2' : '#111315'
  }
  async importBackup(file) {
    if (!window.confirm('匯入會取代目前資料。請先匯出備份；確定繼續匯入？')) return
    return super.importBackup(file)
  }
  openEditor(type, id = '') {
    this.returnFocus = focusKey(document.activeElement)
    this.editorDirty = false
    super.openEditor(type, id)
  }
  openSearch() {
    this.returnFocus = focusKey(document.activeElement)
    super.openSearch()
  }
  handleInput(event) {
    if (event.target.closest('.editor')) this.editorDirty = true
    super.handleInput(event)
  }
  handleChange(event) {
    if (event.target.closest('.editor')) this.editorDirty = true
    super.handleChange(event)
  }
  allowClose() {
    return !this.editorDirty || window.confirm('尚有未儲存的內容，確定離開？')
  }
  handleClick(event) {
    const trigger = event.target.closest('[data-action]')
    if (!trigger) return
    // Keep delegated button actions working inside dialogs; only the backdrop closes them.
    if (trigger.classList.contains('overlay') && event.target.closest('[data-overlay-panel]')) return
    if (trigger.dataset.action === 'closeEditor' && !this.allowClose()) return
    if (trigger.dataset.action === 'clearSearch') {
      this.searchQuery = ''
      const input = this.root.querySelector('.search-input')
      if (input) input.value = ''
      this.renderSearchResults()
      input?.focus()
      return
    }
    if (trigger.dataset.action === 'homeFilter') {
      this.homeFilter = ['focus', 'today', 'all'].includes(trigger.dataset.filter) ? trigger.dataset.filter : 'focus'
      this.render()
      return
    }
    if (trigger.dataset.action === 'toggleTheme') {
      this.store.update(draft => { draft.settings.theme = draft.settings.theme === 'light' ? 'dark' : 'light' })
      return
    }
    if (trigger.dataset.action === 'menu') this.returnFocus = focusKey(trigger)
    super.handleClick(event)
  }
  handleKeyDown(event) {
    const panel = this.root.querySelector('[role="dialog"]')
    if (event.key === 'Tab' && panel) {
      const nodes = [...panel.querySelectorAll(focusable)].filter(node => node.getClientRects().length && !node.closest('[hidden]'))
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    if (event.key === 'Escape' && this.editor && !this.allowClose()) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && this.editor && !this.allowClose()) return
    super.handleKeyDown(event)
  }
  renderSidebar() {
    const groups = [['日常', ['overview', 'tasks', 'restaurant']], ['生活', ['travel', 'investments', 'garage', 'games']], ['工作區', ['notes', 'settings']]]
    const modal = this.menuOpen && window.matchMedia('(max-width: 760px)').matches
    return `<aside id="workspaceMenu" class="sidebar ws-sidebar ${this.menuOpen ? 'open' : ''}" ${modal ? 'role="dialog" aria-modal="true" aria-label="所有工作區"' : ''}>
      <div class="brand"><b>Z</b><span><strong>Zia<span class="ws-brand-dot">.</span></strong><small>你的日常工作台</small></span><button class="icon-button ws-menu-close" data-action="closeMenu" aria-label="關閉選單">${icon('close')}</button></div>
      <button class="sidebar-create" data-action="edit" data-type="task">${icon('plus')}<span>新增任務</span><kbd>＋</kbd></button>
      <nav aria-label="所有工作區">${groups.map(([title, routes]) => `<span class="ws-nav-label">${title}</span>${routes.map(route => `<button class="${this.route === route ? 'active' : ''}" data-action="go" data-route="${route}" ${this.route === route ? 'aria-current="page"' : ''}>${icon(route)}<span>${h(routeLabel(route))}</span>${route === 'tasks' ? `<b class="ws-nav-count">${this.state.tasks.filter(t => !t.done).length}</b>` : ''}</button>`).join('')}`).join('')}</nav>
      <div class="ws-sidebar-backup">${icon('shield')}<strong>只在你的裝置上</strong><p>定期備份，重要紀錄不遺失。</p><button data-action="export">${icon('backup')}匯出備份</button></div>
      <footer><span class="status-dot"></span><div><strong>WORKSPACE 2.0</strong><small>本機優先 · 無雲端同步</small></div></footer>
    </aside>${this.menuOpen ? '<button class="menu-scrim" data-action="closeMenu" aria-label="關閉選單"></button>' : ''}`
  }
  renderMobileNav() {
    return `<nav class="mobile-nav ws-mobile-nav" aria-label="常用功能">${primaryRoutes.map(route => `<button class="${this.route === route && !this.menuOpen ? 'active' : ''}" data-action="go" data-route="${route}" ${this.route === route ? 'aria-current="page"' : ''}>${icon(route)}<span>${h(routeLabel(route))}</span></button>`).join('')}<button class="${this.menuOpen || !primaryRoutes.includes(this.route) ? 'active' : ''}" data-action="menu" aria-controls="workspaceMenu" aria-expanded="${Boolean(this.menuOpen)}">${icon('more')}<span>更多</span></button></nav>`
  }
  render() {
    const previousFocus = focusKey(document.activeElement)
    const activeModal = this.editor ? `editor:${this.editor.type}:${this.editor.id || ''}` : this.searchOpen ? 'search' : this.menuOpen ? 'menu' : ''
    const formBefore = this.root.querySelector('form[data-form="editor"]')
    const draft = formBefore && activeModal === this.previousModal ? new FormData(formBefore) : null
    const selection = typeof document.activeElement?.selectionStart === 'number'
      ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null
    const changedModal = activeModal !== this.previousModal
    const closedModal = Boolean(this.previousModal && !activeModal)
    const dark = this.state.settings.theme !== 'light'
    const storage = this.store.storageStatus()
    this.root.dataset.workspaceVersion = '2.0'
    document.title = `${routeLabel(this.route)} · Zia`
    this.root.innerHTML = `<a href="#mainContent" class="ws-skip">跳至主要內容</a><div class="app-shell">
      ${this.renderSidebar()}
      <div class="workspace"><header class="topbar ws-topbar">
        <div class="ws-breadcrumb"><span>Zia</span><b>/</b><strong>${h(routeLabel(this.route))}</strong></div>
        <div class="top-actions"><span class="ws-local-status"><span class="status-dot"></span>本機模式</span><button class="search-button" data-action="openSearch" aria-label="搜尋所有資料">${icon('search')}<span>搜尋工作區</span><kbd>⌘ K</kbd></button><button class="icon-button ws-theme" data-action="toggleTheme" aria-label="切換至${dark ? '淺色' : '深色'}模式">${icon(dark ? 'sun' : 'moon')}</button><button class="avatar" data-action="go" data-route="settings" aria-label="個人設定">${h((this.state.settings.name || '佐').slice(0, 1))}</button></div>
      </header><main id="mainContent" tabindex="-1" class="content" data-route="${a(this.route)}">${!storage.available ? '<div class="ws-storage-warning" role="alert">無法寫入本機儲存，請立即匯出備份。<button data-action="export">匯出備份</button></div>' : ''}${this.route === 'overview' ? renderHome(this) : renderView(this)}</main></div>${this.renderMobileNav()}</div>${this.renderEditor()}${this.renderSearch()}<div class="toast" role="status" aria-live="polite"></div>`
    if (draft) {
      const form = this.root.querySelector('form[data-form="editor"]')
      for (const [name, value] of draft) {
        const field = form?.elements.namedItem(name)
        if (field && 'value' in field) field.value = value
      }
    }
    const titles = { tasks: '任務清單', restaurant: '餐廳營運', travel: '旅遊計畫', investments: '投資追蹤', garage: '車庫管理', games: '遊戲清單', notes: '筆記工作區', settings: '偏好設定' }
    const title = this.root.querySelector('.page-intro h2')
    if (title && titles[this.route]) title.textContent = titles[this.route]
    const skip = this.root.querySelector('.ws-skip')
    skip.addEventListener('click', event => { event.preventDefault(); this.root.querySelector('main').focus() })
    this.root.querySelectorAll('.row-actions [data-action="edit"]').forEach(button => { button.innerHTML = icon('edit') })
    this.root.querySelectorAll('.row-actions [data-action="delete"], .editor [data-action="closeEditor"].icon-button').forEach(button => { button.innerHTML = icon('close') })
    this.root.querySelectorAll('.check-control input:not([aria-label])').forEach(input => {
      const row = input.closest('.data-row, .checklist-row')
      input.setAttribute('aria-label', `標記完成：${row?.querySelector('strong')?.textContent || '清單項目'}`)
    })
    this.root.querySelectorAll('.stepper').forEach(stepper => {
      const name = stepper.closest('.inventory-row')?.querySelector('.row-main strong')?.textContent || '庫存'
      stepper.querySelectorAll('button').forEach(button => { button.setAttribute('aria-label', `${Number(button.dataset.delta) > 0 ? '增加' : '減少'}${name}`) })
    })
    this.root.querySelectorAll('.filter-chip').forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('active'))))
    const search = this.root.querySelector('.search-dialog')
    if (search) {
      search.querySelector('input').setAttribute('aria-label', '搜尋所有資料')
      search.querySelector('header > i').innerHTML = icon('search')
      search.querySelector('kbd').outerHTML = `<button class="icon-button" data-action="closeSearch" aria-label="關閉搜尋">${icon('close')}</button>`
    }
    const modal = this.root.querySelector('.overlay')
    const menuDialog = this.root.querySelector('.ws-sidebar[role="dialog"]')
    if (modal) this.root.querySelector('.app-shell').inert = true
    else if (menuDialog) {
      this.root.querySelector('.workspace').inert = true
      this.root.querySelector('.mobile-nav').inert = true
    }
    document.body.classList.toggle('ws-dialog-open', Boolean(modal || menuDialog))
    this.previousModal = activeModal
    queueMicrotask(() => {
      if (changedModal && activeModal) {
        const panel = this.root.querySelector('[role="dialog"]')
        ;(panel?.querySelector('[autofocus], .search-input') || panel?.querySelector(focusable))?.focus()
      } else {
        const target = findFocus(this.root, closedModal ? this.returnFocus : previousFocus)
        if (target && !target.closest('[inert]')) {
          target.focus({ preventScroll: true })
          if (selection && typeof target.setSelectionRange === 'function') {
            try { target.setSelectionRange(...selection) } catch { /* Numeric inputs do not support selection. */ }
          }
        }
      }
    })
  }
  destroy() {
    document.body.classList.remove('ws-dialog-open')
    super.destroy()
  }
}
