/**
 * 生成 favicon.ico（packages/react-okr-tree/scripts/gen-favicon.mjs）
 *
 * 为什么放在库里：站点原先只有 favicon.svg，`/favicon.ico` 是 404。老浏览器、部分爬虫与
 * 聚合器仍会先请求 `/favicon.ico`，404 会在服务器日志里留一条持续噪音。仓库里唯一现成的
 * 光栅化器就是 Playwright 的 Chromium（与 gen-og.mjs 同一套前提），所以这个脚本在这里，
 * 产物写到站点的 public/。
 *
 * 产物是一个**内嵌 PNG 的 ICO**（Vista+ 起所有主流浏览器都支持，且比 BMP 小得多）。
 * ico 容器只有 22 字节头 + 一段 PNG，不需要任何图像库。
 *
 * 用法：node scripts/gen-favicon.mjs（改了 logo 后重跑一次，产物提交进仓库）
 */
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const out = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../../apps/website/public/favicon.ico'
)

/** 32×32 的品牌标记：与 public/logo.svg 同一套路径（深色圆角方 + 双环 + 蓝点） */
const mark = `
<svg width="32" height="32" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="356" height="356" rx="78" fill="#17171A" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="4"/>
  <g fill="none" stroke="#FFF" stroke-width="22" stroke-linecap="round">
    <path d="M110.6 149.1a76 76 0 0 1 138.8 0M110.6 210.9a76 76 0 0 0 138.8 0"/>
    <path d="M62 180h26M272 180h26"/>
  </g>
  <rect x="163" y="163" width="34" height="34" rx="10" fill="#3370FF"/>
</svg>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 32, height: 32 }, deviceScaleFactor: 1 })
await page.setContent(
  `<!doctype html><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}html,body{width:32px;height:32px;overflow:hidden}</style>${mark}`,
  { waitUntil: 'load' }
)
const png = await page.screenshot({ type: 'png' })
await browser.close()

// ICO 容器：6 字节 ICONDIR + 16 字节 ICONDIRENTRY + PNG 载荷
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // 保留
header.writeUInt16LE(1, 2) // 1 = 图标
header.writeUInt16LE(1, 4) // 图片张数

const entry = Buffer.alloc(16)
entry.writeUInt8(32, 0) // 宽
entry.writeUInt8(32, 1) // 高
entry.writeUInt8(0, 2) // 调色板颜色数（PNG 载荷不用调色板）
entry.writeUInt8(0, 3) // 保留
entry.writeUInt16LE(1, 4) // 色平面
entry.writeUInt16LE(32, 6) // 每像素位数
entry.writeUInt32LE(png.length, 8) // 载荷字节数
entry.writeUInt32LE(22, 12) // 载荷在文件中的偏移

writeFileSync(out, Buffer.concat([header, entry, png]))
console.log(`[gen-favicon] 写出 ${out}（PNG ${png.length} B + 22 B 容器）`)
