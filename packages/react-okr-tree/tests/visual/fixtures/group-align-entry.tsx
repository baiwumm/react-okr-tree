/**
 * 组对齐行为的浏览器夹具（与 perf-entry.tsx 同一套路：React 19 没有能直接 <script> 的
 * 浏览器版，所以由 global-setup.ts 用 Vite 打成自包含 IIFE，spec 再注进 about:blank）。
 *
 * 暴露的东西刻意保持最小：挂载一个「组里先只有一棵窄左树的成员」的页面，
 * 提供 setTwo(true) 再加入一棵左子树宽得多的成员，以及读回 --okr-group-left-width。
 * 判据是行为级的：加入更宽成员后对齐宽度必须涨。旧实现里 .is-measured 把左容器钉住、
 * 下一轮又把那个钉住的值当自然宽度读回来，于是永远停在首量值 → 这条当场红。
 */
import { createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { OkrTree, OkrTreeGroup } from 'react-okr-tree'

const WIDE = '一'.repeat(40)

const treeProps = (leftLabel: string) => ({
  data: [{ id: 1, label: 'Root', children: [{ id: 11, label: 'A' }] }],
  leftData: [{ id: 1, label: 'Root', children: [{ id: 21, label: leftLabel }] }],
  nodeKey: 'id',
  onlyBothTree: true,
  direction: 'horizontal' as const,
  showCollapsable: true,
  defaultExpandAll: true,
})

interface GroupAlignApi {
  mount: (el: HTMLElement) => void
  setTwo: (two: boolean) => void
  read: () => number
  settle: () => Promise<void>
}

const api: GroupAlignApi = {
  mount: () => {},
  setTwo: () => {},
  read: () => 0,
  settle: async () => {},
}

api.mount = (el: HTMLElement) => {
  const root = createRoot(el)
  let two = false
  const draw = () => {
    const members: ReactNode[] = [createElement(OkrTree, { ...treeProps('短'), key: 'n' })]
    if (two) members.push(createElement(OkrTree, { ...treeProps(WIDE), key: 'w' }))
    root.render(createElement(OkrTreeGroup, null, ...members))
  }
  draw()
  api.setTwo = v => {
    two = v
    draw()
  }
}

api.read = () => {
  const el = document.querySelector('.okr-tree-group')
  if (!el) return NaN
  return parseFloat(getComputedStyle(el).getPropertyValue('--okr-group-left-width'))
}

api.settle = async () => {
  for (let i = 0; i < 6; i++) {
    await new Promise<void>(r => requestAnimationFrame(() => r()))
  }
}

;(window as unknown as Record<string, unknown>).__ga = api

export {}
