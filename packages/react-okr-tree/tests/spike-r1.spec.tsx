/**
 * 阶段 0.1 spike：验证 requirements R1 的订阅层方案能否做到局部更新。
 *
 * 这里刻意不依赖 src/model（那是阶段 2 的事），只用一个同构的最小原型回答三个问题：
 *  1. 可变 class 实例 + useSyncExternalStore，能否让「点击单个节点的展开」只重渲染该节点；
 *  2. 跨节点交互态（源项目的 dragOverNode / focusedNode 那一类）能否只重渲染新旧两个节点；
 *  3. 一次事件里的多次字段赋值，会不会被 React 的自动批处理合并成一次重渲染（expandAll 的性能前提）。
 *
 * 结论回写 docs/requirements.md R1 与 docs/development-plan.md 阶段 0。
 */
import { describe, expect, it } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { useSyncExternalStore, type ReactNode } from 'react'

class Notifier {
  rev = 0
  private listeners = new Set<() => void>()
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }
  notify(): void {
    this.rev += 1
    for (const fn of [...this.listeners]) fn()
  }
}

/** 与 TreeNode 同构：状态字段私有 + 公开访问器自动通知，写入方无需记得 bump */
class SpikeNode {
  readonly id: number
  readonly children: SpikeNode[]
  private notifier = new Notifier()
  private _expanded: boolean
  private _flag = false

  constructor(id: number, children: SpikeNode[], expanded = true) {
    this.id = id
    this.children = children
    this._expanded = expanded
  }

  subscribe = this.notifier.subscribe
  getSnapshot = () => this.notifier.rev

  get expanded(): boolean {
    return this._expanded
  }
  set expanded(value: boolean) {
    if (this._expanded === value) return
    this._expanded = value
    this.notifier.notify()
  }

  get flag(): boolean {
    return this._flag
  }
  set flag(value: boolean) {
    if (this._flag === value) return
    this._flag = value
    this.notifier.notify()
  }

  /** 子列表变化通知的是「拥有这个列表的节点」，因为它负责渲染 v-for */
  replaceChildren(next: SpikeNode[]): void {
    this.children.splice(0, this.children.length, ...next)
    this.notifier.notify()
  }
}

let counts = new Map<number, number>()

function readCount(id: number): number {
  return counts.get(id) ?? 0
}

function NodeView({ node }: { node: SpikeNode }): ReactNode {
  useSyncExternalStore(node.subscribe, node.getSnapshot, () => 0)
  counts.set(node.id, (counts.get(node.id) ?? 0) + 1)
  return (
    <div data-node={node.id}>
      <span>{node.flag ? 'flagged' : ''}</span>
      <button type="button" data-toggle={node.id} onClick={() => (node.expanded = !node.expanded)}>
        {node.id}
      </button>
      {node.expanded && node.children.map(child => <NodeView key={child.id} node={child} />)}
    </div>
  )
}

/** 折叠时子树保持挂载（真实实现的语义：靠 is-hidden 收起，因此根节点不会位移） */
function NodeViewAlwaysMounted({ node }: { node: SpikeNode }): ReactNode {
  useSyncExternalStore(node.subscribe, node.getSnapshot, () => 0)
  counts.set(node.id, (counts.get(node.id) ?? 0) + 1)
  return (
    <div data-node={node.id} className={node.expanded ? '' : 'is-hidden'}>
      <button type="button" data-toggle={node.id} onClick={() => (node.expanded = !node.expanded)}>
        {node.id}
      </button>
      {node.children.map(child => (
        <NodeViewAlwaysMounted key={child.id} node={child} />
      ))}
    </div>
  )
}

/** 跨节点交互态：只 bump 上一个与下一个持有者 */
class CrossState {
  current: SpikeNode | null = null
  set(node: SpikeNode | null): void {
    const prev = this.current
    if (prev === node) return
    this.current = node
    // 用取反代替直接赋值：值必须真的变化，否则 setter 的等值短路会让通知丢失
    if (prev) prev.flag = !prev.flag
    if (node) node.flag = !node.flag
  }
}

function buildTree(): { root: SpikeNode; byId: Map<number, SpikeNode>; total: number } {
  let seed = 0
  const byId = new Map<number, SpikeNode>()
  const make = (depth: number): SpikeNode => {
    const node = new SpikeNode(seed++, [])
    byId.set(node.id, node)
    if (depth > 0) {
      const kids = Array.from({ length: depth === 1 ? 15 : 20 }, () => make(depth - 1))
      node.replaceChildren(kids)
    }
    return node
  }
  const root = make(2)
  // 1 + 20 + 20*15 = 321 个节点
  return { root, byId, total: byId.size }
}

function resetProbes(): void {
  counts = new Map()
}

describe('R1 订阅层：局部更新能力', () => {
  it('原型树确实有 300+ 个节点', () => {
    expect(buildTree().total).toBeGreaterThan(300)
  })

  it('点击单个节点的展开只重渲染该节点', () => {
    const { root, byId } = buildTree()
    resetProbes()
    render(<NodeView node={root} />)

    // 一个第二层节点（拥有 15 个子节点），它的 id 记为 target
    const target = root.children[3]
    expect(target.children.length).toBe(15)
    resetProbes()

    fireEvent.click(document.querySelector(`[data-toggle="${target.id}"]`)!)

    expect(readCount(target.id)).toBe(1)
    // 根节点与所有其他节点都没有重渲染
    expect(readCount(root.id)).toBe(0)
    const others = [...byId.keys()].filter(id => id !== target.id)
    expect(others.filter(id => readCount(id) > 0)).toEqual([])
  })

  it('收起后再展开，子节点重新挂载但不影响兄弟子树', () => {
    const { root } = buildTree()
    resetProbes()
    render(<NodeView node={root} />)

    const a = root.children[0]
    const b = root.children[1]
    resetProbes()

    act(() => {
      a.expanded = false
    })
    const afterCollapse = new Map(counts)
    expect(afterCollapse.get(b.id) ?? 0).toBe(0)

    counts = new Map()
    act(() => {
      a.expanded = true
    })
    expect(readCount(a.id)).toBe(1)
    expect(readCount(b.id)).toBe(0)
    // 展开把 a 的 15 个子节点重新挂载
    expect([...counts.keys()]).toContain(a.children[0].id)
  })

  it('跨节点交互态只重渲染新旧两个节点', () => {
    const { root } = buildTree()
    const cross = new CrossState()
    resetProbes()
    render(<NodeView node={root} />)

    const x = root.children[2].children[1]
    const y = root.children[5].children[3]
    resetProbes()

    act(() => {
      cross.set(x)
    })
    expect(readCount(x.id)).toBe(1)
    expect(readCount(y.id)).toBe(0)
    expect(readCount(root.id)).toBe(0)

    counts = new Map()
    act(() => {
      cross.set(y)
    })
    // 旧的 x 与新的 y 各一次，其他为零
    expect(readCount(x.id)).toBe(1)
    expect(readCount(y.id)).toBe(1)
    expect(readCount(root.id)).toBe(0)
  })

  it('一次事件内多次赋值被 React 自动批处理合并为一次重渲染', () => {
    const { root } = buildTree()
    resetProbes()
    render(<NodeView node={root} />)

    const target = root.children[1]
    resetProbes()

    act(() => {
      target.expanded = false
      target.flag = true
      target.expanded = true
      target.replaceChildren([new SpikeNode(9000 + target.id, [])])
    })

    expect(readCount(target.id)).toBe(1)
  })

  it('整树批量展开时每个挂载中的节点各重渲染一次（expandAll 的开销上界）', () => {
    const { root, byId } = buildTree()
    resetProbes()
    render(<NodeViewAlwaysMounted node={root} />)
    expect(byId.size).toBeGreaterThan(300)

    // 先全部收起：等值短路会吞掉重复赋值，所以这一步不能省
    act(() => {
      for (const node of byId.values()) node.expanded = false
    })
    resetProbes()

    act(() => {
      for (const node of byId.values()) node.expanded = true
    })

    for (const id of byId.keys()) {
      expect(readCount(id)).toBe(1)
    }
    // 321 个节点、每人一次：总渲染次数就是节点数，而不是节点数 × 字段数
    let total = 0
    for (const n of counts.values()) total += n
    expect(total).toBe(byId.size)
  })
})
