import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
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

const javascriptFiles = existsSync(join(root, 'src'))
  ? walk(join(root, 'src')).filter((file) => extname(file) === '.js')
  : []

for (const file of javascriptFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (result.status !== 0) errors.push(`${file.slice(root.length + 1)} 語法錯誤\n${result.stderr.trim()}`)

  const source = readFileSync(file, 'utf8')
  const imports = [...source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)]
  for (const match of imports) {
    const candidate = resolve(dirname(file), match[1])
    const options = [candidate, `${candidate}.js`, join(candidate, 'index.js')]
    if (!options.some(existsSync)) errors.push(`${file.slice(root.length + 1)} 引用了不存在的 ${match[1]}`)
  }
}

if (errors.length) {
  console.error(`Zia check failed (${errors.length})`)
  errors.forEach((error) => console.error(`\n• ${error}`))
  process.exit(1)
}

console.log(`Zia check passed: ${required.length} required files, ${javascriptFiles.length} JavaScript modules.`)
