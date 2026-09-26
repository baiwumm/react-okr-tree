import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, resetWarnings, type OkrTreeHandle } from '../../src/index'
import type { TreeNodeData } from '../../src/types'

/**
 * 虚拟滚动（virtual）单测，与上游 vue3-okr-tree 的 tests/components/virtual.spec.ts 同批同形。
 * jsdom 没有真实布局（getBoundingClientRect 全零），窗口计算走「视口矩形 + 容器矩形全零」
 * 的确定性分支：lo = -300、hi = +300，labelWidth 110px 的行渲染 [0, 5)（+overscan 余量 2）。
 * 度量时序：挂载 effect → rAF → setState → React 提交，waitFor 轮询等它落地。
 */

const makeData = (n: number): TreeNodeData[] => [
  {
    id: 0,
    label: 'Root',
    children: Array.from({ length: n }, (_, i) => ({ id: i + 1, label: `N${i + 1}` })),
  },
]

const NODE_W = 110 // labelWidth 100 + 左右 sibling 间距 2×5

const countNodes = (c: HTMLElement) => c.querySelectorAll('.org-chart-node').length

describe('virtual 关闭（默认）', () => {
  it('不产生任何占位块，行为与旧版一致', async () => {
    const { container } = render(
      <OkrTree data={makeData(200)} nodeKey="id" labelWidth={100} defaultExpandAll />
    )
    await waitFor(() => expect(countNodes(container)).toBe(201))
    expect(container.querySelectorAll('.okr-v-spacer, .okr-h-spacer')).toHaveLength(0)
  })
})

describe('virtual 开启（vertical，宽度模型）', () => {
  beforeEach(() => resetWarnings())
  afterEach(() => {
    // @ts-expect-error 测试后清理原型 stub
    delete Element.prototype.scrollIntoView
  })

  it('达标行只渲染窗口内节点，行末占位块的宽度等于未渲染兄弟的总宽', async () => {
    const ref = createRef<OkrTreeHandle>()
    const { container } = render(
      <OkrTree
        ref={ref}
        data={makeData(3000)}
        nodeKey="id"
        labelWidth={100}
        defaultExpandAll
        virtual
      />
    )
    await waitFor(() => expect(countNodes(container)).toBe(6))
    const spacer = container.querySelector<HTMLElement>('.okr-v-spacer')
    expect(spacer).toBeTruthy()
    expect(spacer!.style.width).toBe(`${(3000 - 5) * NODE_W}px`)
    // 模型不撒谎：可见节点数与 aria 语义都按全量算
    expect(ref.current!.getVisibleNodes().length).toBe(3001)
    const nodes = container.querySelectorAll('.org-chart-node')
    expect(nodes[1].getAttribute('aria-setsize')).toBe('3000')
    expect(nodes[1].getAttribute('aria-posinset')).toBe('1')
  })

  it('scrollToNode 先揭示再滚动：窗口外的目标也能定位', async () => {
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy
    const ref = createRef<OkrTreeHandle>()
    const { container } = render(
      <OkrTree
        ref={ref}
        data={makeData(3000)}
        nodeKey="id"
        labelWidth={100}
        defaultExpandAll
        virtual
      />
    )
    await waitFor(() => expect(countNodes(container)).toBeLessThan(60))
    let ok = false
    await act(async () => {
      ok = await ref.current!.scrollToNode(2500)
    })
    expect(ok).toBe(true)
    const labels = Array.from(container.querySelectorAll('.org-chart-node-label-inner')).map(el =>
      el.textContent?.trim()
    )
    expect(labels).toContain('N2500')
    expect(scrollSpy).toHaveBeenCalled()
    expect(countNodes(container)).toBeGreaterThan(6)
    expect(countNodes(container)).toBeLessThan(60)
  })

  it('filter 后可见兄弟跌破阈值：占位块消失、全量渲染可见节点', async () => {
    const ref = createRef<OkrTreeHandle>()
    const { container } = render(
      <OkrTree
        ref={ref}
        data={makeData(3000)}
        nodeKey="id"
        labelWidth={100}
        defaultExpandAll
        virtual
        filterNodeMethod={(v: string, d: TreeNodeData) =>
          String((d as Record<string, unknown>).label).includes(v)
        }
      />
    )
    await waitFor(() => expect(countNodes(container)).toBeLessThan(60))
    act(() => {
      ref.current!.filter('N250')
    })
    // 匹配 N250、N2500..N2509 共 11 个 < 50：全量渲染、无占位块
    await waitFor(() => expect(countNodes(container)).toBe(12))
    expect(container.querySelectorAll('.okr-v-spacer')).toHaveLength(0)
    act(() => {
      ref.current!.filter('')
    })
    await waitFor(() => expect(countNodes(container)).toBe(6))
  })

  it('expandAll 后 DOM 数量仍有界（宽度模型变化经度量时钟重算窗口）', async () => {
    const ref = createRef<OkrTreeHandle>()
    const data: TreeNodeData[] = [
      {
        id: 0,
        label: 'Root',
        children: Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          label: `P${i + 1}`,
          children: Array.from({ length: 50 }, (_, j) => ({
            id: (i + 1) * 100 + j,
            label: `L${j}`,
          })),
        })),
      },
    ]
    const { container, rerender } = render(
      <OkrTree ref={ref} data={data} nodeKey="id" labelWidth={100} virtual />
    )
    await waitFor(() => expect(countNodes(container)).toBeLessThan(30))
    act(() => {
      ref.current!.expandAll()
    })
    rerender(<OkrTree ref={ref} data={data} nodeKey="id" labelWidth={100} virtual />)
    await waitFor(() => {
      const total = 1 + 100 + 5000
      expect(ref.current!.getVisibleNodes().length).toBe(total)
      expect(countNodes(container)).toBeLessThan(30)
      expect(countNodes(container)).toBeGreaterThan(1)
    })
  })

  it('未给数字型 labelWidth：输出开发期警告，行退回全量渲染', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    resetWarnings()
    const { container } = render(
      <OkrTree data={makeData(200)} nodeKey="id" defaultExpandAll virtual />
    )
    await waitFor(() => expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('labelWidth')))
    expect(countNodes(container)).toBe(201)
    expect(container.querySelectorAll('.okr-v-spacer')).toHaveLength(0)
    warnSpy.mockRestore()
  })
})

describe('virtual 开启（horizontal，高度模型）', () => {
  beforeEach(() => resetWarnings())

  it('达标行按高度窗口化，占位块带高度并使用竖向连线类', async () => {
    const { container } = render(
      <OkrTree
        data={makeData(3000)}
        nodeKey="id"
        direction="horizontal"
        labelWidth={120}
        labelHeight={40}
        defaultExpandAll
        virtual
      />
    )
    // 高度模型 60px/条：视口 300px 容 5 条 + overscan 2 = 7 个子节点 + 根
    await waitFor(() => expect(countNodes(container)).toBe(8))
    const spacer = container.querySelector<HTMLElement>('.okr-h-spacer')
    expect(spacer).toBeTruthy()
    expect(spacer!.style.height).toBe(`${(3000 - 7) * 60}px`)
    // 缺 labelHeight 时警告并退回全量
    resetWarnings()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <OkrTree
        data={makeData(100)}
        nodeKey="id"
        direction="horizontal"
        labelWidth={120}
        defaultExpandAll
        virtual
      />
    )
    await waitFor(() =>
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('labelHeight'))
    )
    warnSpy.mockRestore()
  })

  it('OKR 左树：左行窗口化与占位块（leftWindow 路径）', async () => {
    const { container } = render(
      <OkrTree
        data={[{ id: 1, label: 'OKR 根', children: [{ id: 11, label: 'R-1' }] }]}
        leftData={[
          {
            id: 1,
            label: 'O-根',
            children: Array.from({ length: 80 }, (_, i) => ({ id: i + 2, label: `L${i + 1}` })),
          },
        ]}
        onlyBothTree
        direction="horizontal"
        nodeKey="id"
        labelWidth={120}
        labelHeight={40}
        defaultExpandAll
        virtual
      />
    )
    await waitFor(() => {
      const leftSpacers = container.querySelectorAll('.org-chart-node-left-children .okr-h-spacer')
      expect(leftSpacers.length).toBeGreaterThan(0)
    })
    const nodes = countNodes(container)
    expect(nodes).toBeGreaterThan(1)
    expect(nodes).toBeLessThan(60)
  })
})
