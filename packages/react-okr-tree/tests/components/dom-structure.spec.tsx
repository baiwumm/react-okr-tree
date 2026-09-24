import { describe, expect, it } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, type OkrTreeHandle } from '../../src/index'
import type { OkrTreeProps } from '../../src/OkrTree'

/**
 * DOM 结构快照（requirements 9.2 第 6 条的前半部分）。
 *
 * 类名与层级对这套组件是**契约**而不是实现细节：style.css 的全部几何、OkrTreeGroup 的测量
 * 选择器、键盘导航的可见节点查询、SVG 连接线的卡片锚点都靠字符串工作。这里把渲染结果锁进
 * 快照，任何会改变 DOM 形状的重构都必须显式更新基线。
 *
 * 与 vue3-okr-tree 的**跨实现**比对在 `tests/visual/cross-impl.spec.ts`（G15，已收口）：
 * 同一份 props 两边渲染、两侧都过一遍 DOM 往返再用同一个归一化器 diff。注意这里剔掉
 * `style` 之后，内联样式那一半只有那边的 geometry 断言在守——本文件的快照覆盖不到它。
 */
const data = [
  {
    id: 1,
    label: 'Root',
    children: [
      { id: 2, label: 'B', children: [{ id: 3, label: 'C' }] },
      { id: 4, label: 'D' },
    ],
  },
]
const leftData = [{ id: 1, label: 'Root', children: [{ id: 12, label: 'L' }] }]

/** 只保留结构相关属性：style / draggable 等由 React 逐次渲染写入，不参与比对 */
function structureHtml(root: HTMLElement): string {
  const walk = (el: Element, depth: number): string => {
    const attrs = Array.from(el.attributes)
      .filter(a => a.name !== 'style' && a.name !== 'draggable')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(a => `${a.name}="${a.value}"`)
    const own = el.children.length === 0 ? (el.textContent ?? '').trim() : ''
    const pad = '  '.repeat(depth)
    const open = `<${el.tagName.toLowerCase()}${attrs.length ? ' ' + attrs.join(' ') : ''}>`
    if (!el.children.length) return `${pad}${open}${own}</${el.tagName.toLowerCase()}>`
    const kids = Array.from(el.children)
      .map(c => walk(c, depth + 1))
      .join('\n')
    return `${pad}${open}\n${kids}\n${pad}</${el.tagName.toLowerCase()}>`
  }
  return walk(root, 0)
}

const modes: Array<[name: string, props: OkrTreeProps]> = [
  ['垂直模式', { data, nodeKey: 'id', showCollapsable: true }],
  ['水平模式', { data, nodeKey: 'id', showCollapsable: true, direction: 'horizontal' }],
  [
    'OKR 双向模式',
    {
      data,
      leftData,
      nodeKey: 'id',
      showCollapsable: true,
      onlyBothTree: true,
      direction: 'horizontal',
      defaultExpandAll: true,
    },
  ],
]

describe('DOM 结构快照', () => {
  for (const [name, props] of modes) {
    it(`${name}`, () => {
      const ref = createRef<OkrTreeHandle>()
      const { container } = render(<OkrTree {...props} ref={ref} />)
      expect(structureHtml(container.querySelector('.org-chart-container')!)).toMatchSnapshot()
    })
  }

  it('展开后子容器去掉隐藏内联样式', () => {
    const ref = createRef<OkrTreeHandle>()
    const { container } = render(<OkrTree data={data} nodeKey="id" showCollapsable ref={ref} />)
    const btn = container.querySelector('.org-chart-node-btn') as HTMLElement
    act(() => {
      fireEvent.click(btn)
    })
    const children = container.querySelector('.org-chart-node > .org-chart-node-children')!
    expect(children.getAttribute('style') || '').not.toContain('visibility')
  })
})
