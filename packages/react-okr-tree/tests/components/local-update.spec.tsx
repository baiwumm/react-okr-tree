import { describe, expect, it } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, type OkrTreeHandle } from '../../src/index'
import type { TreeNodeData } from '../../src/types'

/**
 * 局部更新回归（阶段 4.8，把阶段 0.1 的结论固化成常规用例）。
 *
 * 判据是模型层的「谁被 bump 了」：每个组件只订阅自己那个节点的版本，
 * 因此「只有一个节点的版本变了」等价于「React 只会重渲染那个节点」。
 * 整树退化成全量重渲染是这版移植最容易写坏的地方，必须有门禁。
 *
 * 注意断言只比 TreeNode.id（内部自增 id），不要 deep-equal 整个节点对象——
 * 失败时打印 300 个嵌套实例的 diff 能把单条用例拖到十几秒。
 */
function buildData(branches: number, perBranch: number): TreeNodeData[] {
  const out: TreeNodeData[] = []
  let id = 1
  for (let i = 0; i < branches; i++) {
    const children: TreeNodeData[] = []
    for (let j = 0; j < perBranch; j++) {
      children.push({ id: id++, label: `leaf-${i}-${j}` })
    }
    out.push({ id: id++, label: `branch-${i}`, children })
  }
  return out
}

const collectAll = (handle: OkrTreeHandle) => {
  const all: { id: number; rev: number }[] = []
  handle.store.forEachNode(n => all.push({ id: n.id, rev: n.getSnapshot() }))
  return all
}

describe('局部更新', () => {
  it('点击单个节点的展开按钮，只有该节点的版本前进', () => {
    const ref = createRef<OkrTreeHandle>()
    const { container } = render(
      <OkrTree data={buildData(20, 15)} nodeKey="id" showCollapsable ref={ref} />
    )
    const handle = ref.current!
    // 20 个分支 + 每个 15 个叶子 = 320 个节点（折叠子树仍挂载，这里数的是全部节点）
    expect(collectAll(handle).length).toBeGreaterThan(300)

    const before = collectAll(handle)
    let mutations = 0
    const unsubscribe = handle.store.subscribeMutation(() => {
      mutations += 1
    })

    // 文档序第一个按钮属于第一个分支节点
    const target = handle.store.root.childNodes[0]
    act(() => {
      fireEvent.click(container.querySelector('.org-chart-node-btn') as HTMLElement)
    })

    const after = collectAll(handle)
    const changed = after.filter((n, i) => n.rev !== before[i].rev)
    expect(changed.map(n => n.id)).toEqual([target.id])
    expect(mutations).toBe(1)
    unsubscribe()
  })

  it('键盘漫游移动焦点时，只有失去与获得焦点的两个节点重渲染', () => {
    const ref = createRef<OkrTreeHandle>()
    const { container } = render(
      <OkrTree data={buildData(10, 10)} nodeKey="id" showCollapsable ref={ref} />
    )
    const handle = ref.current!
    const first = container.querySelector<HTMLElement>('.org-chart-node')!

    act(() => {
      first.focus()
    })
    const before = collectAll(handle)
    act(() => {
      fireEvent.keyDown(first, { key: 'ArrowDown' })
    })
    const after = collectAll(handle)
    const changed = after.filter((n, i) => n.rev !== before[i].rev)

    // 收起的子树不可达，↓ 落到第二个分支；焦点交接到它 ⇒ 只有旧焦点节点与新焦点节点被 bump
    const focused = document.activeElement as HTMLElement
    expect(focused).not.toBe(first)
    expect(focused.querySelector('.org-chart-node-label-inner')?.textContent).toBe('branch-1')
    expect(changed).toHaveLength(2)
    const ids = new Set(changed.map(n => n.id))
    const nodeIdsOf = (el: HTMLElement) => {
      const label = el.querySelector('.org-chart-node-label-inner')?.textContent
      const node = handle.store.getVisibleNodes().find(n => n.label === label)
      return node?.id
    }
    expect(ids).toContain(nodeIdsOf(first)!)
    expect(ids).toContain(nodeIdsOf(focused)!)
    expect(focused.tabIndex).toBe(0)
    expect(first.tabIndex).toBe(-1)
  })

  it('勾选父节点会联动整棵子树（此时全量 bump 是预期行为）', () => {
    const ref = createRef<OkrTreeHandle>()
    const { container } = render(
      <OkrTree data={buildData(1, 3)} nodeKey="id" showCheckbox ref={ref} />
    )
    const handle = ref.current!
    act(() => {
      fireEvent.click(container.querySelector('.org-chart-node-checkbox') as HTMLElement)
    })
    const branch = handle.store.root.childNodes[0]
    expect(branch.checked).toBe(true)
    expect(branch.childNodes.every(c => c.checked)).toBe(true)
  })
})
