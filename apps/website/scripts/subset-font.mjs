#!/usr/bin/env node
/**
 * 字体子集化（2026-11-25）
 *
 * 站点正文全用 Maple Mono CN，原始子集 1.7MB（GB2312 全集 + ASCII）。它是首访最大的单个
 * 资源，占传输量 82%，也是慢网下 LCP 的瓶颈。这个脚本把字体裁到「站点实际用到的那批字」。
 *
 * 用法：
 *   node scripts/subset-font.mjs           # 重新生成子集 + 字符清单（改内容后跑一次）
 *   node scripts/subset-font.mjs --check   # 只校验：out/ 里的字是否都在清单里（CI 用）
 *
 * 为什么是「清单 + 校验」而不是构建期自动裁剪：
 * - 子集化需要 harfbuzz（subset-font 里是 wasm），把这种东西塞进 next build 会让构建变慢、
 *   还多一条失败路径；字体属于「内容资产」，改内容时重新生成更可控。
 * - `--check` 在 CI 里跑，任何新页/新文案引入清单外的字都会当场红，不会静默退化成系统字体。
 *
 * 源字体在 `font-src/`（完整 GB2312 子集，1.7MB，只作为裁剪输入、不进产物）；产物是
 * `public/fonts/maple-mono-cn-regular.woff2`。**必须从源字体裁**——从上一版子集裁会让已被
 * 裁掉的字形永久丢失。
 *
 * 字符来源：`content/**`（正文）、`components/**`、`app/**`、`lib/**`（界面文案）、
 * `public/llms.txt`、以及库的 `shared/api.ts`（API 表由它渲染）。若 `out/` 存在，
 * 额外并上**已导出 HTML** 里的字——那是最终上屏的集合，兜住来源扫描漏掉的部分。
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import subsetFont from 'subset-font'

const SITE = fileURLToPath(new URL('..', import.meta.url))
/** 完整字体（构建期源，不进产物）：子集只能从它出发，不能从上一版子集出发，否则裁掉的字形再也回不来 */
const SRC_FONT = join(SITE, 'font-src/maple-mono-cn-regular.woff2')
const FONT = join(SITE, 'public/fonts/maple-mono-cn-regular.woff2')
const MANIFEST = join(SITE, 'scripts/font-subset-chars.txt')
const OUT = join(SITE, 'out')

const SCAN_DIRS = ['content', 'components', 'app', 'lib']
const SCAN_FILES = ['public/llms.txt', '../../packages/react-okr-tree/shared/api.ts']
const TEXT_EXT = new Set(['.mdx', '.md', '.ts', '.tsx', '.tsx/', '.json', '.txt', '.css'])

/** ASCII 可见字符 + 常用标点/符号：代码块、数字、箭头、破折号等在正文里到处都是 */
const BASE = (() => {
  let s = ''
  for (let c = 0x20; c <= 0x7e; c++) s += String.fromCharCode(c)
  return s + '‘’“”—–…·×≥≤←→↑↓「」『』（）【】《》、。，：；？！'
})()

const walk = dir =>
  existsSync(dir)
    ? readdirSync(dir).flatMap(entry => {
        const p = join(dir, entry)
        if (entry === 'node_modules' || entry === 'out' || entry.startsWith('.')) return []
        return statSync(p).isDirectory() ? walk(p) : [p]
      })
    : []

const charsOf = (text, set) => {
  for (const ch of text) set.add(ch)
  return set
}

function collectSources() {
  const set = new Set(BASE)
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(SITE, dir))) {
      if (!TEXT_EXT.has(file.slice(file.lastIndexOf('.')))) continue
      charsOf(readFileSync(file, 'utf8'), set)
    }
  }
  for (const rel of SCAN_FILES) {
    const file = resolve(SITE, rel)
    if (existsSync(file)) charsOf(readFileSync(file, 'utf8'), set)
  }
  // 已导出的 HTML 是上屏集合的兜底（标签本身是 ASCII，无害）
  if (existsSync(OUT)) {
    for (const file of walk(OUT)) {
      if (file.endsWith('.html')) charsOf(readFileSync(file, 'utf8'), set)
    }
  }
  return set
}

const printable = chars =>
  [...chars].filter(ch => {
    const code = ch.codePointAt(0)
    return code >= 0x20 && code !== 0x7f
  })

const checkMode = process.argv.includes('--check')

if (checkMode) {
  if (!existsSync(MANIFEST)) {
    console.error(
      `[fonts] 缺少字符清单 ${relative(SITE, MANIFEST)}，先跑一次 node scripts/subset-font.mjs`
    )
    process.exit(1)
  }
  if (!existsSync(OUT)) {
    console.error('[fonts] 缺少 out/，--check 需要先构建')
    process.exit(1)
  }
  const manifest = new Set(readFileSync(MANIFEST, 'utf8').split('\n').filter(Boolean))
  const shipped = new Set()
  for (const file of walk(OUT)) {
    if (!file.endsWith('.html')) continue
    for (const ch of readFileSync(file, 'utf8')) if (ch.codePointAt(0) >= 0x20) shipped.add(ch)
  }
  const missing = printable([...shipped].filter(ch => !manifest.has(ch)).join(''))
  if (missing.length) {
    console.error(`[fonts] 有 ${missing.length} 个字符不在字体子集里（会静默退化成系统字体）：`)
    console.error('  ' + missing.slice(0, 120))
    console.error('  修法：node scripts/subset-font.mjs 重新生成子集与清单，然后提交')
    process.exit(1)
  }
  console.log(`[fonts] ok: 导出的 ${shipped.size} 个字符全部在子集清单内`)
  process.exit(0)
}

const chars = printable([...collectSources()].join(''))
const ordered = [...new Set([...BASE, ...chars])].sort(
  (a, b) => a.codePointAt(0) - b.codePointAt(0)
)
const source = readFileSync(SRC_FONT)
const subset = await subsetFont(source, ordered.join(''), { targetFormat: 'woff2' })

writeFileSync(FONT, subset)
writeFileSync(MANIFEST, ordered.join('\n') + '\n')

const kb = n => `${(n / 1024).toFixed(0)}KB`
console.log(`[fonts] 子集 ${ordered.length} 个字符`)
console.log(
  `[fonts] 字体 ${kb(source.length)} → ${kb(subset.length)}（省 ${(100 - (subset.length / source.length) * 100).toFixed(1)}%）`
)
console.log(`[fonts] 清单写入 ${relative(SITE, MANIFEST)}`)
console.log('[fonts] 别忘了 pnpm build 重新导出，并跑一次视觉基线确认渲染没变')
