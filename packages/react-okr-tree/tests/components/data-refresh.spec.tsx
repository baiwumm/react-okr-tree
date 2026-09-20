import { describe, expect, it } from 'vitest'
import { act, render, type RenderResult } from '@testing-library/react'
import { createRef, useState, type RefObject } from 'react'
import { OkrTree, type OkrTreeHandle } from '../../src/index'
import type { OkrTreeProps } from '../../src/OkrTree'
import type { TreeNodeData } from '../../src/types'

/**
 * requirements R2 / D7：React 观察不到「同引用 + 宿主没重渲染」的原地变更，
 * 因此给出三条路径，各自都要有断言兜着。
 */
const makeData = (): TreeNodeData[] => [
  {
    id: 1,
    label: 'Root',
    children: [
      { id: 2, label: 'A' },
      { id: 3, label: 'B' },
    ],
  },
]

const labels = (container: ParentNode) =>
  Array.from(container.querySelectorAll('.org-chart-node-label-inner')).map(el =>
    el.textContent?.trim()
  )

function renderTree(props: OkrTreeProps): RenderResult & { handle: OkrTreeHandle } {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(<OkrTree {...props} ref={ref} />)
  return { ...utils, handle: ref.current! }
}

/** 宿主持有 data 引用（引用恒定），并暴露一个「原地改 + 强制重渲染」的开关 */
let mutateAndRender: (fn: () => void) => void = () => {}

function Host({ ref }: { ref: RefObject<OkrTreeHandle | null> }) {
  const [data] = useState(makeData)
  const [, bump] = useState(0)
  mutateAndRender = fn => {
    fn()
    // 只 bump 宿主：data 引用保持不变，走 R2 的渲染时脏检查
    bump(n => n + 1)
  }
  return <OkrTree data={data} nodeKey="id" showCollapsable defaultExpandAll ref={ref} />
}

describe('data 变更检测（R2 / D7）', () => {
  it('换引用 → 全量重建', () => {
    const { container, rerender } = renderTree({ data: makeData(), nodeKey: 'id' })
    expect(labels(container)).toEqual(['Root', 'A', 'B'])
    rerender(
      <OkrTree
        data={[{ id: 9, label: 'Other', children: [{ id: 10, label: 'X' }] }]}
        nodeKey="id"
      />
    )
    expect(labels(container)).toEqual(['Other', 'X'])
  })

  it('宿主每次渲染新建数组字面量但元素相同 → 不重建，展开态不被冲掉', () => {
    const ref = createRef<OkrTreeHandle>()
    const branch = { id: 1, label: 'Root', children: [{ id: 2, label: 'A' }] }
    const utils = render(<OkrTree data={[branch]} nodeKey="id" showCollapsable ref={ref} />)
    const handle = ref.current!
    act(() => {
      handle.expandNode(1)
    })
    expect(handle.getNode(1)!.expanded).toBe(true)

    // 换一个外壳、同一批对象：若被当成变化就会重建并丢掉展开态
    utils.rerender(<OkrTree data={[branch]} nodeKey="id" showCollapsable ref={ref} />)
    utils.rerender(<OkrTree data={[branch]} nodeKey="id" showCollapsable ref={ref} />)
    expect(handle.getNode(1)!.expanded).toBe(true)
    expect(handle.store.root.childNodes[0]).toBe(handle.getNode(1))
  })

  it('同引用原地 push / splice + 宿主重渲染 → 渲染时脏检查接住', () => {
    const ref = createRef<OkrTreeHandle>()
    const { container } = render(<Host ref={ref} />)
    const handle = ref.current!
    expect(labels(container)).toEqual(['Root', 'A', 'B'])

    act(() => {
      mutateAndRender(() => {
        handle.store.root.childNodes[0].data.children.push({ id: 4, label: 'C' })
      })
    })
    expect(labels(container)).toContain('C')

    act(() => {
      mutateAndRender(() => {
        const children = handle.store.root.childNodes[0].data.children
        children.splice(0, 1)
      })
    })
    expect(labels(container)).not.toContain('A')
    expect(labels(container)).toEqual(['Root', 'B', 'C'])
    // 复用实例：增量更新而不是整棵重建
    expect(handle.getNode(1)!.expanded).toBe(true)
  })

  it('handle.refreshData()：宿主不重渲染时的显式兜底', () => {
    const ref = createRef<OkrTreeHandle>()
    const { container } = render(<Host ref={ref} />)
    const handle = ref.current!

    // 只改源数据，不触发宿主渲染
    handle.store.root.childNodes[0].data.children.push({ id: 77, label: '手动' })
    expect(labels(container)).not.toContain('手动')

    act(() => {
      handle.refreshData()
    })
    expect(labels(container)).toContain('手动')
  })

  it('deepWatch=false 时只认引用变化，不做同引用扫描', () => {
    const ref = createRef<OkrTreeHandle>()
    const data = makeData()
    const utils = render(
      <OkrTree
        data={data}
        nodeKey="id"
        showCollapsable
        defaultExpandAll
        deepWatch={false}
        ref={ref}
      />
    )

    // 原地加一个子节点但引用不变：deepWatch=false 时不该被接住
    act(() => {
      data[0].children.push({ id: 5, label: 'D' })
      utils.rerender(
        <OkrTree
          data={data}
          nodeKey="id"
          showCollapsable
          defaultExpandAll
          deepWatch={false}
          ref={ref}
        />
      )
    })
    expect(labels(utils.container)).not.toContain('D')

    // deepWatch=false 关掉同引用扫描后，必须换成一整批新对象才会重建——
    // 只换数组外壳（[...data]）不算变化：sameItems 保护会认定内容同一批对象、刻意不重建，
    // 这正是「宿主每帧新建数组字面量」不丢展开态的代价。README 里也要按这个口径写。
    act(() => {
      utils.rerender(
        <OkrTree
          data={JSON.parse(JSON.stringify(data))}
          nodeKey="id"
          showCollapsable
          defaultExpandAll
          deepWatch={false}
          ref={ref}
        />
      )
    })
    expect(labels(utils.container)).toContain('D')
  })
})
