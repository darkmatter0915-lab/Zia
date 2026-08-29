import {
  AREA_LABELS,
  GAME_STATUS_LABELS,
  PRIORITY_LABELS,
  TRIP_STATUS_LABELS,
} from './data.js'
import { escapeAttr, escapeHTML, todayISO } from './utils.js'

const text = (name, label, value = '', options = {}) => ({
  name,
  label,
  value,
  type: 'text',
  ...options,
})

const number = (name, label, value = 0, options = {}) => ({
  name,
  label,
  value,
  type: 'number',
  min: 0,
  step: '1',
  ...options,
})

const date = (name, label, value = '', options = {}) => ({
  name,
  label,
  value,
  type: 'date',
  ...options,
})

const select = (name, label, value, options, config = {}) => ({
  name,
  label,
  value,
  options,
  ...config,
})

const textarea = (name, label, value = '', options = {}) => ({
  name,
  label,
  value,
  textarea: true,
  rows: 4,
  ...options,
})

const entries = (record) => Object.entries(record)

export function getEditorConfig(app, type) {
  const configs = {
    task: {
      type: 'task',
      label: '任務',
      path: 'tasks',
      fields: (item = {}) => [
        text('title', '任務名稱', item.title, { full: true, required: true, maxLength: 120 }),
        date('due', '期限', item.due || todayISO()),
        select('priority', '優先順序', item.priority || 'medium', entries(PRIORITY_LABELS)),
        select('area', '分類', item.area || 'personal', entries(AREA_LABELS), { full: true }),
        textarea('notes', '備註', item.notes, { full: true, maxLength: 800 }),
      ],
    },
    inventory: {
      type: 'inventory',
      label: '庫存品項',
      path: 'restaurant.inventory',
      fields: (item = {}) => [
        text('name', '品項名稱', item.name, { full: true, required: true, maxLength: 80 }),
        number('current', '目前數量', item.current, { step: '0.1' }),
        number('minimum', '安全存量', item.minimum, { step: '0.1' }),
        text('unit', '單位', item.unit || '份', { full: true, maxLength: 20 }),
      ],
    },
    restaurantLog: {
      type: 'restaurantLog',
      label: '營運日報',
      path: 'restaurant.logs',
      fields: (item = {}) => [
        date('date', '日期', item.date || todayISO(), { full: true, required: true }),
        number('sales', '營業額', item.sales),
        number('covers', '來客數', item.covers),
        number('waste', '耗損金額', item.waste, { full: true }),
        textarea('notes', '備註', item.notes, {
          full: true,
          maxLength: 1000,
          placeholder: '缺料、客訴、設備或特殊事件',
        }),
      ],
    },
    trip: {
      type: 'trip',
      label: '旅程',
      path: 'travel.trips',
      wide: true,
      fields: (item = {}) => [
        text('name', '旅程名稱', item.name, { full: true, required: true, maxLength: 100 }),
        text('destination', '目的地', item.destination, { full: true, maxLength: 120 }),
        date('startDate', '開始日期', item.startDate),
        date('endDate', '結束日期', item.endDate),
        number('budget', '預算', item.budget),
        select('status', '狀態', item.status || 'planning', entries(TRIP_STATUS_LABELS)),
        textarea('notes', '備註', item.notes, { full: true, maxLength: 1000 }),
      ],
    },
    itinerary: {
      type: 'itinerary',
      label: '行程',
      path: 'travel.itinerary',
      wide: true,
      fields: (item = {}) => {
        const activeTrip = app.state.travel.trips.find((trip) => trip.id === app.tripId)
        return [
          text('title', '項目名稱', item.title, { full: true, required: true, maxLength: 120 }),
          date('date', '日期', item.date || activeTrip?.startDate || ''),
          text('time', '時間', item.time, { type: 'time' }),
          text('place', '地點', item.place, { full: true, maxLength: 160 }),
          text('booking', '預訂資訊', item.booking, {
            maxLength: 160,
            placeholder: '訂位編號、班次或備註',
          }),
          number('cost', '費用', item.cost),
          textarea('notes', '備註', item.notes, { full: true, maxLength: 1000 }),
        ]
      },
    },
    holding: {
      type: 'holding',
      label: '持股',
      path: 'investments.holdings',
      fields: (item = {}) => [
        text('symbol', '股票代號', item.symbol, { required: true, maxLength: 15 }),
        text('name', '名稱', item.name, { maxLength: 100 }),
        number('shares', '股數', item.shares, { step: '0.0001' }),
        number('averageCost', '平均成本', item.averageCost, { step: '0.01' }),
        number('currentPrice', '目前價格', item.currentPrice, { step: '0.01', full: true }),
        textarea('note', '投資筆記', item.note, { full: true, maxLength: 1000 }),
      ],
    },
    vehicle: {
      type: 'vehicle',
      label: '車輛',
      path: 'garage.vehicles',
      wide: true,
      fields: (item = {}) => [
        text('name', '車輛名稱', item.name, { required: true, maxLength: 100 }),
        text('type', '類型', item.type || '重機', { maxLength: 50 }),
        number('odometer', '目前里程 km', item.odometer),
        number('nextServiceKm', '下次保養里程 km', item.nextServiceKm),
        date('nextServiceDate', '下次保養日期', item.nextServiceDate),
        date('insuranceDate', '保險到期日', item.insuranceDate),
        textarea('note', '備註', item.note, { full: true, maxLength: 1000 }),
      ],
    },
    maintenance: {
      type: 'maintenance',
      label: '保養紀錄',
      path: 'garage.logs',
      wide: true,
      fields: (item = {}) => [
        select(
          'vehicleId',
          '車輛',
          item.vehicleId || app.state.garage.vehicles[0]?.id || '',
          app.state.garage.vehicles.map((vehicle) => [vehicle.id, vehicle.name]),
          { required: true },
        ),
        date('date', '日期', item.date || todayISO(), { required: true }),
        text('serviceType', '保養項目', item.serviceType, {
          full: true,
          required: true,
          maxLength: 120,
          placeholder: '例如：更換機油與濾芯',
        }),
        number('odometer', '當時里程 km', item.odometer),
        number('cost', '費用', item.cost),
        textarea('notes', '備註', item.notes, { full: true, maxLength: 1000 }),
      ],
    },
    game: {
      type: 'game',
      label: '遊戲',
      path: 'games',
      fields: (item = {}) => [
        text('title', '遊戲名稱', item.title, { full: true, required: true, maxLength: 120 }),
        text('platform', '平台', item.platform, { maxLength: 80 }),
        select('status', '狀態', item.status || 'backlog', entries(GAME_STATUS_LABELS)),
        number('progress', '進度 0 至 100%', item.progress, { max: 100 }),
        number('rating', '評分 0 至 10', item.rating, { max: 10, step: '0.5' }),
        textarea('note', '筆記', item.note, { full: true, maxLength: 1000 }),
      ],
    },
    note: {
      type: 'note',
      label: '筆記',
      path: 'notes',
      wide: true,
      fields: (item = {}) => [
        text('title', '標題', item.title, { full: true, required: true, maxLength: 140 }),
        text('tags', '標籤，用逗號分隔', item.tags?.join(', '), {
          full: true,
          maxLength: 160,
          placeholder: '例如：料理, 旅行',
        }),
        textarea('content', '內容', item.content, {
          full: true,
          rows: 12,
          maxLength: 12000,
          placeholder: '寫下想法、資料、連結或下一步',
        }),
      ],
    },
  }

  return configs[type] || configs.task
}

export function renderField(field, autofocus = false) {
  const className = field.full ? 'field full' : 'field'
  const focus = autofocus ? ' autofocus' : ''
  const required = field.required ? ' required' : ''
  const disabled = field.disabled ? ' disabled' : ''
  const placeholder = field.placeholder ? ` placeholder="${escapeAttr(field.placeholder)}"` : ''
  const maxLength = field.maxLength ? ` maxlength="${field.maxLength}"` : ''

  if (field.options) {
    return `
      <label class="${className}">
        <span>${escapeHTML(field.label)}</span>
        <select name="${escapeAttr(field.name)}"${focus}${required}${disabled}>
          ${field.options.map(([value, label]) => `
            <option value="${escapeAttr(value)}" ${String(field.value ?? '') === String(value) ? 'selected' : ''}>
              ${escapeHTML(label)}
            </option>
          `).join('')}
        </select>
      </label>
    `
  }

  if (field.textarea) {
    return `
      <label class="${className}">
        <span>${escapeHTML(field.label)}</span>
        <textarea
          name="${escapeAttr(field.name)}"
          rows="${field.rows || 4}"
          ${focus}${required}${disabled}${placeholder}${maxLength}
        >${escapeHTML(field.value ?? '')}</textarea>
      </label>
    `
  }

  const min = field.min !== undefined ? ` min="${field.min}"` : ''
  const max = field.max !== undefined ? ` max="${field.max}"` : ''
  const step = field.step !== undefined ? ` step="${field.step}"` : ''

  return `
    <label class="${className}">
      <span>${escapeHTML(field.label)}</span>
      <input
        type="${escapeAttr(field.type || 'text')}"
        name="${escapeAttr(field.name)}"
        value="${escapeAttr(field.value ?? '')}"
        ${focus}${required}${disabled}${placeholder}${maxLength}${min}${max}${step}
      />
    </label>
  `
}
