import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * 全局共享的「系统是否要求减少动效」状态：matchMedia 监听只注册一次。
 * SSR 安全——服务端没有 window，快照恒为 false。
 */
const listeners = new Set<() => void>()
let listening = false
let matches = false

function ensureListening(): void {
  if (listening || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  listening = true
  const mql = window.matchMedia(QUERY)
  matches = mql.matches
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', event => {
      matches = event.matches
      for (const listener of [...listeners]) listener()
    })
  }
}

function subscribe(listener: () => void): () => void {
  ensureListening()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 非 hook 读取，供 scrollToNode / SVG 重绘这类命令式路径使用 */
export function prefersReducedMotion(): boolean {
  ensureListening()
  return matches
}

export function getServerSnapshot(): boolean {
  return false
}

/**
 * 调用方据此把 animate 视为关闭，使展开/收起状态直切。
 * CSS 媒体查询只掐掉过渡时长，若 JS 仍保留撑高度的延迟，收起后会留下一段空白。
 */
export function usePrefersReducedMotion(): boolean {
  ensureListening()
  return useSyncExternalStore(subscribe, () => matches, getServerSnapshot)
}
