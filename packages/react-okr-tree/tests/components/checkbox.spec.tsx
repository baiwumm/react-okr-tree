import { describe, it, expect, vi } from 'vitest'
import { act, fireEvent, render, type RenderResult } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, type OkrTreeHandle, type OkrTreeProps, type TreeCheckInfo } from '../../src/index'
import { resetWarnings } from '../../src/model/util'

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

/**
 * 对齐源项目的 mount + wrapper.setProps：
 * 补丁式合并 props 后用同一个 ref 重渲染（store / handle 跨渲染保持稳定），
 * 并复用同一份 data 引用，避免引用变化触发整树重建。
 */
function renderTree(
  props: OkrTreeProps
): RenderResult & { handle: OkrTreeHandle; setProps: (patch: Partial<OkrTreeProps>) => void } {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(<OkrTree {...props} ref={ref} />)
  let current = props
  const setProps = (patch: Partial<OkrTreeProps>) => {
    current = { ...current, ...patch }
    utils.rerender(<OkrTree {...current} ref={ref} />)
  }
  return { ...utils, handle: ref.current!, setProps }
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

/** 点击某个节点的复选框（stopPropagation 不会触发节点选中 / onNodeClick） */
const clickCheckbox = (c: ParentNode, label: string) => {
  const el = nodeByLabel(c, label).querySelector<HTMLElement>(
    ':scope > .org-chart-node-label > .org-chart-node-label-inner > .org-chart-node-checkbox'
  )!
  // 源项目 await nextTick() → React 侧以 act 包裹触发，保证订阅者渲染完成
  act(() => {
    fireEvent.click(el)
  })
}

/** 编程式调用 store 方法会通知订阅者渲染（React 里属离散更新），需包在 act 内 */
const inAct = <T,>(fn: () => T): T => {
  let value: T = undefined as unknown as T
  act(() => {
    value = fn()
  })
  return value
}

describe('show-checkbox 渲染', () => {
  it('默认不渲染复选框；开启后每个节点带一个，treeitem 输出 aria-checked', () => {
    const plain = renderTree({ data: makeData() })
    expect(plain.container.querySelector('.org-chart-node-checkbox')).toBeNull()

    const { container } = renderTree({ data: makeData(), showCheckbox: true, nodeKey: 'id' })
    expect(container.querySelectorAll('.org-chart-node-checkbox').length).toBe(
      allNodes(container).length
    )
    expect(nodeByLabel(container, 'Root').getAttribute('aria-checked')).toBe('false')
    // aria-checked 为 mixed 需先产生半选，见联动用例
  })

  it('运行时切换 show-checkbox：隐藏后重新开启，勾选状态保留', () => {
    const { container, handle, setProps } = renderTree({
      data: makeData(),
      showCheckbox: true,
      nodeKey: 'id',
    })
    clickCheckbox(container, 'A1')
    expect(handle.isChecked(111)).toBe(true)

    setProps({ showCheckbox: false })
    expect(container.querySelector('.org-chart-node-checkbox')).toBeNull()
    expect(handle.isChecked(111)).toBe(true)

    setProps({ showCheckbox: true })
    const checkbox = nodeByLabel(container, 'A1').querySelector('.org-chart-node-checkbox')!
    expect(checkbox.classList.contains('is-checked')).toBe(true)
  })
})

describe('父子联动与半选传播', () => {
  it('勾选子节点：兄弟未选时父节点半选，全选后父节点选中', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      showCheckbox: true,
      nodeKey: 'id',
    })
    clickCheckbox(container, 'A1')
    expect(handle.getNode(111)!.checked).toBe(true)
    expect(handle.getNode(11)!.checked).toBe(false)
    expect(handle.getNode(11)!.indeterminate).toBe(true)
    expect(handle.getNode(1)!.indeterminate).toBe(true)

    clickCheckbox(container, 'A2')
    expect(handle.getNode(11)!.checked).toBe(true)
    expect(handle.getNode(11)!.indeterminate).toBe(false)
    // Root 下 A 全选但 B、C 未选 → 仍半选
    expect(handle.getNode(1)!.checked).toBe(false)
    expect(handle.getNode(1)!.indeterminate).toBe(true)
  })

  it('勾选父节点：向下联动全部后代；取消勾选整体回退', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      showCheckbox: true,
      nodeKey: 'id',
    })
    clickCheckbox(container, 'A')
    expect(handle.getNode(111)!.checked).toBe(true)
    expect(handle.getNode(112)!.checked).toBe(true)
    expect(handle.getNode(11)!.checked).toBe(true)

    clickCheckbox(container, 'A')
    expect(handle.getNode(111)!.checked).toBe(false)
    expect(handle.getNode(11)!.checked).toBe(false)

    clickCheckbox(container, 'Root')
    expect(handle.isChecked(13)).toBe(true)
    expect(handle.getCheckedKeys()).toEqual([1, 11, 111, 112, 12, 121, 13])
  })

  it('check-strictly：勾选只作用于自身，无联动无半选', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      showCheckbox: true,
      checkStrictly: true,
      nodeKey: 'id',
    })
    clickCheckbox(container, 'A')
    expect(handle.getNode(11)!.checked).toBe(true)
    expect(handle.getNode(111)!.checked).toBe(false)
    expect(handle.getNode(11)!.indeterminate).toBe(false)
    expect(handle.getNode(1)!.indeterminate).toBe(false)
  })

  it('disabled 节点：自身不可点击勾选，但被父节点联动覆盖（与 el-tree 一致）', () => {
    const data = [
      {
        id: 1,
        label: 'Root',
        children: [
          { id: 14, label: 'D', disabled: true },
          { id: 15, label: 'E' },
        ],
      },
    ]
    const { container, handle } = renderTree({
      data,
      showCheckbox: true,
      nodeKey: 'id',
    })
    clickCheckbox(container, 'D')
    expect(handle.isChecked(14)).toBe(false)

    clickCheckbox(container, 'Root')
    expect(handle.isChecked(14)).toBe(true)
    // 父节点点击后整体全选，Root 为选中而非半选
    expect(handle.getNode(1)!.indeterminate).toBe(false)
  })
})

describe('default-checked-keys 与方法', () => {
  it('default-checked-keys：初始勾选并推导祖先半选；需 node-key', () => {
    // warn 按文案全局去重，先复位（与 prop-sync.spec 的用法一致）
    resetWarnings()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const withoutKey = renderTree({
      data: makeData(),
      showCheckbox: true,
      defaultCheckedKeys: [111],
    })
    expect(withoutKey.container.querySelector('.org-chart-node-checkbox.is-checked')).toBeNull()
    expect(warnSpy).toHaveBeenCalled()

    const { handle } = renderTree({
      data: makeData(),
      showCheckbox: true,
      defaultCheckedKeys: [111, 121],
      nodeKey: 'id',
    })
    expect(handle.getNode(111)!.checked).toBe(true)
    expect(handle.getNode(11)!.indeterminate).toBe(true)
    // B 只有唯一子节点 B1，B1 被勾选 → B 全选（el-tree 语义：全部子节点选中 ⇒ 父选中）
    expect(handle.getCheckedKeys()).toEqual([111, 12, 121])
    expect(handle.getHalfCheckedKeys()).toEqual([1, 11])
    warnSpy.mockRestore()
  })

  it('setCheckedKeys：先清空再按列表勾选（带联动），leafOnly 只计叶子', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      showCheckbox: true,
      nodeKey: 'id',
    })
    clickCheckbox(container, 'A1') // 先制造一点状态

    inAct(() => handle.setCheckedKeys([12]))
    expect(handle.isChecked(12)).toBe(true)
    expect(handle.isChecked(121)).toBe(true)
    expect(handle.getCheckedKeys()).toEqual([12, 121])
    expect(handle.getHalfCheckedKeys()).toEqual([1])
    expect(handle.isChecked(111)).toBe(false)

    inAct(() => handle.setCheckedKeys([1]))
    // 全树勾选后 leafOnly 只返回叶子
    expect(handle.getCheckedKeys(true)).toEqual([111, 112, 121, 13])
  })

  it('default-checked-keys 运行时变更：以新列表为准（先清空再应用）', () => {
    const { handle, setProps } = renderTree({
      data: makeData(),
      showCheckbox: true,
      defaultCheckedKeys: [111],
      nodeKey: 'id',
    })
    expect(handle.isChecked(111)).toBe(true)
    setProps({ defaultCheckedKeys: [13] })
    expect(handle.isChecked(111)).toBe(false)
    expect(handle.isChecked(13)).toBe(true)
    expect(handle.getCheckedKeys()).toEqual([13])
  })
})

describe('check / check-change 事件', () => {
  it('点击复选框触发 check（含全量勾选信息），不触发 onNodeClick', () => {
    const onCheck = vi.fn()
    const onNodeClick = vi.fn()
    const { container } = renderTree({
      data: makeData(),
      showCheckbox: true,
      nodeKey: 'id',
      onCheck,
      onNodeClick,
    })
    clickCheckbox(container, 'A1')
    expect(onCheck).toHaveBeenCalledTimes(1)
    const info = onCheck.mock.calls[0][1] as TreeCheckInfo
    expect(info.checkedKeys).toEqual([111])
    expect(info.halfCheckedKeys).toEqual([1, 11])
    expect(info.checkedNodes.map(d => d.id)).toEqual([111])
    expect(info.halfCheckedNodes.map(n => n.key)).toEqual([1, 11])
    expect(onNodeClick).not.toHaveBeenCalled()
  })

  it('check-change：每个受影响节点各触发一次，联动与级联都覆盖', () => {
    // React 版由「节点重渲染后的快照比对」发出（Vue 版为 watcher），语义一致
    const onCheckChange = vi.fn()
    const { container, handle, setProps } = renderTree({
      data: makeData(),
      showCheckbox: true,
      nodeKey: 'id',
      onCheckChange,
    })
    clickCheckbox(container, 'A')
    const changes = onCheckChange.mock.calls.map(c => `${c[0].id}:${c[1]}:${c[2]}`)
    // A 勾选 → 自身 + 两个叶子变选中；Root 变半选；B / C 子树不受影响
    expect(changes).toContain('11:true:false')
    expect(changes).toContain('111:true:false')
    expect(changes).toContain('112:true:false')
    expect(changes).toContain('1:false:true')
    expect(changes.every(c => !c.startsWith('12:') && !c.startsWith('13:'))).toBe(true)

    // 程序化 setCheckedKeys 只触发 check-change，不触发 check
    const onCheck = vi.fn()
    setProps({ onCheck })
    onCheckChange.mockClear()
    inAct(() => handle.setCheckedKeys([13]))
    expect(onCheck).not.toHaveBeenCalled()
    expect(onCheckChange.mock.calls.some(c => c[0].id === 13)).toBe(true)
  })

  it('空格键切换勾选（show-checkbox 开启时），Enter 仍是选中语义', () => {
    const { container, handle } = renderTree({
      data: makeData(),
      showCheckbox: true,
      nodeKey: 'id',
    })
    const nodeA = nodeByLabel(container, 'A')
    act(() => {
      nodeA.focus()
      fireEvent.keyDown(nodeA, { key: ' ' })
    })
    expect(handle.isChecked(11)).toBe(true)

    act(() => {
      fireEvent.keyDown(nodeA, { key: 'Enter' })
    })
    expect(handle.getNode(11)!.isCurrent).toBe(true)
    expect(handle.isChecked(11)).toBe(true) // Enter 不改勾选
  })
})

describe('OKR 模式（onlyBothTree）', () => {
  it('勾选按左右两树独立维护；setCheckedKeys / getCheckedKeys 按 key 合并生效', () => {
    const leftData = [
      {
        id: 1,
        label: 'Root',
        children: [{ id: 11, label: 'A', children: [{ id: 111, label: 'A1' }] }],
      },
    ]
    const { container, handle } = renderTree({
      data: makeData(),
      leftData,
      onlyBothTree: true,
      direction: 'horizontal',
      showCheckbox: true,
      nodeKey: 'id',
    })
    // 点击右树的 A1，只作用于右树（左树存在同标签节点，需按类过滤）
    const rightNodeByLabel = (label: string) =>
      allNodes(container)
        .filter(n => !n.classList.contains('is-left-child-node'))
        .find(n => ownLabel(n) === label)!
    const el = rightNodeByLabel('A1').querySelector<HTMLElement>(
      ':scope > .org-chart-node-label > .org-chart-node-label-inner > .org-chart-node-checkbox'
    )!
    act(() => {
      fireEvent.click(el)
    })
    expect(handle.isChecked(111)).toBe(true)
    expect(handle.store.leftNodesMap['111']?.checked ?? false).toBe(false)

    // 方法按 key 对左右两树同时生效
    inAct(() => handle.setCheckedKeys([11]))
    expect(handle.isChecked(11)).toBe(true)
    expect(handle.store.leftNodesMap['11'].checked).toBe(true)
    // 联动：右树 A2 随 A 勾选；左树 A 的唯一子链全选 → 左根 1 全选
    expect(handle.isChecked(112)).toBe(true)
    expect(handle.store.leftNodesMap['1'].checked).toBe(true)
    // getCheckedKeys 左右合并去重：右 11/111/112 + 左 1（11/111 已去重）
    expect(handle.getCheckedKeys()).toEqual([11, 111, 112, 1])
  })
})
