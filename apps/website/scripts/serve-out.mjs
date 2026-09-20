// 静态导出产物的本地文件服务器：给 Playwright 的视觉门禁当 webServer 用。
//
// 为什么不用 `next dev`：视觉基线要的是**部署形态**的样子，而部署的是 `out/` 里那批
// 静态文件（Cloudflare 纯静态资产）。dev 服务器带未压缩的 React 与不同的水合时机，
// 用它做基线等于给一个线上不存在的形态拍照。
//
// 用法：node scripts/serve-out.mjs --port 4173（端口也可用 OKR_VISUAL_PORT 覆盖）
// Windows 的 TCP 排除区间常把 4173 整段保留（netsh int ipv4 show excludedportrange protocol=tcp），
// listen 直接 EACCES 时用 --port 换一个。
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const outDir = resolve(fileURLToPath(new URL('../out', import.meta.url)))
const port = Number(arg('port', process.env.OKR_VISUAL_PORT || 4173))
const host = arg('host', '127.0.0.1')

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.png': 'image/png',
}

if (!existsSync(outDir)) {
  console.error(`[serve-out] 没有 ${outDir}，先跑 pnpm --filter react-okr-tree-website build`)
  process.exit(1)
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${host}`)
  const rel = decodeURIComponent(url.pathname)
  const target = normalize(join(outDir, rel))
  if (!target.startsWith(outDir)) {
    res.writeHead(403).end('forbidden')
    return
  }
  try {
    let file = target
    if (existsSync(target) && statSync(target).isDirectory()) file = join(target, 'index.html')
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    console.warn(`[serve-out] 404 ${rel}`)
    // 与 Cloudflare 的 not_found_handling: 404-page 一致：回 404.html
    try {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
      res.end(await readFile(join(outDir, '404.html')))
    } catch {
      res.writeHead(404).end('not found')
    }
  }
}).listen(port, host, () => {
  console.log(`[serve-out] ${outDir} → http://${host}:${port}`)
})
