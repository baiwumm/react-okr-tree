import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, type RenderResult } from '@testing-library/react'
import { createRef, useMemo, useState, type ReactElement, type RefObject } from 'react'
import { OkrTree, resetWarnings, type OkrTreeHandle, type OkrTreeProps } from '../../src/index'
import type { TreeKey, TreeNodeData } from '../../src/types'

/**
 * 移植自源项目 tests/components/controlled.spec.ts。
 * 受控用例一律走「宿主持有 state + 回调写回」的真受控路径（requirements D3），
 * 而不是只塞一个 mock 就当受控——那样测不到父 → 子的单向同步。
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

function renderTree(props: OkrTreeProps): RenderResult & { handle: OkrTreeHandle } {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(<OkrTree {...props} ref={ref} />)
  return { ...utils, handle: ref.current! }
}

const q = (c: ParentNode, sel: string) => c.querySelector(sel) as HTMLElement
const qa = (c: ParentNode, sel: string) => Array.from(c.querySelectorAll(sel)) as HTMLElement[]
const labels = (c: ParentNode) =>
  qa(c, '.org-chart-node-label-inner').map(el => el.textContent?.trim())

/**
 * 收起态的子容器仍渲染在 DOM 中（is-hidden + visibility/height 内联样式），
 * 展开 / 收起又会重建元素——按标签文本每次重新查找才是稳定定位。
 */
const nodeByLabel = (c: ParentNode, label: string) =>
  qa(c, '.org-chart-node').find(
    n => n.querySelector('.org-chart-node-label-inner')?.textContent?.trim() === label
  )!

const btnOf = (c: ParentNode, label: string) => q(nodeByLabel(c, label), '.org-chart-node-btn')
const labelInnerOf = (c: ParentNode, label: string) =>
  q(nodeByLabel(c, label), '.org-chart-node-label-inner')

const clickBtnOf = (c: ParentNode, label: string) => {
  act(() => {
    fireEvent.click(btnOf(c, label))
  })
}

const clickLabel = (c: ParentNode, label: string) => {
  act(() => {
    fireEvent.click(labelInnerOf(c, label))
  })
}

const childrenStyleOf = (c: ParentNode, label: string) =>
  nodeByLabel(c, label).querySelector('.org-chart-node-children')?.getAttribute('style') || ''

/** 宿主受控值的镜像：源项目直读组件实例上的 vm.keys / vm.current，React 没有这层入口 */
interface ExpandedHostState {
  keys: TreeKey[]
  setKeys: (keys: TreeKey[]) => void
}

interface CurrentHostState {
  current: TreeKey | null
  setCurrent: (key: TreeKey | null) => void
}

/** 受控展开宿主：expandedKeys 提升到父组件 state，回调写回（等价 v-model:expanded-keys） */
function ExpandedHost({
  data,
  initialKeys,
  handleRef,
  stateRef,
  extra,
}: {
  data: TreeNodeData[]
  initialKeys: TreeKey[]
  handleRef: RefObject<OkrTreeHandle | null>
  stateRef: RefObject<ExpandedHostState | null>
  extra?: Partial<OkrTreeProps>
}): ReactElement {
  const [keys, setKeys] = useState<TreeKey[]>(initialKeys)
  stateRef.current = { keys, setKeys }
  return (
    <OkrTree
      data={data}
      nodeKey="id"
      showCollapsable
      expandedKeys={keys}
      onExpandedKeysChange={setKeys}
      ref={handleRef}
      {...extra}
    />
  )
}

/**
 * 锁定强度宿主：`data` 钉成稳定引用，`expandedKeys` 每次渲染现场向 `keysOf()` 取一次。
 *
 * `data` 必须稳定：上一批探针就是栽在这里——宿主重渲染时 `data={makeData()}` 同时换了引用，
 * 走的是整树重建那条路，两种锁定强度混在一起分不出来（两个分支的观测结果逐字相同，正是被
 * 整树重建主导的那种「相同」）。`hostRef.bump()` 用来制造一次「与树无关」的宿主重渲染。
 */
function LockHost({
  keysOf,
  handleRef,
  hostRef,
}: {
  keysOf: () => TreeKey[]
  handleRef: RefObject<OkrTreeHandle | null>
  hostRef: RefObject<{ bump: () => void } | null>
}): ReactElement {
  const [, setTick] = useState(0)
  const data = useMemo(makeData, [])
  hostRef.current = { bump: () => setTick(t => t + 1) }
  return (
    <OkrTree ref={handleRef} data={data} nodeKey="id" showCollapsable expandedKeys={keysOf()} />
  )
}

/** 受控选中宿主：currentKey 提升到父组件 state（等价 v-model:current-key） */
function CurrentHost({
  data,
  initialCurrent,
  handleRef,
  stateRef,
}: {
  data: TreeNodeData[]
  initialCurrent: TreeKey | null
  handleRef: RefObject<OkrTreeHandle | null>
  stateRef: RefObject<CurrentHostState | null>
}): ReactElement {
  const [current, setCurrent] = useState<TreeKey | null>(initialCurrent)
  stateRef.current = { current, setCurrent }
  return (
    <OkrTree
      data={data}
      nodeKey="id"
      currentKey={current}
      onCurrentKeyChange={setCurrent}
      ref={handleRef}
    />
  )
}

describe('受控展开 expandedKeys（对应 v-model:expanded-keys）', () => {
  it('传入 expandedKeys 时按列表展开，其余收起；点击按钮触发 onExpandedKeysChange', () => {
    const onExpandedKeysChange = vi.fn()
    const onNodeExpand = vi.fn()
    const { container, handle } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      showCollapsable: true,
      expandedKeys: [1],
      onExpandedKeysChange,
      onNodeExpand,
    })
    expect(handle.getNode(1)!.expanded).toBe(true)
    expect(handle.getNode(2)!.expanded).toBe(false)

    clickBtnOf(container, 'B')
    expect(onExpandedKeysChange).toHaveBeenCalledTimes(1)
    expect([...(onExpandedKeysChange.mock.calls[0][0] as TreeKey[])].sort()).toEqual([1, 2])
    // 同时仍触发原有 onNodeExpand（D2：回调不再带第三个参数 nodeComponent）
    expect(onNodeExpand).toHaveBeenCalledTimes(1)
  })

  /**
   * 锁定态（requirements 第 5 节点名的「传值但不传回调」写法）实测行为：**不冻结视图**。
   * 展开态的渲染源是 store，受控 prop 只在创建期（`OkrTree.tsx:293`）与宿主传入值变化时
   * （`:832-837`）回灌，宿主不回写就没有第二次同步 —— 点击照常折叠。上游 vue3 侧三种写法
   * （只绑 prop / 绑了不回写的监听 / 真受控写回）实测与此逐字相同，所以这不是复刻偏差，
   * 是两仓共同语义。这两条钉住现状：不报错、不警告、回调照常收到新值、视图跟着交互走。
   */
  it('锁定态：传 expandedKeys 而不给回写时不警告，点击照常生效', () => {
    /**
     * 必须自己清一次去重表：`warn()` 默认按文案去重、且是**模块级**的，本文件前面的用例
     * 已经把「expanded-keys（受控）需要同时设置 node-key」那条发掉了，不清表的话
     * `not.toHaveBeenCalled()` 是白断的（实测把 node-key 守卫改成无条件警告，这条照样绿）。
     */
    resetWarnings()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, handle } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      showCollapsable: true,
      expandedKeys: [1],
    })
    expect(handle.getNode(1)!.expanded).toBe(true)
    clickBtnOf(container, 'A')
    expect(handle.getNode(1)!.expanded, '宿主没回写，视图仍按 store 走').toBe(false)
    expect(warnSpy, '锁定态是合法配置，不该警告').not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('锁定态：传了回调但宿主不回写时，回调收到新值而视图不被拉回', () => {
    const onExpandedKeysChange = vi.fn()
    const { container, handle } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      showCollapsable: true,
      expandedKeys: [1],
      onExpandedKeysChange,
    })
    clickBtnOf(container, 'A')
    expect(onExpandedKeysChange).toHaveBeenCalledTimes(1)
    expect(
      [...(onExpandedKeysChange.mock.calls[0][0] as TreeKey[])],
      '收起 A 之后回调收到的新值就是空列表'
    ).toEqual([])
    expect(handle.getNode(1)!.expanded, 'prop 恒为 [1]，但没人回灌就不该被拉回').toBe(false)
  })

  /**
   * 锁定态的**第二种强度**：文档站 `guide/controlled.mdx` 里「写成每次渲染新建的数组字面量
   * → 完全锁定；引用稳定的数组 → 交互结果保留到 prop 真的变化为止」这条说法此前只是文档，
   * 没有用例钉过（第 2 批探针想验，被 `data` 换引用引发的整树重建盖住了）。
   * 机制就是 `OkrTree.tsx:832-837` 那条 effect 的依赖比较——React 的依赖按 `Object.is` 比，
   * 所以“变化”就是换引用，原地改内容不算。上游 vue3 同批测过，三条分支观测逐字相同
   * （vue3 另有一种：数组是 `ref` 包着的响应式对象时，`deep: true` 能收到原地变更——
   * 那是框架差，本包没有对应机制，故不在此处构造）。
   */
  it('锁定态·内联字面量：宿主一重渲染就把交互结果拉回（＝完全锁定）', () => {
    const handleRef = createRef<OkrTreeHandle>()
    const hostRef = createRef<{ bump: () => void }>()
    const { container } = render(
      <LockHost keysOf={() => [1]} handleRef={handleRef} hostRef={hostRef} />
    )
    const handle = handleRef.current!
    expect(handle.getNode(1)!.expanded).toBe(true)

    clickBtnOf(container, 'A')
    expect(handle.getNode(1)!.expanded, '交互本身照常生效').toBe(false)

    act(() => hostRef.current!.bump())
    expect(handle.getNode(1)!.expanded, '引用变了 ⇒ 按 prop 回灌，折叠被拉回').toBe(true)
    // 拉回不是一次性的：还能再收，收完不动 prop 就不会又被拉回（本包 effect 只在依赖变化时跑）
    clickBtnOf(container, 'A')
    expect(handle.getNode(1)!.expanded).toBe(false)
  })

  it('锁定态·引用稳定的数组：不回灌到 prop 真的换引用为止（原地改内容不算）', () => {
    let keys: TreeKey[] = [1]
    const handleRef = createRef<OkrTreeHandle>()
    const hostRef = createRef<{ bump: () => void }>()
    const { container } = render(
      <LockHost keysOf={() => keys} handleRef={handleRef} hostRef={hostRef} />
    )
    const handle = handleRef.current!

    clickBtnOf(container, 'A')
    expect(handle.getNode(1)!.expanded).toBe(false)

    act(() => hostRef.current!.bump())
    expect(handle.getNode(1)!.expanded, '引用没变 ⇒ effect 不跑，折叠结果保留').toBe(false)

    keys.push(2)
    act(() => hostRef.current!.bump())
    expect(handle.getNode(2)!.expanded, '依赖按 Object.is 比，原地 push 不算变化').toBe(false)
    expect(handle.getNode(1)!.expanded).toBe(false)

    keys = [1, 2]
    act(() => hostRef.current!.bump())
    expect(handle.getNode(1)!.expanded, '换引用 ⇒ 按新 prop 回灌，根节点重新展开').toBe(true)
    expect(handle.getNode(2)!.expanded).toBe(true)
  })

  it('父组件更新 expandedKeys 后同步展开态（双向）', () => {
    const handleRef = createRef<OkrTreeHandle>()
    const stateRef = createRef<ExpandedHostState>()
    const { container } = render(
      <ExpandedHost data={makeData()} initialKeys={[1]} handleRef={handleRef} stateRef={stateRef} />
    )
    const handle = handleRef.current!
    const state = stateRef.current!
    // 父 → 子
    act(() => state.setKeys([1, 2]))
    expect(handle.getNode(2)!.expanded).toBe(true)
    act(() => state.setKeys([]))
    expect(handle.getNode(1)!.expanded).toBe(false)
    // 子 → 父（点击根按钮展开）
    clickBtnOf(container, 'A')
    expect(stateRef.current!.keys).toEqual([1])
    // 方法调用也回写
    act(() => handle.expandAll())
    expect([...stateRef.current!.keys].sort()).toEqual([1, 2, 3, 4])
    act(() => handle.collapseAll())
    expect(stateRef.current!.keys).toEqual([])
  })

  it('未传 expandedKeys 时不触发 onExpandedKeysChange（非受控）', () => {
    // D3：expandedKeys 为 undefined 即判定非受控，此时只回调 onNodeExpand
    const onExpandedKeysChange = vi.fn()
    const onNodeExpand = vi.fn()
    const { container } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      showCollapsable: true,
      onExpandedKeysChange,
      onNodeExpand,
    })
    clickBtnOf(container, 'A')
    expect(onNodeExpand).toHaveBeenCalledTimes(1)
    expect(onExpandedKeysChange).not.toHaveBeenCalled()
  })
})

describe('受控选中 currentKey（对应 v-model:current-key）', () => {
  it('初始选中、点击回写、父组件更新同步', () => {
    const handleRef = createRef<OkrTreeHandle>()
    const stateRef = createRef<CurrentHostState>()
    const { container } = render(
      <CurrentHost data={makeData()} initialCurrent={4} handleRef={handleRef} stateRef={stateRef} />
    )
    const handle = handleRef.current!
    expect(handle.getCurrentKey()).toBe(4)
    expect(labelInnerOf(container, 'D').classList).toContain('is-current')

    clickLabel(container, 'B')
    expect(stateRef.current!.current).toBe(2)

    act(() => stateRef.current!.setCurrent(null))
    expect(handle.getCurrentKey()).toBeNull()
    expect(container.querySelectorAll('.is-current')).toHaveLength(0)

    act(() => handle.setCurrentKey(3))
    expect(stateRef.current!.current).toBe(3)
  })
})

describe('新增方法', () => {
  it('expandNode / collapseNode 驱动视图', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      showCollapsable: true,
    })
    act(() => handle.expandNode(3))
    expect(childrenStyleOf(container, 'A')).not.toContain('visibility: hidden')
    expect(childrenStyleOf(container, 'B')).not.toContain('visibility: hidden')
    act(() => handle.collapseNode(2))
    expect(childrenStyleOf(container, 'B')).toContain('visibility: hidden')
    expect(childrenStyleOf(container, 'A')).not.toContain('visibility: hidden')
  })

  it('scrollToNode 展开祖先并调用 scrollIntoView', async () => {
    const scrollSpy = vi.fn()
    const originalScrollIntoView = Element.prototype.scrollIntoView
    // jsdom 不实现 scrollIntoView，用例自带一个可断言的替身
    Element.prototype.scrollIntoView = scrollSpy
    try {
      // 源用例的 attachTo: document.body —— RTL 默认就把容器挂在 document.body 上
      const { handle } = renderTree({
        data: makeData(),
        nodeKey: 'id',
        showCollapsable: true,
      })
      expect(handle.getNode(2)!.expanded).toBe(false)
      let ok = false
      await act(async () => {
        ok = await handle.scrollToNode(3, { behavior: 'auto' })
      })
      expect(ok).toBe(true)
      expect(handle.getNode(2)!.expanded).toBe(true)
      expect(handle.getNode(1)!.expanded).toBe(true)
      expect(scrollSpy).toHaveBeenCalledTimes(1)
      expect(scrollSpy.mock.calls[0][0]).toMatchObject({ behavior: 'auto', block: 'center' })
      const target = scrollSpy.mock.instances[0] as HTMLElement
      expect(target.querySelector('.org-chart-node-label-inner')?.textContent).toBe('C')
      let missing = true
      await act(async () => {
        missing = await handle.scrollToNode(999)
      })
      expect(missing).toBe(false)
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView
    }
  })
})

describe('渲染定制（对应源项目插槽，D4）', () => {
  it('renderExpandBtn 替代 nodeBtnContent，收到 node / data / expanded / side', () => {
    const renderExpandBtn = ({ expanded, side, data }: any) => (
      <i className="my-btn">{`${side}:${data.id}:${expanded ? '-' : '+'}`}</i>
    )
    const { container } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      showCollapsable: true,
      renderExpandBtn,
    })
    expect(q(btnOf(container, 'A'), '.my-btn').textContent).toBe('right:1:+')
    clickBtnOf(container, 'A')
    expect(q(btnOf(container, 'A'), '.my-btn').textContent).toBe('right:1:-')
    // 递归透传到子节点
    expect(q(btnOf(container, 'B'), '.my-btn').textContent).toBe('right:2:+')
  })

  it('OKR 模式左按钮的 side 为 left', () => {
    const { container } = renderTree({
      data: makeData(),
      leftData: [{ id: 1, label: 'A', children: [{ id: 12, label: 'L' }] }],
      onlyBothTree: true,
      direction: 'horizontal',
      showCollapsable: true,
      nodeKey: 'id',
      renderExpandBtn: ({ side }: any) => <i className="my-btn">{side}</i>,
    })
    expect(q(container, '.is-root-label .org-chart-node-left-btn .my-btn').textContent).toBe('left')
    expect(q(container, '.is-root-label .org-chart-node-btn .my-btn').textContent).toBe('right')
  })

  it('showNodeNum 优先于 renderExpandBtn（折叠时显示数字）', () => {
    const { container } = renderTree({
      data: makeData(),
      showCollapsable: true,
      showNodeNum: true,
      renderExpandBtn: () => <i className="my-btn">x</i>,
    })
    const btn = q(container, '.org-chart-node-btn')
    expect(q(btn, '.org-chart-node-btn-text').textContent).toBe('2')
    expect(btn.querySelector('.my-btn')).toBeNull()
  })

  it('empty（对应 #empty 插槽）在 data 为空时渲染', () => {
    const ref = createRef<OkrTreeHandle>()
    const empty = <p className="empty-tip">暂无数据</p>
    const utils = render(<OkrTree data={[]} empty={empty} ref={ref} />)
    expect(q(utils.container, '.org-chart-empty .empty-tip').textContent).toBe('暂无数据')
    utils.rerender(<OkrTree data={makeData()} empty={empty} ref={ref} />)
    expect(utils.container.querySelector('.org-chart-empty')).toBeNull()
    expect(labels(utils.container)).toHaveLength(4)
  })
})

describe('组件级开发期警告', () => {
  beforeEach(() => resetWarnings())

  it('onlyBothTree 非 horizontal、leftData 未开 onlyBothTree、受控 prop 缺 node-key 时警告', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderTree({
      data: makeData(),
      leftData: [{ id: 1, label: 'A' }],
      onlyBothTree: true,
      direction: 'vertical',
    })
    renderTree({ data: makeData(), leftData: [{ id: 1, label: 'A' }] })
    renderTree({ data: makeData(), expandedKeys: [1], currentKey: 1 })
    const messages = spy.mock.calls.map(c => String(c[0]))
    expect(messages.some(m => m.includes('onlyBothTree 仅在 direction="horizontal"'))).toBe(true)
    expect(messages.some(m => m.includes('leftData 会被忽略'))).toBe(true)
    expect(messages.some(m => m.includes('expanded-keys'))).toBe(true)
    expect(messages.some(m => m.includes('current-key'))).toBe(true)
    spy.mockRestore()
  })

  /**
   * 另外三条各挂一次、每次先清 spy：断的是「这一支自己的条件」。
   * 一条 pooled 断言会把它们全蒙过去——`current-key` 那条的文案本身就写着
   * 「current-key / currentNodeKey」，只传 currentNodeKey 时靠子串也能命中，
   * 摘掉 `|| p.currentNodeKey !== undefined` 也不会红。所以补一条反向守卫：
   * node-key 齐备时三条都不许出现，否则「无条件警告」的写法也能过关。
   */
  it('default-expanded-keys / default-checked-keys / currentNodeKey 缺 node-key 时各自警告', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const warnedOf = (props: Partial<OkrTreeProps>): string[] => {
      spy.mockClear()
      /**
       * 每次挂载前都要清 `warn` 的去重表：`warn(msg)` 默认 once，同一条文案在整个
       * 模块里只出一次。不清的话最后那次「node-key 已补齐」的反向挂载根本不会再
       * 产生消息，反向守卫就变成永真——实测把 `if (!p.nodeKey)` 改成无条件警告时，
       * 这条守卫照样绿，红的是文件里另一条老用例。
       */
      resetWarnings()
      renderTree({ data: makeData(), ...props })
      return spy.mock.calls.map(c => String(c[0]))
    }
    expect(
      warnedOf({ defaultExpandedKeys: [1] }).some(m => m.includes('default-expanded-keys')),
      '只传 default-expanded-keys 时应警告它需要 node-key'
    ).toBe(true)
    expect(
      warnedOf({ defaultCheckedKeys: [1] }).some(m => m.includes('default-checked-keys')),
      '只传 default-checked-keys 时应警告它需要 node-key'
    ).toBe(true)
    expect(
      warnedOf({ currentNodeKey: 1 }).some(m => m.includes('currentNodeKey')),
      '只传 currentNodeKey（不传 currentKey）时也应警告'
    ).toBe(true)
    expect(
      warnedOf({
        nodeKey: 'id',
        defaultExpandedKeys: [1],
        defaultCheckedKeys: [1],
        currentNodeKey: 1,
      }).some(m => m.includes('需要同时设置 node-key')),
      '补齐 node-key 后这三条警告都不该出现'
    ).toBe(false)
    spy.mockRestore()
  })

  it('配置正确时无警告', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderTree({
      data: makeData(),
      nodeKey: 'id',
      expandedKeys: [1],
      currentKey: null,
      showCollapsable: true,
    })
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
