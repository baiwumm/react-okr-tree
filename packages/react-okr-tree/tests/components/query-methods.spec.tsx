import { describe, it, expect } from 'vitest'
import { act, render, type RenderResult } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, type OkrTreeHandle, type OkrTreeProps } from '../../src/index'
import type { FilterNodeMethod, TreeNode, TreeNodeData } from '../../src/types'

/**
 * 移植自源项目 tests/components/query-methods.spec.ts。
 *
 * 查询类方法（getVisibleNodes / getNodePath）是纯模型读取，不依赖渲染；
 * 但改变展开态的入口方法会通知订阅者重渲染（React 里属离散更新），一律包在 act 内。
 */

const makeData = (): TreeNodeData[] => [
  {
    id: 1,
    label: 'Root',
    children: [
      {
        id: 11,
        label: 'A',
        children: [
          { id: 111, label: 'A1' },
          { id: 112, label: 'A2' },
        ],
      },
      { id: 12, label: 'B', children: [{ id: 121, label: 'B1' }] },
      { id: 13, label: 'C' },
    ],
  },
]

/** OKR 的 leftData[0] 是根节点的左侧镜像（与右树根同 id），渲染的是它的 children */
const makeLeftData = (): TreeNodeData[] => [
  {
    id: 1,
    label: 'Root',
    children: [
      { id: 21, label: '左A', children: [{ id: 211, label: '左A1' }] },
      { id: 22, label: '左B' },
    ],
  },
]

/** 对齐源项目的 mountTree：默认 props + 覆盖项，同一个 ref 暴露 handle */
function renderTree(extra: Partial<OkrTreeProps> = {}): RenderResult & { handle: OkrTreeHandle } {
  const ref = createRef<OkrTreeHandle>()
  const props: OkrTreeProps = {
    data: makeData(),
    nodeKey: 'id',
    showCollapsable: true,
    ...extra,
  }
  const utils = render(<OkrTree {...props} ref={ref} />)
  return { ...utils, handle: ref.current! }
}

/** 编程式调用 handle 方法会通知订阅者渲染，需包在 act 内（见 checkbox.spec.tsx 的同名helper） */
const inAct = <T,>(fn: () => T): T => {
  let value: T = undefined as unknown as T
  act(() => {
    value = fn()
  })
  return value
}

const labelsOf = (nodes: TreeNode[]) => nodes.map(n => n.label)

describe('getVisibleNodes', () => {
  it('折叠的子树不计入，即使它仍挂载在 DOM 中', () => {
    const { container, handle } = renderTree()
    expect(labelsOf(handle.getVisibleNodes())).toEqual(['Root'])
    // 折叠节点仍存在于 DOM（靠 is-hidden 收起），二者必须区分开
    expect(container.querySelectorAll('.org-chart-node')).toHaveLength(7)

    inAct(() => handle.expandNode(1))
    expect(labelsOf(handle.getVisibleNodes())).toEqual(['Root', 'A', 'B', 'C'])

    inAct(() => handle.expandNode(11))
    expect(labelsOf(handle.getVisibleNodes())).toEqual(['Root', 'A', 'A1', 'A2', 'B', 'C'])

    inAct(() => handle.collapseNode(1))
    expect(labelsOf(handle.getVisibleNodes())).toEqual(['Root'])
  })

  it('expandAll 后与全部节点一致；filter 只保留通过过滤的可见节点', () => {
    const filterNodeMethod: FilterNodeMethod = (value, data) =>
      !value ? true : String(data.label).includes(value)
    const { handle } = renderTree({ filterNodeMethod })
    inAct(() => handle.expandAll())
    expect(handle.getVisibleNodes()).toHaveLength(7)

    inAct(() => handle.filter('A1'))
    // 父节点有可见后代时保持可见（element-ui 语义），A2 / B / C 被过滤掉
    expect(labelsOf(handle.getVisibleNodes())).toEqual(['Root', 'A', 'A1'])
  })

  it('OKR 模式左树按 leftExpanded 计入', () => {
    const { handle } = renderTree({
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
    })
    const withoutLeft = handle.getVisibleNodes()
    inAct(() => handle.expandNode(1))
    const firstRoot = handle.store.root.childNodes[0]
    inAct(() => {
      firstRoot.leftExpanded = true
    })
    const withLeft = handle.getVisibleNodes()
    expect(withLeft.length).toBeGreaterThan(withoutLeft.length)
    expect(labelsOf(withLeft)).toEqual(['Root', 'A', 'B', 'C', '左A', '左B'])

    // 左树自身的下级同样只看 leftExpanded
    inAct(() => {
      firstRoot.leftChildNodes[0].leftExpanded = true
    })
    expect(labelsOf(handle.getVisibleNodes())).toContain('左A1')
  })
})

describe('getNodePath', () => {
  it('key / data 对象 / Node 实例三种入参返回同一条链', () => {
    const { handle } = renderTree()
    const byKey = handle.getNodePath(111)
    const node = handle.getNode(111)!
    expect(labelsOf(byKey)).toEqual(['Root', 'A', 'A1'])
    expect(handle.getNodePath(node.data)).toEqual(byKey)
    expect(handle.getNodePath(node)).toEqual(byKey)
    expect(byKey[byKey.length - 1]).toBe(node)
  })

  it('顶层节点的链路只含自身；未命中返回空数组', () => {
    const { handle } = renderTree()
    expect(labelsOf(handle.getNodePath(1))).toEqual(['Root'])
    expect(handle.getNodePath(999)).toEqual([])
    expect(handle.getNodePath(null as any)).toEqual([])
  })

  it('OKR 左树节点的链路留在左树内，不跨接到右树根', () => {
    const { handle } = renderTree({
      leftData: makeLeftData(),
      onlyBothTree: true,
      direction: 'horizontal',
    })
    // 左树顶层是根节点的左侧镜像（与右树根同 key），链路沿左树父链上溯到它为止
    expect(labelsOf(handle.getNodePath(211))).toEqual(['Root', '左A', '左A1'])
  })
})
