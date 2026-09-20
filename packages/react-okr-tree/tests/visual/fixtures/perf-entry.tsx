/**
 * 浏览器侧性能夹具（计划 9.3）：在真 Chromium 里量 2041 节点的首渲染。
 *
 * 为什么要在 Node 那份 jsdom 基线之外再做一个浏览器版：jsdom 没有真实布局与样式计算，
 * 单节点 DOM 开销比真实浏览器高 3–5 倍，只能做横向对比与回归告警；
 * requirements 9.3 那条「Chromium 首渲染 < 300 ms」必须是浏览器数字才算数。
 *
 * 为什么走 Vite 打包而不是源项目那种「route 拦截 + importmap」：React 19 取消了 UMD 构建，
 * `node_modules/react-dom/` 下没有能直接给 `<script>` 用的浏览器版，
 * 所以这里把 react / react-dom / 库产物打成一个 IIFE 夹具，由 perf.spec.ts 用
 * `addScriptTag({ content })` 注进 about:blank——不依赖外部网络，也不依赖 webServer。
 *
 * `process.env.NODE_ENV` 必须是 production：开发版 React 的校验与日志会把测量变成测调试器。
 */
import { createElement } from 'react'
// flushSync 挂在 react-dom 上（18.2 与 19 都是这个位置；从 'react' 引会在打包时静默变成
// undefined，运行期才炸），这里必须同步提交才测得到真实挂载耗时
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { OkrTree } from 'react-okr-tree'

type Cell = { id: number; label: string; children?: Cell[] }

/** 40 个部门 × 50 名员工，与 scripts/benchmark.mjs 同一份数据形状 */
function makeBigData(): Cell[] {
  const data: Cell[] = []
  let id = 1
  for (let d = 0; d < 40; d++) {
    const children: Cell[] = []
    for (let p = 0; p < 50; p++) children.push({ id: id++, label: `员工-${d}-${p}` })
    data.push({ id: id++, label: `部门-${d}`, children })
  }
  return data
}

declare global {
  interface Window {
    __perf?: { rounds: number[]; best: number; nodes: number }
  }
}

const host = document.createElement('div')
document.body.appendChild(host)

const rounds: number[] = []
let nodes = 0
for (let i = 0; i < 5; i++) {
  const data = makeBigData()
  const root = createRoot(host)
  const t0 = performance.now()
  /**
   * 必须 flushSync：并发根上的 `root.render()` 只是排一次更新，函数返回时 DOM 还是空的——
   * 不加这层，测到的就是「调度耗时」（几毫秒），而且下面 perf.nodes 会是 0。
   * 第一版就是这么悄悄量出了 0 个节点，靠 perf.spec.ts 的节点数断言才被抓出来。
   */
  flushSync(() => {
    root.render(createElement(OkrTree, { data, nodeKey: 'id', showCollapsable: true }))
  })
  const t1 = performance.now()
  rounds.push(t1 - t0)
  nodes = document.querySelectorAll('.org-chart-node').length
  flushSync(() => root.unmount())
}
window.__perf = { rounds, best: Math.min(...rounds), nodes }

export {}
