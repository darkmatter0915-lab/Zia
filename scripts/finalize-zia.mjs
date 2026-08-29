import { readFileSync, writeFileSync } from 'node:fs'

function replaceRequired(path, before, after, label) {
  const source = readFileSync(path, 'utf8')
  if (source.includes(after)) return false
  if (!source.includes(before)) {
    throw new Error(`無法套用修補：${label}`)
  }
  writeFileSync(path, source.replace(before, after))
  console.log(`已修補：${label}`)
  return true
}

replaceRequired(
  'src/app.js',
  `    this.store.update((draft) => {
      const list = this.listAt(draft, config.path)
      const index = list.findIndex((item) => item.id === record.id)
      if (index >= 0) list[index] = record
      else list.unshift(record)
    }, {
      text: \`${'${'}current ? '更新' : '新增'}${'${'}config.label}：${'${'}record.title || record.name || record.symbol || record.serviceType || record.date || config.label}\`,
      route: this.route,
    })

    if (type === 'trip' && !current) this.tripId = record.id
    this.editor = null
    this.say(\`${'${'}config.label}已${'${'}current ? '更新' : '新增'}\`)
`,
  `    if (type === 'trip' && !current) this.tripId = record.id
    this.editor = null

    this.store.update((draft) => {
      const list = this.listAt(draft, config.path)
      const index = list.findIndex((item) => item.id === record.id)
      if (index >= 0) list[index] = record
      else list.unshift(record)
    }, {
      text: \`${'${'}current ? '更新' : '新增'}${'${'}config.label}：${'${'}record.title || record.name || record.symbol || record.serviceType || record.date || config.label}\`,
      route: this.route,
    })

    this.say(\`${'${'}config.label}已${'${'}current ? '更新' : '新增'}\`)
`,
  '儲存後正確關閉編輯視窗',
)

replaceRequired(
  'src/app.js',
  `panel.addEventListener('click', (event) => event.stopPropagation(), { once: true })`,
  `panel.addEventListener('click', (event) => event.stopPropagation())`,
  '對話框內多次點擊不會誤關閉',
)

replaceRequired(
  'src/views.js',
  `${'${'}intro('從備料到收店，一頁掌握。', '日報、例行檢查與低庫存集中管理。', 'restaurantLog', latest ? '更新日報' : '新增日報')}`,
  `${'${'}intro('從備料到收店，一頁掌握。', '日報、例行檢查與低庫存集中管理。', 'restaurantLog', '新增日報')}`,
  '餐廳日報按鈕文案',
)

replaceRequired(
  'src/views.js',
  `  const total = state.investments.holdings.reduce((result, holding) => {
    const cost = toNumber(holding.shares) * toNumber(holding.averageCost)
    const value = toNumber(holding.shares) * toNumber(holding.currentPrice)
    result.cost += cost
    result.value += value
    if (holding.averageCost > 0 && holding.currentPrice > 0) result.valid += 1
    return result
  }, { cost: 0, value: 0, valid: 0 })
`,
  `  const total = state.investments.holdings.reduce((result, holding) => {
    const shares = toNumber(holding.shares)
    const averageCost = toNumber(holding.averageCost)
    const currentPrice = toNumber(holding.currentPrice)
    if (shares <= 0 || averageCost <= 0 || currentPrice <= 0) return result

    result.cost += shares * averageCost
    result.value += shares * currentPrice
    result.valid += 1
    return result
  }, { cost: 0, value: 0, valid: 0 })
`,
  '投資總計只納入資料完整的持股',
)

replaceRequired(
  'src/views.js',
  `            const valid = holding.averageCost > 0 && holding.currentPrice > 0`,
  `            const valid = holding.shares > 0 && holding.averageCost > 0 && holding.currentPrice > 0`,
  '持股損益有效性判斷',
)

console.log('Zia finalization complete.')
