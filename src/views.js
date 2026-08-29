import {
  AREA_LABELS,
  GAME_STATUS_LABELS,
  NAV_ITEMS,
  PRIORITY_LABELS,
  TRIP_STATUS_LABELS,
} from './data.js'
import {
  bytesLabel,
  calculateTripSpent,
  clamp,
  escapeAttr,
  escapeHTML,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  isOverdue,
  todayISO,
  toNumber,
} from './utils.js'

const priorityOrder = { high: 0, medium: 1, low: 2 }
const descriptions = {
  tasks: '期限、分類與優先順序',
  restaurant: '日報、檢查與庫存',
  travel: '旅程、預算與行程',
  investments: '手動持股與損益',
  garage: '里程、保養與騎乘',
  games: '遊玩進度與待玩清單',
  notes: '想法、資料與靈感',
}

const percent = (done, total) => total ? Math.round((done / total) * 100) : 0

const sortTasks = (tasks) => [...tasks].sort((a, b) => {
  if (a.done !== b.done) return Number(a.done) - Number(b.done)
  const dateCompare = (a.due || '9999-12-31').localeCompare(b.due || '9999-12-31')
  if (dateCompare) return dateCompare
  return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
})

function intro(title, description, type, label = '新增') {
  return `
    <header class="page-intro">
      <div>
        <h2>${escapeHTML(title)}</h2>
        <p>${escapeHTML(description)}</p>
      </div>
      ${type ? `
        <button class="button primary" data-action="edit" data-type="${escapeAttr(type)}">
          <span aria-hidden="true">＋</span>${escapeHTML(label)}
        </button>
      ` : ''}
    </header>
  `
}

function panelTitle(kicker, title, action = '') {
  return `
    <header class="panel-title">
      <div><small>${escapeHTML(kicker)}</small><h3>${escapeHTML(title)}</h3></div>
      ${action}
    </header>
  `
}

function stat(label, value, detail, icon = '✦', warning = false) {
  return `
    <article class="stat-card ${warning ? 'warning' : ''}">
      <i aria-hidden="true">${icon}</i>
      <small>${escapeHTML(label)}</small>
      <strong>${escapeHTML(String(value))}</strong>
      <span>${escapeHTML(detail)}</span>
    </article>
  `
}

function empty(title, description, type, label = '新增') {
  return `
    <div class="empty-state">
      <i aria-hidden="true">✦</i>
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(description)}</p>
      ${type ? `<button class="button secondary" data-action="edit" data-type="${escapeAttr(type)}">${escapeHTML(label)}</button>` : ''}
    </div>
  `
}

function rowActions(type, id, path, label, route) {
  return `
    <div class="row-actions">
      <button class="icon-button small" data-action="edit" data-type="${escapeAttr(type)}" data-id="${escapeAttr(id)}" aria-label="編輯${escapeAttr(label)}">✎</button>
      <button class="icon-button small danger" data-action="delete" data-path="${escapeAttr(path)}" data-id="${escapeAttr(id)}" data-label="${escapeAttr(label)}" data-route="${escapeAttr(route)}" aria-label="刪除${escapeAttr(label)}">×</button>
    </div>
  `
}

function taskRow(task, compact = false) {
  const overdue = isOverdue(task.due, task.done)
  return `
    <article class="data-row task-row ${task.done ? 'done' : ''}">
      <label class="check-control" title="${task.done ? '重新開啟' : '標記完成'}">
        <input type="checkbox" data-toggle="task" data-id="${escapeAttr(task.id)}" ${task.done ? 'checked' : ''} />
        <i></i>
      </label>
      <div class="row-main">
        <div class="title-line">
          <strong>${escapeHTML(task.title)}</strong>
          <em class="priority ${escapeAttr(task.priority)}">${escapeHTML(PRIORITY_LABELS[task.priority] || task.priority)}</em>
        </div>
        ${!compact && task.notes ? `<p>${escapeHTML(task.notes)}</p>` : ''}
        <small>
          ${escapeHTML(AREA_LABELS[task.area] || task.area || '個人')}
          <span>·</span>
          <b class="${overdue ? 'negative' : ''}">${escapeHTML(task.due ? formatDate(task.due, { year: undefined }) : '無期限')}</b>
        </small>
      </div>
      ${rowActions('task', task.id, 'tasks', '任務', 'tasks')}
    </article>
  `
}

function checklist(items, toggleType, path, label, route, formType) {
  return `
    <div class="checklist">
      ${items.map((item) => `
        <div class="checklist-row ${item.done ? 'done' : ''}">
          <label class="check-control">
            <input type="checkbox" data-toggle="${escapeAttr(toggleType)}" data-id="${escapeAttr(item.id)}" ${item.done ? 'checked' : ''} />
            <i></i>
          </label>
          <strong>${escapeHTML(item.title)}</strong>
          <button class="tiny-delete" data-action="delete" data-path="${escapeAttr(path)}" data-id="${escapeAttr(item.id)}" data-label="${escapeAttr(label)}" data-route="${escapeAttr(route)}" aria-label="刪除">×</button>
        </div>
      `).join('')}
    </div>
    <form class="inline-add" data-form="${escapeAttr(formType)}">
      <input name="title" placeholder="新增清單項目" maxlength="120" required />
      <button type="submit" aria-label="新增">＋</button>
    </form>
  `
}

function portfolioTotals(state) {
  const total = state.investments.holdings.reduce((result, holding) => {
    const shares = toNumber(holding.shares)
    const averageCost = toNumber(holding.averageCost)
    const currentPrice = toNumber(holding.currentPrice)
    if (shares <= 0 || averageCost <= 0 || currentPrice <= 0) return result

    result.cost += shares * averageCost
    result.value += shares * currentPrice
    result.valid += 1
    return result
  }, { cost: 0, value: 0, valid: 0 })

  total.profit = total.value - total.cost
  total.rate = total.cost ? (total.profit / total.cost) * 100 : 0
  return total
}

function renderOverview(app) {
  const { state } = app
  const openTasks = state.tasks.filter((task) => !task.done)
  const todayTasks = sortTasks(openTasks.filter((task) => task.due === todayISO()))
  const checks = state.restaurant.checklist
  const checksDone = checks.filter((item) => item.done).length
  const lowStock = state.restaurant.inventory.filter((item) => toNumber(item.current) <= toNumber(item.minimum)).length
  const portfolio = portfolioTotals(state)
  const hour = new Date().getHours()
  const greeting = hour < 5 ? '夜深了，留一點餘裕' : hour < 11 ? '早安，先抓住今天' : hour < 18 ? '今天保持節奏' : '收束今天，留下餘裕'

  return `
    <section class="page-stack">
      <article class="hero-card">
        <div class="hero-copy">
          <small>${escapeHTML(greeting)}</small>
          <h2>${escapeHTML(state.settings.name)}，今天先處理最重要的事。</h2>
          <p>任務、店務、旅行、投資與生活紀錄，都收進同一個駕駛艙。</p>
        </div>
        <form class="quick-add" data-form="quickTask">
          <label for="quickTask">快速加入今天</label>
          <div>
            <input id="quickTask" name="title" placeholder="輸入任務後按 Enter" maxlength="120" required />
            <button class="button primary" type="submit">加入</button>
          </div>
        </form>
      </article>

      <section class="stats-grid">
        ${stat('待辦任務', openTasks.length, `${todayTasks.length} 項在今天`, '✓')}
        ${stat('餐廳檢查', `${percent(checksDone, checks.length)}%`, lowStock ? `${lowStock} 項低庫存` : '庫存狀態正常', '♨', lowStock > 0)}
        ${stat('旅行計畫', state.travel.trips.length, `${state.travel.itinerary.length} 個行程項目`, '✈')}
        ${stat('投資損益', portfolio.valid ? formatCurrency(portfolio.profit, state.settings.currency) : '待輸入', portfolio.valid ? `報酬 ${portfolio.rate.toFixed(1)}%` : '手動更新現價', '↗', portfolio.profit < 0)}
      </section>

      <section class="dashboard-grid">
        <article class="panel span-7">
          ${panelTitle('FOCUS', '今天的重點', '<button class="text-button" data-action="go" data-route="tasks">查看全部</button>')}
          <div class="rows">
            ${todayTasks.length ? todayTasks.slice(0, 5).map((task) => taskRow(task, true)).join('') : empty('今天沒有待辦', '新的空白不是漏洞，是喘息。', 'task', '新增任務')}
          </div>
        </article>

        <article class="panel span-5">
          ${panelTitle('PULSE', '最近動態')}
          <div class="activity-list">
            ${state.activity.slice(0, 7).map((entry) => `
              <button data-action="go" data-route="${escapeAttr(entry.route || 'overview')}">
                <i></i>
                <span><strong>${escapeHTML(entry.text)}</strong><small>${escapeHTML(formatDateTime(entry.createdAt))}</small></span>
              </button>
            `).join('')}
          </div>
        </article>
      </section>

      <article class="panel">
        ${panelTitle('MODULES', '快速進入')}
        <div class="module-grid">
          ${NAV_ITEMS.filter((item) => !['overview', 'settings'].includes(item.id)).map((item) => `
            <button data-action="go" data-route="${escapeAttr(item.id)}">
              <i>${item.icon}</i>
              <strong>${escapeHTML(item.label)}</strong>
              <small>${escapeHTML(descriptions[item.id])}</small>
              <em>↗</em>
            </button>
          `).join('')}
        </div>
      </article>
    </section>
  `
}

function renderTasks(app) {
  const today = todayISO()
  const tests = {
    open: (task) => !task.done,
    today: (task) => !task.done && task.due === today,
    overdue: (task) => isOverdue(task.due, task.done),
    done: (task) => task.done,
    all: () => true,
  }
  const all = sortTasks(app.state.tasks)
  const visible = all.filter(tests[app.taskFilter] || tests.open)
  const filters = [['open', '待完成'], ['today', '今天'], ['overdue', '逾期'], ['done', '已完成'], ['all', '全部']]

  return `
    <section class="page-stack">
      ${intro('把事情切小、排好、做掉。', '依今天、逾期與完成狀態篩選。', 'task', '新增任務')}
      <div class="filter-bar">
        ${filters.map(([key, label]) => `
          <button class="filter-chip ${app.taskFilter === key ? 'active' : ''}" data-action="taskFilter" data-filter="${key}">
            ${label}<i>${all.filter(tests[key]).length}</i>
          </button>
        `).join('')}
      </div>
      <article class="panel">
        <div class="rows">
          ${visible.length ? visible.map((task) => taskRow(task)).join('') : empty('這個分類是空的', '換一個篩選或加入任務。', 'task', '新增任務')}
        </div>
      </article>
    </section>
  `
}

function renderRestaurant(app) {
  const { state } = app
  const currency = state.settings.currency
  const checks = state.restaurant.checklist
  const checksDone = checks.filter((item) => item.done).length
  const logs = [...state.restaurant.logs].sort((a, b) => b.date.localeCompare(a.date))
  const latest = logs[0]
  const stock = [...state.restaurant.inventory].sort((a, b) => {
    const aLow = toNumber(a.current) <= toNumber(a.minimum)
    const bLow = toNumber(b.current) <= toNumber(b.minimum)
    return Number(bLow) - Number(aLow) || a.name.localeCompare(b.name, 'zh-Hant')
  })

  return `
    <section class="page-stack">
      ${intro('從備料到收店，一頁掌握。', '日報、例行檢查與低庫存集中管理。', 'restaurantLog', '新增日報')}
      <section class="stats-grid three">
        ${stat('最近營業額', latest ? formatCurrency(latest.sales, currency) : '尚未紀錄', latest ? formatDate(latest.date) : '建立第一份日報', '⌁')}
        ${stat('最近來客', latest ? formatNumber(latest.covers, 0) : '0', latest?.covers ? `客單 ${formatCurrency(latest.sales / latest.covers, currency)}` : '尚未紀錄', '◎')}
        ${stat('例行檢查', `${percent(checksDone, checks.length)}%`, `${checksDone}/${checks.length} 已完成`, '✓', checksDone < checks.length)}
      </section>

      <section class="dashboard-grid">
        <article class="panel span-5">
          ${panelTitle('OPEN / CLOSE', '每日檢查', `<strong class="panel-value">${percent(checksDone, checks.length)}%</strong>`)}
          ${checklist(checks, 'restaurantCheck', 'restaurant.checklist', '檢查項目', 'restaurant', 'restaurantCheck')}
        </article>

        <article class="panel span-7">
          ${panelTitle('INVENTORY', '庫存雷達', '<button class="button secondary" data-action="edit" data-type="inventory">新增品項</button>')}
          <div class="inventory-list">
            ${stock.length ? stock.map((item) => {
              const low = toNumber(item.current) <= toNumber(item.minimum)
              return `
                <article class="data-row inventory-row ${low ? 'low' : ''}">
                  <i class="signal"></i>
                  <div class="row-main"><strong>${escapeHTML(item.name)}</strong><small>${low ? '低庫存' : `安全量 ${formatNumber(item.minimum)} ${escapeHTML(item.unit)}`}</small></div>
                  <div class="stepper">
                    <button data-action="stock" data-id="${escapeAttr(item.id)}" data-delta="-1">−</button>
                    <strong>${formatNumber(item.current)} <small>${escapeHTML(item.unit)}</small></strong>
                    <button data-action="stock" data-id="${escapeAttr(item.id)}" data-delta="1">＋</button>
                  </div>
                  ${rowActions('inventory', item.id, 'restaurant.inventory', '庫存品項', 'restaurant')}
                </article>
              `
            }).join('') : empty('尚無庫存品項', '加入常用食材與耗材。', 'inventory', '新增品項')}
          </div>
        </article>
      </section>

      <article class="panel">
        ${panelTitle('DAILY LOG', '營運日報', '<button class="button secondary" data-action="edit" data-type="restaurantLog">新增日報</button>')}
        ${logs.length ? `
          <div class="data-table restaurant-table">
            <div class="table-head"><b>日期</b><b>營業額</b><b>來客</b><b>客單</b><b>耗損</b><b></b></div>
            ${logs.slice(0, 20).map((log) => `
              <div class="table-row">
                <span data-label="日期">${escapeHTML(formatDate(log.date))}</span>
                <strong data-label="營業額">${escapeHTML(formatCurrency(log.sales, currency))}</strong>
                <span data-label="來客">${formatNumber(log.covers, 0)}</span>
                <span data-label="客單">${log.covers ? escapeHTML(formatCurrency(log.sales / log.covers, currency)) : '—'}</span>
                <span data-label="耗損">${escapeHTML(formatCurrency(log.waste, currency))}</span>
                ${rowActions('restaurantLog', log.id, 'restaurant.logs', '日報', 'restaurant')}
              </div>
            `).join('')}
          </div>
        ` : empty('還沒有日報', '收店前花一分鐘記錄，之後看趨勢會很有用。', 'restaurantLog', '新增日報')}
      </article>
    </section>
  `
}

function renderTravel(app) {
  const { state } = app
  const trips = state.travel.trips
  const active = trips.find((trip) => trip.id === app.tripId) || trips[0]
  if (active) app.tripId = active.id
  const currency = state.settings.currency
  const itinerary = active
    ? state.travel.itinerary.filter((item) => item.tripId === active.id).sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`))
    : []
  const spent = active ? calculateTripSpent(active.id, state.travel.itinerary) : 0
  const checks = state.travel.checklist
  const checksDone = checks.filter((item) => item.done).length

  return `
    <section class="page-stack">
      ${intro('把散落的旅行資訊收成一條路。', '管理旅程、日期、預算、行程與出發清單。', 'trip', '新增旅程')}
      <div class="trip-tabs">
        ${trips.map((trip) => `
          <button class="${active?.id === trip.id ? 'active' : ''}" data-action="selectTrip" data-id="${escapeAttr(trip.id)}">
            <small>${escapeHTML(TRIP_STATUS_LABELS[trip.status] || trip.status)}</small>
            <strong>${escapeHTML(trip.name)}</strong>
            <span>${escapeHTML(trip.destination || '目的地待定')}</span>
          </button>
        `).join('')}
        <button data-action="edit" data-type="trip"><small>＋</small><strong>新增旅程</strong><span>開始下一段路</span></button>
      </div>

      ${active ? `
        <article class="trip-hero">
          <div>
            <em>${escapeHTML(TRIP_STATUS_LABELS[active.status] || active.status)}</em>
            <h2>${escapeHTML(active.name)}</h2>
            <p>${escapeHTML(active.destination || '目的地待決定')} · ${active.startDate ? escapeHTML(formatDate(active.startDate)) : '日期未定'}${active.endDate ? ` 至 ${escapeHTML(formatDate(active.endDate))}` : ''}</p>
            ${active.notes ? `<small>${escapeHTML(active.notes)}</small>` : ''}
          </div>
          ${rowActions('trip', active.id, 'travel.trips', '旅程', 'travel')}
        </article>

        <section class="stats-grid three">
          ${stat('旅行預算', active.budget ? formatCurrency(active.budget, currency) : '未設定', `${active.budget ? Math.round((spent / active.budget) * 100) : 0}% 已排入`, '◎')}
          ${stat('已排費用', formatCurrency(spent, currency), active.budget ? `剩餘 ${formatCurrency(Math.max(active.budget - spent, 0), currency)}` : '在行程填入費用', '↗', active.budget > 0 && spent > active.budget)}
          ${stat('出發清單', `${checksDone}/${checks.length}`, `${percent(checksDone, checks.length)}% 完成`, '✓')}
        </section>

        <section class="dashboard-grid">
          <article class="panel span-8">
            ${panelTitle('ITINERARY', '行程時間軸', '<button class="button secondary" data-action="edit" data-type="itinerary">新增行程</button>')}
            <div class="timeline">
              ${itinerary.length ? itinerary.map((item) => `
                <article>
                  <time><strong>${item.date ? escapeHTML(formatDate(item.date, { year: undefined })) : '待定'}</strong><small>${escapeHTML(item.time || '時間未定')}</small></time>
                  <i></i>
                  <div>
                    <header><strong>${escapeHTML(item.title)}</strong><em>${item.cost ? escapeHTML(formatCurrency(item.cost, currency)) : '免費 / 未填'}</em></header>
                    <p>${escapeHTML(item.place || '地點未定')}</p>
                    ${item.booking || item.notes ? `<small>${escapeHTML([item.booking, item.notes].filter(Boolean).join(' · '))}</small>` : ''}
                    ${rowActions('itinerary', item.id, 'travel.itinerary', '行程', 'travel')}
                  </div>
                </article>
              `).join('') : empty('行程還是空白', '先放進第一個航班、景點或住宿。', 'itinerary', '新增行程')}
            </div>
          </article>

          <article class="panel span-4">
            ${panelTitle('CHECKLIST', '出發清單')}
            ${checklist(checks, 'travelCheck', 'travel.checklist', '旅行清單', 'travel', 'travelCheck')}
          </article>
        </section>
      ` : empty('尚無旅程', '建立第一個旅程，Zia 才能開始排路線。', 'trip', '新增旅程')}
    </section>
  `
}

function renderInvestments(app) {
  const { state } = app
  const currency = state.settings.currency
  const total = portfolioTotals(state)
  const holdings = state.investments.holdings

  return `
    <section class="page-stack">
      ${intro('看清部位，不把猜測偽裝成行情。', '成本、股數與現價由你手動更新，Zia 負責計算。', 'holding', '新增持股')}
      <div class="notice-card"><b>i</b><p><strong>手動資料模式</strong> Zia 不連接券商，也不會假裝價格是即時行情。</p></div>
      <section class="stats-grid three">
        ${stat('總投入成本', total.valid ? formatCurrency(total.cost, currency) : '待輸入', `${holdings.length} 個持股`, '◎')}
        ${stat('目前市值', total.valid ? formatCurrency(total.value, currency) : '待輸入', '依手動現價計算', '↗')}
        ${stat('未實現損益', total.valid ? formatCurrency(total.profit, currency) : '待輸入', total.valid ? `${total.rate.toFixed(2)}%` : '填妥後顯示', total.profit >= 0 ? '＋' : '−', total.profit < 0)}
      </section>
      <article class="panel">
        ${panelTitle('PORTFOLIO', '持股清單', '<button class="button secondary" data-action="edit" data-type="holding">新增持股</button>')}
        <div class="card-grid">
          ${holdings.length ? holdings.map((holding) => {
            const cost = toNumber(holding.shares) * toNumber(holding.averageCost)
            const value = toNumber(holding.shares) * toNumber(holding.currentPrice)
            const profit = value - cost
            const valid = holding.shares > 0 && holding.averageCost > 0 && holding.currentPrice > 0
            return `
              <article class="mini-card holding-card">
                <header>
                  <div><strong>${escapeHTML(holding.symbol)}</strong><small>${escapeHTML(holding.name || '未命名')}</small></div>
                  ${rowActions('holding', holding.id, 'investments.holdings', '持股', 'investments')}
                </header>
                <div class="key-values">
                  <span>股數<strong>${formatNumber(holding.shares, 4)}</strong></span>
                  <span>平均成本<strong>${holding.averageCost ? escapeHTML(formatCurrency(holding.averageCost, currency, 2)) : '待輸入'}</strong></span>
                  <span>目前價格<strong>${holding.currentPrice ? escapeHTML(formatCurrency(holding.currentPrice, currency, 2)) : '待輸入'}</strong></span>
                  <span>損益<strong class="${valid ? (profit >= 0 ? 'positive' : 'negative') : ''}">${valid ? escapeHTML(formatCurrency(profit, currency)) : '—'}</strong></span>
                </div>
                ${holding.note ? `<p>${escapeHTML(holding.note)}</p>` : ''}
              </article>
            `
          }).join('') : empty('尚無持股', '加入標的、成本與股數。', 'holding', '新增持股')}
        </div>
      </article>
    </section>
  `
}

function renderGarage(app) {
  const { state } = app
  const currency = state.settings.currency
  const vehicles = state.garage.vehicles
  const logs = [...state.garage.logs].sort((a, b) => b.date.localeCompare(a.date))
  const checks = state.garage.checklist
  const checksDone = checks.filter((item) => item.done).length

  return `
    <section class="page-stack">
      ${intro('讓每一次出發都有紀錄。', '里程、保養、保險與騎乘前檢查集中管理。', 'vehicle', '新增車輛')}
      <div class="card-grid vehicle-grid">
        ${vehicles.length ? vehicles.map((vehicle) => {
          const remaining = toNumber(vehicle.nextServiceKm) - toNumber(vehicle.odometer)
          const warning = vehicle.nextServiceKm > 0 && remaining <= 300
          return `
            <article class="mini-card vehicle-card ${warning ? 'warning' : ''}">
              <header>
                <div><small>${escapeHTML(vehicle.type || '車輛')}</small><h2>${escapeHTML(vehicle.name)}</h2></div>
                ${rowActions('vehicle', vehicle.id, 'garage.vehicles', '車輛', 'garage')}
              </header>
              <div class="key-values">
                <span>目前里程<strong>${formatNumber(vehicle.odometer, 0)} km</strong></span>
                <span>下次保養<strong>${vehicle.nextServiceKm ? `${formatNumber(vehicle.nextServiceKm, 0)} km` : '未設定'}</strong></span>
                <span>距離保養<strong class="${warning ? 'negative' : ''}">${vehicle.nextServiceKm ? `${formatNumber(remaining, 0)} km` : '—'}</strong></span>
                <span>保險到期<strong>${vehicle.insuranceDate ? escapeHTML(formatDate(vehicle.insuranceDate)) : '未設定'}</strong></span>
              </div>
              ${vehicle.note ? `<p>${escapeHTML(vehicle.note)}</p>` : ''}
            </article>
          `
        }).join('') : empty('尚無車輛', '新增汽車或重機。', 'vehicle', '新增車輛')}
      </div>

      <section class="dashboard-grid">
        <article class="panel span-5">
          ${panelTitle('PRE-RIDE', '出發前檢查', `<strong class="panel-value">${percent(checksDone, checks.length)}%</strong>`)}
          ${checklist(checks, 'rideCheck', 'garage.checklist', '騎乘檢查', 'garage', 'rideCheck')}
        </article>
        <article class="panel span-7">
          ${panelTitle('MAINTENANCE', '保養紀錄', `<button class="button secondary" data-action="edit" data-type="maintenance" ${vehicles.length ? '' : 'disabled'}>新增紀錄</button>`)}
          <div class="rows">
            ${logs.length ? logs.map((log) => {
              const vehicle = vehicles.find((item) => item.id === log.vehicleId)
              return `
                <article class="data-row maintenance-row">
                  <time><strong>${escapeHTML(formatDate(log.date, { year: undefined }))}</strong><small>${formatNumber(log.odometer, 0)} km</small></time>
                  <div class="row-main"><strong>${escapeHTML(log.serviceType)}</strong><small>${escapeHTML(vehicle?.name || '已刪除車輛')}${log.notes ? ` · ${escapeHTML(log.notes)}` : ''}</small></div>
                  <strong class="maintenance-cost">${escapeHTML(formatCurrency(log.cost, currency))}</strong>
                  ${rowActions('maintenance', log.id, 'garage.logs', '保養紀錄', 'garage')}
                </article>
              `
            }).join('') : empty('尚無保養紀錄', '換油、輪胎、鏈條與檢查都能記。', vehicles.length ? 'maintenance' : null, '新增保養')}
          </div>
        </article>
      </section>
    </section>
  `
}

function renderGames(app) {
  const tests = {
    all: () => true,
    playing: (game) => game.status === 'playing',
    backlog: (game) => game.status === 'backlog',
    completed: (game) => game.status === 'completed',
    paused: (game) => game.status === 'paused',
  }
  const filters = [['all', '全部'], ['playing', '遊玩中'], ['backlog', '待遊玩'], ['completed', '已完成'], ['paused', '暫停']]
  const visible = app.state.games.filter(tests[app.gameFilter] || tests.all)

  return `
    <section class="page-stack">
      ${intro('遊戲不是待辦，但進度值得有個家。', '整理遊玩中、待玩、完成與暫停清單。', 'game', '新增遊戲')}
      <div class="filter-bar">
        ${filters.map(([key, label]) => `
          <button class="filter-chip ${app.gameFilter === key ? 'active' : ''}" data-action="gameFilter" data-filter="${key}">
            ${label}<i>${app.state.games.filter(tests[key]).length}</i>
          </button>
        `).join('')}
      </div>
      <div class="card-grid game-grid">
        ${visible.length ? visible.map((game) => `
          <article class="mini-card game-card">
            <header><em>${escapeHTML(GAME_STATUS_LABELS[game.status] || game.status)}</em>${rowActions('game', game.id, 'games', '遊戲', 'games')}</header>
            <div class="game-art" aria-hidden="true">${escapeHTML(game.title.slice(0, 2).toUpperCase())}</div>
            <h3>${escapeHTML(game.title)}</h3>
            <p>${escapeHTML(game.platform || '平台未填')}</p>
            <div class="progress-track"><i style="width:${clamp(toNumber(game.progress), 0, 100)}%"></i></div>
            <small class="progress-label">進度 <strong>${clamp(toNumber(game.progress), 0, 100)}%</strong>${game.rating ? ` · 評分 <strong>${formatNumber(game.rating)}/10</strong>` : ''}</small>
            ${game.note ? `<blockquote>${escapeHTML(game.note)}</blockquote>` : ''}
          </article>
        `).join('') : empty('這個分類沒有遊戲', '換一個篩選或新增遊戲。', 'game', '新增遊戲')}
      </div>
    </section>
  `
}

function renderNotes(app) {
  const notes = [...app.state.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return `
    <section class="page-stack">
      ${intro('把腦中的火花裝進耐熱容器。', '筆記支援標籤、搜尋、編輯與本機保存。', 'note', '新增筆記')}
      <div class="card-grid notes-grid">
        ${notes.length ? notes.map((note) => `
          <article class="mini-card note-card">
            <div class="tags">${(note.tags?.length ? note.tags : ['未分類']).map((tag) => `<i>#${escapeHTML(tag)}</i>`).join('')}</div>
            <h3>${escapeHTML(note.title)}</h3>
            <p>${escapeHTML(note.content || '空白筆記')}</p>
            <footer><small>更新 ${escapeHTML(formatDateTime(note.updatedAt))}</small>${rowActions('note', note.id, 'notes', '筆記', 'notes')}</footer>
          </article>
        `).join('') : empty('筆記本還是空的', '把第一個想法寫下來。', 'note', '新增筆記')}
      </div>
    </section>
  `
}

function renderSettings(app) {
  const { state } = app
  const settings = state.settings
  const storage = app.store.storageStatus()
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

  return `
    <section class="page-stack">
      ${intro('把 Zia 調成你的手感。', '顯示、備份、匯入與重設集中在這裡。')}
      <section class="settings-grid">
        <article class="panel">
          ${panelTitle('APPEARANCE', '顯示設定')}
          <form class="form-grid" data-form="settings">
            <label class="field full"><span>顯示名稱</span><input name="name" value="${escapeAttr(settings.name)}" maxlength="30" required /></label>
            <label class="field"><span>主題</span><select name="theme"><option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>深色</option><option value="light" ${settings.theme === 'light' ? 'selected' : ''}>淺色</option></select></label>
            <label class="field"><span>強調色</span><select name="accent"><option value="violet" ${settings.accent === 'violet' ? 'selected' : ''}>紫曜</option><option value="cyan" ${settings.accent === 'cyan' ? 'selected' : ''}>冰藍</option><option value="amber" ${settings.accent === 'amber' ? 'selected' : ''}>琥珀</option><option value="rose" ${settings.accent === 'rose' ? 'selected' : ''}>玫紅</option></select></label>
            <label class="field full"><span>預設幣別</span><select name="currency">${['TWD', 'USD', 'EUR', 'JPY', 'KRW', 'CHF'].map((currency) => `<option value="${currency}" ${settings.currency === currency ? 'selected' : ''}>${currency}</option>`).join('')}</select></label>
            <label class="switch-row full"><span><strong>緊湊模式</strong><small>單頁顯示更多內容</small></span><input type="checkbox" name="compact" ${settings.compact ? 'checked' : ''} /></label>
            <footer class="form-actions full"><button class="button primary" type="submit">儲存設定</button></footer>
          </form>
        </article>

        <article class="panel">
          ${panelTitle('DATA', '資料與備份')}
          <div class="data-status">
            <span>儲存狀態<strong class="${storage.available ? 'positive' : 'negative'}">${storage.available ? '本機儲存正常' : '無法寫入'}</strong></span>
            <span>目前用量<strong>${escapeHTML(bytesLabel(storage.bytes))}</strong></span>
            <span>最後更新<strong>${escapeHTML(formatDateTime(state.meta.updatedAt))}</strong></span>
          </div>
          <div class="stacked-actions">
            <button class="button secondary" data-action="export">匯出 JSON 備份</button>
            <button class="button secondary" data-action="import">匯入 JSON 備份</button>
            <input id="importFile" type="file" accept="application/json,.json" hidden />
            <button class="button danger-button" data-action="reset">重設全部資料</button>
          </div>
        </article>

        <article class="panel">
          ${panelTitle('APP', '安裝 Zia')}
          <div class="install-card"><b>Z</b><span><strong>${standalone ? 'Zia 已以 App 模式開啟' : '加入手機主畫面'}</strong><p>可全螢幕使用，載入過的內容也能離線開啟。</p></span></div>
          <button class="button primary full-button" data-action="install" ${standalone ? 'disabled' : ''}>${standalone ? '已安裝' : '安裝 Zia'}</button>
        </article>

        <article class="panel">
          ${panelTitle('ABOUT', 'Zia 1.0')}
          <p class="about-copy">本機優先的個人中控台。沒有帳號、沒有追蹤碼，也不會把資料送到外部伺服器。</p>
          <ul class="feature-list"><li>任務與今日焦點</li><li>餐廳日報與庫存</li><li>旅程與預算</li><li>手動投資損益</li><li>車輛與保養</li><li>遊戲與筆記</li></ul>
        </article>
      </section>
    </section>
  `
}

export function renderView(app) {
  const views = {
    overview: renderOverview,
    tasks: renderTasks,
    restaurant: renderRestaurant,
    travel: renderTravel,
    investments: renderInvestments,
    garage: renderGarage,
    games: renderGames,
    notes: renderNotes,
    settings: renderSettings,
  }
  return (views[app.route] || renderOverview)(app)
}
