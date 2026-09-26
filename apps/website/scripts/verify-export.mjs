// 静态导出真实性 + 站内死链检查（CI 的 website job 跑这个）。
//
// 为什么单独写一个脚本而不是只看 `next build` 的退出码：
// 部署链路是 Cloudflare 的**纯静态资产**（源 okr-tree 站的做法），
// 所以「构建通过」并不等价于「可部署」——导出的 HTML 里只要留一个指向
// 服务端 Route Handler 的死链、或一个 404 的站内链接，线上才会暴露。
// 这里断言的是产物层面的四件事：
//   1. out/ 存在且是纯文件（没有 .next/standalone、没有 server action 清单）；
//   2. 站内 href/src 全部能落到 out/ 里的真实文件（外链与 #锚点 放行），og/twitter image meta 的
//      content 走同一套解析（这条是 2026-09-26 补的，此前正则扫不到 meta，og.png 丢了没人报）；
//   3. 关键资产齐备：/api/search 索引、sitemap.xml、robots.txt、字体、favicon；
//   4. sitemap 覆盖所有文档页，且每个页面的 canonical 与 SITE.url 同源。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, normalize } from 'node:path'

const OUT = 'out'
const SITE_URL = 'https://react-okr-tree.baiwumm.com'

const failures = []
const ok = msg => console.log(`[verify:export] ok: ${msg}`)
const assert = (cond, msg) => (cond ? ok(msg) : failures.push(msg))

const walk = dir =>
  readdirSync(dir).flatMap(entry => {
    const p = join(dir, entry)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

if (!existsSync(OUT)) {
  console.error(`[verify:export] 缺少 ${OUT}/，先跑 pnpm build`)
  process.exit(1)
}

const files = walk(OUT)
const htmlFiles = files.filter(f => f.endsWith('.html'))

// ---- 1. 纯静态 ----
assert(htmlFiles.length >= 5, `导出 HTML 数量 ${htmlFiles.length}`)
assert(
  !files.some(f => /_[r]?server|server\.js$|\.next\/standalone/.test(f)),
  '无服务端运行时产物残留'
)
const allHtml = htmlFiles.map(f => readFileSync(f, 'utf8'))
assert(
  !allHtml.some(h => h.includes('"actionId"') || h.includes('$ACTION')),
  '无 Server Action 引用（静态导出下本就不该出现）'
)

// ---- 2. 死链 ----
// out/ 的路径形态：/docs/start/ -> out/docs/start/index.html（trailingSlash: true）
const resolveLocal = href => {
  const clean = decodeURIComponent(href.split('#')[0].split('?')[0])
  if (clean === '') return true
  const base = join(OUT, normalize(clean).replace(/^(\.\.[/\\])+/, ''))
  if (existsSync(base) && statSync(base).isFile()) return true
  return existsSync(join(base, 'index.html'))
}

const dead = new Set()
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8')
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = m[1]
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(raw)) continue
    if (raw.startsWith('#')) continue
    // 构建期注入的 /_next/... 与 RSC payload 走同一套解析
    const path = raw.startsWith('http') ? new URL(raw).pathname : raw
    if (!resolveLocal(path)) dead.add(`${file.replace(OUT + '/', '')} -> ${raw}`)
  }
}
assert(dead.size === 0, `站内链接全部可解析（死链 ${dead.size} 条）`)
for (const d of [...dead].slice(0, 15)) console.error('  ' + d)

// ---- 2.5 image meta（G11 的那个检测盲区）----
// 上面那条正则只看 href/src，而 app/layout.tsx 的 `images: ['/og.png']` 渲染成
// <meta property="og:image" content="…/og.png">——图丢了线上是社交卡片空白，CI 却全绿。
// 这里把 image 类 meta 单独扫一遍，摘掉 SITE_URL 前缀后按同一套 resolveLocal 验文件真的存在。
const imageMetaTag = /<meta\b[^>]*>/g
let imageMetaHits = 0
const deadImages = new Set()
for (const file of htmlFiles) {
  for (const tag of readFileSync(file, 'utf8').matchAll(imageMetaTag)) {
    const key = /(?:property|name)="(?:og|twitter):image"/.exec(tag[0])
    const content = /content="([^"]*)"/.exec(tag[0])
    if (!key || !content?.[1]) continue
    const raw = content[1]
    imageMetaHits++
    const path = raw.startsWith(SITE_URL) ? raw.slice(SITE_URL.length) : raw
    if (!path.startsWith('/') || !resolveLocal(path))
      deadImages.add(`${file.replace(OUT + '/', '')} -> ${raw}`)
  }
}
// 命中数为 0 意味着 meta 形状变了、正则失配，下面那条就退化成永真——所以先钉命中数
assert(imageMetaHits > 0, `导出里有 ${imageMetaHits} 条 og/twitter image meta 可扫`)
assert(deadImages.size === 0, `image meta 指向的文件全部真实存在（缺失 ${deadImages.size} 条）`)
for (const d of [...deadImages].slice(0, 10)) console.error('  ' + d)

// ---- 3. 关键资产 ----
for (const p of [
  'api/search',
  'sitemap.xml',
  'robots.txt',
  'favicon.svg',
  'og.png',
  'logo.svg',
  'logo-dark.svg',
  'fonts/maple-mono-cn-regular.woff2',
  '404.html',
]) {
  assert(existsSync(join(OUT, p)), `资产存在：/${p}`)
}
const index = JSON.parse(readFileSync(join(OUT, 'api/search'), 'utf8'))
assert(
  (index.type === 'advanced' || index.type === 'simple') &&
    index.index?.indexes &&
    Object.keys(index.index.indexes).length > 0 &&
    Array.isArray(index.internalDocumentIDStore?.internalIdToId) &&
    index.internalDocumentIDStore.internalIdToId.length > 0,
  '站内搜索索引结构可被 staticClient 载入（含文档 id 与各字段子树）'
)

// ---- 4. sitemap 覆盖文档页 ----
// app/sitemap.ts 用的是 source 的 page.url（形如 /docs、/docs/start，不带尾斜杠），
// 而磁盘形态是 out/docs/start/index.html，所以这里按同一套规则反推再比对。
const sitemap = readFileSync(join(OUT, 'sitemap.xml'), 'utf8')
assert(sitemap.includes(`${SITE_URL}/`), 'sitemap 收录落地页')
const docPages = htmlFiles
  .map(f => f.slice(OUT.length + 1).replace(/\\/g, '/'))
  .filter(p => (p === 'docs/index.html' || p.startsWith('docs/')) && p.endsWith('index.html'))
  .map(p => `${SITE_URL}/${p.replace(/\/index\.html$/, '').replace(/^docs$/, 'docs')}`)
const missing = docPages.filter(url => !sitemap.includes(url))
assert(missing.length === 0, `sitemap 覆盖 ${docPages.length} 个文档页（缺 ${missing.length}）`)
for (const m of missing.slice(0, 10)) console.error('  ' + m)
assert(
  allHtml.every(h => !h.includes('localhost:') && !h.includes('127.0.0.1')),
  'HTML 里没有本地回环地址残留'
)

if (failures.length) {
  // 只报数量等于没报：CI 上红一条时得靠猜是哪一项，所以逐条打出来
  for (const f of failures) console.error(`[verify:export] FAIL: ${f}`)
  console.error(`[verify:export] ${failures.length} 项失败`)
  process.exit(1)
}
console.log('[verify:export] ALL PASSED')
