import { describe, it, expect, vi } from 'vitest'
import { act, render, type RenderResult } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, type OkrTreeHandle, type OkrTreeProps } from '../../src/index'

const makeData = () => [
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

/** 对齐源项目的 mount：ref 承载 imperative handle；data 复用同一引用以便断言源数据回写 */
function renderTree(props: OkrTreeProps): RenderResult & { handle: OkrTreeHandle } {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(<OkrTree {...props} ref={ref} />)
  return { ...utils, handle: ref.current! }
}

const allNodes = (c: ParentNode) => Array.from(c.querySelectorAll<HTMLElement>('.org-chart-node'))

/**
 * 节点自身的标签元素：必须用 :scope 限定直接子代——querySelector 会下降到整个子树，
 * OKR 模式根节点的左子树容器在模板序上先于自身标签，子树查找会命中后代节点的标签
 */
const ownLabel = (n: HTMLElement) =>
  n
    .querySelector(':scope > .org-chart-node-label > .org-chart-node-label-inner')
    ?.textContent?.trim()

const nodeByLabel = (c: ParentNode, label: string) => allNodes(c).find(n => ownLabel(n) === label)!

/** 放置分区挂在 label 外层，拖拽起点 / 终点是内层卡片 */
const labelOf = (n: HTMLElement) => n.querySelector<HTMLElement>(':scope > .org-chart-node-label')!
const innerOf = (n: HTMLElement) =>
  n.querySelector<HTMLElement>(':scope > .org-chart-node-label > .org-chart-node-label-inner')!

/**
 * jsdom 未实现 DragEvent（testing-library 会退化成普通 Event，clientX / clientY 丢失），
 * 而分区判定读的正是这两个坐标，故用 MouseEvent 构造同名事件，并挂一个 DataTransfer 桩。
 */
const createDataTransfer = () => {
  const store: Record<string, string> = {}
  return {
    effectAllowed: '',
    dropEffect: '',
    setData: (type: string, value: string) => {
      store[type] = value
    },
    getData: (type: string) => store[type] ?? '',
  }
}

const fireDrag = (el: HTMLElement, type: string, coord = { clientX: 0, clientY: 0 }) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...coord })
  Object.defineProperty(event, 'dataTransfer', { value: createDataTransfer() })
  act(() => {
    el.dispatchEvent(event)
  })
}

/** 模拟 getBoundingClientRect（分区处理器读的是 label 的 currentTarget） */
const mockRect = (el: HTMLElement) => {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    bottom: 100,
    right: 100,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}
const horizontalOffset = (offset: number) => ({ clientY: offset, clientX: offset })

/** 编程式调用 store 方法会通知订阅者渲染（React 里属离散更新），需包在 act 内并回传返回值 */
const inAct = <T,>(fn: () => T): T => {
  let value: T = undefined as unknown as T
  act(() => {
    value = fn()
  })
  return value
}

/** 完整拖放流程：dragstart(from) → dragover(to, offset) → drop(to) → dragend(from) */
const dragDrop = (c: ParentNode, from: string, to: string, offset: number) => {
  fireDrag(innerOf(nodeByLabel(c, from)), 'dragstart')
  const target = labelOf(nodeByLabel(c, to))
  mockRect(target)
  fireDrag(target, 'dragover', horizontalOffset(offset))
  fireDrag(target, 'drop')
  fireDrag(innerOf(nodeByLabel(c, from)), 'dragend')
}

/** 源数据辅助：从 data 数组里摘出某个 id 的对象引用 */
const findData = (list: any[], id: number): any =>
  list.reduce<any>((found, item) => {
    if (found) return found
    if (item.id === id) return item
    return findData(item.children || [], id)
  }, null)

describe('draggable 基础', () => {
  it('默认不可拖；开启后卡片 draggable，disabled 节点不可拖', () => {
    const plain = renderTree({ data: makeData() })
    expect(innerOf(nodeByLabel(plain.container, 'Root')).getAttribute('draggable')).toBe('false')

    const { container } = renderTree({ data: makeData(), draggable: true, nodeKey: 'id' })
    expect(innerOf(nodeByLabel(container, 'A')).getAttribute('draggable')).toBe('true')

    const withDisabled = renderTree({
      data: [{ id: 1, label: 'R', children: [{ id: 2, label: 'D', disabled: true }] }],
      draggable: true,
      nodeKey: 'id',
    })
    expect(innerOf(nodeByLabel(withDisabled.container, 'D')).getAttribute('draggable')).toBe(
      'false'
    )
  })

  it('dragstart / dragend 事件', () => {
    const onNodeDragStart = vi.fn()
    const onNodeDragEnd = vi.fn()
    const { container } = renderTree({
      data: makeData(),
      draggable: true,
      nodeKey: 'id',
      onNodeDragStart,
      onNodeDragEnd,
    })
    fireDrag(innerOf(nodeByLabel(container, 'A')), 'dragstart')
    expect(onNodeDragStart).toHaveBeenCalledTimes(1)
    expect(onNodeDragStart.mock.calls[0][0].key).toBe(11)
    fireDrag(innerOf(nodeByLabel(container, 'A')), 'dragend')
    expect(onNodeDragEnd).toHaveBeenCalledTimes(1)
  })

  it('成功放置后 onNodeDragEnd 报出真实落点（不是 null 载荷）', () => {
    const onNodeDragEnd = vi.fn()
    const onNodeDrop = vi.fn()
    const { container } = renderTree({
      data: makeData(),
      draggable: true,
      nodeKey: 'id',
      onNodeDrop,
      onNodeDragEnd,
    })
    // B 拖进 A 的 inner 区：drop 先派发，dragend 紧随其后
    dragDrop(container, 'B', 'A', 50)
    expect(onNodeDrop).toHaveBeenCalledTimes(1)
    expect(onNodeDragEnd).toHaveBeenCalledTimes(1)
    // 旧实现这里两个参数恒为 null——handleDrop 在 dragend 之前就把 dragOver 清了，
    // 于是宿主侧每次成功拖动只能记一句「未完成放置」，第六个事件的载荷等于没有
    const [, dropNode, dropType] = onNodeDragEnd.mock.calls[0]
    expect(onNodeDragEnd.mock.calls[0][0].key).toBe(12)
    expect(dropNode.key).toBe(11)
    expect(dropType).toBe('inner')
  })

  it('连续两次放置：每次都收到一对 drop / drag-end（手势状态不泄漏到下一轮）', () => {
    const onNodeDragEnd = vi.fn()
    const onNodeDrop = vi.fn()
    const { container } = renderTree({
      data: makeData(),
      draggable: true,
      nodeKey: 'id',
      onNodeDrop,
      onNodeDragEnd,
    })
    dragDrop(container, 'B', 'A', 50)
    dragDrop(container, 'C', 'A', 50)
    expect(onNodeDrop).toHaveBeenCalledTimes(2)
    expect(onNodeDragEnd).toHaveBeenCalledTimes(2)
    expect(onNodeDragEnd.mock.calls.map((c: any[]) => [c[0].key, c[1]?.key, c[2]])).toEqual([
      [12, 11, 'inner'],
      [13, 11, 'inner'],
    ])
  })

  it('被 allowDrop 拒掉的放置：onNodeDragEnd 仍然报 null', () => {
    const onNodeDragEnd = vi.fn()
    const onNodeDrop = vi.fn()
    const { container } = renderTree({
      data: makeData(),
      draggable: true,
      nodeKey: 'id',
      allowDrop: () => false,
      onNodeDrop,
      onNodeDragEnd,
    })
    dragDrop(container, 'B', 'A', 50)
    expect(onNodeDrop).not.toHaveBeenCalled()
    expect(onNodeDragEnd).toHaveBeenCalledTimes(1)
    expect(onNodeDragEnd.mock.calls[0][1]).toBeNull()
    expect(onNodeDragEnd.mock.calls[0][2]).toBeNull()
  })

  it('allowDrag 返回 false：不可拖拽且不触发 onNodeDragStart', () => {
    const onNodeDragStart = vi.fn()
    const { container } = renderTree({
      data: makeData(),
      draggable: true,
      nodeKey: 'id',
      allowDrag: node => node.key !== 11,
      onNodeDragStart,
    })
    expect(innerOf(nodeByLabel(container, 'A')).getAttribute('draggable')).toBe('false')
    fireDrag(innerOf(nodeByLabel(container, 'A')), 'dragstart')
    expect(onNodeDragStart).not.toHaveBeenCalled()
  })
})

describe('放置分区与数据同步（水平模式按 Y 轴）', () => {
  it('prev：拖到目标同级之前，源数据同步', () => {
    const data = makeData()
    const onNodeDrop = vi.fn()
    const { container, handle } = renderTree({
      data,
      draggable: true,
      nodeKey: 'id',
      onNodeDrop,
    })
    dragDrop(container, 'B', 'A', 10) // B 拖到 A 上方 25% → prev
    // 视图：B 成为 A 的前置兄弟
    expect(handle.getNode(12)!.parent!.key).toBe(1)
    const siblingIds = data[0].children.map((c: any) => c.id)
    expect(siblingIds).toEqual([12, 11, 13])
    // 事件
    expect(onNodeDrop).toHaveBeenCalledTimes(1)
    const [dragged, dropped, type] = onNodeDrop.mock.calls[0]
    expect(dragged.key).toBe(12)
    expect(dropped.key).toBe(11)
    expect(type).toBe('prev')
  })

  it('next：拖到目标同级之后', () => {
    const data = makeData()
    const { container } = renderTree({ data, draggable: true, nodeKey: 'id' })
    dragDrop(container, 'C', 'A', 90) // A 下方 75% → next
    expect(data[0].children.map((c: any) => c.id)).toEqual([11, 13, 12])
  })

  it('inner：成为目标子节点，目标自动展开并回写受控 expandedKeys', () => {
    const data = makeData()
    const onExpandedKeysChange = vi.fn()
    const { container, handle } = renderTree({
      data,
      draggable: true,
      nodeKey: 'id',
      expandedKeys: [1],
      onExpandedKeysChange,
    })
    dragDrop(container, 'C', 'A', 50) // 中间 → inner
    expect(handle.getNode(13)!.parent!.key).toBe(11)
    expect(findData(data, 11).children.map((c: any) => c.id)).toEqual([111, 112, 13])
    // 受控回写契约（D3：v-model:expanded-keys → expandedKeys + onExpandedKeysChange）：
    // 回调收到的新列表包含被自动展开的目标 11；真实受控下宿主回写后 setExpandedKeys 会保持展开态
    // （测试内静态 prop 不回写，渲染时脏检查会按旧值 [1] 重设，属受控模式的既定语义）
    const calls = onExpandedKeysChange.mock.calls
    const emittedKeys = calls[calls.length - 1][0] as number[]
    expect(emittedKeys).toContain(11)
    expect(emittedKeys).toContain(1)
  })

  it('硬性禁止：不可放到自身或自己的子树内', () => {
    const data = makeData()
    const onNodeDrop = vi.fn()
    const { container, handle } = renderTree({
      data,
      draggable: true,
      nodeKey: 'id',
      onNodeDrop,
    })
    dragDrop(container, 'A', 'A1', 50) // A 拖进自己的子节点
    expect(findData(data, 111).children).toBeUndefined()
    expect(onNodeDrop).not.toHaveBeenCalled()
    // 树结构未被破坏
    expect(handle.getNode(11)!.parent!.key).toBe(1)
  })

  it('allowDrop 返回 false：对应放置位置被禁止，其他位置可用', () => {
    const data = makeData()
    const { container } = renderTree({
      data,
      draggable: true,
      nodeKey: 'id',
      allowDrop: (_draggingNode, _dropNode, type) => type !== 'inner',
    })
    dragDrop(container, 'C', 'A', 50) // inner 被禁止
    expect(findData(data, 11).children.map((c: any) => c.id)).toEqual([111, 112])
    dragDrop(container, 'C', 'A', 90) // next 仍可用
    expect(data[0].children.map((c: any) => c.id)).toEqual([11, 13, 12])
  })
})

describe('moveNode 方法与层级修正', () => {
  it('ref.moveNode 编程式移动，层级随新位置修正', () => {
    const data = makeData()
    const { handle } = renderTree({ data, draggable: true, nodeKey: 'id' })
    expect(inAct(() => handle.moveNode(111, 12, 'inner'))).toBe(true)
    expect(handle.getNode(111)!.parent!.key).toBe(12)
    expect(handle.getNode(111)!.level).toBe(3)
    expect(handle.getNode(1)!.level).toBe(1)
    expect(findData(data, 12).children.map((c: any) => c.id)).toEqual([121, 111])
    // 硬性禁止：移动到自身子树
    expect(inAct(() => handle.moveNode(12, 111, 'inner'))).toBe(false)
  })
})

describe('OKR 模式跨左右树', () => {
  const okrRender = (props: Partial<OkrTreeProps> = {}) => {
    const rightData = [
      {
        id: 1,
        label: 'R',
        children: [{ id: 11, label: 'RA', children: [{ id: 111, label: 'RA1' }] }],
      },
    ]
    const leftData = [
      {
        id: 2,
        label: 'L',
        children: [{ id: 21, label: 'LA', children: [{ id: 211, label: 'LA1' }] }],
      },
    ]
    const rendered = renderTree({
      data: rightData,
      leftData,
      onlyBothTree: true,
      direction: 'horizontal',
      draggable: true,
      nodeKey: 'id',
      ...props,
    })
    return { rightData, leftData, ...rendered }
  }

  const rightOrLeft = (c: ParentNode, label: string, left: boolean) =>
    allNodes(c)
      .filter(n => n.classList.contains('is-left-child-node') === left)
      .find(n => ownLabel(n) === label)!

  it('默认禁止跨左右树拖动', () => {
    const { container, rightData, leftData } = okrRender()
    const target = labelOf(rightOrLeft(container, 'RA', false))
    // 从左树发起拖拽
    fireDrag(innerOf(rightOrLeft(container, 'LA', true)), 'dragstart')
    mockRect(target)
    fireDrag(target, 'dragover', horizontalOffset(50))
    expect(container.querySelector('.drop-inner')).toBeNull()
    fireDrag(target, 'drop')
    expect(findData(rightData, 11).children.map((c: any) => c.id)).toEqual([111])
    expect(findData(leftData, 2).children.map((c: any) => c.id)).toEqual([21])
  })

  it('allowDrop 返回 true 放开跨树，注册表与 isLeftChild 随之迁移', () => {
    const { container, handle, rightData, leftData } = okrRender({ allowDrop: () => true })
    const target = labelOf(rightOrLeft(container, 'RA1', false))
    // 左树 LA1 拖到右树 RA1（inner）
    fireDrag(innerOf(rightOrLeft(container, 'LA1', true)), 'dragstart')
    mockRect(target)
    fireDrag(target, 'dragover', horizontalOffset(50))
    expect(container.querySelector('.drop-inner')).toBeTruthy()
    fireDrag(target, 'drop')
    // 源数据：leftData 失去 211，rightData 的 111 得到 211
    expect(findData(leftData, 21).children).toEqual([])
    expect(findData(rightData, 111).children.map((c: any) => c.id)).toEqual([211])
    // 注册表：211 迁到右树注册表，isLeftChild 翻转，层级修正
    expect(handle.getNode(211)!.isLeftChild).toBe(false)
    expect(handle.getNode(211)!.parent!.key).toBe(111)
    expect(handle.getNode(211)!.level).toBe(4)
    expect(handle.store.nodesMap['211']).toBeTruthy()
    expect(handle.store.leftNodesMap['211']).toBeUndefined()
  })
})
