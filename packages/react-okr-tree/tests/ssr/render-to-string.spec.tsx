import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { OkrTree, OkrTreeGroup, OkrTreeViewport } from '../../src/index'

/**
 * SSR / hydration 冒烟（requirements R8）。
 *
 * 源项目用 vue/server-renderer 证明「没有 SSR 专属开关，但服务端渲染不能炸」；
 * React 版要求同等且更明确：模块顶层不碰 window、useSyncExternalStore 有
 * getServerSnapshot、ResizeObserver / matchMedia / 字体监听只在挂载后注册。
 */
const data = [
  {
    id: 1,
    label: 'Root',
    children: [
      { id: 2, label: 'A', children: [{ id: 4, label: 'A1' }] },
      { id: 3, label: 'B' },
    ],
  },
]
const leftData = [{ id: 1, label: 'Root', children: [{ id: 12, label: 'L' }] }]

describe('SSR renderToStaticMarkup', () => {
  it('垂直模式服务端渲染出全部节点', () => {
    const html = renderToStaticMarkup(<OkrTree data={data} nodeKey="id" showCollapsable />)
    expect(html).toContain('org-chart-container')
    expect(html).toContain('role="tree"')
    expect(html).toContain('>Root<')
    expect(html).toContain('>A<')
    expect(html).toContain('aria-level="1"')
    // 未展开的子树依然挂载（靠 is-hidden 收起），与客户端语义一致
    expect(html).toContain('>A1<')
  })

  it('水平模式与 OKR 双向模式（左子树照样渲染出来）', () => {
    const horizontal = renderToStaticMarkup(
      <OkrTree data={data} nodeKey="id" direction="horizontal" showCollapsable />
    )
    expect(horizontal).toContain('horizontal')

    const okr = renderToStaticMarkup(
      <OkrTree
        data={data}
        leftData={leftData}
        nodeKey="id"
        onlyBothTree
        direction="horizontal"
        showCollapsable
        defaultExpandAll
      />
    )
    expect(okr).toContain('org-chart-node-left-children')
    expect(okr).toContain('is-left-child-node')
    expect(okr).toContain('>L<')
    expect(okr).toContain('only-both-tree-node')
    expect(okr).toContain('align-root')
  })

  it('受控 props 在服务端就按传入值渲染', () => {
    const html = renderToStaticMarkup(
      <OkrTree
        data={data}
        nodeKey="id"
        showCollapsable
        expandedKeys={[2]}
        currentKey={3}
        onExpandedKeysChange={() => {}}
        onCurrentKeyChange={() => {}}
      />
    )
    expect(html).toContain('aria-selected="true"')
    // 受控列表里没有 3 的子树 ⇒ 服务端就应该是收起的（is-hidden 容器仍在 DOM 中）
    expect(html).toContain('is-hidden')
  })

  it('renderNode / empty 与 Group、Viewport 包裹', () => {
    const custom = renderToStaticMarkup(
      <OkrTree data={data} renderNode={({ node }) => <b className="ssr-node">{node.label}</b>} />
    )
    expect(custom).toContain('<b class="ssr-node">Root</b>')

    const empty = renderToStaticMarkup(<OkrTree data={[]} empty={<i>no data</i>} />)
    expect(empty).toContain('org-chart-empty')
    expect(empty).toContain('no data')

    const grouped = renderToStaticMarkup(
      <OkrTreeGroup>
        <OkrTree data={data} leftData={leftData} nodeKey="id" onlyBothTree direction="horizontal" />
      </OkrTreeGroup>
    )
    expect(grouped).toContain('okr-tree-group')
    expect(grouped).toContain('only-both-tree-node')

    const canvas = renderToStaticMarkup(
      <OkrTreeViewport toolbar>
        <OkrTree data={data} nodeKey="id" />
      </OkrTreeViewport>
    )
    expect(canvas).toContain('okr-viewport-canvas')
    expect(canvas).toContain('okr-viewport-toolbar')
    expect(canvas).toContain('org-chart-container')
  })

  it('服务端渲染不读 window，也不产生 console 噪音', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const originalWindow = Reflect.get(globalThis, 'window')
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    // @ts-expect-error 故意抹掉 window，验证模块顶层与渲染路径都不依赖它
    delete globalThis.window
    try {
      const html = renderToStaticMarkup(
        <OkrTree data={data} nodeKey="id" showCollapsable animate connector="svg" theme="feishu" />
      )
      expect(html).toContain('org-chart-container')
      expect(warnSpy).not.toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      // 按原描述符还原：jsdom 挂上来的 window 可能带 getter 配置，
      // 用固定 { value, writable } 覆盖会把它变成普通数据属性，泄漏给同 worker 的下一个文件
      if (originalDescriptor) Object.defineProperty(globalThis, 'window', originalDescriptor)
      else
        Object.defineProperty(globalThis, 'window', {
          value: originalWindow,
          configurable: true,
          writable: true,
        })
      warnSpy.mockRestore()
      errorSpy.mockRestore()
      expect(typeof globalThis.window).toBe('object')
    }
  })

  it('未知主题名在客户端 effect 里警告，而不是在渲染期', () => {
    // 渲染期告警会被 StrictMode 双调用重复输出，所以 requirements R9 要求放 effect
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const html = renderToStaticMarkup(<OkrTree data={data} theme="brand" />)
    expect(html).toContain('okr-theme-brand')
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
