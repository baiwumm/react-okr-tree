import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, fireEvent, render, type RenderResult } from '@testing-library/react'
import { createRef, useState, type ReactElement, type RefObject } from 'react'
import { OkrTree, type OkrTreeHandle } from '../../src/index'
import type { OkrTreeProps } from '../../src/OkrTree'

const fresh = () => [
  {
    id: 1,
    label: 'xxx科技有有限公司',
    children: [
      {
        id: 2,
        label: '产品研发部',
        children: [
          { id: 3, label: '研发-前端' },
          { id: 4, label: '研发-后端' },
          { id: 5, label: 'UI 设计' },
        ],
      },
      {
        id: 6,
        label: '销售部',
        children: [
          { id: 7, label: '销售一部' },
          { id: 8, label: '销售二部' },
        ],
      },
      { id: 9, label: '财务部' },
    ],
  },
]

const filterNode = (value: string, data: any) => (!value ? true : data.label.indexOf(value) !== -1)

const labels = (container: ParentNode) =>
  Array.from(container.querySelectorAll('.org-chart-node-label-inner')).map(el =>
    el.textContent?.trim()
  )

/** 宿主组件：持有 data 引用并暴露 reset，用于验证「换引用后旧节点同步消失」 */
let resetHost: (() => void) | null = null

function Host({
  extra,
  handleRef,
}: {
  extra?: Partial<OkrTreeProps>
  handleRef: RefObject<OkrTreeHandle | null>
}): ReactElement {
  const [data, setData] = useState(fresh())
  resetHost = () => setData(fresh())
  return (
    <OkrTree data={data} nodeKey="id" filterNodeMethod={filterNode} ref={handleRef} {...extra} />
  )
}

function renderHost(extra?: Partial<OkrTreeProps>): RenderResult & { handle: OkrTreeHandle } {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(<Host extra={extra} handleRef={ref} />)
  return { ...utils, handle: ref.current! }
}

describe('过渡在 rAF 被节流环境下的健壮性', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('animate 关闭时，Demo 13 完整序列后重置数据，旧子节点 DOM 被同步移除（不依赖 rAF）', () => {
    // 模拟后台/隐藏标签页：requestAnimationFrame 永不回调
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)

    const { container, handle } = renderHost()

    act(() => {
      handle.filter('销售')
    })
    expect(labels(container)).toEqual(['xxx科技有有限公司', '销售部', '销售一部', '销售二部'])
    act(() => {
      handle.filter('')
    })
    expect(labels(container)).toHaveLength(9)

    act(() => {
      handle.remove(handle.getNode(2)!)
      handle.append({ id: 10, label: '销售三部' }, handle.getNode(6)!)
      handle.insertBefore({ id: 11, label: '销售总部' }, handle.getNode(6)!)
      handle.updateKeyChildren(6, [
        {
          id: 7,
          label: '销售一部',
          children: [
            { id: 1117, label: '销售一部--子一' },
            { id: 1118, label: '销售一部--子二' },
          ],
        },
        { id: 8, label: '销售二部' },
        { id: 77, label: '销售三部' },
      ])
    })
    expect(labels(container)).toContain('销售一部--子一')
    expect(labels(container)).not.toContain('产品研发部')

    act(() => {
      resetHost!()
    })
    expect(labels(container)).toEqual([
      'xxx科技有有限公司',
      '产品研发部',
      '研发-前端',
      '研发-后端',
      'UI 设计',
      '销售部',
      '销售一部',
      '销售二部',
      '财务部',
    ])
    // 不应残留卡在 leave 状态的容器
    expect(container.querySelectorAll('[class*="leave-active"]')).toHaveLength(0)
  })

  it('animate 开启时容器带 CSS 过渡状态类与时长变量，关闭时不带', () => {
    const on = renderHost({ animate: true, animateName: 'okr-fade-in', animateDuration: 50 })
    const container = on.container.querySelector(
      '.org-chart-node > .org-chart-node-children'
    ) as HTMLElement
    expect(container.classList).toContain('is-animated')
    expect(container.classList).toContain('okr-anim-okr-fade-in')
    expect(container.getAttribute('style')).toContain('--okr-anim-duration: 50ms')

    const off = renderHost()
    const c2 = off.container.querySelector(
      '.org-chart-node > .org-chart-node-children'
    ) as HTMLElement
    expect(c2.classList).not.toContain('is-animated')
    expect(c2.getAttribute('style') ?? '').not.toContain('--okr-anim-duration')
  })

  /** src/types 的 AnimateName 联合类型全集，增删内置动画时这里与 verify:dist 的 CSS 枚举要同步 */
  const BUILT_IN_ANIMATE_NAMES = [
    'okr-fade-in-linear',
    'okr-fade-in',
    'okr-zoom-in-center',
    'okr-zoom-in-top',
    'okr-zoom-in-bottom',
    'okr-zoom-in-left',
  ]

  // 原先只钉了 okr-fade-in 一种，其余五种被删掉也不会有人发现
  it.each(BUILT_IN_ANIMATE_NAMES)('animateName=%s 时子容器带上 okr-anim-<name> 类', animateName => {
    const host = renderHost({ animate: true, animateName })
    const container = host.container.querySelector(
      '.org-chart-node > .org-chart-node-children'
    ) as HTMLElement
    expect(container.classList).toContain(`okr-anim-${animateName}`)
  })

  it('内置动画名共 6 种', () => {
    expect(BUILT_IN_ANIMATE_NAMES).toHaveLength(6)
  })
})

/**
 * 延迟卸载的撑高窗口只该由「展开态变了」触发。animate / animateDuration 运行中改动
 * 一旦进了 effect 依赖，已收起的容器会再走一遍 setKeepHeight(true) + setTimeout，
 * 凭空撑高一段时长（源项目是 `watch(isExpanded, …)`，没有这条）。
 */
describe('撑高窗口只由展开态变化触发', () => {
  /** 根节点的子容器：height 有值 = 已收起并释放高度；height 为空 = 正在撑高 */
  const rootChildrenEl = (c: ParentNode) =>
    c.querySelector<HTMLElement>('.org-chart-node > .org-chart-node-children')!

  const toggleRoot = (c: ParentNode) => {
    act(() => {
      fireEvent.click(c.querySelector('.org-chart-node-btn')!)
    })
  }

  /** 真实等 ms 毫秒，并把期间到达的 setTimeout 回调（撑高窗口归零）刷进 act 里 */
  const settle = async (ms: number) => {
    await act(async () => {
      await new Promise(r => setTimeout(r, ms))
    })
  }

  const host = (animateDuration: number, animate = true) => ({
    animate,
    animateDuration,
    showCollapsable: true,
    defaultExpandAll: true,
  })

  it('收起到位后改 animateDuration / animate 开关，容器不再被重新撑高', async () => {
    const ref = createRef<OkrTreeHandle>()
    const { container, rerender } = render(<Host extra={host(20)} handleRef={ref} />)

    toggleRoot(container)
    expect(rootChildrenEl(container).style.height).toBe('')
    await settle(60)
    expect(rootChildrenEl(container).style.height).toBe('0px')

    rerender(<Host extra={host(900)} handleRef={ref} />)
    expect(rootChildrenEl(container).style.height).toBe('0px')
    rerender(<Host extra={host(900, false)} handleRef={ref} />)
    expect(rootChildrenEl(container).style.height).toBe('0px')
    rerender(<Host extra={host(900)} handleRef={ref} />)
    expect(rootChildrenEl(container).style.height).toBe('0px')
  })

  // 上一条依赖「改完值不再触发 effect」，这一条钉反面：值仍要送到下一次收起时读到
  it('运行中改过的 animateDuration 对下一次收起生效', async () => {
    const ref = createRef<OkrTreeHandle>()
    const { container, rerender } = render(<Host extra={host(20)} handleRef={ref} />)

    toggleRoot(container)
    await settle(60)
    rerender(<Host extra={host(240)} handleRef={ref} />)
    toggleRoot(container)
    toggleRoot(container)
    expect(rootChildrenEl(container).style.height).toBe('')
    await settle(90)
    expect(rootChildrenEl(container).style.height).toBe('')
    await settle(240)
    expect(rootChildrenEl(container).style.height).toBe('0px')
  })
})
