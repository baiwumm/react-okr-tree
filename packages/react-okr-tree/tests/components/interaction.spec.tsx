import { describe, it, expect, vi } from 'vitest'
import { act, fireEvent, render, type RenderResult } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, type OkrTreeHandle, type OkrTreeProps } from '../../src/index'

const makeData = () => [
  {
    id: 1,
    label: 'Root',
    children: [
      { id: 11, label: 'A', children: [{ id: 111, label: 'A1' }] },
      { id: 12, label: 'B', children: [{ id: 121, label: 'B1' }] },
      { id: 13, label: 'C', children: [{ id: 131, label: 'C1' }] },
    ],
  },
]

function renderTree(props: OkrTreeProps): RenderResult & { handle: OkrTreeHandle } {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(<OkrTree {...props} ref={ref} />)
  return { ...utils, handle: ref.current! }
}

/**
 * 收起态的子容器仍渲染在 DOM 中（height: 0 隐藏），文档序包含未展开的子孙节点，
 * 且展开/收起会触发元素重建——按标签文本每次重新查找才是稳定定位。
 */
const nodeByLabel = (container: ParentNode, label: string) =>
  Array.from(container.querySelectorAll<HTMLElement>('.org-chart-node')).find(
    n => n.querySelector('.org-chart-node-label-inner')?.textContent?.trim() === label
  )!

const clickBtnOf = (container: ParentNode, label: string) => {
  const btn = nodeByLabel(container, label).querySelector('.org-chart-node-btn') as HTMLElement
  act(() => {
    fireEvent.click(btn)
  })
}

const clickLabel = (container: ParentNode, label: string) => {
  const inner = nodeByLabel(container, label).querySelector(
    '.org-chart-node-label-inner'
  ) as HTMLElement
  act(() => {
    fireEvent.click(inner)
  })
}

const keydownOf = (container: ParentNode, label: string, key: string) => {
  const node = nodeByLabel(container, label)
  act(() => {
    node.focus()
    fireEvent.keyDown(node, { key })
  })
}

describe('accordion 手风琴模式', () => {
  it('默认关闭：同级兄弟可同时展开', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      showCollapsable: true,
      nodeKey: 'id',
    })
    clickBtnOf(container, 'A')
    clickBtnOf(container, 'B')
    expect(handle.getNode(11)!.expanded).toBe(true)
    expect(handle.getNode(12)!.expanded).toBe(true)
  })

  it('开启后：交互展开 B 时自动收起同级已展开的 A', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      showCollapsable: true,
      accordion: true,
      nodeKey: 'id',
    })
    clickBtnOf(container, 'A')
    expect(handle.getNode(11)!.expanded).toBe(true)
    clickBtnOf(container, 'B')
    expect(handle.getNode(12)!.expanded).toBe(true)
    expect(handle.getNode(11)!.expanded).toBe(false)
  })

  it('键盘方向键触发的展开同样受互斥约束', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      showCollapsable: true,
      accordion: true,
      nodeKey: 'id',
    })
    clickBtnOf(container, 'A')
    // → 键展开当前节点（Enter 是选中/激活语义，展开需 expandOnClickNode）
    keydownOf(container, 'B', 'ArrowRight')
    expect(handle.getNode(12)!.expanded).toBe(true)
    expect(handle.getNode(11)!.expanded).toBe(false)
  })

  it('程序化 expandNode 不受互斥限制（与 el-tree 语义一致）', () => {
    const { handle } = renderTree({
      data: makeData(),
      showCollapsable: true,
      accordion: true,
      nodeKey: 'id',
    })
    handle.expandNode(11)
    handle.expandNode(12)
    expect(handle.getNode(11)!.expanded).toBe(true)
    expect(handle.getNode(12)!.expanded).toBe(true)
  })

  it('受控 expandedKeys 含多个同级 key 时全部生效', () => {
    const { handle } = renderTree({
      data: makeData(),
      showCollapsable: true,
      accordion: true,
      nodeKey: 'id',
      expandedKeys: [11, 12],
    })
    expect(handle.getNode(11)!.expanded).toBe(true)
    expect(handle.getNode(12)!.expanded).toBe(true)
  })

  it('运行时切换 accordion 即时生效', () => {
    const props: OkrTreeProps = { data: makeData(), showCollapsable: true, nodeKey: 'id' }
    const { container, rerender, handle } = renderTree(props)
    rerender(<OkrTree {...props} accordion nodeKey="id" showCollapsable />)
    clickBtnOf(container, 'A')
    clickBtnOf(container, 'B')
    expect(handle.getNode(12)!.expanded).toBe(true)
    expect(handle.getNode(11)!.expanded).toBe(false)
  })
})

describe('expandOnClickNode 点击节点内容展开', () => {
  it('默认 false：点击节点内容只选中，不切换展开', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      showCollapsable: true,
      nodeKey: 'id',
    })
    clickLabel(container, 'A')
    expect(handle.getNode(11)!.expanded).toBe(false)
    expect(handle.getNode(11)!.isCurrent).toBe(true)
  })

  it('开启后：点击节点内容切换展开/收起，且选中态与 onNodeClick 正常', () => {
    const onNodeClick = vi.fn()
    const { container, handle } = renderTree({
      data: makeData(),
      showCollapsable: true,
      expandOnClickNode: true,
      nodeKey: 'id',
      onNodeClick,
    })
    clickLabel(container, 'A')
    expect(handle.getNode(11)!.expanded).toBe(true)
    expect(handle.getNode(11)!.isCurrent).toBe(true)
    clickLabel(container, 'A')
    expect(handle.getNode(11)!.expanded).toBe(false)
    expect(onNodeClick).toHaveBeenCalledTimes(2)
  })

  it('叶子节点点击内容不切换展开', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      showCollapsable: true,
      expandOnClickNode: true,
      nodeKey: 'id',
    })
    act(() => {
      handle.expandNode(11)
    })
    clickLabel(container, 'A1')
    expect(handle.getNode(11)!.expanded).toBe(true) // 不受影响
    expect(handle.getNode(111)!.isCurrent).toBe(true)
  })
})
