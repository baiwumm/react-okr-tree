import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, type RenderResult } from '@testing-library/react'
import { createRef, useState, type ReactElement, type RefObject } from 'react'
import { OkrTree, resetWarnings, type OkrTreeHandle, type OkrTreeProps } from '../../src/index'
import type { TreeNode } from '../../src/model/node'
import type { TreeKey, TreeNodeData } from '../../src/types'

/**
 * 移植自源项目 tests/components/lazy-load.spec.ts。
 * 源用例的 load 用 setTimeout(0) 异步 resolve，nextTick 换成 act 内的定时推进（见 flush）。
 */
const makeLazyData = (): TreeNodeData[] => [
  { id: 1, label: 'A' },
  { id: 2, label: 'B', leaf: true },
]

/**
 * 推进一个宏任务让 setTimeout 里的 resolve 跑完，并包在 act 内吸收回调触发的 React 更新
 * （等价源用例的 flushMicrotasks + await nextTick）。
 */
const flush = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })

const lazyLoad: OkrTreeProps['load'] = (_node, resolve) => {
  setTimeout(() => resolve([{ id: 11, label: 'A-子' }]), 0)
}

function renderTree(props: OkrTreeProps): RenderResult & { handle: OkrTreeHandle } {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(<OkrTree {...props} ref={ref} />)
  return { ...utils, handle: ref.current! }
}

const q = (c: ParentNode, sel: string) => c.querySelector(sel) as HTMLElement
const qa = (c: ParentNode, sel: string) => Array.from(c.querySelectorAll(sel)) as HTMLElement[]
const labels = (c: ParentNode) =>
  qa(c, '.org-chart-node-label-inner').map(el => el.textContent?.trim())

/** 收起 / 加载中的子树仍挂载在 DOM 里，且加载完成会重建元素——每次按标签文本重新查找 */
const nodeByLabel = (c: ParentNode, label: string) =>
  qa(c, '.org-chart-node').find(
    n => n.querySelector('.org-chart-node-label-inner')?.textContent?.trim() === label
  )!

const btnOf = (c: ParentNode, label: string) => q(nodeByLabel(c, label), '.org-chart-node-btn')

const clickBtnOf = (c: ParentNode, label: string) => {
  act(() => {
    fireEvent.click(btnOf(c, label))
  })
}

/** 宿主受控值的镜像：源项目直读组件实例上的 vm.keys，React 没有这层入口 */
interface ExpandedHostState {
  keys: TreeKey[]
  setKeys: (keys: TreeKey[]) => void
}

/** 受控展开宿主：expandedKeys 提升到父组件 state，回调写回（等价 v-model:expanded-keys） */
function ExpandedHost({
  data,
  initialKeys,
  handleRef,
  stateRef,
  extra,
}: {
  data: TreeNodeData[]
  initialKeys: TreeKey[]
  handleRef: RefObject<OkrTreeHandle | null>
  stateRef: RefObject<ExpandedHostState | null>
  extra?: Partial<OkrTreeProps>
}): ReactElement {
  const [keys, setKeys] = useState<TreeKey[]>(initialKeys)
  stateRef.current = { keys, setKeys }
  return (
    <OkrTree
      data={data}
      nodeKey="id"
      showCollapsable
      expandedKeys={keys}
      onExpandedKeysChange={setKeys}
      ref={handleRef}
      {...extra}
    />
  )
}

describe('懒加载：组件交互', () => {
  it('点击展开按钮出现 is-loading，resolve 后渲染子节点并展开', async () => {
    const { container } = renderTree({
      data: makeLazyData(),
      nodeKey: 'id',
      showCollapsable: true,
      lazy: true,
      load: lazyLoad,
    })
    expect(btnOf(container, 'A')).toBeTruthy() // 未加载节点也有展开按钮
    clickBtnOf(container, 'A')
    expect(btnOf(container, 'A').classList).toContain('is-loading')
    expect(labels(container)).toEqual(['A', 'B'])

    await flush()
    expect(labels(container)).toEqual(['A', 'A-子', 'B'])
    expect(btnOf(container, 'A').classList).not.toContain('is-loading')
  })

  it('reject 后按钮回到折叠态，可再次点击重试', async () => {
    let attempts = 0
    const { container, handle } = renderTree({
      data: makeLazyData(),
      nodeKey: 'id',
      showCollapsable: true,
      lazy: true,
      load: (_node, resolve, reject) => {
        attempts += 1
        setTimeout(() => (attempts === 1 ? reject?.() : resolve([{ id: 11, label: 'A-子' }])), 0)
      },
    })
    clickBtnOf(container, 'A')
    await flush()
    expect(labels(container)).toEqual(['A', 'B']) // 无子节点
    expect(handle.getNode(1)!.expanded).toBe(false)
    expect(btnOf(container, 'A').classList).not.toContain('is-loading')
    clickBtnOf(container, 'A')
    await flush()
    expect(attempts).toBe(2)
    expect(labels(container)).toEqual(['A', 'A-子', 'B'])
  })

  it('show-node-num 未加载时不显示数字，加载后显示', async () => {
    const { container } = renderTree({
      data: makeLazyData(),
      nodeKey: 'id',
      showCollapsable: true,
      showNodeNum: true,
      lazy: true,
      load: lazyLoad,
    })
    const textOf = () => btnOf(container, 'A').querySelector('.org-chart-node-btn-text')
    expect(textOf()).toBeNull()
    await flush()
    // 未点开过不加载，数字保持隐藏；手动展开后加载完成再显示
    expect(textOf()).toBeNull()
    clickBtnOf(container, 'A')
    await flush()
    clickBtnOf(container, 'A') // 收起
    expect(q(btnOf(container, 'A'), '.org-chart-node-btn-text').textContent).toBe('1')
  })

  it('renderExpandBtn 作用域包含 loading', async () => {
    const scopes: any[] = []
    const { container } = renderTree({
      data: makeLazyData(),
      nodeKey: 'id',
      showCollapsable: true,
      lazy: true,
      load: lazyLoad,
      renderExpandBtn: (scope: any) => {
        scopes.push(scope)
        return <i className="my-btn">{scope.loading ? '…' : '+'}</i>
      },
    })
    clickBtnOf(container, 'A')
    expect(scopes[scopes.length - 1].loading).toBe(true)
    await flush()
    expect(scopes[scopes.length - 1].loading).toBe(false)
  })

  it('expandNode / scrollToNode 对未加载节点先加载再展开/滚动', async () => {
    const scrollSpy = vi.fn()
    const originalScrollIntoView = Element.prototype.scrollIntoView
    // jsdom 不实现 scrollIntoView，用例自带一个可断言的替身
    Element.prototype.scrollIntoView = scrollSpy
    try {
      const { container, handle } = renderTree({
        data: makeLazyData(),
        nodeKey: 'id',
        showCollapsable: true,
        lazy: true,
        load: (node, resolve) => {
          const children =
            node.key === 1 ? [{ id: 11, label: 'A-子' }] : [{ id: 111, label: 'A-孙' }]
          setTimeout(() => resolve(children), 0)
        },
      })
      let expanded: TreeNode | null = null
      act(() => {
        expanded = handle.expandNode(1)
      })
      expect(expanded).toBeTruthy()
      await flush()
      expect(labels(container)).toEqual(['A', 'A-子', 'B'])

      // 目标节点（A-子，11）已注册但未加载：scrollToNode 触发其加载，完成后滚动
      let ok = false
      await act(async () => {
        ok = await handle.scrollToNode(11, { behavior: 'auto' })
      })
      expect(ok).toBe(true)
      expect(scrollSpy).toHaveBeenCalled()
      expect(labels(container)).toContain('A-孙')
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView
    }
  })

  it('受控 expandedKeys 在加载完成后回写', async () => {
    // data 引用需固定：宿主每次渲染都新建数组会重建树、丢掉加载中的节点（requirements R2）
    const data = makeLazyData()
    const handleRef = createRef<OkrTreeHandle>()
    const stateRef = createRef<ExpandedHostState>()
    const { container } = render(
      <ExpandedHost
        data={data}
        initialKeys={[]}
        handleRef={handleRef}
        stateRef={stateRef}
        extra={{ lazy: true, load: lazyLoad }}
      />
    )
    clickBtnOf(container, 'A')
    expect(stateRef.current!.keys).toEqual([]) // 加载完成前不回写
    await flush()
    expect([...stateRef.current!.keys]).toEqual([1])
  })
})

describe('懒加载：开发期警告', () => {
  beforeEach(() => resetWarnings())

  it('lazy 缺 load、load 缺 lazy 时警告；配置完整时无警告', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderTree({ data: makeLazyData(), lazy: true })
    renderTree({ data: makeLazyData(), load: () => {} })
    const callsBeforeComplete = spy.mock.calls.length
    renderTree({
      data: makeLazyData(),
      lazy: true,
      load: (_node, resolve) => resolve([]),
    })
    const messages = spy.mock.calls.map(c => String(c[0]))
    expect(messages.some(m => m.includes('lazy 需要同时提供 load'))).toBe(true)
    expect(messages.some(m => m.includes('未开启 lazy'))).toBe(true)
    // 配置完整的那棵树不产生任何新增警告
    expect(spy.mock.calls.length).toBe(callsBeforeComplete)
    spy.mockRestore()
  })

  it('props.isLeaf 标记的叶子节点无展开按钮', () => {
    const { container } = renderTree({
      data: makeLazyData(),
      nodeKey: 'id',
      showCollapsable: true,
      lazy: true,
      props: { isLeaf: 'leaf' },
      load: lazyLoad,
    })
    expect(nodeByLabel(container, 'B').querySelector('.org-chart-node-btn')).toBeNull()
    expect(btnOf(container, 'A')).toBeTruthy()
  })
})
