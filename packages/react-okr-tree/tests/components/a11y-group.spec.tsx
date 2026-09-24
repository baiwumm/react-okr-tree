import { describe, it, expect, expectTypeOf, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, type RenderResult } from '@testing-library/react'
import { createRef, type ReactNode } from 'react'
import {
  OkrTree,
  OkrTreeGroup,
  type OkrTreeGroupHandle,
  type OkrTreeHandle,
  type OkrTreeProps,
} from '../../src/index'
import type { NodeComponentProps, TreeNodeData } from '../../src/types'
import type { TreeNode } from '../../src/model/node'

/**
 * 移植自源项目 tests/components/a11y-group.spec.ts。
 *
 * 两条契约：可访问性（role / aria-* / 键盘交互 / 焦点管理）与 OkrTreeGroup 的跨实例根对齐
 * （量组内左子树宽度并写成 --okr-group-left-width）。
 *
 * React 侧的两处结构性差异，断言按 React 实现重新推导而非照抄：
 * 1. aria-setsize / aria-posinset 由**父节点**算好后作为 props 传下来（Vue 版逐节点自算），
 *    语义不变：按「未被 filter 隐藏」的可见兄弟计数；
 * 2. wrapper.vm 的方法入口换成 OkrTreeHandle / OkrTreeGroupHandle（ref）。
 *
 * 移植过程中修掉了两个漫游 tabindex 的实现缺陷（源项目靠整树重渲染天然没有）：
 * React 的 onFocus 由会冒泡的 focusin 映射而来，祖先 treeitem 会抢走后代的焦点归属
 * （OkrTreeNode.handleFocus 现按 target === currentTarget 限定，等价源项目的不冒泡 focus）；
 * 以及「无焦点节点时由首个根节点持有 0」这条兜底规则的持有者未被通知，
 * 导致转移后有两个节点同时可 Tab 进入（OkrTree.setFocusedNode 现一并 bump 它）。
 */

const makeData = (): TreeNodeData[] => [
  {
    id: 1,
    label: 'A',
    children: [
      { id: 2, label: 'B', children: [{ id: 3, label: 'C' }] },
      { id: 4, label: 'D' },
    ],
  },
]
const makeLeft = (): TreeNodeData[] => [
  { id: 1, label: 'A', children: [{ id: 12, label: 'L', children: [{ id: 13, label: 'LC' }] }] },
]

function renderTree(props: OkrTreeProps): RenderResult & { handle: OkrTreeHandle } {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(<OkrTree {...props} ref={ref} />)
  return { ...utils, handle: ref.current! }
}

const q = (c: ParentNode, sel: string) => c.querySelector(sel) as HTMLElement
const qa = (c: ParentNode, sel: string) => Array.from(c.querySelectorAll(sel)) as HTMLElement[]

/** 左树节点的子容器在标签之前，需取节点自身的标签（:scope > 标签） */
const ownLabel = (n: HTMLElement) =>
  n
    .querySelector(':scope > .org-chart-node-label > .org-chart-node-label-inner')
    ?.textContent?.trim()

/** 对应源项目的 findAll('.org-chart-node[role="treeitem"]')：按标签每次重新定位，元素在展开/收起时会重建 */
const itemByLabel = (c: ParentNode, label: string) =>
  qa(c, '.org-chart-node[role="treeitem"]').find(n => ownLabel(n) === label)!

/** 方向键前置 focus()：等价源项目「(el as HTMLElement).focus() + trigger('keydown')」 */
const keyDown = (c: ParentNode, label: string, key: string) => {
  const node = itemByLabel(c, label)
  act(() => {
    node.focus()
    fireEvent.keyDown(node, { key })
  })
}

const activeText = () => ownLabel(document.activeElement as HTMLElement)

describe('可访问性：ARIA 属性', () => {
  it('树 / treeitem / group 角色与 aria-level / aria-expanded / aria-selected', () => {
    const { container } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      showCollapsable: true,
      defaultExpandedKeys: [1],
    })
    expect(q(container, '[role="tree"]')).toBeTruthy()
    expect(itemByLabel(container, 'A').getAttribute('aria-level')).toBe('1')
    expect(itemByLabel(container, 'A').getAttribute('aria-expanded')).toBe('true')
    expect(itemByLabel(container, 'A').getAttribute('aria-selected')).toBe('false')
    expect(itemByLabel(container, 'B').getAttribute('aria-level')).toBe('2')
    expect(itemByLabel(container, 'B').getAttribute('aria-expanded')).toBe('false')
    // 叶子无子树 ⇒ 不输出 aria-expanded
    expect(itemByLabel(container, 'D').hasAttribute('aria-expanded')).toBe(false)
    expect(
      q(itemByLabel(container, 'A'), ':scope > .org-chart-node-children').getAttribute('role')
    ).toBe('group')
    expect(
      q(
        itemByLabel(container, 'A'),
        ':scope > .org-chart-node-label > .org-chart-node-btn'
      ).getAttribute('aria-hidden')
    ).toBe('true')

    act(() => {
      fireEvent.click(
        q(
          itemByLabel(container, 'A'),
          ':scope > .org-chart-node-label > .org-chart-node-label-inner'
        )
      )
    })
    expect(itemByLabel(container, 'A').getAttribute('aria-selected')).toBe('true')
  })

  it('aria-setsize / aria-posinset 按可见兄弟节点计数，被 filter 隐藏的不计入', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      showCollapsable: true,
      defaultExpandAll: true,
      filterNodeMethod: (value: string, d: TreeNodeData) =>
        !value ? true : String(d.label).includes(value),
    })
    // A → [B, D]：A 在根集合里唯一，B / D 是同一组里的第 1 / 2 个
    expect(itemByLabel(container, 'A').getAttribute('aria-setsize')).toBe('1')
    expect(itemByLabel(container, 'A').getAttribute('aria-posinset')).toBe('1')
    expect(itemByLabel(container, 'B').getAttribute('aria-setsize')).toBe('2')
    expect(itemByLabel(container, 'B').getAttribute('aria-posinset')).toBe('1')
    expect(itemByLabel(container, 'D').getAttribute('aria-posinset')).toBe('2')

    // 过滤后 B 及其子树隐藏，A 的可见子节点只剩 D
    act(() => {
      handle.filter('D')
    })
    expect(qa(container, '.org-chart-node[role="treeitem"]').map(n => ownLabel(n))).toEqual([
      'A',
      'D',
    ])
    expect(itemByLabel(container, 'D').getAttribute('aria-setsize')).toBe('1')
    expect(itemByLabel(container, 'D').getAttribute('aria-posinset')).toBe('1')
  })

  it('禁用节点 aria-disabled', () => {
    const { container } = renderTree({ data: [{ label: 'X', disabled: true }] })
    expect(itemByLabel(container, 'X').getAttribute('aria-disabled')).toBe('true')
  })

  it('漫游 tabindex：初始第一个根节点为 0，其余 -1；聚焦后转移', () => {
    const { container } = renderTree({ data: makeData(), nodeKey: 'id' })
    expect(itemByLabel(container, 'A').getAttribute('tabindex')).toBe('0')
    expect(itemByLabel(container, 'B').getAttribute('tabindex')).toBe('-1')
    act(() => {
      itemByLabel(container, 'B').focus()
    })
    expect(itemByLabel(container, 'B').getAttribute('tabindex')).toBe('0')
    expect(itemByLabel(container, 'A').getAttribute('tabindex')).toBe('-1')
  })
})

describe('可访问性：键盘导航', () => {
  const mountTree = (extra: Partial<OkrTreeProps> = {}) =>
    renderTree({
      data: makeData(),
      nodeKey: 'id',
      showCollapsable: true,
      defaultExpandAll: true,
      ...extra,
    })

  it('ArrowDown / ArrowUp / Home / End 沿可见节点移动焦点', () => {
    const { container } = mountTree()
    keyDown(container, 'A', 'ArrowDown')
    expect(activeText()).toBe('B')
    keyDown(container, 'B', 'ArrowDown')
    expect(activeText()).toBe('C')
    keyDown(container, 'C', 'ArrowUp')
    expect(activeText()).toBe('B')
    keyDown(container, 'B', 'End')
    expect(activeText()).toBe('D')
    keyDown(container, 'D', 'Home')
    expect(activeText()).toBe('A')
  })

  it('收起容器中的节点不参与方向键遍历', () => {
    // A 展开（B、D 可见），B 收起（C 不可见）
    const { container } = mountTree({ defaultExpandAll: false, defaultExpandedKeys: [1] })
    expect(q(itemByLabel(container, 'B'), ':scope > .org-chart-node-children').classList).toContain(
      'is-hidden'
    )
    keyDown(container, 'B', 'ArrowDown')
    expect(activeText()).toBe('D')
  })

  it('ArrowRight 展开或进入子节点，ArrowLeft 收起或回到父节点，并触发事件 / 受控回调', () => {
    const onNodeExpand = vi.fn()
    const onNodeCollapse = vi.fn()
    const onExpandedKeysChange = vi.fn()
    const { container, handle } = mountTree({
      defaultExpandAll: false,
      expandedKeys: [],
      onNodeExpand,
      onNodeCollapse,
      onExpandedKeysChange,
    })
    keyDown(container, 'A', 'ArrowRight')
    expect(handle.getNode(1)!.expanded).toBe(true)
    expect(onNodeExpand).toHaveBeenCalledTimes(1)
    // 对应源项目 emitted('update:expandedKeys')![0][0]
    expect(onExpandedKeysChange.mock.calls[0][0]).toEqual([1])
    // 已展开 → 进入第一个子节点
    keyDown(container, 'A', 'ArrowRight')
    expect(activeText()).toBe('B')
    // 子节点 ← 无展开子树 → 回到父节点
    keyDown(container, 'B', 'ArrowLeft')
    expect(activeText()).toBe('A')
    // 父节点 ← 已展开 → 收起
    keyDown(container, 'A', 'ArrowLeft')
    expect(handle.getNode(1)!.expanded).toBe(false)
    expect(onNodeCollapse).toHaveBeenCalledTimes(1)
  })

  it('Enter / Space 选中节点并触发 onNodeClick', () => {
    const onNodeClick = vi.fn()
    const { container, handle } = mountTree({ onNodeClick })
    keyDown(container, 'B', 'Enter')
    expect(onNodeClick).toHaveBeenCalledTimes(1)
    expect(handle.getCurrentKey()).toBe(2)
    keyDown(container, 'D', ' ')
    expect(handle.getCurrentKey()).toBe(4)
  })

  it('OKR 模式：根节点 ← 进入左子树；左树节点 → 回到根节点', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      leftData: makeLeft(),
      onlyBothTree: true,
      direction: 'horizontal',
      showCollapsable: true,
      defaultExpandAll: true,
      nodeKey: 'id',
    })
    keyDown(container, 'A', 'ArrowLeft')
    expect(activeText()).toBe('L')
    keyDown(container, 'L', 'ArrowLeft')
    expect(activeText()).toBe('LC')
    keyDown(container, 'LC', 'ArrowRight')
    expect(activeText()).toBe('L')
    // L 有展开子树：→ 先收起
    keyDown(container, 'L', 'ArrowRight')
    expect(handle.store.leftNodesMap[12].leftExpanded).toBe(false)
    // 再 → 回到根节点
    keyDown(container, 'L', 'ArrowRight')
    expect(activeText()).toBe('A')
    expect(document.activeElement).toBe(itemByLabel(container, 'A'))
  })

  it('焦点在节点内部控件时不拦截按键', () => {
    const onNodeClick = vi.fn()
    const { container } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      onNodeClick,
      renderNode: () => <input className="inner" />,
    })
    const input = q(container, 'input.inner')
    act(() => {
      input.focus()
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    expect(document.activeElement).toBe(input)
    expect(onNodeClick).not.toHaveBeenCalled()
  })
})

describe('node-component', () => {
  const Card = ({ node, data }: NodeComponentProps): ReactNode => (
    <b className="card">{`${data.label}@${node.level}`}</b>
  )

  it('以 { node, data } 渲染组件', () => {
    const { container } = renderTree({ data: makeData(), nodeComponent: Card })
    expect(qa(container, '.card').map(c => c.textContent)).toEqual(['A@1', 'B@2', 'C@3', 'D@2'])
  })

  it('优先级：renderNode（对应 #default 插槽）> node-component > render-content', () => {
    const renderContent = (node: TreeNode): ReactNode => <i className="rc">{node.label}</i>
    const both = renderTree({ data: [{ label: 'X' }], nodeComponent: Card, renderContent })
    expect(both.container.querySelector('.card')).toBeTruthy()
    expect(both.container.querySelector('.rc')).toBeNull()
    const withRenderNode = renderTree({
      data: [{ label: 'X' }],
      nodeComponent: Card,
      renderContent,
      renderNode: ({ data }) => <u className="sl">{data.label}</u>,
    })
    expect(q(withRenderNode.container, '.sl').textContent).toBe('X')
    expect(withRenderNode.container.querySelector('.card')).toBeNull()
    const onlyRender = renderTree({ data: [{ label: 'X' }], renderContent })
    expect(q(onlyRender.container, '.rc').textContent).toBe('X')
  })
})

describe('OkrTreeGroup', () => {
  /**
   * 这里只断言测量链路的结构契约：is-measured / is-measuring 类、组件自己写进内联样式的
   * --okr-group-left-width 值。至于「各棵树的根节点因此水平对齐」这一结论，它由
   * style.css 里 `.okr-tree-group.is-measured …` 那条规则消费该变量后才能确定，
   * jsdom 不套用样式表（vitest css: false）——那半部分归阶段 9.2 的 Playwright 视觉回归。
   */
  const okrProps = (left: TreeNodeData[]): OkrTreeProps => ({
    data: makeData(),
    leftData: left,
    onlyBothTree: true,
    direction: 'horizontal',
    showCollapsable: true,
    defaultExpandAll: true,
    nodeKey: 'id',
  })

  /**
   * 源项目的 flush（两次 nextTick）：React 版测量经 requestAnimationFrame 去重调度，
   * 这里把 rAF 换成手动队列同步推进（照 connector.spec.tsx 的做法，
   * 帧间 setState 必须包在 act 内）。afterEach 的 vi.restoreAllMocks() 负责复原。
   */
  let rafQueue: FrameRequestCallback[] = []
  let rafSeq = 1
  beforeEach(() => {
    rafQueue = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      rafQueue.push(cb)
      return rafSeq++
    })
  })
  afterEach(() => {
    rafQueue = []
  })
  const flushMeasure = async () => {
    // 测量本身会触发重渲染，重渲染又可能再排一帧：循环到队列空为止
    for (let round = 0; round < 5; round++) {
      const batch = rafQueue
      if (!batch.length) break
      rafQueue = []
      await act(async () => {
        batch.forEach(cb => cb(performance.now()))
      })
    }
  }

  it('测量组内左子树容器最大宽度并写入 --okr-group-left-width', async () => {
    // jsdom 无布局：按左容器内节点数模拟宽度
    const original = Element.prototype.getBoundingClientRect
    /**
     * 每次读宽度都记一笔「此刻组上有没有 is-measuring」——这条才是本用例的主判据：
     * 测量态若不落到 DOM，读回的是 .is-measured 钉住的分配宽度，组对齐宽度会被首量钉死。
     * 上游 vue3-okr-tree 同形判据；把 measure 里的 classList 操作摘掉，这里就变 [false, false]。
     */
    const measuringAtRead: boolean[] = []
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      const rect = original.call(this)
      if (this.classList.contains('org-chart-node-left-children')) {
        const g = document.querySelector('.okr-tree-group')
        measuringAtRead.push(!!g && g.classList.contains('is-measuring'))
        return { ...rect, width: this.querySelectorAll('.org-chart-node').length * 100 } as DOMRect
      }
      return rect
    })
    const groupRef = createRef<OkrTreeGroupHandle>()
    const { container } = render(
      <OkrTreeGroup ref={groupRef}>
        <OkrTree {...okrProps([{ id: 1, label: 'A', children: [{ id: 12, label: 'L' }] }])} />
        <OkrTree {...okrProps(makeLeft())} />
      </OkrTreeGroup>
    )
    await flushMeasure()
    const group = q(container, '.okr-tree-group')
    expect(group.classList).toContain('is-measured')
    expect(group.classList).not.toContain('is-measuring')
    // 第二棵树左侧 2 个节点 → 200px（组内最大值）
    expect(group.style.getPropertyValue('--okr-group-left-width')).toBe('200px')
    expect(typeof groupRef.current!.refresh).toBe('function')
    expect(measuringAtRead.length, '一次 rect 都没读到——探针没生效').toBeGreaterThan(0)
    expect(measuringAtRead, '读 rect 时 is-measuring 不在 DOM 上（量到的是分配宽度）').toEqual(
      measuringAtRead.map(() => true)
    )
  })

  it('align=false 时不测量；组内无 OKR 树时不加 is-measured', async () => {
    const off = render(
      <OkrTreeGroup align={false}>
        <OkrTree {...okrProps(makeLeft())} />
      </OkrTreeGroup>
    )
    await flushMeasure()
    // 可测量的左容器确实存在（开启 align 就会被量），只是 align=false 关掉了整条链路
    expect(off.container.querySelector('.org-chart-node-left-children')).toBeTruthy()
    expect(q(off.container, '.okr-tree-group').classList).not.toContain('is-measured')

    const plain = render(
      <OkrTreeGroup>
        <OkrTree data={makeData()} nodeKey="id" />
      </OkrTreeGroup>
    )
    await flushMeasure()
    expect(plain.container.querySelector('.org-chart-node-left-children')).toBeNull()
    expect(q(plain.container, '.okr-tree-group').classList).not.toContain('is-measured')
  })
})

describe('泛型类型收窄（对应源项目 createTypedOkrTree<T>，D5）', () => {
  it('OkrTree<T> 只作用于类型层：收窄 data 与回调参数，运行时渲染同一组件', () => {
    // React 版无需工厂函数：OkrTree 本身就是泛型组件，T 只是类型参数（无运行时代码）
    type Dept = { id: number; label: string; leader?: string }
    expectTypeOf<OkrTreeProps<Dept>['data']>().toEqualTypeOf<Dept[]>()
    expectTypeOf<NonNullable<OkrTreeProps<Dept>['onNodeClick']>>()
      .parameter(0)
      .toEqualTypeOf<Dept>()
    // @ts-expect-error leader 只能是 string：泛型收窄在编译期生效（由 typecheck 把关）
    const wrong: OkrTreeProps<Dept> = { data: [{ id: 1, label: 'X', leader: 42 }] }
    expect(wrong.data[0].label).toBe('X')

    const { container } = render(
      <OkrTree<Dept>
        data={[{ id: 1, label: 'X', leader: 'Y' }]}
        renderNode={({ data }) => <span className="typed">{`${data.label}/${data.leader}`}</span>}
      />
    )
    // 无包装层：OkrTree<Dept> 的根元素就是 .org-chart-container
    expect(container.firstElementChild!.classList).toContain('org-chart-container')
    expect(q(container, '.typed').textContent).toBe('X/Y')
  })
})
