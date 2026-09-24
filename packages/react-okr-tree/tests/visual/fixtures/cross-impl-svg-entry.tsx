/**
 * 跨实现几何比对的 react 侧浏览器夹具（与 perf-entry / group-align-entry 同一套路：
 * React 19 没有能直接 <script> 的浏览器版，由 global-setup.ts 打成自包含 IIFE）。
 *
 * 为什么必须真浏览器：`connector="svg"` 的 path `d` 是挂载后量完布局算出来的，
 * SSR 与 jsdom 都拿不到（jsdom 无布局，rect 恒为 0）。vue3 侧的 d 存在
 * fixtures/cross-impl-vue3.json 里（同一套 style.css、同一视口、显式 label 尺寸）。
 */
import { createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { OkrTree } from 'react-okr-tree'

type Mode = { name: string; props: Record<string, unknown> }

interface SvgFixtureApi {
  mount: (el: HTMLElement, props: Record<string, unknown>) => void
  readPaths: () => (string | null)[]
  env: () => { innerWidth: number; innerHeight: number; dpr: number }
  settle: () => Promise<void>
}

let root: Root | null = null
let hostEl: HTMLElement | null = null

const api: SvgFixtureApi = {
  mount: (el, props) => {
    hostEl = el
    if (root) root.unmount()
    root = createRoot(el)
    const node: ReactNode = createElement(OkrTree, props as never)
    // 用 flushSync 之外的最稳路径：渲染 + 两次 rAF 由 settle() 负责等齐
    root.render(node)
  },
  readPaths: () =>
    hostEl
      ? Array.from(hostEl.querySelectorAll('.okr-connector-svg path')).map(p => p.getAttribute('d'))
      : [],
  env: () => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    dpr: window.devicePixelRatio,
  }),
  settle: async () => {
    for (let i = 0; i < 4; i++) {
      await new Promise<void>(r => requestAnimationFrame(() => r()))
    }
  },
}

;(window as unknown as Record<string, unknown>).__svgFixture = api

export type { Mode }
