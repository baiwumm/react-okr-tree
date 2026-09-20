import { describe, it, expect, vi } from 'vitest'
import { act, fireEvent, render, type RenderResult } from '@testing-library/react'
import { createRef, useReducer, useRef, type ReactNode } from 'react'
import { OkrTree, type OkrTreeHandle } from '../../src/index'
import type { TreeNode } from '../../src/model/node'
import type { OkrTreeProps } from '../../src/OkrTree'

const makeData = () => [
  {
    id: 1,
    label: 'xxx科技有限公司',
    children: [
      {
        id: 2,
        label: '产品研发部',
        children: [
          { id: 3, label: '研发-前端' },
          { id: 4, label: '研发-后端' },
        ],
      },
      { id: 6, label: '销售部', children: [{ id: 7, label: '销售一部' }] },
      { id: 9, label: '财务部' },
    ],
  },
]

const makeLeftData = () => [
  {
    id: 1,
    label: 'xxx科技有限公司',
    children: [
      { id: 12, label: '(左)产品研发部', children: [{ id: 13, label: '(左)研发-前端' }] },
      { id: 16, label: '(左)销售部' },
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

describe('渲染：三种模式', () => {
  it('垂直模式（默认）渲染全部节点', () => {
    const { container } = renderTree({ data: makeData() })
    expect(q(container, '.org-chart-container')).toBeTruthy()
    const rootChildren = q(container, '.org-chart-node-children')
    expect(rootChildren.classList).toContain('vertical')
    expect(rootChildren.classList).toContain('one-branch')
    expect(labels(container)).toEqual([
      'xxx科技有限公司',
      '产品研发部',
      '研发-前端',
      '研发-后端',
      '销售部',
      '销售一部',
      '财务部',
    ])
    // 未开启 showCollapsable 时无展开按钮，且全部展开
    expect(q(container, '.org-chart-node-btn')).toBeNull()
    expect(qa(container, '.org-chart-node-children').length).toBeGreaterThan(1)
  })

  it('水平模式', () => {
    const { container } = renderTree({ data: makeData(), direction: 'horizontal' })
    expect(q(container, '.org-chart-node-children').classList).toContain('horizontal')
    expect(labels(container)).toHaveLength(7)
  })

  it('多根数据不带 one-branch', () => {
    const { container } = renderTree({ data: [{ label: 'A' }, { label: 'B' }] })
    expect(q(container, '.org-chart-node-children').classList).not.toContain('one-branch')
    expect(labels(container)).toEqual(['A', 'B'])
  })

  it('OKR 模式渲染左右子树，根节点带 only-both-tree-node / align-root', () => {
    const { container } = renderTree({
      data: makeData(),
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
      nodeKey: 'id',
    })
    const rootNode = q(container, '.org-chart-node')
    expect(rootNode.classList).toContain('only-both-tree-node')
    expect(rootNode.classList).toContain('align-root')
    const left = q(container, '.org-chart-node-left-children')
    expect(left).toBeTruthy()
    // 左树节点模板中子容器位于标签之前，DOM 顺序为 子 → 父 → 兄弟
    expect(labels(left)).toEqual(['(左)研发-前端', '(左)产品研发部', '(左)销售部'])
    expect(q(left, '.org-chart-node').classList).toContain('is-left-child-node')
    expect(labels(container)).toHaveLength(10)
  })

  it('alignRoot=false 时不加 align-root 类', () => {
    const { container } = renderTree({
      data: makeData(),
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
      alignRoot: false,
    })
    expect(q(container, '.org-chart-node').classList).not.toContain('align-root')
  })

  it('OKR 模式缺 leftData 抛错', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() =>
        renderTree({ data: makeData(), onlyBothTree: true, direction: 'horizontal' })
      ).toThrow('[Tree] leftData is required in onlyBothTree')
    } finally {
      errorSpy.mockRestore()
    }
  })
})

describe('展开 / 折叠', () => {
  it('showCollapsable 默认折叠，点击按钮展开并触发 onNodeExpand / onNodeCollapse', () => {
    const onNodeExpand = vi.fn()
    const onNodeCollapse = vi.fn()
    const { container, handle } = renderTree({
      data: makeData(),
      showCollapsable: true,
      nodeKey: 'id',
      onNodeExpand,
      onNodeCollapse,
    })
    const rootNode = q(container, '.org-chart-node')
    // 原版语义：collapsed = !leftExpanded || !expanded，非 OKR 模式下 leftExpanded 恒为 false，
    // 该类常驻并由子容器连线覆盖其指示线，此处按原版保留
    expect(rootNode.classList).toContain('collapsed')
    const btn = q(rootNode, '.org-chart-node-btn')
    expect(btn).toBeTruthy()
    expect(btn.classList).not.toContain('expanded')
    const children = q(rootNode, '.org-chart-node-children')
    expect(children.getAttribute('style')).toContain('visibility: hidden')

    act(() => {
      fireEvent.click(btn)
    })
    expect(onNodeExpand).toHaveBeenCalledTimes(1)
    expect(onNodeExpand.mock.calls[0][0].id).toBe(1)
    expect(handle.getNode(1)!.expanded).toBe(true)
    expect(btn.classList).toContain('expanded')
    expect(children.getAttribute('style') || '').not.toContain('visibility: hidden')

    act(() => {
      fireEvent.click(btn)
    })
    expect(onNodeCollapse).toHaveBeenCalledTimes(1)
    expect(handle.getNode(1)!.expanded).toBe(false)
    expect(btn.classList).not.toContain('expanded')
    expect(children.getAttribute('style')).toContain('visibility: hidden')
  })

  it('defaultExpandAll 全部展开', () => {
    const { container } = renderTree({
      data: makeData(),
      showCollapsable: true,
      defaultExpandAll: true,
    })
    expect(q(container, '.org-chart-node').classList).not.toContain('collapsed')
    expect(q(container, '.org-chart-node-btn').classList).toContain('expanded')
  })

  it('defaultExpandedKeys 展开指定节点及祖先', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      showCollapsable: true,
      nodeKey: 'id',
      defaultExpandedKeys: [3],
    })
    expect(handle.getNode(1)!.expanded).toBe(true)
    expect(handle.getNode(2)!.expanded).toBe(true)
    expect(handle.getNode(3)!.expanded).toBe(true)
    expect(handle.getNode(6)!.expanded).toBe(false)
    const byLabel = (label: string) =>
      qa(container, '.org-chart-node').find(n => labels(n)[0] === label)!
    const childrenStyle = (label: string) =>
      q(byLabel(label), '.org-chart-node-children')?.getAttribute('style') || ''
    expect(childrenStyle('xxx科技有限公司')).not.toContain('visibility: hidden')
    expect(childrenStyle('产品研发部')).not.toContain('visibility: hidden')
    expect(childrenStyle('销售部')).toContain('visibility: hidden')
  })

  it('showNodeNum 在折叠态显示子节点数', () => {
    const { container } = renderTree({
      data: makeData(),
      showCollapsable: true,
      showNodeNum: true,
    })
    const btn = q(container, '.org-chart-node-btn')
    expect(q(btn, '.org-chart-node-btn-text').textContent).toBe('3')
    act(() => {
      fireEvent.click(btn)
    })
    expect(q(btn, '.org-chart-node-btn-text')).toBeNull()
  })

  it('OKR 模式左侧按钮切换 leftExpanded 并触发事件', () => {
    const onNodeExpand = vi.fn()
    const onNodeCollapse = vi.fn()
    const { container } = renderTree({
      data: makeData(),
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
      showCollapsable: true,
      defaultExpandAll: true,
      onNodeExpand,
      onNodeCollapse,
    })
    const rootNode = q(container, '.org-chart-node')
    // 左树子节点的左按钮在 DOM 中位于根节点按钮之前，需通过根标签定位
    const leftBtn = q(rootNode, '.is-root-label .org-chart-node-left-btn')
    expect(leftBtn).toBeTruthy()
    expect(leftBtn.classList).toContain('expanded')
    act(() => {
      fireEvent.click(leftBtn)
    })
    expect(onNodeCollapse).toHaveBeenCalledTimes(1)
    expect(leftBtn.classList).not.toContain('expanded')
    expect(q(rootNode, '.org-chart-node-left-children').getAttribute('style')).toContain(
      'visibility: hidden'
    )
    act(() => {
      fireEvent.click(leftBtn)
    })
    expect(onNodeExpand).toHaveBeenCalledTimes(1)
  })
})

describe('选中与事件', () => {
  it('onNodeClick 触发事件并设置 is-current / currentLableClassName', () => {
    const onNodeClick = vi.fn()
    const { container, handle } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      currentLableClassName: 'my-current',
      labelClassName: (node: TreeNode) => `lvl-${node.level}`,
      onNodeClick,
    })
    const inner = qa(container, '.org-chart-node-label-inner')[1]
    expect(inner.classList).toContain('lvl-2')
    act(() => {
      fireEvent.click(inner)
    })
    expect(onNodeClick).toHaveBeenCalledTimes(1)
    const [data, node] = onNodeClick.mock.calls[0] as [any, TreeNode]
    expect(data.label).toBe('产品研发部')
    expect(node.isCurrent).toBe(true)
    expect(inner.classList).toContain('is-current')
    expect(inner.classList).toContain('my-current')

    expect(handle.getCurrentKey()).toBe(2)
    expect((handle.getCurrentNode() as any).label).toBe('产品研发部')
    act(() => {
      handle.setCurrentKey(null)
    })
    expect(inner.classList).not.toContain('is-current')
    expect(handle.getCurrentKey()).toBeNull()
  })

  it('setCurrentKey / setCurrentNode / currentNodeKey', () => {
    const { container, handle } = renderTree({ data: makeData(), nodeKey: 'id', currentNodeKey: 9 })
    expect(handle.getCurrentKey()).toBe(9)
    act(() => {
      handle.setCurrentKey(3)
    })
    expect(handle.getCurrentKey()).toBe(3)
    const current = qa(container, '.org-chart-node-label-inner').filter(el =>
      el.classList.contains('is-current')
    )
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toBe('研发-前端')
    act(() => {
      handle.setCurrentNode(handle.getNode(7)!)
    })
    expect(handle.getCurrentKey()).toBe(7)
  })

  it('禁用节点不可选中、不触发 onNodeClick', () => {
    const onNodeClick = vi.fn()
    const { container } = renderTree({
      data: [{ label: 'A', disabled: true }, { label: 'B' }],
      onNodeClick,
    })
    const [a, b] = qa(container, '.org-chart-node-label-inner')
    expect(a.classList).toContain('is-disabled')
    act(() => {
      fireEvent.click(a)
    })
    expect(onNodeClick).not.toHaveBeenCalled()
    act(() => {
      fireEvent.click(b)
    })
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('onNodeContextMenu：绑定时阻止默认菜单，未绑定时不阻止', () => {
    const onNodeContextMenu = vi.fn()
    const bound = renderTree({ data: makeData(), onNodeContextMenu })
    const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    act(() => {
      q(bound.container, '.org-chart-node').dispatchEvent(evt)
    })
    expect(evt.defaultPrevented).toBe(true)
    expect(onNodeContextMenu).toHaveBeenCalledTimes(1)
    const [event, data, node] = onNodeContextMenu.mock.calls[0] as any[]
    expect(event.nativeEvent).toBe(evt)
    expect(data.id).toBe(1)
    expect(node.level).toBe(1)

    const unbound = renderTree({ data: makeData() })
    const evt2 = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    act(() => {
      q(unbound.container, '.org-chart-node').dispatchEvent(evt2)
    })
    expect(evt2.defaultPrevented).toBe(false)
  })

  it('缺 nodeKey 时相关方法抛错（文案与源项目一致）', () => {
    const { handle } = renderTree({ data: makeData() })
    expect(() => handle.setCurrentKey(1)).toThrow('[Tree] nodeKey is required in setCurrentKey')
    expect(() => handle.getCurrentKey()).toThrow('[Tree] nodeKey is required in getCurrentKey')
    expect(() => handle.setCurrentNode(handle.root.childNodes[0])).toThrow(
      '[Tree] nodeKey is required in setCurrentNode'
    )
    expect(() => handle.updateKeyChildren(1, [])).toThrow(
      '[Tree] nodeKey is required in updateKeyChild'
    )
    expect(() => handle.filter('x')).toThrow('[Tree] filterNodeMethod is required when filter')
  })
})

describe('filter', () => {
  const filterNode = (value: string, data: any) => (!value ? true : data.label.includes(value))

  it('过滤后隐藏不匹配节点，空值恢复', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      filterNodeMethod: filterNode,
      direction: 'horizontal',
    })
    act(() => {
      handle.filter('前端')
    })
    expect(labels(container)).toEqual(['xxx科技有限公司', '产品研发部', '研发-前端'])
    act(() => {
      handle.filter('')
    })
    expect(labels(container)).toHaveLength(7)
  })

  it('OKR 模式同时过滤左右子树', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
      nodeKey: 'id',
      filterNodeMethod: filterNode,
    })
    act(() => {
      handle.filter('销售')
    })
    expect(labels(container)).toEqual(['(左)销售部', 'xxx科技有限公司', '销售部', '销售一部'])
  })

  it('showNodeNum 只统计过滤后可见的子节点', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      nodeKey: 'id',
      showCollapsable: true,
      showNodeNum: true,
      filterNodeMethod: filterNode,
    })
    const btn = q(container, '.org-chart-node-btn')
    expect(q(btn, '.org-chart-node-btn-text').textContent).toBe('3')
    // 过滤会自动展开命中节点，收起后按钮上的数字才是本用例要看的
    act(() => {
      handle.filter('销售')
    })
    act(() => {
      handle.collapseAll()
    })
    expect(q(btn, '.org-chart-node-btn-text').textContent).toBe('1')
  })
})

describe('自定义内容', () => {
  it('renderContent 收到 node（React 版不传 h，D1）并渲染', () => {
    const renderContent = vi.fn((node: TreeNode): ReactNode => (
      <div className="custom">
        <b>{node.label}</b>
        <i>{node.data.id}</i>
      </div>
    ))
    const { container } = renderTree({ data: [{ id: 1, label: 'Root' }], renderContent })
    expect(renderContent).toHaveBeenCalled()
    expect(renderContent.mock.calls[0].length).toBe(1)
    expect(renderContent.mock.calls[0][0].label).toBe('Root')
    expect(q(container, '.custom b').textContent).toBe('Root')
    expect(q(container, '.custom i').textContent).toBe('1')
  })

  it('nodeBtnContent 自定义按钮内容', () => {
    const { container } = renderTree({
      data: makeData(),
      showCollapsable: true,
      nodeBtnContent: (node: TreeNode): ReactNode => (
        <span className="my-btn">{node.expanded ? '-' : '+'}</span>
      ),
    })
    expect(q(container, '.org-chart-node-btn .my-btn').textContent).toBe('+')
  })

  it('renderNode（对应源项目 #default 插槽）', () => {
    const { container } = renderTree({
      data: [{ id: 1, label: 'Root', extra: 'X' }],
      renderNode: ({ node, data }) => <em>{`${node.label}/${data.extra}`}</em>,
    })
    expect(q(container, '.org-chart-node-label-inner em').textContent).toBe('Root/X')
  })

  it('节点内容优先级：renderNode > nodeComponent > renderContent', () => {
    const NodeComponent = ({ node }: { node: TreeNode }): ReactNode => <b>comp:{node.label}</b>
    const { container } = renderTree({
      data: [{ id: 1, label: 'Root' }],
      nodeComponent: NodeComponent,
      renderContent: () => <i>content</i>,
    })
    expect(q(container, '.org-chart-node-label-inner').textContent).toBe('comp:Root')
    const withSlot = renderTree({
      data: [{ id: 1, label: 'Root' }],
      nodeComponent: NodeComponent,
      renderNode: () => <u>renderNode</u>,
    })
    expect(q(withSlot.container, '.org-chart-node-label-inner').textContent).toBe('renderNode')
  })

  it('empty（对应 #empty 插槽）在 data 为空数组时渲染', () => {
    const { container } = renderTree({ data: [], empty: <div className="my-empty">暂无数据</div> })
    expect(q(container, '.org-chart-empty .my-empty').textContent).toBe('暂无数据')
  })

  it('labelWidth / labelHeight：number → px，string 原样', () => {
    const w1 = renderTree({ data: [{ label: 'A' }], labelWidth: 120, labelHeight: 40 })
    const style1 = q(w1.container, '.org-chart-node-label-inner').getAttribute('style')!
    expect(style1).toContain('width: 120px')
    expect(style1).toContain('height: 40px')
    const w2 = renderTree({ data: [{ label: 'A' }], labelWidth: '50%' })
    expect(q(w2.container, '.org-chart-node-label-inner').getAttribute('style')).toContain('50%')
  })
})

describe('数据响应', () => {
  it('替换 data 引用后重新渲染', () => {
    const { rerender, container } = renderTree({ data: makeData(), nodeKey: 'id' })
    rerender(<OkrTree data={[{ id: 100, label: 'New' }]} nodeKey="id" />)
    expect(labels(container)).toEqual(['New'])
  })

  it('同引用原地变更 + 宿主重渲染 → 渲染时脏检查接住（requirements R2）', () => {
    let forceRender: () => void = () => {}
    let getData: () => any[] = () => []
    function Host() {
      const dataRef = useRef(makeData())
      const [, bump] = useReducer((x: number) => x + 1, 0)
      forceRender = bump
      getData = () => dataRef.current
      return <OkrTree data={dataRef.current} nodeKey="id" showCollapsable defaultExpandAll />
    }
    const { container } = render(<Host />)
    expect(labels(container)).toHaveLength(7)

    act(() => {
      getData()[0].children.push({ id: 50, label: '新部门' })
      forceRender()
    })
    expect(labels(container)).toContain('新部门')

    act(() => {
      getData()[0].children.splice(0, 1)
      forceRender()
    })
    expect(labels(container)).not.toContain('产品研发部')
    expect(labels(container)).toHaveLength(5)
  })

  it('append / remove / insertBefore 等方法驱动视图更新', () => {
    const { container, handle } = renderTree({ data: makeData(), nodeKey: 'id' })
    act(() => {
      handle.append({ id: 60, label: '新增' }, 6)
    })
    expect(labels(container)).toContain('新增')
    act(() => {
      handle.remove(2)
    })
    expect(labels(container)).not.toContain('产品研发部')
    act(() => {
      handle.insertBefore({ id: 61, label: '总部' }, 6)
    })
    const l = labels(container)
    expect(l.indexOf('总部')).toBe(l.indexOf('销售部') - 1)
    act(() => {
      handle.updateKeyChildren(6, [{ id: 70, label: '销售三部' }])
    })
    expect(labels(container)).toContain('销售三部')
    expect(labels(container)).not.toContain('销售一部')
  })

  it('leftData 更新后左子树更新，右树 data 更新后左子树不丢失', () => {
    const { rerender, container } = renderTree({
      data: makeData(),
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
      nodeKey: 'id',
    })
    rerender(
      <OkrTree
        data={makeData()}
        leftData={[{ id: 1, label: 'L', children: [{ id: 99, label: '新左' }] }]}
        onlyBothTree
        direction="horizontal"
        nodeKey="id"
      />
    )
    const leftLabels = () => labels(q(container, '.org-chart-node-left-children'))
    expect(leftLabels()).toEqual(['新左'])
    rerender(
      <OkrTree
        data={[{ id: 1, label: 'Right2', children: [{ id: 300, label: 'R' }] }]}
        leftData={[{ id: 1, label: 'L', children: [{ id: 99, label: '新左' }] }]}
        onlyBothTree
        direction="horizontal"
        nodeKey="id"
      />
    )
    expect(leftLabels()).toEqual(['新左'])
    expect(labels(container)).toContain('Right2')
  })
})

describe('children 与默认导出（D6 / 渲染定制）', () => {
  it('children 传函数等价 renderNode', () => {
    const { container } = render(
      <OkrTree data={[{ id: 1, label: 'Root' }]}>
        {({ node }) => <b>{`c-${node.label}`}</b>}
      </OkrTree>
    )
    expect(q(container, '.org-chart-node-label-inner').textContent).toBe('c-Root')
  })

  it('children 传非函数不渲染，并给一次开发期警告', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // 类型上已经收严为「只接受函数」，这里演的是 JS 消费者的误用
    const props = { data: [{ id: 1, label: 'Root' }], children: <span>串</span> }
    const { container } = render(<OkrTree {...(props as unknown as OkrTreeProps)} />)
    expect(container.querySelector('span')).toBeNull()
    expect(container.querySelector('.org-chart-node-label-inner')?.textContent).toBe('Root')
    expect(spy.mock.calls.map(c => String(c[0])).join('\n')).toContain('children 只接受函数形式')
    spy.mockRestore()
  })

  it('默认导出与具名 OkrTree 同一引用（源码层面，D6）', async () => {
    const mod = await import('../../src/index')
    expect(mod.default).toBe(mod.OkrTree)
  })
})
