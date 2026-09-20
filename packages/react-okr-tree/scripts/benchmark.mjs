/**
 * 性能基线 benchmark（计划 9.3，对应源项目 scripts/benchmark.mjs）：2041 节点的关键路径耗时。
 * 先构建产物再运行：pnpm build && pnpm bench
 * 输出 markdown 表格，结果记录在 docs/perf.md。
 *
 * 与源项目的三处必要差异（都写在场景注释里）：
 * 1. Vue 靠 `nextTick()` 等一次刷新；React 侧用 `act()`（`IS_REACT_ACT_ENVIRONMENT`）刷，
 *    否则并发根上的更新还没提交就停止计时，数字会假得极低。
 * 2. 场景 5 / 6 在 Vue 里由 deep watch 自动触发重渲染；React 没有深监听，
 *    必须让宿主真的再 render 一次——这正好把 D7 的两条路径（结构脏检查 vs 脏检查跳过）
 *    各测一遍，是 Vue 版测不到的东西。
 * 3. 挂载用 `createRoot`（并发根），与消费者实际用法一致；不用 `LegacyRoot`，
 *    否则测的是另一套调度。
 */
import { JSDOM } from 'jsdom'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve, dirname } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distEs = resolve(root, 'dist/react-okr-tree.es.js')

const dom = new JSDOM('<!doctype html><html><body></body></html>')
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.HTMLElement = dom.window.HTMLElement
globalThis.SVGElement = dom.window.SVGElement
globalThis.Element = dom.window.Element
globalThis.Node = dom.window.Node
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { createElement, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { OkrTree } = await import(pathToFileURL(distEs).href)

/** 2000 节点：40 个部门 × 50 人（两层），加公司层共 2041 节点 */
function makeBigData() {
  const data = []
  let id = 1
  for (let d = 0; d < 40; d++) {
    const children = []
    for (let p = 0; p < 50; p++) {
      children.push({ id: id++, label: `员工-${d}-${p}` })
    }
    data.push({ id: id++, label: `部门-${d}`, children })
  }
  return data
}

const fmt = ms => (ms >= 100 ? `${ms.toFixed(0)}` : ms >= 10 ? `${ms.toFixed(1)}` : ms.toFixed(2))

async function measure(label, fn, rounds = 3) {
  const times = []
  let last
  for (let i = 0; i < rounds; i++) {
    last = await fn()
    times.push(last.ms)
  }
  const best = Math.min(...times)
  console.log(
    `| ${label} | ${fmt(best)} ms（${rounds} 轮取最优，末轮 ${fmt(last.ms)} ms） | ` +
      (last.note || '')
  )
  return last
}

/** 挂载一棵树并返回 { root, handle, mount, unmount }；props 每次 render 都新取一份 */
function mountTree(props) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  let handle = null
  const ref = r => {
    handle = r
  }
  const rootEl = createRoot(el)
  const render = () => act(() => rootEl.render(createElement(OkrTree, { ...props, ref })))
  return {
    render,
    get handle() {
      return handle
    },
    unmount: () => {
      act(() => rootEl.unmount())
      document.body.removeChild(el)
    },
  }
}

console.log('## react-okr-tree 性能基线（2041 节点，jsdom + dist ESM 产物）\n')
console.log('| 场景 | 耗时 | 说明 |')
console.log('| ---- | ---- | ---- |')

// ---- 1. 首渲染（折叠态，仅顶层可见） ----
await measure('首渲染（2041 节点数据，仅顶层渲染）', async () => {
  const data = makeBigData()
  const t0 = performance.now()
  const tree = mountTree({ data, nodeKey: 'id', showCollapsable: true })
  tree.render()
  const t1 = performance.now()
  tree.unmount()
  return { ms: t1 - t0 }
})

// ---- 2. 首渲染（全部展开，2041 个节点全量 DOM） ----
await measure('首渲染（全部展开，约 2041 个节点 DOM）', async () => {
  const data = makeBigData()
  const t0 = performance.now()
  const tree = mountTree({ data, nodeKey: 'id', showCollapsable: true, defaultExpandAll: true })
  tree.render()
  const t1 = performance.now()
  tree.unmount()
  return { ms: t1 - t0 }
})

{
  const data = makeBigData()
  const tree = mountTree({
    data,
    nodeKey: 'id',
    showCollapsable: true,
    filterNodeMethod: (value, d) => d.label && d.label.includes(value),
  })
  tree.render()

  // ---- 3. 展开 / 收起全部 ----
  await measure('expandAll（2041 节点状态 + 渲染）', async () => {
    const t0 = performance.now()
    await act(async () => tree.handle.expandAll())
    const t1 = performance.now()
    return { ms: t1 - t0 }
  })
  await measure('collapseAll（2041 节点状态 + 渲染）', async () => {
    const t0 = performance.now()
    await act(async () => tree.handle.collapseAll())
    const t1 = performance.now()
    return { ms: t1 - t0 }
  })

  // ---- 4. filter ----
  await act(async () => tree.handle.expandAll())
  await measure(
    'filter（全量 2000 节点过滤 + 渲染）',
    async () => {
      const t0 = performance.now()
      await act(async () => tree.handle.filter('员工-1'))
      await act(async () => tree.handle.filter(''))
      const t1 = performance.now()
      return { ms: t1 - t0, note: '含恢复全显的二次过滤' }
    },
    2
  )

  // ---- 5. 原地 push（宿主重渲染 → 结构脏检查增量更新，R2 / D7） ----
  await measure(
    '原地 push 一个节点（宿主再 render 一次 → 脏检出的增量重建）',
    async () => {
      const t0 = performance.now()
      data[0].children.push({ id: 90000 + Math.floor(Math.random() * 10000), label: '新人' })
      tree.render()
      const t1 = performance.now()
      data[0].children.pop()
      tree.render()
      return { ms: t1 - t0, note: '含一次 push + 一次 pop；React 无深监听，这一步依赖宿主重渲染' }
    },
    2
  )

  // ---- 6. 非结构变更（深层 label 修改，脏检查跳过重建） ----
  await measure('深层 label 修改（脏检查判定结构未变，跳过重建）', async () => {
    const t0 = performance.now()
    data[10].children[10].label = '改名-' + Math.random()
    tree.render()
    const t1 = performance.now()
    return { ms: t1 - t0, note: '与场景 5 对照：这条走的是 sameItems + isStructureDirty 的短路' }
  })

  // ---- 7. 展开单个节点（R1 局部更新的实际用户路径，源项目没有这一条） ----
  // 2041 节点全收起后点一个部门的 ± ：订阅层只 bump 该节点，
  // 其余 2040 个组件不该跟着重渲染。这条是 R1 设计的全部意义所在。
  await measure('展开单个节点（局部更新：1 个组件重渲染，其余 2040 个不动）', async () => {
    // 每轮前先整体收起：expandNode 不是幂等的，第二轮起「展开」会原地踏步，
    // 计时与可见节点数都测不到任何东西（第一版就被这个假数字骗过一次）。
    await act(async () => tree.handle.collapseAll())
    const before = tree.handle.getVisibleNodes().length
    const t0 = performance.now()
    await act(async () => tree.handle.expandNode(data[5]))
    const t1 = performance.now()
    const after = tree.handle.getVisibleNodes().length
    /**
     * 先证明这次展开真的发生了再谈耗时：0.01 ms 这种数字多半是「什么都没干」，
     * 而不是「快」。可见节点没增长就说明入参或订阅链出了问题，直接报错退出。
     */
    if (after <= before) {
      throw new Error(`场景 7 无效：展开后可见节点数未变化（${before} → ${after}）`)
    }
    return { ms: t1 - t0, note: `可见节点 ${before} → ${after}；对照场景 3 的 expandAll` }
  })

  tree.unmount()
}

console.log('\n> 环境：Node ' + process.version + '，jsdom 模拟 DOM，dist/react-okr-tree.es.js。')
console.log('> jsdom 无真实布局/样式，数值仅用于横向对比与回归告警，不代表浏览器真实帧率。')
console.log('> 浏览器侧首屏门禁（Chromium < 300 ms）归 9.2 的 Playwright，不在这里。')
