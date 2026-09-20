/**
 * 生成文档站的 OG 卡片（public/og.png，1200×630）。
 *
 * 为什么放在库里而不是站点里：静态导出没有 `opengraph-image.tsx`（那是服务端运行时的能力），
 * 而 satori/sharp 都不在依赖清单上；仓库里唯一现成的光栅化器就是 Playwright 的 Chromium，
 * 它只装在 packages/react-okr-tree。所以这个脚本在这里，产物写到站点的 public/。
 *
 * 版式对齐源 okr-tree 站的 og-image.png（深色卡 + 品牌标记 + 标题 + 一行副标题 +
 * 一行特性 + 域名），文字换成本项目自己的。
 *
 * 用法：node scripts/gen-og.mjs（改了文案后重跑一次，产物提交进仓库）
 */
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const out = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../../apps/website/public/og.png'
)

// 品牌标记（与 public/logo.svg 同一套路径，改成内联以便光栅化）
const mark = `
<svg width="230" height="230" viewBox="0 0 360 360" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="356" height="356" rx="78" fill="#17171A" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="4"/>
  <g fill="none" stroke="#FFF" stroke-width="22" stroke-linecap="round">
    <path d="M110.6 149.1a76 76 0 0 1 138.8 0M110.6 210.9a76 76 0 0 0 138.8 0"/>
    <path d="M62 180h26M272 180h26"/>
  </g>
  <rect x="163" y="163" width="34" height="34" rx="10" fill="#3370FF"/>
</svg>`

const html = `<!doctype html>
<meta charset="utf-8">
<style>
  * { margin: 0; box-sizing: border-box }
  html, body { width: 1200px; height: 630px; overflow: hidden }
  body {
    background: #0A0A0B; color: #FAFAFA;
    font-family: "Maple Mono CN", "Microsoft YaHei", "PingFang SC", sans-serif;
    display: flex; align-items: center; gap: 64px; padding: 0 88px;
  }
  h1 { font-size: 82px; font-weight: 700; letter-spacing: -1px }
  .sub { font-size: 40px; color: #E4E4E7; margin-top: 22px }
  .feat { font-size: 27px; color: #8B8B92; margin-top: 22px }
  .host { font-size: 29px; color: #3370FF; margin-top: 34px }
</style>
<div>${mark}</div>
<div>
  <h1>react-okr-tree</h1>
  <p class="sub">React 组织架构树 / OKR 树组件</p>
  <p class="feat">三种布局 · 根节点双向展开 · 6 套主题 · 画布缩放与导出</p>
  <p class="host">react-okr-tree.baiwumm.com</p>
</div>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: out })
await browser.close()
console.log('[gen-og] 写出', out)
