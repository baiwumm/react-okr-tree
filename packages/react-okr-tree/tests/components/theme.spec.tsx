import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, type RenderResult } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, type OkrTreeHandle, type OkrTreeProps } from '../../src/index'
import { resetWarnings } from '../../src/model/util'

/**
 * 主题（requirements 5.3）。
 *
 * React 版**逐字引用源项目的样式表**（src/styles/style.css，R7），所以这里与源项目的
 * theme.spec 一样只断言「CSS 挂钩的入口契约」：主题类 / okr-unstyled / data-level。
 * 源项目这 6 条用例本身也没有一条读取 computed style。
 *
 * 逐主题的变量包效果（feishu 圆角与双层阴影、dark 卡片配色、auto 的 prefers-color-scheme、
 * colorful 按 data-level 着色、unstyled 中和卡片外观）要真实级联才算得出来，而 jsdom 不套用
 * 样式表（vitest 配置 css: false），即便手工注入 dist/style.css 也拿不到 var() 解析后的值，
 * 断言它等于伪造覆盖。那部分归阶段 9.2 的视觉回归（requirements 9.2 第 7 条，同一份 CSS）。
 */

const data = [
  {
    id: 1,
    label: 'R',
    children: [{ id: 2, label: 'C', children: [{ id: 3, label: 'G' }] }],
  },
]

function renderTree(props: OkrTreeProps): RenderResult & { handle: OkrTreeHandle } {
  const ref = createRef<OkrTreeHandle>()
  const utils = render(<OkrTree {...props} ref={ref} />)
  return { ...utils, handle: ref.current! }
}

/** 根容器类名数组（对应源项目的 wrapper.find('.org-chart-container').classes()） */
const containerClasses = (c: ParentNode) =>
  Array.from(c.querySelector<HTMLElement>('.org-chart-container')!.classList)

/**
 * 节点自身的标签文本：必须用 :scope 限定直接子代——querySelector 会下降到整个子树，
 * 于是父节点会被判为其后代节点的标签（见 checkbox.spec.tsx 的同名说明）
 */
const ownLabel = (n: HTMLElement) =>
  n
    .querySelector(':scope > .org-chart-node-label > .org-chart-node-label-inner')
    ?.textContent?.trim()

const nodeByLabel = (c: ParentNode, label: string) =>
  Array.from(c.querySelectorAll<HTMLElement>('.org-chart-node')).find(n => ownLabel(n) === label)!

describe('theme prop', () => {
  it('非 default 主题在根容器加 okr-theme-{name} 类', () => {
    const feishu = renderTree({ data, theme: 'feishu' })
    expect(containerClasses(feishu.container)).toContain('okr-theme-feishu')
    const custom = renderTree({ data, theme: 'my-brand' })
    expect(containerClasses(custom.container)).toContain('okr-theme-my-brand')
  })

  it('default 主题不加主题类（保持原版外观）', () => {
    const { container } = renderTree({ data })
    const classes = containerClasses(container)
    expect(classes.some(c => c.startsWith('okr-theme-'))).toBe(false)
  })

  it('unstyled 切换 okr-unstyled 类（卡片外观的中和由样式表负责）', () => {
    const plain = renderTree({ data })
    expect(containerClasses(plain.container)).not.toContain('okr-unstyled')
    const bare = renderTree({ data, unstyled: true })
    expect(containerClasses(bare.container)).toContain('okr-unstyled')
  })

  it('节点带 data-level 属性（colorful 主题按层级着色用）', () => {
    const { container } = renderTree({ data })
    expect(nodeByLabel(container, 'R').getAttribute('data-level')).toBe('1')
    expect(nodeByLabel(container, 'C').getAttribute('data-level')).toBe('2')
  })

  describe('未知 theme 值的开发期警告', () => {
    beforeEach(() => resetWarnings())

    it('不在内置清单里的 theme 值提示需自行编写变量', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      renderTree({ data, theme: 'my-brand' })
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('theme="my-brand" 不是内置主题'))
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('.okr-theme-my-brand'))
      // 前缀是用户排查警告来源的唯一线索，改掉了没人会发现，所以单独钉一条
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('[react-okr-tree]'))
      spy.mockRestore()
    })

    it('内置主题名不警告', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      for (const theme of ['default', 'feishu', 'dark', 'auto', 'minimal', 'colorful'] as const) {
        renderTree({ data, theme })
      }
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})
