/**
 * 跨实现 DOM 比对的 vue3 侧夹具捕获脚本（react 权威清单 G15 / vue3 侧 G9 的公共解）。
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
 * （两边本就不形），`connector="svg"` 的 d 值也不在（要真实几何才有意义，见 spec 顶部说明）。
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
]

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(
  '<!doctype html><html><head><meta charset="utf-8"><title>cross-impl fixture</title>' +
    '</head><body><div id="stage"></div></body></html>'
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
    results.push({ name: mode.name, html: el ? el.outerHTML : null })
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

const vue3Pkg = JSON.parse(readFileSync(resolve(vue3Dir, 'package.json'), 'utf8'))
const fixture = {
  source: {
    package: 'vue3-okr-tree',
    version: vue3Pkg.version,
    capturedAt: new Date().toISOString().slice(0, 10),
    chromium: browserVersion,
    generator: 'scripts/gen-cross-impl-fixture.mjs',
  },
  modes: modes.map((m, i) => ({ name: m.name, props: m.props, html: captured[i].html })),
}
writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)
console.log(
  `[cross-impl] 已写入 ${fixturePath}\n` +
    `  vue3 ${vue3Pkg.version} · chromium ${browserVersion} · ${fixture.modes.length} 个模式`
)
