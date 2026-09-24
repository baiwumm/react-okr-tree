import { describe, it, expect } from 'vitest'
import { act, render } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, type OkrTreeHandle } from '../../src/index'

// leftData 首项是包装根，它不进画面，它的 children 才是左树顶层（与 OkrTreeGroup 的用法一致）
const makeLeftData = () => [
  {
    id: 100,
    label: 'LRoot',
    children: [
      { id: 101, label: 'L1', children: [{ id: 1011, label: 'L1a' }] },
      { id: 102, label: 'L2' },
    ],
  },
]

const renderTree = () => {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(
    <OkrTree
      data={[{ id: 1, label: 'R' }]}
      leftData={makeLeftData()}
      onlyBothTree
      direction="horizontal"
      nodeKey="id"
      ref={ref}
    />
  )
  return { ...utils, ref: ref }
}

const leftLabels = (container: ParentNode) =>
  Array.from(container.querySelectorAll('.org-chart-node.is-left-child-node')).map(
    el =>
      el
        .querySelector(':scope > .org-chart-node-label > .org-chart-node-label-inner')
        ?.textContent?.trim() ?? ''
  )

describe('OKR 左树顶层的结构性变更（1.2 回归）', () => {
  it('remove 左树顶层节点：画面随即少掉它和它的子树', () => {
    const { container, ref } = renderTree()
    expect(leftLabels(container)).toEqual(['L1', 'L1a', 'L2'])

    act(() => {
      ref.current!.remove(101)
    })

    expect(leftLabels(container)).toEqual(['L2'])
    expect(ref.current!.getNode(101)).toBeNull()
    expect(ref.current!.getNode(1011)).toBeNull()
  })

  it('append 到左树顶层：新节点出现在画面上', () => {
    const { container, ref } = renderTree()
    act(() => {
      ref.current!.append({ id: 103, label: 'L3' }, 100)
    })
    expect(leftLabels(container)).toEqual(['L1', 'L1a', 'L2', 'L3'])
  })

  it('insertBefore 左树顶层同级：顺序与模型一致', () => {
    const { container, ref } = renderTree()
    act(() => {
      ref.current!.insertBefore({ id: 104, label: 'L0' }, 101)
    })
    expect(leftLabels(container)).toEqual(['L0', 'L1', 'L1a', 'L2'])
  })
})
