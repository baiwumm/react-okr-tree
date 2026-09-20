import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, type RenderResult } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, type OkrTreeHandle } from '../../src/index'
import type { OkrTreeProps } from '../../src/OkrTree'
import { getNodeKey, markNodeData, resetWarnings } from '../../src/model/util'

const makeData = () => [
  {
    id: 1,
    label: 'A',
    children: [
      { id: 2, label: 'B' },
      { id: 4, label: 'D' },
    ],
  },
]

const labels = (container: ParentNode) =>
  Array.from(container.querySelectorAll('.org-chart-node-label-inner')).map(el =>
    el.textContent?.trim()
  )

const nodeByLabel = (container: ParentNode, label: string) =>
  Array.from(container.querySelectorAll<HTMLElement>('.org-chart-node')).find(
    n => n.querySelector('.org-chart-node-label-inner')?.textContent?.trim() === label
  )!

const childrenStyle = (container: ParentNode, label: string) =>
  nodeByLabel(container, label).querySelector('.org-chart-node-children')?.getAttribute('style') ||
  ''

function renderTree(props: OkrTreeProps): RenderResult & { handle: OkrTreeHandle } {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(<OkrTree {...props} ref={ref} />)
  return { ...utils, handle: ref.current! }
}

describe('冻结 / 只读源数据', () => {
  beforeEach(() => resetWarnings())

  it('浅冻结 data：正常渲染、可展开收起，不抛异常', () => {
    const data = Object.freeze(makeData()) as any
    const { container, handle } = renderTree({ data, nodeKey: 'id', showCollapsable: true })
    expect(labels(container)).toEqual(['A', 'B', 'D'])
    // 初始折叠（容器在 DOM 中但隐藏）；点击为展开
    expect(childrenStyle(container, 'A')).toContain('visibility: hidden')
    act(() => {
      fireEvent.click(nodeByLabel(container, 'A').querySelector('.org-chart-node-btn')!)
    })
    expect(handle.getNode(1)!.expanded).toBe(true)
    expect(childrenStyle(container, 'A')).not.toContain('height: 0')
    // 再收起，无异常
    act(() => {
      fireEvent.click(nodeByLabel(container, 'A').querySelector('.org-chart-node-btn')!)
    })
    expect(childrenStyle(container, 'A')).toContain('visibility: hidden')
  })

  it('深冻结（children 数组也冻结）：渲染、展开收起均不抛异常', () => {
    const data = JSON.parse(JSON.stringify(makeData()))
    Object.freeze(data)
    data.forEach((root: any) => {
      Object.freeze(root)
      root.children?.forEach((c: any) => Object.freeze(c))
      if (root.children) Object.freeze(root.children)
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, handle } = renderTree({
      data,
      nodeKey: 'id',
      showCollapsable: true,
      defaultExpandAll: true,
    })
    expect(labels(container)).toEqual(['A', 'B', 'D'])
    // 展开收起（不涉及源数据回写）
    act(() => {
      handle.collapseNode(1)
    })
    act(() => {
      handle.expandNode(1)
    })
    expect(labels(container)).toEqual(['A', 'B', 'D'])
    warnSpy.mockRestore()
  })

  it('深冻结数据调用 append / remove：收到开发期警告、不抛错', () => {
    const data = JSON.parse(JSON.stringify(makeData()))
    Object.freeze(data)
    data.forEach((root: any) => {
      Object.freeze(root)
      Object.freeze(root.children)
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { handle } = renderTree({ data, nodeKey: 'id' })

    act(() => {
      handle.append({ id: 9, label: 'I' })
    })
    expect(errorSpy).not.toHaveBeenCalled()
    const messages = warnSpy.mock.calls.map(c => String(c[0]))
    expect(messages.some(m => m.includes('冻结/只读源数据'))).toBe(true)
    expect(messages.some(m => m.includes('append'))).toBe(true)

    act(() => {
      handle.remove(2)
    })
    expect(errorSpy).not.toHaveBeenCalled()
    expect(warnSpy.mock.calls.some(c => String(c[0]).includes('remove'))).toBe(true)
    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it('markNodeData 在冻结对象上写入失败时降级 WeakMap，getNodeKey 兜底可用', () => {
    const frozen = Object.freeze({ label: 'X' })
    markNodeData({ id: 42 }, frozen)
    // defineProperty 抛错被吞掉，id 走 WeakMap
    expect(getNodeKey(undefined, frozen)).toBe(42)
    // 非冻结对象行为不变（写入 $treeNodeId）
    const plain: any = { label: 'Y' }
    markNodeData({ id: 7 }, plain)
    expect(getNodeKey(undefined, plain)).toBe(7)
  })

  it('未配置 node-key 的冻结数据可渲染，列表 key 使用 WeakMap 兜底 id', () => {
    const data = Object.freeze(makeData()) as any
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderTree({ data })
    expect(labels(container)).toEqual(['A', 'B', 'D'])
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
