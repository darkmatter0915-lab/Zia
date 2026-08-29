export const APP_SCHEMA_VERSION = 1

export const NAV_ITEMS = [
  { id: 'overview', label: '總覽', icon: '⌂' },
  { id: 'tasks', label: '任務', icon: '✓' },
  { id: 'restaurant', label: '餐廳', icon: '♨' },
  { id: 'travel', label: '旅遊', icon: '✈' },
  { id: 'investments', label: '投資', icon: '↗' },
  { id: 'garage', label: '車庫', icon: '◈' },
  { id: 'games', label: '遊戲', icon: '◉' },
  { id: 'notes', label: '筆記', icon: '▤' },
  { id: 'settings', label: '設定', icon: '⚙' },
]

export const AREA_LABELS = {
  personal: '個人',
  restaurant: '餐廳',
  travel: '旅遊',
  investments: '投資',
  garage: '車庫',
  games: '遊戲',
}

export const PRIORITY_LABELS = {
  high: '高',
  medium: '中',
  low: '低',
}

export const GAME_STATUS_LABELS = {
  playing: '遊玩中',
  backlog: '待遊玩',
  completed: '已完成',
  paused: '暫停',
}

export const TRIP_STATUS_LABELS = {
  planning: '規劃中',
  booked: '已預訂',
  active: '旅途中',
  completed: '已完成',
}

const isoDate = (offset = 0) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

const isoNow = () => new Date().toISOString()

export function createDefaultState() {
  const today = isoDate(0)
  const tomorrow = isoDate(1)
  const nextWeek = isoDate(7)

  return {
    meta: {
      schemaVersion: APP_SCHEMA_VERSION,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    },
    settings: {
      name: '佐',
      theme: 'dark',
      accent: 'violet',
      currency: 'TWD',
      compact: false,
    },
    tasks: [
      {
        id: 'task-restaurant-prep',
        title: '補齊今天備料清單',
        notes: '確認缺料、低庫存與明日採購。',
        due: today,
        priority: 'high',
        area: 'restaurant',
        done: false,
        createdAt: isoNow(),
      },
      {
        id: 'task-mu-price',
        title: '更新 MU 成本與現價',
        notes: '投資資料採手動輸入，不會假裝是即時行情。',
        due: today,
        priority: 'medium',
        area: 'investments',
        done: false,
        createdAt: isoNow(),
      },
      {
        id: 'task-trip',
        title: '整理下一趟旅行想去的地方',
        notes: '先把目的地丟進 Zia，再慢慢排。',
        due: tomorrow,
        priority: 'low',
        area: 'travel',
        done: false,
        createdAt: isoNow(),
      },
      {
        id: 'task-ducati',
        title: '更新 Ducati 里程',
        notes: '順便確認下次保養里程。',
        due: nextWeek,
        priority: 'low',
        area: 'garage',
        done: false,
        createdAt: isoNow(),
      },
    ],
    restaurant: {
      checklist: [
        { id: 'rest-check-1', title: '冷藏與冷凍溫度確認', done: false },
        { id: 'rest-check-2', title: '今日備料量確認', done: false },
        { id: 'rest-check-3', title: '出單機與收銀測試', done: false },
        { id: 'rest-check-4', title: '清潔與閉店檢查', done: false },
      ],
      inventory: [
        { id: 'stock-1', name: '牛肉', unit: 'kg', current: 12, minimum: 8 },
        { id: 'stock-2', name: '食用油', unit: '桶', current: 2, minimum: 2 },
        { id: 'stock-3', name: '洗碗精', unit: '箱', current: 1, minimum: 2 },
      ],
      logs: [],
    },
    travel: {
      trips: [
        {
          id: 'trip-next',
          name: '下一趟旅行',
          destination: '待決定',
          startDate: '',
          endDate: '',
          budget: 0,
          status: 'planning',
          notes: '把看到的景點、航班與住宿先集中收進來。',
        },
      ],
      itinerary: [],
      checklist: [
        { id: 'travel-check-1', title: '護照效期', done: false },
        { id: 'travel-check-2', title: '網路與 eSIM', done: false },
        { id: 'travel-check-3', title: '旅平險與不便險', done: false },
        { id: 'travel-check-4', title: '充電器與行動電源', done: false },
      ],
    },
    investments: {
      holdings: [
        {
          id: 'holding-mu',
          symbol: 'MU',
          name: 'Micron Technology',
          shares: 8,
          averageCost: 0,
          currentPrice: 0,
          note: '填入實際成本與現價後，Zia 會自動計算損益。',
        },
      ],
    },
    garage: {
      vehicles: [
        {
          id: 'vehicle-ducati',
          name: 'Ducati',
          type: '重機',
          odometer: 0,
          nextServiceKm: 1000,
          nextServiceDate: '',
          insuranceDate: '',
          note: '先填目前里程，之後保養紀錄都集中在這裡。',
        },
      ],
      logs: [],
      checklist: [
        { id: 'ride-check-1', title: '胎壓與胎況', done: false },
        { id: 'ride-check-2', title: '機油與冷卻液', done: false },
        { id: 'ride-check-3', title: '煞車與燈具', done: false },
        { id: 'ride-check-4', title: '鏈條與油量', done: false },
      ],
    },
    games: [
      {
        id: 'game-poe2',
        title: 'Path of Exile 2',
        platform: 'PC / PS5',
        status: 'playing',
        progress: 35,
        rating: 0,
        note: '亞馬遜冰旋風規劃。',
      },
      {
        id: 'game-diablo4',
        title: 'Diablo IV',
        platform: 'PS5',
        status: 'playing',
        progress: 15,
        rating: 0,
        note: '野蠻人進度。',
      },
      {
        id: 'game-helldivers2',
        title: '絕地戰兵 2',
        platform: 'PS5 / PC',
        status: 'backlog',
        progress: 0,
        rating: 0,
        note: '裝備與升等路線待整理。',
      },
    ],
    notes: [
      {
        id: 'note-welcome',
        title: 'Zia 使用方式',
        tags: ['開始', '說明'],
        content: 'Zia 是你的本機優先中控台。任務、餐廳、旅行、投資、車庫、遊戲與筆記都會保存在目前瀏覽器。請定期到設定匯出 JSON 備份。',
        updatedAt: isoNow(),
      },
    ],
    activity: [
      {
        id: 'activity-welcome',
        text: 'Zia 1.0 工作區已建立',
        route: 'overview',
        createdAt: isoNow(),
      },
    ],
  }
}
