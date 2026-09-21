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
 * 2. ESM 产物保留三家打包器的 ignore 注释 —— Next 16 的 Turbopack 只认
 *    `webpackIgnore` / `turbopackIgnore`，只有 `@vite-ignore` 时它会在**构建期**
 *    直接报 Module not found（文档站是第一个撞上的真实消费者）；
 * 3. CJS / UMD 同理不得出现静态 require。
 */
const esSource = readFileSync(distEs, 'utf8')
assert(
  /@vite-ignore/.test(esSource) &&
    /webpackIgnore:\s*true/.test(esSource) &&
    /turbopackIgnore:\s*true/.test(esSource),
  'ESM 保留可选 peer 的动态导入与三家 ignore 注释'
)
for (const [name, src] of [
  ['es', esSource],
  ['cjs', readFileSync(distCjs, 'utf8')],
  ['umd', umdSource],
]) {
  assert(
    !/(?:require|import)\(\s*(["`'])html-to-image\1/.test(src),
    `${name} 未静态引入可选 peer（说明符走变量）`
  )
}

if (failures.length) {
  console.error(`[verify:dist] ${failures.length} 项失败`)
  process.exit(1)
}
console.log('[verify:dist] ALL PASSED')
