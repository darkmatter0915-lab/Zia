import { NAV_ITEMS } from './data.js'
import { getEditorConfig, renderField } from './forms.js'
import { renderView } from './views.js'
import {
  clamp,
  downloadJSON,
  escapeAttr,
  escapeHTML,
  readTextFile,
  routeFromHash,
  todayISO,
  toNumber,
  uid,
} from './utils.js'

const VALID_ROUTES = NAV_ITEMS.map((item) => item.id)
const routeLabel = (route) => NAV_ITEMS.find((item) => item.id === route)?.label || '總覽'
const numericTypes = new Set(['number', 'range'])

export class ZiaApp {
  constructor(root, store) {
    this.root = root
    this.store = store
    this.state = store.getState()
    this.route = routeFromHash(VALID_ROUTES)
    this.taskFilter = 'open'
    this.gameFilter = 'all'
    this.tripId = this.state.travel.trips[0]?.id || ''
    this.editor = null
    this.searchOpen = false
    this.searchQuery = ''
    this.menuOpen = false
    this.deferredInstallPrompt = null
    this.unsubscribe = null
    this.clockTimer = null
    this.toastTimer = null

    this.handleClick = this.handleClick.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.handleInput = this.handleInput.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleHashChange = this.handleHashChange.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleInstallPrompt = this.handleInstallPrompt.bind(this)
  }

  mount() {
    this.root.addEventListener('click', this.handleClick)
    this.root.addEventListener('change', this.handleChange)
    this.root.addEventListener('input', this.handleInput)
    this.root.addEventListener('submit', this.handleSubmit)
    window.addEventListener('hashchange', this.handleHashChange)
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('beforeinstallprompt', this.handleInstallPrompt)
    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null
      this.say('Zia 已安裝到裝置')
      this.render()
    })

    this.unsubscribe = this.store.subscribe((state) => {
      this.state = state
      if (this.tripId && !state.travel.trips.some((trip) => trip.id === this.tripId)) {
        this.tripId = state.travel.trips[0]?.id || ''
      }
      this.applyPreferences()
      this.render()
    })

    this.applyPreferences()
    this.render()
    this.updateClock()
    this.clockTimer = window.setInterval(() => this.updateClock(), 30_000)
  }

  destroy() {
    this.root.removeEventListener('click', this.handleClick)
    this.root.removeEventListener('change', this.handleChange)
    this.root.removeEventListener('input', this.handleInput)
    this.root.removeEventListener('submit', this.handleSubmit)
    window.removeEventListener('hashchange', this.handleHashChange)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('beforeinstallprompt', this.handleInstallPrompt)
    this.unsubscribe?.()
    window.clearInterval(this.clockTimer)
    window.clearTimeout(this.toastTimer)
    this.store.destroy()
  }

  applyPreferences() {
    const { theme, accent, compact } = this.state.settings
    const html = document.documentElement
    html.dataset.theme = theme
    html.dataset.accent = accent
    html.classList.toggle('compact', Boolean(compact))

    const themeMeta = document.querySelector('meta[name="theme-color"]')
    if (themeMeta) themeMeta.content = theme === 'light' ? '#f4f4f8' : '#080b12'
  }

  handleHashChange() {
    this.route = routeFromHash(VALID_ROUTES)
    this.menuOpen = false
    this.editor = null
    this.searchOpen = false
    this.render()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  handleInstallPrompt(event) {
    event.preventDefault()
    this.deferredInstallPrompt = event
    if (this.route === 'settings') this.render()
  }

  handleKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      this.openSearch()
      return
    }

    if (event.key === 'Escape') {
      if (this.editor) {
        this.editor = null
        this.render()
      } else if (this.searchOpen) {
        this.searchOpen = false
        this.searchQuery = ''
        this.render()
      } else if (this.menuOpen) {
        this.menuOpen = false
        this.render()
      }
    }
  }

  handleClick(event) {
    const target = event.target.closest('[data-action]')
    if (!target) return

    const action = target.dataset.action
    const { id, type, route, path, label, filter } = target.dataset

    const handlers = {
      go: () => this.go(route),
      menu: () => {
        this.menuOpen = !this.menuOpen
        this.render()
      },
      closeMenu: () => {
        this.menuOpen = false
        this.render()
      },
      openSearch: () => this.openSearch(),
      closeSearch: () => {
        this.searchOpen = false
        this.searchQuery = ''
        this.render()
      },
      clearSearch: () => {
        this.searchQuery = ''
        this.renderSearchResults()
        this.root.querySelector('.search-input')?.focus()
      },
      edit: () => this.openEditor(type, id),
      closeEditor: () => {
        this.editor = null
        this.render()
      },
      delete: () => this.remove(path, id, label, route),
      taskFilter: () => {
        this.taskFilter = filter || 'open'
        this.render()
      },
      gameFilter: () => {
        this.gameFilter = filter || 'all'
        this.render()
      },
      selectTrip: () => {
        this.tripId = id
        this.render()
      },
      stock: () => this.adjustStock(id, toNumber(target.dataset.delta)),
      export: () => this.exportBackup(),
      import: () => this.root.querySelector('#importFile')?.click(),
      reset: () => this.resetData(),
      install: () => this.installApp(),
      searchResult: () => this.openSearchResult(target.dataset),
    }

    handlers[action]?.()
  }

  handleChange(event) {
    const fileInput = event.target.closest('#importFile')
    if (fileInput?.files?.[0]) {
      this.importBackup(fileInput.files[0])
      fileInput.value = ''
      return
    }

    const toggle = event.target.closest('[data-toggle]')
    if (!toggle) return

    const map = {
      task: ['tasks', '完成任務'],
      restaurantCheck: ['restaurant.checklist', '更新餐廳檢查'],
      travelCheck: ['travel.checklist', '更新旅行清單'],
      rideCheck: ['garage.checklist', '更新騎乘檢查'],
    }
    const [path, activity] = map[toggle.dataset.toggle] || []
    if (!path) return

    this.store.update((draft) => {
      const item = this.listAt(draft, path).find((entry) => entry.id === toggle.dataset.id)
      if (item) item.done = toggle.checked
    }, { text: activity, route: this.route })
  }

  handleInput(event) {
    if (!event.target.matches('.search-input')) return
    this.searchQuery = event.target.value
    this.renderSearchResults()
  }

  handleSubmit(event) {
    const form = event.target.closest('form[data-form]')
    if (!form) return
    event.preventDefault()

    const formType = form.dataset.form
    const data = Object.fromEntries(new FormData(form).entries())

    if (formType === 'quickTask') {
      const title = data.title?.trim()
      if (!title) return
      this.store.update((draft) => {
        draft.tasks.unshift({
          id: uid('task'),
          title,
          notes: '',
          due: todayISO(),
          priority: 'medium',
          area: 'personal',
          done: false,
          createdAt: new Date().toISOString(),
        })
      }, { text: `新增任務：${title}`, route: 'tasks' })
      form.reset()
      this.say('已加入今天的任務')
      return
    }

    const checklistForms = {
      restaurantCheck: ['restaurant.checklist', 'rest-check', '新增餐廳檢查', 'restaurant'],
      travelCheck: ['travel.checklist', 'travel-check', '新增旅行清單', 'travel'],
      rideCheck: ['garage.checklist', 'ride-check', '新增騎乘檢查', 'garage'],
    }

    if (checklistForms[formType]) {
      const title = data.title?.trim()
      if (!title) return
      const [path, prefix, activity, route] = checklistForms[formType]
      this.store.update((draft) => {
        this.listAt(draft, path).push({ id: uid(prefix), title, done: false })
      }, { text: `${activity}：${title}`, route })
      form.reset()
      return
    }

    if (formType === 'settings') {
      this.store.update((draft) => {
        draft.settings.name = data.name.trim() || '佐'
        draft.settings.theme = data.theme
        draft.settings.accent = data.accent
        draft.settings.currency = data.currency
        draft.settings.compact = Boolean(form.elements.compact?.checked)
      }, { text: '更新 Zia 顯示設定', route: 'settings' })
      this.say('設定已儲存')
      return
    }

    if (formType === 'editor') this.saveEditor(form)
  }

  go(route = 'overview') {
    const next = VALID_ROUTES.includes(route) ? route : 'overview'
    if (this.route === next && location.hash === `#/${next}`) {
      this.menuOpen = false
      this.render()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    location.hash = `#/${next}`
  }

  listAt(root, path) {
    return path.split('.').reduce((value, key) => value?.[key], root)
  }

  openEditor(type, id = '') {
    if (type === 'itinerary' && !this.state.travel.trips.length) {
      this.say('請先建立旅程')
      return
    }
    if (type === 'maintenance' && !this.state.garage.vehicles.length) {
      this.say('請先新增車輛')
      return
    }

    const config = getEditorConfig(this, type)
    const list = this.listAt(this.state, config.path)
    const item = id ? list?.find((entry) => entry.id === id) : null
    this.editor = { type, id, item }
    this.searchOpen = false
    this.menuOpen = false
    this.render()
    requestAnimationFrame(() => this.root.querySelector('.editor input[autofocus], .editor textarea[autofocus], .editor select[autofocus]')?.focus())
  }

  saveEditor(form) {
    const { type, id } = this.editor || {}
    if (!type) return
    const config = getEditorConfig(this, type)
    const current = id ? this.listAt(this.state, config.path)?.find((item) => item.id === id) : null
    const fields = config.fields(current || {})
    const data = Object.fromEntries(new FormData(form).entries())
    const record = { ...(current || {}) }

    for (const field of fields) {
      const raw = data[field.name] ?? ''
      record[field.name] = numericTypes.has(field.type) ? toNumber(raw) : String(raw).trim()
    }

    if (type === 'trip' && record.startDate && record.endDate && record.endDate < record.startDate) {
      this.say('旅程結束日期不能早於開始日期')
      return
    }

    record.id = current?.id || uid(type)
    if (type === 'task') {
      record.done = current?.done || false
      record.createdAt = current?.createdAt || new Date().toISOString()
    }
    if (type === 'itinerary') record.tripId = current?.tripId || this.tripId
    if (type === 'holding') record.symbol = record.symbol.toUpperCase()
    if (type === 'game') {
      record.progress = clamp(record.progress, 0, 100)
      record.rating = clamp(record.rating, 0, 10)
    }
    if (type === 'note') {
      record.tags = String(data.tags || '')
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12)
      record.updatedAt = new Date().toISOString()
    }

    if (type === 'trip' && !current) this.tripId = record.id
    this.editor = null

    this.store.update((draft) => {
      const list = this.listAt(draft, config.path)
      const index = list.findIndex((item) => item.id === record.id)
      if (index >= 0) list[index] = record
      else list.unshift(record)
    }, {
      text: `${current ? '更新' : '新增'}${config.label}：${record.title || record.name || record.symbol || record.serviceType || record.date || config.label}`,
      route: this.route,
    })

    this.say(`${config.label}已${current ? '更新' : '新增'}`)
  }

  remove(path, id, label = '項目', route = this.route) {
    if (!path || !id) return
    if (!window.confirm(`確定刪除這個${label}？`)) return

    this.store.update((draft) => {
      const list = this.listAt(draft, path)
      const index = list.findIndex((item) => item.id === id)
      if (index >= 0) list.splice(index, 1)

      if (path === 'travel.trips') {
        draft.travel.itinerary = draft.travel.itinerary.filter((item) => item.tripId !== id)
      }
      if (path === 'garage.vehicles') {
        draft.garage.logs = draft.garage.logs.filter((item) => item.vehicleId !== id)
      }
    }, { text: `刪除${label}`, route })

    this.say(`${label}已刪除`)
  }

  adjustStock(id, delta) {
    if (!delta) return
    this.store.update((draft) => {
      const item = draft.restaurant.inventory.find((entry) => entry.id === id)
      if (item) item.current = Math.max(0, toNumber(item.current) + delta)
    }, { text: '更新庫存數量', route: 'restaurant' })
  }

  openSearch() {
    this.searchOpen = true
    this.editor = null
    this.menuOpen = false
    this.render()
    requestAnimationFrame(() => this.root.querySelector('.search-input')?.focus())
  }

  searchIndex() {
    const index = []
    const add = (route, type, item, title, detail = '') => index.push({ route, type, id: item.id, title, detail })

    this.state.tasks.forEach((item) => add('tasks', 'task', item, item.title, item.notes))
    this.state.restaurant.inventory.forEach((item) => add('restaurant', 'inventory', item, item.name, `${item.current} ${item.unit}`))
    this.state.restaurant.logs.forEach((item) => add('restaurant', 'restaurantLog', item, `餐廳日報 ${item.date}`, item.notes))
    this.state.travel.trips.forEach((item) => add('travel', 'trip', item, item.name, `${item.destination} ${item.notes || ''}`))
    this.state.travel.itinerary.forEach((item) => add('travel', 'itinerary', item, item.title, `${item.place || ''} ${item.notes || ''}`))
    this.state.investments.holdings.forEach((item) => add('investments', 'holding', item, item.symbol, `${item.name || ''} ${item.note || ''}`))
    this.state.garage.vehicles.forEach((item) => add('garage', 'vehicle', item, item.name, item.note))
    this.state.garage.logs.forEach((item) => add('garage', 'maintenance', item, item.serviceType, item.notes))
    this.state.games.forEach((item) => add('games', 'game', item, item.title, `${item.platform || ''} ${item.note || ''}`))
    this.state.notes.forEach((item) => add('notes', 'note', item, item.title, `${item.tags?.join(' ') || ''} ${item.content || ''}`))
    return index
  }

  searchResults() {
    const query = this.searchQuery.trim().toLocaleLowerCase('zh-Hant')
    if (!query) return this.searchIndex().slice(0, 8)
    return this.searchIndex().filter((item) => `${item.title} ${item.detail}`.toLocaleLowerCase('zh-Hant').includes(query)).slice(0, 20)
  }

  renderSearchResults() {
    const node = this.root.querySelector('.search-results')
    if (node) node.innerHTML = this.searchResultsMarkup()
    const clear = this.root.querySelector('[data-action="clearSearch"]')
    if (clear) clear.hidden = !this.searchQuery
  }

  searchResultsMarkup() {
    const results = this.searchResults()
    return results.length ? results.map((item) => `
      <button data-action="searchResult" data-route="${escapeAttr(item.route)}" data-type="${escapeAttr(item.type)}" data-id="${escapeAttr(item.id)}">
        <i>${NAV_ITEMS.find((nav) => nav.id === item.route)?.icon || '✦'}</i>
        <span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(routeLabel(item.route))}${item.detail ? ` · ${escapeHTML(item.detail.slice(0, 90))}` : ''}</small></span>
        <em>↗</em>
      </button>
    `).join('') : '<div class="search-empty"><i>⌕</i><strong>找不到相符內容</strong><p>換一組關鍵字試試。</p></div>'
  }

  openSearchResult(data) {
    this.searchOpen = false
    this.searchQuery = ''
    const open = () => this.openEditor(data.type, data.id)
    if (this.route === data.route) open()
    else {
      location.hash = `#/${data.route}`
      window.setTimeout(open, 30)
    }
  }

  exportBackup() {
    const date = new Date().toISOString().slice(0, 10)
    downloadJSON(this.store.exportData(), `zia-backup-${date}.json`)
    this.say('備份檔已匯出')
  }

  async importBackup(file) {
    try {
      const raw = await readTextFile(file)
      const data = JSON.parse(raw)
      if (!data || typeof data !== 'object' || !data.settings || !data.tasks) throw new Error('格式不符')
      this.store.replace(data)
      this.say('備份資料已匯入')
    } catch (error) {
      console.error(error)
      this.say('匯入失敗，請確認是 Zia JSON 備份')
    }
  }

  resetData() {
    if (!window.confirm('確定重設全部資料？這個動作無法復原，建議先匯出備份。')) return
    this.store.reset()
    this.tripId = this.store.getState().travel.trips[0]?.id || ''
    this.say('Zia 已重設為初始資料')
  }

  async installApp() {
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt()
      await this.deferredInstallPrompt.userChoice
      this.deferredInstallPrompt = null
      this.render()
      return
    }

    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    this.say(isiOS ? 'iPhone：點分享，再選「加入主畫面」' : '請用瀏覽器選單的「安裝應用程式」', 5000)
  }

  say(message, duration = 2600) {
    window.clearTimeout(this.toastTimer)
    const toast = this.root.querySelector('.toast')
    if (!toast) return
    toast.textContent = message
    toast.classList.add('show')
    this.toastTimer = window.setTimeout(() => toast.classList.remove('show'), duration)
  }

  updateClock() {
    const clock = this.root.querySelector('[data-clock]')
    if (!clock) return
    clock.textContent = new Intl.DateTimeFormat('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())
  }

  renderEditor() {
    if (!this.editor) return ''
    const config = getEditorConfig(this, this.editor.type)
    const item = this.editor.item || (this.editor.id ? this.listAt(this.state, config.path)?.find((entry) => entry.id === this.editor.id) : null)
    const fields = config.fields(item || {})

    return `
      <div class="overlay" data-action="closeEditor">
        <section class="editor ${config.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="editorTitle" data-overlay-panel>
          <header>
            <div><small>${item ? 'EDIT' : 'NEW'}</small><h2 id="editorTitle">${item ? '編輯' : '新增'}${escapeHTML(config.label)}</h2></div>
            <button class="icon-button" data-action="closeEditor" aria-label="關閉">×</button>
          </header>
          <form class="form-grid" data-form="editor">
            ${fields.map((field, index) => renderField(field, index === 0)).join('')}
            <footer class="form-actions full">
              <button class="button secondary" type="button" data-action="closeEditor">取消</button>
              <button class="button primary" type="submit">儲存${escapeHTML(config.label)}</button>
            </footer>
          </form>
        </section>
      </div>
    `
  }

  renderSearch() {
    if (!this.searchOpen) return ''
    return `
      <div class="overlay search-overlay" data-action="closeSearch">
        <section class="search-dialog" role="dialog" aria-modal="true" aria-label="全域搜尋" data-overlay-panel>
          <header>
            <i>⌕</i>
            <input class="search-input" value="${escapeAttr(this.searchQuery)}" placeholder="搜尋任務、行程、持股、車輛、遊戲或筆記" autocomplete="off" />
            <button class="clear-search" data-action="clearSearch" ${this.searchQuery ? '' : 'hidden'} aria-label="清除">×</button>
            <kbd>ESC</kbd>
          </header>
          <div class="search-results">${this.searchResultsMarkup()}</div>
        </section>
      </div>
    `
  }

  renderSidebar() {
    return `
      <aside class="sidebar ${this.menuOpen ? 'open' : ''}">
        <div class="brand"><b>Z</b><span><strong>ZIA</strong><small>PERSONAL OS</small></span></div>
        <button class="sidebar-create" data-action="edit" data-type="task"><i>＋</i><span>快速新增任務</span></button>
        <nav>
          ${NAV_ITEMS.map((item) => `
            <button class="${this.route === item.id ? 'active' : ''}" data-action="go" data-route="${escapeAttr(item.id)}">
              <i>${item.icon}</i><span>${escapeHTML(item.label)}</span>
            </button>
          `).join('')}
        </nav>
        <footer><span class="status-dot"></span><div><strong>LOCAL FIRST</strong><small>資料保存在這台裝置</small></div></footer>
      </aside>
      ${this.menuOpen ? '<button class="menu-scrim" data-action="closeMenu" aria-label="關閉選單"></button>' : ''}
    `
  }

  renderMobileNav() {
    return `
      <nav class="mobile-nav" aria-label="主要選單">
        ${NAV_ITEMS.map((item) => `
          <button class="${this.route === item.id ? 'active' : ''}" data-action="go" data-route="${escapeAttr(item.id)}">
            <i>${item.icon}</i><span>${escapeHTML(item.label)}</span>
          </button>
        `).join('')}
      </nav>
    `
  }

  render() {
    this.root.innerHTML = `
      <div class="app-shell">
        ${this.renderSidebar()}
        <div class="workspace">
          <header class="topbar">
            <button class="menu-button" data-action="menu" aria-label="開啟選單">☰</button>
            <div class="route-title"><small>ZIA / ${escapeHTML(this.route.toUpperCase())}</small><strong>${escapeHTML(routeLabel(this.route))}</strong></div>
            <div class="top-actions">
              <time data-clock></time>
              <button class="search-button" data-action="openSearch"><i>⌕</i><span>搜尋</span><kbd>⌘K</kbd></button>
              <button class="avatar" data-action="go" data-route="settings" aria-label="設定">${escapeHTML((this.state.settings.name || '佐').slice(0, 1))}</button>
            </div>
          </header>
          <main class="content">${renderView(this)}</main>
        </div>
        ${this.renderMobileNav()}
      </div>
      ${this.renderEditor()}
      ${this.renderSearch()}
      <div class="toast" role="status" aria-live="polite"></div>
    `

    this.root.querySelectorAll('[data-overlay-panel]').forEach((panel) => {
      panel.addEventListener('click', (event) => event.stopPropagation())
    })
    this.updateClock()
  }
}
