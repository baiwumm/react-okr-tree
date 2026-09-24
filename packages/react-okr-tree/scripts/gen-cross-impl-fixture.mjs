/**
 * 跨实现比对的 vue3 侧夹具捕获脚本（react 权威清单 G15）。
 *
 * 用真实 Chromium 加载姊妹包 vue3-okr-tree 的 UMD 产物，按下面 modes 逐个挂载，
 * 序列化 `.org-chart-container` 的 outerHTML 写进 tests/visual/fixtures/cross-impl-vue3.json。
 * 常驻门禁是 tests/visual/cross-impl.spec.ts：它拿夹具里同一份 props 渲 react（SSR），
 * 两边都在浏览器里过一遍 DOM 往返再归一化比对。
 *
 * 这里存的必须是**原始 outerHTML**、不做任何归一化：归一化留在测试端一次做两侧，
 * 换 Chromium 版本时差异会同时对两边生效，不会只归一了一侧。
 *
 * 用法（姊妹仓库需已 pnpm build）：
 *   node scripts/gen-cross-impl-fixture.mjs
 *   OKR_VUE3_DIR=/path/to/vue3-okr-tree node scripts/gen-cross-impl-fixture.mjs
 *
 * props 只放 JSON 可序列化的值：本门禁比的是 DOM 形状与内联样式，插槽 / 渲染函数不在覆盖内
 * （两边本就不形）。`connector="svg"` 的 path `d` 要真实几何才有意义，SSR 比不了，所以这些
 * 模式另存一份 `paths`（挂载稳态后按文档顺序取 `svg path` 的 d 属性），由
 * tests/visual/cross-impl-svg.spec.ts 与 react 侧真实浏览器结果比对。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vue3Dir = process.env.OKR_VUE3_DIR
  ? resolve(process.env.OKR_VUE3_DIR)
  : resolve(pkgRoot, '../../../vue3-okr-tree')
const umdPath = resolve(vue3Dir, 'dist/vue3-okr-tree.umd.js')
const vueGlobalPath = resolve(vue3Dir, 'node_modules/vue/dist/vue.global.prod.js')
const fixturePath = resolve(pkgRoot, 'tests/visual/fixtures/cross-impl-vue3.json')

for (const p of [umdPath, vueGlobalPath]) {
  if (!existsSync(p)) {
    console.error(`[cross-impl] 缺文件：${p}\n请先在 ${vue3Dir} 里 pnpm build（或设 OKR_VUE3_DIR）`)
    process.exit(1)
  }
}

const data = [
  {
    id: 1,
    label: 'Root',
    children: [
      { id: 2, label: 'B', children: [{ id: 3, label: 'C' }] },
      { id: 4, label: 'D' },
    ],
  },
]
const leftData = [{ id: 1, label: 'Root', children: [{ id: 12, label: 'L' }] }]

/** 与 tests/components/dom-structure.spec.tsx 的三种布局同源，其余是特性组合 */
const modes = [
  { name: '垂直模式', props: { data, nodeKey: 'id', showCollapsable: true } },
  {
    name: '水平模式',
    props: { data, nodeKey: 'id', showCollapsable: true, direction: 'horizontal' },
  },
  {
    name: 'OKR 双向（全展开）',
    props: {
      data,
      leftData,
      nodeKey: 'id',
      showCollapsable: true,
      onlyBothTree: true,
      direction: 'horizontal',
      defaultExpandAll: true,
    },
  },
  {
    name: 'OKR 双向（左右均收起，含左树收起态）',
    props: {
      data,
      leftData,
      nodeKey: 'id',
      showCollapsable: true,
      onlyBothTree: true,
      direction: 'horizontal',
    },
  },
  {
    name: '复选框 + 拖拽 + 全展开',
    props: {
      data,
      nodeKey: 'id',
      showCollapsable: true,
      showCheckbox: true,
      draggable: true,
      defaultExpandAll: true,
    },
  },
  {
    name: 'animate + 过渡时长变量',
    props: {
      data,
      nodeKey: 'id',
      showCollapsable: true,
      defaultExpandAll: true,
      animate: true,
      animateName: 'okr-fade-in',
      animateDuration: 300,
    },
  },
  {
    name: '水平 + defaultExpandedKeys（折叠态按钮数字）',
    props: {
      data,
      nodeKey: 'id',
      showCollapsable: true,
      direction: 'horizontal',
      defaultExpandedKeys: [1],
      showNodeNum: true,
    },
  },
  {
    name: 'theme=dark + unstyled',
    props: {
      data,
      nodeKey: 'id',
      showCollapsable: true,
      defaultExpandAll: true,
      theme: 'dark',
      unstyled: true,
    },
  },
  {
    name: '标签尺寸（内联样式面）',
    props: {
      data,
      nodeKey: 'id',
      showCollapsable: true,
      defaultExpandAll: true,
      labelWidth: 220,
      labelHeight: 60,
    },
  },
  { name: '空数据', props: { data: [], nodeKey: 'id' } },
  /**
   * 三种 connector 形状的 d 值比对模式。必须显式给 labelWidth / labelHeight：
   * 默认值是 auto，卡片宽高由**文字度量**决定，而换机器（Windows 开发机 ↔ Linux CI）字体
   * 就不同，夹具里存下的 d 会在 CI 上莫名红。钉死盒子尺寸后，几何只由 style.css 的
   * gap / 线宽常量决定，跨机器可复现；字体本身留给上面那批结构用例去覆盖。
   */
  {
    name: 'svg 连线 curve',
    props: {
      data,
      nodeKey: 'id',
      showCollapsable: true,
      defaultExpandAll: true,
      connector: 'svg',
      connectorShape: 'curve',
      labelWidth: 200,
      labelHeight: 60,
    },
  },
  {
    name: 'svg 连线 orthogonal',
    props: {
      data,
      nodeKey: 'id',
      showCollapsable: true,
      defaultExpandAll: true,
      connector: 'svg',
      connectorShape: 'orthogonal',
      labelWidth: 200,
      labelHeight: 60,
    },
  },
  {
    name: 'svg 连线 straight',
    props: {
      data,
      nodeKey: 'id',
      showCollapsable: true,
      defaultExpandAll: true,
      connector: 'svg',
      connectorShape: 'straight',
      labelWidth: 200,
      labelHeight: 60,
    },
  },
  {
    name: 'svg 连线 curve（OKR 双向）',
    props: {
      data,
      leftData,
      nodeKey: 'id',
      showCollapsable: true,
      onlyBothTree: true,
      direction: 'horizontal',
      defaultExpandAll: true,
      connector: 'svg',
      connectorShape: 'curve',
      labelWidth: 200,
      labelHeight: 60,
    },
  },
  {
    /**
     * 左树收起态才有那两条 stubPath 分支（根左侧 `l -20 0`、右树收起 `l 0 20`）——
     * 第 1 轮报告的低级项 3.2（vue3 侧 `stubPath` 冗余三元清理）动的正是这段。
     * 少了这个模式，把 -20 改成 -14 门禁照样全绿（实测过）。
     */
    name: 'svg 连线 curve（OKR 左树收起，含 stubPath）',
    props: {
      data,
      leftData,
      nodeKey: 'id',
      showCollapsable: true,
      onlyBothTree: true,
      direction: 'horizontal',
      connector: 'svg',
      connectorShape: 'curve',
      labelWidth: 200,
      labelHeight: 60,
    },
  },
]

/**
 * 必须与 playwright.config.ts 里 projects[0].use（devices['Desktop Chrome']）一致 ——
 * project 级的 use 会覆盖顶层 use.viewport，所以套件实际跑在 1280×720 而不是 800。
 * d 值只在同视口下可比，cross-impl-svg.spec.ts 有环境自检会把这个不一致直接判失败。
 */
const VIEWPORT = { width: 1280, height: 720 }

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: VIEWPORT,
  deviceScaleFactor: 1,
  locale: 'zh-CN',
  /**
   * 刻意**不**模拟 prefers-reduced-motion：套件默认是 reduce（为了像素稳定），但 react 侧
   * 走 SSR，服务端拿不到 matchMedia、animate 恒为开启；这里若也按 reduce 捕获，vue3 会把
   * animate 当关闭（is-animated / --okr-anim-duration 都不写），animate 模式的结构比对必假红。
   */
  reducedMotion: 'no-preference',
})
await page.setContent(
  '<!doctype html><html><head><meta charset="utf-8"><title>cross-impl fixture</title>' +
    '<style>' +
    readFileSync(resolve(vue3Dir, 'dist/style.css'), 'utf8') +
    '</style></head><body><div id="stage"></div></body></html>'
)
await page.addScriptTag({ content: readFileSync(vueGlobalPath, 'utf8') })
await page.addScriptTag({ content: readFileSync(umdPath, 'utf8') })

const captured = await page.evaluate(async list => {
  const { createApp, h } = window.Vue
  const { OkrTree } = window.VueOkrTree
  const results = []
  for (const mode of list) {
    const host = document.createElement('div')
    document.getElementById('stage').appendChild(host)
    const app = createApp({ render: () => h(OkrTree, mode.props) })
    app.mount(host)
    // 两帧之后才算稳态：挂载期的 rAF / ResizeObserver 回调都要落完
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    const el = host.querySelector('.org-chart-container')
    results.push({
      name: mode.name,
      html: el ? el.outerHTML : null,
      // connector=svg 的几何面：覆盖层里每条 path 的 d，按文档序
      paths: el
        ? Array.from(el.querySelectorAll('.okr-connector-svg path')).map(p => p.getAttribute('d'))
        : [],
    })
    app.unmount()
  }
  return results
}, modes)

const browserVersion = browser.version()
await browser.close()

const missing = captured.filter(c => !c.html).map(c => c.name)
if (missing.length) {
  console.error(`[cross-impl] 这些模式没取到 .org-chart-container：${missing.join(' / ')}`)
  process.exit(1)
}
// svg 模式一条 path 都没取到 = 覆盖层没渲染或被改坏了，别把空数组写进夹具当基线
const emptySvg = modes
  .filter(m => m.props.connector === 'svg')
  .map(m => captured.find(c => c.name === m.name))
  .filter(c => !c || !c.paths.length)
  .map(c => (c ? c.name : '未知'))
if (emptySvg.length) {
  console.error(`[cross-impl] 这些 svg 模式没有 path：${emptySvg.join(' / ')}`)
  process.exit(1)
}

const vue3Pkg = JSON.parse(readFileSync(resolve(vue3Dir, 'package.json'), 'utf8'))
const fixture = {
  source: {
    package: 'vue3-okr-tree',
    version: vue3Pkg.version,
    capturedAt: new Date().toISOString().slice(0, 10),
    chromium: browserVersion,
    generator: 'scripts/gen-cross-impl-fixture.mjs',
    // d 值只有在同样的视口 / dpr / 语言下才可比（见 modes 里 svg 模式为何钉死 label 尺寸）
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    reducedMotion: 'no-preference',
  },
  modes: modes.map((m, i) => ({
    name: m.name,
    props: m.props,
    html: captured[i].html,
    paths: captured[i].paths,
  })),
}
writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)
console.log(
  `[cross-impl] 已写入 ${fixturePath}\n` +
    `  vue3 ${vue3Pkg.version} · chromium ${browserVersion} · ${fixture.modes.length} 个模式`
)
