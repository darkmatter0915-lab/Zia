import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const assetLabRuntimeFiles = ['src/warrior-asset-lab/lab.js', 'src/warrior-asset-lab/audit.js', 'src/warrior-asset-lab/asset-io.js']
const required = [
  'index.html',
  'src/main.js',
  'src/app.js',
  'src/views.js',
  'src/forms.js',
  'src/data.js',
  'src/store.js',
  'src/utils.js',
  'src/style.css',
  'warrior-asset-lab/index.html',
  'src/warrior-asset-lab/main.js',
  'src/warrior-asset-lab/style.css',
  ...assetLabRuntimeFiles,
  'public/assets/characters/warrior/README.md',
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/icons/zia-icon.svg',
]

const errors = []
for (const file of required) {
  if (!existsSync(join(root, file))) errors.push(`缺少必要檔案：${file}`)
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const sourceJavascriptFiles = existsSync(join(root, 'src'))
  ? walk(join(root, 'src')).filter((file) => extname(file) === '.js')
  : []
const runtimeJavascriptFiles = assetLabRuntimeFiles.map((file) => join(root, file)).filter(existsSync)
const javascriptFiles = [...sourceJavascriptFiles, ...runtimeJavascriptFiles]

for (const file of javascriptFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (result.status !== 0) errors.push(`${file.slice(root.length + 1)} 語法錯誤\n${result.stderr.trim()}`)

  if (!file.startsWith(join(root, 'src'))) continue
  const source = readFileSync(file, 'utf8')
  const imports = [...source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)]
  for (const match of imports) {
    const candidate = resolve(dirname(file), match[1])
    const options = [candidate, `${candidate}.js`, join(candidate, 'index.js')]
    if (!options.some(existsSync)) errors.push(`${file.slice(root.length + 1)} 引用了不存在的 ${match[1]}`)
  }
}

const assetLabEntryPath = join(root, 'src/warrior-asset-lab/main.js')
const assetLabHtmlPath = join(root, 'warrior-asset-lab/index.html')
const assetLabRuntimeSource = runtimeJavascriptFiles.map((file) => readFileSync(file, 'utf8')).join('\n')
if (existsSync(assetLabEntryPath)) {
  const source = readFileSync(assetLabEntryPath, 'utf8')
  if (!source.includes('import.meta.env.BASE_URL')) {
    errors.push('Warrior Asset Lab 必須使用 import.meta.env.BASE_URL 載入公開資產')
  }

}
if (!assetLabRuntimeSource.includes('assets/characters/warrior/warrior.glb')) {
  errors.push('Warrior Asset Lab 缺少正式 warrior.glb 路徑')
}
if (/premium-pack|premium-boot|premium-payload|方塊角色/i.test(assetLabRuntimeSource)) {
  errors.push('Warrior Asset Lab 不得載入舊 premium-pack 或方塊角色')
}

if (existsSync(assetLabHtmlPath)) {
  const html = readFileSync(assetLabHtmlPath, 'utf8')
  if (!html.includes('WAITING_FOR_WARRIOR_ASSET')) {
    errors.push('Warrior Asset Lab 缺少 WAITING_FOR_WARRIOR_ASSET 畫面')
  }
}

if (errors.length) {
  console.error(`Zia check failed (${errors.length})`)
  errors.forEach((error) => console.error(`\n• ${error}`))
  process.exit(1)
}

console.log(`Zia check passed: ${required.length} required files, ${javascriptFiles.length} JavaScript files.`)
