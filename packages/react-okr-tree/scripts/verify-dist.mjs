/**
 * 发布产物冒烟验证（移植自源项目 scripts/verify-dist.mjs）：
 * 直接引入 dist/react-okr-tree.es.js，在 jsdom 里挂载三种模式并断言渲染结果与 ref 方法。
 * 用法：pnpm build && pnpm verify:dist
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distEs = resolve(root, 'dist/react-okr-tree.es.js')
const distCjs = resolve(root, 'dist/react-okr-tree.cjs')
const distUmd = resolve(root, 'dist/react-okr-tree.umd.js')
const distCss = resolve(root, 'dist/style.css')
const distDts = resolve(root, 'dist/index.d.ts')
const distDcts = resolve(root, 'dist/index.d.cts')

const failures = []
const assert = (cond, msg) => {
  if (!cond) {
    console.error(`[verify:dist] FAILED: ${msg}`)
    failures.push(msg)
    return
  }
  console.log(`[verify:dist] ok: ${msg}`)
}

for (const f of [distEs, distCjs, distUmd, distCss, distDts, distDcts]) {
  if (!existsSync(f)) {
    console.error(`[verify:dist] 缺少产物: ${f}`)
    process.exit(1)
  }
}

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document
// Node 21+ 自带只读的 globalThis.navigator，直接赋值会抛 TypeError
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
})
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.Element = dom.window.Element
globalThis.Node = dom.window.Node
globalThis.MouseEvent = dom.window.MouseEvent
globalThis.KeyboardEvent = dom.window.KeyboardEvent
globalThis.Event = dom.window.Event
globalThis.getComputedStyle = dom.window.getComputedStyle
globalThis.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0)
globalThis.cancelAnimationFrame = id => clearTimeout(id)
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const React = await import('react')
const { createRoot } = await import('react-dom/client')
const { act } = React
const lib = await import(pathToFileURL(distEs).href)

assert(typeof lib.OkrTree === 'function' || typeof lib.OkrTree === 'object', '导出 OkrTree')
assert(typeof lib.TreeStore === 'function', '导出 TreeStore')
assert(typeof lib.TreeNode === 'function', '导出 TreeNode')
assert(
  typeof lib.clampZoom === 'function' && typeof lib.computeFit === 'function',
  '导出 clampZoom / computeFit'
)
assert(
  typeof lib.getNodeKey === 'function' && lib.NODE_KEY === '$treeNodeId',
  '导出 getNodeKey / NODE_KEY'
)

const data = [
  {
    id: 1,
    label: 'R',
    children: [
      { id: 2, label: 'C' },
      { id: 3, label: 'D' },
    ],
  },
]
const leftData = [{ id: 1, label: 'R', children: [{ id: 12, label: 'L' }] }]

const mount = props => {
  const el = dom.window.document.createElement('div')
  dom.window.document.body.appendChild(el)
  const ref = React.createRef()
  const rootInstance = createRoot(el)
  act(() => {
    rootInstance.render(React.createElement(lib.OkrTree, { ...props, ref }))
  })
  return { el, handle: ref.current, unmount: () => act(() => rootInstance.unmount()) }
}

const texts = el =>
  Array.from(el.querySelectorAll('.org-chart-node-label-inner')).map(n => n.textContent.trim())

const v = mount({ data })
assert(JSON.stringify(texts(v.el)) === JSON.stringify(['R', 'C', 'D']), '垂直模式渲染')
assert(v.el.querySelector('.org-chart-node-children').classList.contains('vertical'), 'vertical 类')
v.unmount()

const hz = mount({ data, direction: 'horizontal', showCollapsable: true, nodeKey: 'id' })
assert(
  hz.el.querySelector('.org-chart-node-children').classList.contains('horizontal'),
  'horizontal 类'
)
assert(hz.el.querySelector('.org-chart-node-btn') !== null, '展开按钮存在')
assert(hz.handle.getNode(2).label === 'C', 'handle.getNode 可用')
hz.unmount()

const okr = mount({
  data,
  leftData,
  onlyBothTree: true,
  direction: 'horizontal',
  nodeKey: 'id',
})
assert(okr.el.querySelector('.org-chart-node-left-children') !== null, 'OKR 左子树渲染')
assert(okr.el.querySelector('.org-chart-node').classList.contains('align-root'), 'align-root 类')
assert(texts(okr.el).includes('L'), 'OKR 左节点文本')
okr.unmount()

const themed = mount({ data, theme: 'feishu' })
assert(
  themed.el.querySelector('.org-chart-container').classList.contains('okr-theme-feishu'),
  'theme prop 加类'
)
themed.unmount()

const css = readFileSync(distCss, 'utf8')
assert(css.includes('.org-chart-container'), 'style.css 含组件样式')
// Q6 / R7：六种内置过渡名必须在 CSS 里各有 enter / leave 两组类。
// 组件侧的 okr-anim-<name> 类是拼字符串生成的，CSS 少一组不会报错，只会静默没有动画。
const ANIMATE_NAMES = [
  'okr-fade-in-linear',
  'okr-fade-in',
  'okr-zoom-in-center',
  'okr-zoom-in-top',
  'okr-zoom-in-bottom',
  'okr-zoom-in-left',
]
for (const name of ANIMATE_NAMES) {
  assert(
    css.includes(`.${name}-enter-active`) && css.includes(`.${name}-leave-active`),
    `style.css 含 ${name} 的 enter / leave 过渡类`
  )
}
assert(!/^\s*\*\s*\{/m.test(css), 'style.css 无全局 * reset')
assert(
  ['feishu', 'dark', 'auto', 'minimal', 'colorful'].every(t => css.includes(`.okr-theme-${t}`)),
  'style.css 含内置主题预设'
)
assert(
  /prefers-color-scheme:\s*dark/.test(css) && css.includes('.okr-theme-auto'),
  'auto 主题跟随系统暗色'
)
assert(
  css.includes('var(--okr-line-color') && css.includes('var(--okr-node-shadow'),
  '样式已变量化'
)
assert(css.includes('@media print') && css.includes('prefers-reduced-motion'), '含打印与减弱动效块')
/** 这两条与上游 vue3-okr-tree 的 CSS 段逐字同集（两仓 style.css 同源，门禁不该一边多一边少） */
assert(!css.includes('1px solid #ccc'), '连接线颜色无残留硬编码')

/**
 * CSS 几何常量门禁（G17 / 第 1 轮审计报告 §7 第 3 条）。与上游 vue3-okr-tree 同集同形。
 *
 * 两仓的 `style.css` 逐字同源（实测只差头注释与 `@import` 路径两处），`transition.css` 全等，
 * 但**产物** CSS 是两套压缩器各写一遍（本仓走 rolldown 内置的那套，上游是 esbuild），实测
 * 差异全在写法层面：合并声明体相同的相邻规则（本仓因此少 2 条规则、
 * `var(--okr-line-width,1px)` 少 1 次）、重排声明顺序、`transparent` 写成 `0 0`、
 * `.3s height` 写成 `height .3s`、`rgba(255,255,255,.94)` 折成 `#fffffff0`。所以
 * 「两仓产物逐字 diff」这条路走不通（那正是 G17 原本设想的「重装做法」的坑），这里退一步
 * 钉**相互咬合的几何值本身**：这些数字改一个就是连接线错位，组件层没有任何断言能发现它。
 *
 * 匹配前先归一两种形态：`cssFlat` 抹掉全部空白（声明体用它，绕开两侧「逗号后有无空格」的
 * 差异）；`cssSquash` 只把空白串折成一个空格（选择器用它——`.a b` 压成 `.ab` 就不是原意了）。
 */
const cssFlat = css.replace(/\s+/g, '')
const cssSquash = css.replace(/\s+/g, ' ')
/**
 * 几何类变量的兜底值要**处处存在且处处同值**：兜底就是这些值的单一来源（消费方不设变量时
 * 靠它），少一处或改一处都算漂移。只钉兜底里不含嵌套 `var()` 的那几个 ——
 * `--okr-*-shadow` / `--okr-line-color` 一类默认值带括号，简单正则会截断，且两仓压缩后
 * 颜色写法还不一致（实测 `rgba(31,35,41,.08)` vs `#1f232914`），不在这里管。
 */
const GEOMETRY_VARS = [
  ['--okr-gap-level', '20px'],
  ['--okr-gap-sibling', '5px'],
  ['--okr-line-width', '1px'],
  ['--okr-line-radius', '5px'],
  ['--okr-btn-size', '20px'],
  ['--okr-gap-node-y', '10px'],
]
for (const [name, expect] of GEOMETRY_VARS) {
  const hits = [...cssFlat.matchAll(new RegExp(`var\\(${name},([^()]*)\\)`, 'g'))].map(m => m[1])
  const uses = cssFlat.split(`var(${name}`).length - 1
  assert(
    uses > 0 && hits.length === uses,
    `${name} 每处使用都带兜底（uses=${uses}，带兜底=${hits.length}）`
  )
  assert(
    new Set(hits).size === 1 && hits[0] === expect,
    `${name} 的兜底值处处为 ${expect}（实测 ${[...new Set(hits)].join(' / ') || '无'}）`
  )
}
/**
 * 左子树连接线短头：`12px`（宽）/ `calc(100% - 11px)`（左偏移）/ `10px`（高）三个值相互咬合，
 * 源文件里就注明「保持硬编码」。断「恰好出现一次」而不是「出现过」——出现两次说明有人复制
 * 了这条规则却没删原件，那种重复在同特异度下会让后一条说了算。
 */
for (const [label, token] of [
  ['短头宽 12px', 'width:12px'],
  ['短头高 10px', 'height:10px'],
  ['短头左偏移 calc(100% - 11px)', 'left:calc(100%-11px)'],
  ['垂直独子的 -1px 修正', 'margin-right:-1px'],
  ['水平独子去圆角', 'border-radius:0!important'],
]) {
  const n = cssFlat.split(token).length - 1
  assert(n === 1, `几何常量 ${label} 恰好转录一次（实测 ${n} 次）`)
}
/**
 * unstyled 的中和规则必须带满 5 个类：方向专属规则是 4 个类且排在它之后，同特异度后者胜，
 * 少一个类 unstyled 就压不住 hover 阴影。基础 + `:hover` 各一处。
 */
assert(
  cssSquash.split(
    '.org-chart-container.okr-unstyled .org-chart-node .org-chart-node-label .org-chart-node-label-inner'
  ).length -
    1 ===
    2,
  'okr-unstyled 的中和规则是五类选择器（基础与 :hover 各一处）'
)
/**
 * 组对齐的两条规则顺序：`.is-measuring`（`width: max-content`，测量时按自然宽度排）必须排在
 * `.is-measured`（`width: var(--okr-group-left-width)`，把宽度钉住）**之前** —— 两条特异度相同，
 * 后者胜，所以测量期间必须把 `is-measured` 摘掉才读得到自然宽度。顺序一旦颠倒，`measure()`
 * 无论怎么改都会读回被钉住的值。压缩器实测保留规则顺序，故能在产物层钉。
 */
const measuringAt = cssFlat.indexOf('.is-measuring')
const measuredAt = cssFlat.indexOf('.is-measured')
assert(
  measuringAt >= 0 && measuredAt > measuringAt,
  `.is-measuring 排在 .is-measured 之前（实测 ${measuringAt} / ${measuredAt}）`
)
assert(
  cssFlat.includes('width:max-content') && cssFlat.includes('width:var(--okr-group-left-width)'),
  '组对齐的自然宽度与钉宽两条规则都在产物里'
)

const dts = readFileSync(distDts, 'utf8')
assert(dts.includes('OkrTree') && dts.includes('TreeStore'), 'index.d.ts 含导出声明')
assert(!/from '\.\.?\//.test(dts), 'index.d.ts 无未打包的相对路径引用')
const dcts = readFileSync(distDcts, 'utf8')
assert(dcts === dts, 'index.d.cts 与 index.d.ts 内容一致（CJS require 类型条件）')

const require = createRequire(import.meta.url)
const cjs = require(distCjs)
assert(
  typeof cjs.OkrTree === 'function' || typeof cjs.OkrTree === 'object',
  'require() 可拿到 OkrTree'
)
assert(cjs.NODE_KEY === '$treeNodeId', 'require() 可拿到 NODE_KEY')

// D6 + R8 的产物层面落地：默认导出与 RSC 边界指令
assert(
  cjs.default != null && cjs.default === cjs.OkrTree,
  'require() 的 default 与具名 OkrTree 是同一引用（D6）'
)
for (const [name, file] of [
  ['es', distEs],
  ['cjs', distCjs],
  ['umd', distUmd],
]) {
  const src = readFileSync(file, 'utf8')
  /**
   * 必须「以分号或换行收尾」，而不只是开头有这句话：压缩会把 banner 与下一行并成一行，
   * `"use client"(function(...){...})` 就成了「把字符串当函数调用」，整包在加载期 TypeError。
   * UMD 的形态正是 `"use client";(function(e,t){...}` ——有分号，紧跟 `(` 是另一条语句。
   */
  assert(
    /^(['"])use client\1(?:;|\r?\n)/.test(src),
    `${name} 首行是收尾明确的 'use client'（RSC 边界，R8）`
  )
}

const umdSource = readFileSync(distUmd, 'utf8')
// 这条原先写成 `... || /React/.test(umdSource)`，而产物里必然含 ReactOkrTree 字样，恒真等于没断言。
// 判据换成两件事：UMD 的 CJS 分支确实把 react 当外部依赖 require（没被内联进包体），
// 以及把整份 UMD 真跑一遍——跑通即证明工厂签名与外部依赖声明都正确，浏览器 <script> 用户才拿得到东西。
assert(/require\((["'`])react\1\)/.test(umdSource), 'UMD 的 CJS 分支把 react 作为外部依赖 require')
const umdModule = { exports: {} }
new Function('module', 'exports', 'require', umdSource)(umdModule, umdModule.exports, require)
assert(
  umdModule.exports.OkrTree && umdModule.exports.default === umdModule.exports.OkrTree,
  '.umd.js 可被执行且 default 与 OkrTree 同指一个组件'
)
assert(
  Array.isArray(umdModule.exports.BUILT_IN_THEMES) &&
    umdModule.exports.BUILT_IN_THEMES.length === 6,
  '.umd.js 导出 BUILT_IN_THEMES（6 个内置主题，与 .cjs 一致）'
)

/**
 * optional peer（html-to-image）在产物里要同时满足三件事，缺一都会在下游炸：
 * 1. 说明符经变量传递，不出现静态 import/require —— 否则 Vite/Rollup 会把可选依赖
 *    内联成额外 chunk，或让没装它的消费者连加载都过不了；
 * 2. **三种产物**都保留三家打包器的 ignore 注释 —— Next 16 的 Turbopack 只认
 *    `webpackIgnore` / `turbopackIgnore`，只有 `@vite-ignore` 时它会在**构建期**直接报
 *    Module not found（文档站是第一个撞上的真实消费者）。这里原先只断 ESM，而 cjs / umd
 *    走 esbuild 压缩后三条注释一条不剩（实测 grep 计数全为 0），等于三条路径只守住了
 *    一条；压缩器换成 terser + `format.comments` 白名单后三种都留得住，断言随之铺开。
 * 3. ESM 仍有动态 import 调用点（防止哪天被摇掉或改成顶层 await）。
 */
const esSource = readFileSync(distEs, 'utf8')
for (const [name, src] of [
  ['ESM', esSource],
  ['.cjs', readFileSync(distCjs, 'utf8')],
  ['.umd', umdSource],
]) {
  assert(
    /@vite-ignore/.test(src) &&
      /webpackIgnore:\s*true/.test(src) &&
      /turbopackIgnore:\s*true/.test(src),
    `${name} 保留可选 peer 的三家打包器 ignore 注释`
  )
  assert(
    !/(?:require|import)\(\s*(["`'])html-to-image\1/.test(src),
    `${name} 未静态引入可选 peer（说明符走变量）`
  )
}
assert(/import\(/.test(esSource), 'ESM 保留 html-to-image 的动态 import 调用点')

if (failures.length) {
  console.error(`[verify:dist] ${failures.length} 项失败`)
  process.exit(1)
}
console.log('[verify:dist] ALL PASSED')
