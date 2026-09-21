import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, type RenderResult } from '@testing-library/react'
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
