import { AREA_LABELS, PRIORITY_LABELS } from './data.js'
import { escapeHTML as h, escapeAttr as a, todayISO, dueLabel, formatNumber, formatDate, formatDateTime, toNumber } from './utils.js'
import { icon } from './workspace-icons.js'

export function agenda(state, filter = 'focus') {
  const today = todayISO()
  const rank = { high: 0, medium: 1, low: 2 }
  return state.tasks.filter(task => !task.done && (filter === 'all' || (filter === 'today' ? task.due === today : task.due && task.due <= today)))
    .sort((x, y) => (x.due || '9999').localeCompare(y.due || '9999') || (rank[x.priority] ?? 3) - (rank[y.priority] ?? 3))
}
const head = (number, title, extra = '') => `<header class="ws-section-head"><div><span class="ws-index">${number}</span><h3>${title}</h3></div>${extra}</header>`
const go = (route, text) => `<button class="ws-link" data-action="go" data-route="${a(route)}">${h(text)}${icon('arrow')}</button>`
function taskRow(task) {
  const overdue = Boolean(task.due && task.due < todayISO())
  return `<article class="ws-task">
    <label class="check-control"><input type="checkbox" data-toggle="task" data-id="${a(task.id)}" aria-label="完成任務：${a(task.title)}"/><i></i></label>
    <button class="ws-task-title" data-action="edit" data-type="task" data-id="${a(task.id)}"><strong>${h(task.title)}</strong><span>${h(AREA_LABELS[task.area] || '個人')}<b>·</b><span class="${overdue ? 'negative' : ''}">${h(dueLabel(task.due))}</span></span></button>
    <span class="ws-priority ${a(task.priority)}">${h(PRIORITY_LABELS[task.priority] || '中')}優先</span>
  </article>`
}
function metric(route, title, value, detail, alert = false) {
  return `<button class="ws-metric ${alert ? 'ws-attention' : ''}" data-action="go" data-route="${route}"><span class="ws-metric-top">${icon(route)}${title}${icon('arrow')}</span><strong>${h(value)}</strong><small>${h(detail)}</small></button>`
}
export function renderHome(app) {
  const { state } = app
  const today = todayISO()
  const open = state.tasks.filter(t => !t.done)
  const overdue = open.filter(t => t.due && t.due < today)
  const dueToday = state.tasks.filter(t => t.due === today)
  const doneToday = dueToday.filter(t => t.done).length
  const checks = state.restaurant.checklist
  const completedChecks = checks.filter(c => c.done).length
  const low = state.restaurant.inventory.filter(i => toNumber(i.current) <= toNumber(i.minimum))
  const trips = state.travel.trips.filter(t => t.status !== 'completed')
  const upcoming = trips.filter(t => t.startDate && t.startDate >= today).sort((x, y) => x.startDate.localeCompare(y.startDate))[0]
  const todayLog = state.restaurant.logs.find(l => l.date === today)
  const items = agenda(state, app.homeFilter || 'focus')
  const hour = new Date().getHours()
  const greeting = hour < 5 ? '夜深了' : hour < 11 ? '早安' : hour < 18 ? '午安' : '晚上好'
  const date = new Intl.DateTimeFormat('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
  const moduleInfo = [
    ['travel', '旅遊', upcoming ? upcoming.destination || upcoming.name : '下一段旅程，從這裡開始', `${trips.length} 個進行中計畫`],
    ['investments', '投資', '持股、成本與投資筆記', `${state.investments.holdings.length} 筆持股 · 手動價格`],
    ['garage', '車庫', '里程、保養與出發前檢查', `${state.garage.vehicles.length} 輛車`],
    ['games', '遊戲', '接續進度，收好攻略', `${state.games.filter(g => g.status === 'playing').length} 款遊玩中`],
    ['notes', '筆記', '留住想法，不用記在腦中', `${state.notes.length} 則筆記`],
  ]
  return `<section class="ws-home">
    <header class="ws-welcome"><div><span class="ws-eyebrow">YOUR DAILY SPACE <span>／</span> ${h(date)}</span><h2>${h(greeting)}，${h(state.settings.name || '佐')}<span class="ws-period">。</span></h2><p>${overdue.length ? `有 ${overdue.length} 件逾期待辦，先從最重要的一件開始。` : '今天的工作與生活，在這裡各就各位。'}</p></div><button class="button secondary ws-note-shortcut" data-action="edit" data-type="note">${icon('notes')}記下想法</button></header>
    <section class="ws-metrics" aria-label="工作區摘要">
      ${metric('tasks', '待辦任務', String(open.length).padStart(2, '0'), overdue.length ? `${overdue.length} 件逾期，需要留意` : `${dueToday.filter(t => !t.done).length} 件今天到期`, overdue.length > 0)}
      ${metric('restaurant', '店務檢查', `${completedChecks} / ${checks.length}`, checks.length ? '依目前勾選狀態' : '尚未建立檢查清單')}
      ${metric('restaurant', '補貨提醒', String(low.length).padStart(2, '0'), low.length ? low.slice(0, 3).map(i => i.name).join('、') : state.restaurant.inventory.length ? '沒有低於或等於安全量的品項' : '尚未建立庫存品項', low.length > 0)}
      ${metric('travel', '旅行計畫', String(trips.length).padStart(2, '0'), upcoming ? `${formatDate(upcoming.startDate, { year: undefined })} 出發` : '規劃、預算、行程一次收好')}
    </section>
    <div class="ws-main-grid">
      <article class="ws-panel ws-agenda">
        ${head('01', '先做這幾件', go('tasks', '全部任務'))}
        <div class="ws-agenda-controls"><div class="ws-tabs" role="group" aria-label="首頁任務篩選">${[['focus', '待處理'], ['today', '今天'], ['all', '全部待辦']].map(([key, title]) => `<button data-action="homeFilter" data-filter="${key}" aria-pressed="${(app.homeFilter || 'focus') === key}" class="${(app.homeFilter || 'focus') === key ? 'active' : ''}">${title}</button>`).join('')}</div><span class="ws-count">${items.length} 件</span></div>
        <div class="ws-task-list">${items.length ? items.slice(0, 6).map(taskRow).join('') : `<div class="ws-empty">${icon('check')}<strong>${app.homeFilter === 'today' ? '今天的到期待辦已處理完' : '這裡暫時沒有待辦'}</strong><p>${open.length ? '其他日期的任務可在「全部待辦」查看。' : '留點空間給自己，也可以記下下一件事。'}</p></div>`}</div>
        ${items.length > 6 ? `<div class="ws-overflow-note">還有 ${items.length - 6} 件${go('tasks', '到任務頁查看')}</div>` : ''}
        <form class="ws-quick" data-form="quickTask"><label for="quickTask" class="ws-sr-only">新增今天的任務</label>${icon('plus')}<input id="quickTask" name="title" placeholder="新增今天的任務…" maxlength="120" required autocomplete="off"/><button type="submit" aria-label="加入今天的任務">${icon('arrow')}</button></form>
        <footer class="ws-agenda-footer"><span>今天到期的任務</span><strong>${doneToday} / ${dueToday.length} 已完成</strong><progress value="${doneToday}" max="${Math.max(1, dueToday.length)}" aria-label="今天到期任務完成進度"></progress></footer>
      </article>
      <aside class="ws-side-stack" aria-label="店務與快捷操作">
        <article class="ws-panel ws-shop">${head('02', '店務速覽', icon('restaurant'))}<div class="ws-shop-status"><span class="ws-live-dot"></span><span>${todayLog ? '今日已建立營運日報' : '今日日報尚未填寫'}</span></div><p>${low.length ? `有 ${low.length} 個品項到達安全庫存量，採購前先看一眼。` : '日報、備料與檢查都放在一起，收店前不漏事。'}</p><button class="button primary" data-action="edit" data-type="restaurantLog" ${todayLog ? `data-id="${a(todayLog.id)}"` : ''}>${icon(todayLog ? 'edit' : 'plus')}${todayLog ? '編輯今日日報' : '記錄今日日報'}</button><div class="ws-shop-foot">${go('restaurant', '管理庫存與檢查')}</div></article>
        <article class="ws-panel ws-capture"><span class="ws-eyebrow">QUICK CAPTURE</span><h3>先記下，再安排。</h3><p>行程、待辦、靈感，別讓它們散落。</p><div><button data-action="edit" data-type="trip">${icon('travel')}新旅程</button><button data-action="edit" data-type="note">${icon('notes')}新筆記</button><button data-action="edit" data-type="task">${icon('tasks')}新任務</button></div></article>
      </aside>
    </div>
    <section class="ws-modules-section">${head('03', '生活工作區', '<span class="ws-section-note">工作以外，也好好安排</span>')}<div class="ws-module-grid">${moduleInfo.map(([route, title, desc, detail]) => `<button class="ws-module" data-action="go" data-route="${route}"><span class="ws-module-icon">${icon(route)}</span><h3>${title}</h3><p>${h(desc)}</p><footer><small>${h(detail)}</small>${icon('arrow')}</footer></button>`).join('')}</div></section>
    <section class="ws-panel ws-recent">${head('04', '最近活動', go('settings', '資料與備份'))}<div>${state.activity.length ? state.activity.slice(0, 4).map(entry => `<button data-action="go" data-route="${a(entry.route || 'overview')}"><span class="ws-activity-icon">${icon(entry.route)}</span><span>${h(entry.text)}</span><time>${h(formatDateTime(entry.createdAt))}</time>${icon('arrow')}</button>`).join('') : '<p class="ws-muted">新增或更新內容後，活動會顯示在這裡。</p>'}</div></section>
    <footer class="ws-page-footer">${icon('shield')}資料保存在這台裝置，不會跨裝置自動同步。<button data-action="export">匯出備份</button></footer>
  </section>`
}
