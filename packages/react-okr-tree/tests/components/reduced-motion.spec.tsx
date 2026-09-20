import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render } from '@testing-library/react'
import { OkrTree } from '../../src/index'
import type { OkrTreeProps } from '../../src/index'

/**
 * 移植自源项目 tests/components/reduced-motion.spec.ts（prefers-reduced-motion，roadmap 13 其他小项）。
 *
 * 系统要求减少动效时，组件把 animate 视为关闭（状态类与过渡都撤掉，状态直切），
 * 配套的 CSS 媒体查询在 src/styles/style.css / transition.css 里。
 *
 * 这里只断言 DOM 上的状态类与样式表文本：jsdom 不套用样式表（vitest 配置 css: false），
 * 「媒体查询命中时过渡时长真的归零」这一半只有真实级联才判得出来，归阶段 9.2 的视觉回归。
 */

const data = [{ id: 1, label: 'R', children: [{ id: 2, label: 'C' }] }]

type MqlListener = (event: { matches: boolean }) => void
let mqlMatches = false
// use-reduced-motion 的 matchMedia 监听是模块级单例，只会在首次 subscribe 时注册一次，所以数组跨用例保留
const mqlListeners: MqlListener[] = []

function stubMatchMedia() {
  mqlMatches = false
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    get matches() {
      return mqlMatches
    },
    onchange: null,
    addEventListener: (_: string, cb: MqlListener) => mqlListeners.push(cb),
    removeEventListener: () => {},
    addListener: (cb: MqlListener) => mqlListeners.push(cb),
    removeListener: () => {},
    dispatchEvent: () => true,
  }))
  // 单例里的 matches 会跨用例残留（用例内改过就是改过），派发一次 false 复位
  if (mqlListeners.length) act(() => mqlListeners.forEach(cb => cb({ matches: false })))
}

function setReducedMotion(matches: boolean) {
  mqlMatches = matches
  // 通知订阅者是 React 外的离散更新，包在 act 内保证渲染已刷新
  act(() => mqlListeners.forEach(cb => cb({ matches })))
}

const treeProps: OkrTreeProps = {
  data,
  nodeKey: 'id',
  showCollapsable: true,
  animate: true,
  defaultExpandAll: true,
}

// 顶层的 role=tree 容器同样带 .org-chart-node-children，状态类只打在节点自己的子容器上
const childrenClasses = (c: ParentNode) =>
  Array.from(c.querySelector<HTMLElement>('.org-chart-node .org-chart-node-children')!.classList)

describe('prefers-reduced-motion', () => {
  beforeEach(() => stubMatchMedia())
  afterEach(() => vi.unstubAllGlobals())

  it('默认（不要求减少动效）时 animate 状态类正常生效', () => {
    const { container } = render(<OkrTree {...treeProps} />)
    expect(childrenClasses(container)).toContain('is-animated')
    expect(childrenClasses(container).some(c => c.startsWith('okr-anim-'))).toBe(true)
  })

  it('系统要求减少动效时按 animate 关闭处理，状态类撤掉', () => {
    const { container } = render(<OkrTree {...treeProps} />)
    expect(childrenClasses(container)).toContain('is-animated')

    setReducedMotion(true)
    expect(childrenClasses(container)).not.toContain('is-animated')
    expect(childrenClasses(container).some(c => c.startsWith('okr-anim-'))).toBe(false)

    // 用户改回系统设置后动画恢复
    setReducedMotion(false)
    expect(childrenClasses(container)).toContain('is-animated')
  })

  it('两份样式里都保留了 reduced-motion 媒体查询（防止误删）', () => {
    // vitest 的工作目录就是包根目录；import.meta.url 在 jsdom 环境下不是 file 协议，不能用来定位源码
    const stylesDir = resolve(process.cwd(), 'src/styles')
    for (const file of ['style.css', 'transition.css']) {
      expect(readFileSync(resolve(stylesDir, file), 'utf8')).toContain(
        '@media (prefers-reduced-motion: reduce)'
      )
    }
  })
})
