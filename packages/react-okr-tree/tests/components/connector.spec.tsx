import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, type RenderResult } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, resetWarnings, type OkrTreeHandle, type OkrTreeProps } from '../../src/index'

/**
 * 移植自源项目 tests/components/connector.spec.ts（12 条）。
 *
 * 与源项目的关键差异：Vue 侧靠 onUpdated 在每次组件更新后重绘，React 侧改为
 * store.subscribeMutation + 渲染后 effect + ResizeObserver 三路触发 requestRedraw
 * （见 src/OkrTree.tsx）。重绘本身仍是 rAF 去重调度，所以「等一帧」的语义保留。
 */
const makeData = () => [
  {
    id: 1,
    label: 'Root',
    children: [
      { id: 11, label: 'A', children: [{ id: 111, label: 'A1' }] },
      { id: 12, label: 'B' },
    ],
  },
]

/**
 * 对齐源项目的 mount + wrapper.setProps：
 * 补丁式合并 props 后用同一个 ref 重渲染（store / handle 跨渲染保持稳定）。
 */
function renderTree(
  props: OkrTreeProps
): RenderResult & { handle: OkrTreeHandle; setProps: (patch: Partial<OkrTreeProps>) => void } {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(<OkrTree {...props} ref={ref} />)
  let current = props
  const setProps = (patch: Partial<OkrTreeProps>) => {
    current = { ...current, ...patch }
    utils.rerender(<OkrTree {...current} ref={ref} />)
  }
  return { ...utils, handle: ref.current!, setProps }
}

const mountSvg = (props: Partial<OkrTreeProps> = {}) =>
  renderTree({ data: makeData(), connector: 'svg', nodeKey: 'id', ...props })

const q = (c: ParentNode, sel: string) => c.querySelector(sel) as HTMLElement
const qa = (c: ParentNode, sel: string) => Array.from(c.querySelectorAll(sel)) as HTMLElement[]

const paths = (c: ParentNode) => qa(c, '.okr-connector-svg path')
const pathDs = (c: ParentNode) => paths(c).map(p => p.getAttribute('d') as string)
/** 残枝路径使用相对指令 l */
const stubDs = (c: ParentNode) => pathDs(c).filter(d => d.includes(' l '))

/** 节点自身的卡片：必须 :scope 限定直接子代，否则查询会下降到子树误取后代的标签 */
const innerOf = (node: HTMLElement) =>
  node.querySelector<HTMLElement>(':scope > .org-chart-node-label > .org-chart-node-label-inner')!
const nodeByLabel = (c: ParentNode, label: string) =>
  qa(c, '.org-chart-node').find(n => innerOf(n)?.textContent?.trim() === label)!

/** [left, top, width, height] */
type Box = [number, number, number, number]

/**
 * jsdom 不做布局，getBoundingClientRect 恒为 0：不桩几何就看不出锚点落在哪一侧、
 * 也看不出残枝方向（所有坐标都塌到原点）。这里按标签给每张卡片一个假想矩形。
 * 树根本身的 rect 在 jsdom 里是 0，因此卡片的页面坐标即等于测量出的相对坐标。
 */
const stubCards = (c: ParentNode, boxes: Record<string, Box>) => {
  Object.entries(boxes).forEach(([label, [left, top, width, height]]) => {
    vi.spyOn(innerOf(nodeByLabel(c, label)), 'getBoundingClientRect').mockReturnValue({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    } as DOMRect)
  })
}

/**
 * 竖向（默认 direction）布局：卡片 100x40。
 * Root(100,0) → A(0,100) / B(120,100) → A1(0,200)
 * 由 svg-connector 的锚点规则（竖向下锚 = 底边中点、上锚 = 顶边中点）可得：
 * Root 底中 (150,40)、A 顶中 (50,100)、A 底中 (50,140)、A1 顶中 (50,200)、B 顶中 (170,100)
 */
const V_CARDS: Record<string, Box> = {
  Root: [100, 0, 100, 40],
  A: [0, 100, 100, 40],
  B: [120, 100, 100, 40],
}
/** 上面这张表再补上 A1（收起 / 展开用例需要它的顶边锚点） */
const V_CARDS_FULL: Record<string, Box> = { ...V_CARDS, A1: [0, 200, 100, 40] }

/**
 * OKR 横向布局：卡片 100x40，右树在根右侧、左树镜像在根左侧。
 * Root(100,100) → A(300,40) → A1(500,20)、Root → B(300,160)、L1(-100,100)
 * 横向锚点为左右边中点：Root 右 (200,120) / 左 (100,120)、L1 右 (0,120)
 */
const H_CARDS: Record<string, Box> = {
  Root: [100, 100, 100, 40],
  A: [300, 40, 100, 40],
  A1: [500, 20, 100, 40],
  B: [300, 160, 100, 40],
  L1: [-100, 100, 100, 40],
}

/** 编程式调用 store 方法会通知订阅者渲染（React 里属离散更新），需包在 act 内并回传返回值 */
const inAct = <T,>(fn: () => T): T => {
  let value: T = undefined as unknown as T
  act(() => {
    value = fn()
  })
  return value
}

/**
 * 源项目的 flushFrame 是「nextTick → 等一个 rAF → nextTick」：重绘经 rAF 调度。
 *
 * React 侧不照搬 await 真实帧：jsdom 的 rAF 是 16ms 定时器，而连接线在每次渲染后都会
 * 再排一帧（跟随展开 / 收起过渡逐帧重绘），帧与帧之间会掉到 act 之外并触发
 * 「not wrapped in act」。这里把 requestAnimationFrame 换成手动队列，由 flushFrame 同步
 * 推进（与 transition-robustness.spec.tsx 同样的桩法）；afterEach 的 restoreAllMocks 复原。
 */
let rafQueue: FrameRequestCallback[] = []
let rafSeq = 1

beforeEach(() => {
  rafQueue = []
  rafSeq = 1
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
    rafQueue.push(cb)
    return rafSeq++
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
    // 队列在 flushFrame 里整批消费，测试内无需真正取消
  })
})

afterEach(() => {
  // 丢弃未消费的逐帧重绘回调，避免泄漏到下一个用例
  rafQueue = []
})

const flushFrame = async () => {
  await act(async () => {
    const batch = rafQueue
    rafQueue = []
    batch.forEach(cb => cb(performance.now()))
  })
}

describe('connector 模式', () => {
  it('默认 css：无覆盖层、无 connector-svg 类', () => {
    const { container } = renderTree({ data: makeData() })
    expect(container.querySelector('.okr-connector-svg')).toBeNull()
    expect(q(container, '.org-chart-container').classList).not.toContain('connector-svg')
  })

  it('svg 模式：渲染覆盖层与路径，路径数量等于可见父子边数', async () => {
    const { container } = mountSvg()
    await flushFrame()
    expect(q(container, '.org-chart-container').classList).toContain('connector-svg')
    // Root→A、A→A1、Root→B，共 3 条（show-collapsable=false 时强制全展开）
    expect(paths(container).length).toBe(3)
    expect(pathDs(container).every(d => d.startsWith('M '))).toBe(true)
    // React 侧特有：重绘由「渲染后 effect + 突变订阅」驱动，而重绘的结果要经 setEdges
    // 落回 DOM。若 setEdges 无条件换引用，就会「排帧 → 重绘 → 重渲染 → 再排帧」永不停止，
    // 稳态下队列里永远吊着一帧。连排三帧后必须彻底清空。
    await flushFrame()
    await flushFrame()
    expect(rafQueue).toHaveLength(0)
  })

  it('非法 connector 值：按 css 渲染并输出开发期警告', () => {
    resetWarnings()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTree({
      data: makeData(),
      connector: 'none' as OkrTreeProps['connector'],
    })
    expect(container.querySelector('.okr-connector-svg')).toBeNull()
    expect(q(container, '.org-chart-container').classList).not.toContain('connector-svg')
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('运行时切换 connector：svg ↔ css 即时生效', async () => {
    const { container, setProps } = renderTree({ data: makeData(), nodeKey: 'id' })
    setProps({ connector: 'svg' })
    await flushFrame()
    expect(container.querySelector('.okr-connector-svg')).toBeTruthy()
    expect(paths(container).length).toBe(3)
    setProps({ connector: 'css' })
    // 源项目 await nextTick()：React 的 rerender 已同步完成 DOM 更新
    expect(container.querySelector('.okr-connector-svg')).toBeNull()
    expect(q(container, '.org-chart-container').classList).not.toContain('connector-svg')
  })
})

describe('路径形状', () => {
  // 源项目这几个用例没有等帧，paths 为空数组时 every() 恒为 true（断言形同虚设）；
  // 这里既补 flushFrame，也桩入卡片几何，让「什么形状」真的体现在 d 上。
  it('curve 含贝塞尔 C 指令（默认）', async () => {
    const { container } = mountSvg({ connectorShape: 'curve' })
    stubCards(container, V_CARDS_FULL)
    await flushFrame()
    expect(paths(container).length).toBe(3)
    expect(pathDs(container).every(d => d.includes('C '))).toBe(true)
    // Root 底中 (150,40) → A 顶中 (50,100)，控制点沿纵向各推进 min(40, 60/2)=30
    expect(pathDs(container)).toContain('M 150 40 C 150 70, 50 70, 50 100')
  })

  it('orthogonal 为直角折线（只含 L 指令）', async () => {
    const { container } = mountSvg({ connectorShape: 'orthogonal' })
    stubCards(container, V_CARDS_FULL)
    await flushFrame()
    expect(paths(container).length).toBe(3)
    const ds = pathDs(container)
    expect(ds.every(d => d.includes('L '))).toBe(true)
    expect(ds.every(d => !d.includes('C '))).toBe(true)
    // 折点落在两端 y 的中线 70 上
    expect(ds).toContain('M 150 40 L 150 70 L 50 70 L 50 100')
  })

  it('straight 为两点直线', async () => {
    const { container } = mountSvg({ connectorShape: 'straight' })
    stubCards(container, V_CARDS_FULL)
    await flushFrame()
    expect(paths(container).length).toBe(3)
    const ds = pathDs(container)
    expect(ds.every(d => /^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/.test(d))).toBe(true)
    expect(ds).toContain('M 150 40 L 50 100')
  })

  it('非法 connectorShape 警告并回退 curve', async () => {
    resetWarnings()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = mountSvg({ connectorShape: 'zigzag' as OkrTreeProps['connectorShape'] })
    stubCards(container, V_CARDS_FULL)
    await flushFrame()
    expect(paths(container).length).toBe(3)
    expect(pathDs(container).every(d => d.includes('C '))).toBe(true)
    // 与 curve 用例逐字相同，才叫「回退」
    expect(pathDs(container)).toContain('M 150 40 C 150 70, 50 70, 50 100')
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe('展开 / 收起与过滤后的重绘', () => {
  it('展开节点后：A→A1 实体边替换收起残枝（订阅式重绘）', async () => {
    const { container, handle } = mountSvg({ showCollapsable: true, defaultExpandedKeys: [1] })
    stubCards(container, V_CARDS_FULL)
    await flushFrame()
    // 初始：Root→A、Root→B 两条实体边 + A 的收起残枝（A 底边中点向下 20）
    expect(paths(container).length).toBe(3)
    expect(stubDs(container)).toEqual(['M 50 140 l 0 20'])
    // 展开 A
    inAct(() => handle.expandNode(11))
    await flushFrame()
    expect(stubDs(container)).toEqual([])
    expect(paths(container).length).toBe(3)
    expect(pathDs(container)).toContain('M 50 140 C 50 170, 50 170, 50 200')
  })

  it('收起残枝：收起带子节点的节点时保留 stub 路径', async () => {
    const { container, handle } = mountSvg({
      showCollapsable: true,
      defaultExpandedKeys: [1, 11],
    })
    stubCards(container, V_CARDS_FULL)
    await flushFrame()
    // 初始全展开：3 条实体边、无残枝
    expect(stubDs(container)).toEqual([])
    inAct(() => handle.collapseNode(11))
    await flushFrame()
    // A→A1 实体边被 A 自己的残枝替换
    expect(stubDs(container)).toEqual(['M 50 140 l 0 20'])
    expect(paths(container).length).toBe(3)
  })

  it('filter 隐藏节点后对应边消失', async () => {
    const { container, handle } = mountSvg({
      filterNodeMethod: (value: string, data: any) => !value || data.label.includes(value),
    })
    stubCards(container, V_CARDS_FULL)
    await flushFrame()
    inAct(() => handle.filter('B'))
    await flushFrame()
    // 只剩 Root→B：终点是 B 的顶边中点 (170,100)，故 A 子树的两条边确实没了
    expect(paths(container).length).toBe(1)
    expect(pathDs(container)).toEqual(['M 150 40 C 150 70, 170 70, 170 100'])
    inAct(() => handle.filter(''))
    await flushFrame()
    expect(paths(container).length).toBe(3)
  })

  /**
   * 与上游 vue3-okr-tree 的「稳态不自持重排」同形（那边是 1.3 的守卫，这边钉 sameEdges 短路）。
   *
   * 计数一律走 `spy.mock.calls.length`，**不要改成 `mockImplementation` 里自增的计数器**：
   * 本文件的 stubCards 会对每个卡片做 `vi.spyOn(el, 'getBoundingClientRect')`，而这个方法在
   * 元素上是继承来的——同名方法的实例级 spy 会把原型层那个 mock 的**自定义实现作废**（实测：
   * mock 本身仍被调用、`mock.calls` 照常增长，但 `mockImplementation` 给的函数体不再执行，
   * 自增计数器从挂载后一步都不动）。上游那边没有实例级同名 spy，所以自增计数器是有效的
   * （实测同一位置计数 10）；两边写法看着同形，能响的东西并不相同。
   *
   * 顺带排除过一条错判：挂载后元素原型链上持有该方法的确实就是测试模块的 `Element.prototype`
   * （`=== ` 为 true），不存在"另一个 realm"。
   */
  it('稳态不自持重排：静置后不再产生任何测量', async () => {
    const { container, handle } = mountSvg({ showCollapsable: true, defaultExpandedKeys: [1, 11] })
    const rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect')
    try {
      stubCards(container, V_CARDS_FULL)
      for (let i = 0; i < 4; i++) await flushFrame()
      // 探针必须在计数，否则下面的 0 是假绿
      expect(rectSpy.mock.calls.length, 'rect 一次都没被读到——探针没生效').toBeGreaterThan(0)
      const settled = rectSpy.mock.calls.length
      for (let i = 0; i < 8; i++) await flushFrame()
      /**
       * 短路失效的形状就是这里：setEdges 无条件换引用 → 重渲染 → 每次提交后排一帧 →
       * 再读一遍全树 rect。静置 8 帧的增量应当恰为 0。
       */
      expect(rectSpy.mock.calls.length - settled).toBe(0)
      // 短路不能冻住覆盖层：几何真的变了仍要重绘（A→A1 实体边换成收起残枝）
      expect(stubDs(container)).toEqual([])
      inAct(() => handle.collapseNode(11))
      await flushFrame()
      expect(stubDs(container).length).toBe(1)
      expect(rectSpy.mock.calls.length - settled).toBeGreaterThan(0)
    } finally {
      rectSpy.mockRestore()
    }
  })
})

describe('OKR 模式左树', () => {
  it('根节点与左树顶层节点之间绘制镜像连线', async () => {
    const { container, handle } = renderTree({
      data: makeData(),
      leftData: [{ id: 1, label: 'Root', children: [{ id: 21, label: 'L1' }] }],
      onlyBothTree: true,
      direction: 'horizontal',
      connector: 'svg',
      nodeKey: 'id',
    })
    stubCards(container, H_CARDS)
    await flushFrame()
    // 右树 3 条 + 根→L1 共 4 条
    expect(paths(container).length).toBe(4)
    // 镜像线：根卡片左锚点 (100,120) → L1 右锚点 (0,120)，控制点朝左（与右树方向相反）
    expect(pathDs(container)).toContain('M 100 120 C 60 120, 40 120, 0 120')
    // 收起左侧后：根→L1 的边替换为残枝，总数不变
    inAct(() => {
      handle.getNode(1)!.leftExpanded = false
    })
    await flushFrame()
    expect(paths(container).length).toBe(4)
    expect(stubDs(container)).toEqual(['M 100 120 l -20 0'])
  })
})
