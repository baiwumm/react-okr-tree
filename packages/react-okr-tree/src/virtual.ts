import type { TreeNode } from './model/node'

/**
 * 虚拟滚动（virtual prop）：只对「同层可见兄弟数 ≥ 阈值」的行做窗口化渲染。
 * 与上游 vue3-okr-tree 同批同形（2026-09-26）。
 *
 * 机制：连接线的每段线都由节点自绘，真正依赖 DOM 相邻的只有边界帽
 * （:first-child / :last-child / :only-child）——等尺寸占位块顶住未渲染兄弟的位置后，
 * 占位块天然占据行首 / 行末，真实节点的边界帽语义自动正确。展开行的子容器按宽度模型
 * 显式定宽（float 的 shrink-to-fit 取 min(max(min-content, 可用宽), max-content)，
 * 单个巨宽占位块会把容器钉在 min-content 上、把渲染节点挤到第二行折断连线）。
 *
 * 与上游的差异只在反应层：Vue 用 computed 自动追踪后代宽度变化，React 这里由
 * OkrTree 在 onExpandChange / filter / 数据变更时 bump 度量时钟（virtual 下渲染节点
 * 有界，整树重渲染代价可控），行组件在渲染期调用 computeWindowState 重算窗口。
 */

/** 参与 virtual 的最小同层可见兄弟数：低于它的行全量渲染（窗口化无收益） */
export const VIRTUAL_THRESHOLD = 50
/** 主轴方向视口外扩的像素数（overscan） */
export const VIRTUAL_OVERSCAN_PX = 300
/** 视口外（交叉轴）行的最小渲染条数：保持少量真实结构，高度近似有界 */
export const VIRTUAL_MIN_WINDOW = 12
/** 交叉轴参与判定时视口的外扩余量 */
export const VIRTUAL_CROSS_MARGIN = 400
/** 揭示请求（scrollToNode / 键盘漫游）强制窗口的半宽（条数） */
export const VIRTUAL_REVEAL_HALF = 10

/** OkrTree 提供给行组件的虚拟滚动上下文（virtual 关闭时为 undefined） */
export interface OkrTreeVirtualContext {
  /** 窗口化主轴：vertical 布局兄弟横排 → 'x'；horizontal 布局兄弟竖排 → 'y' */
  axis: 'x' | 'y'
  /**
   * 度量时钟：滚动 / resize / viewport 变换 / 展开与过滤等模型变化时 +1。
   * 行组件在渲染期读取它（经 context 传递，bump 即整树消费者重渲染并重算窗口）。
   */
  getTick: () => number
  /** 滚动视口矩形（滚动容器或 documentElement 的 getBoundingClientRect） */
  getViewRect: () => DOMRect | null
  /** 揭示请求：scrollToNode / 键盘漫游要求某节点必须渲染时递增 */
  getReveal: () => { node: TreeNode; n: number } | null
  /** 卡片定宽（labelWidth 数字值）；0 表示不可用（达标行退回全量渲染） */
  labelW: number
  /** 卡片定高（labelHeight 数字值），仅 axis === 'y' 需要；0 同上 */
  labelH: number
  /** --okr-gap-sibling 解析值（宽度模型的水平内边距） */
  gapSibling: number
  /** --okr-gap-node-y 解析值（高度模型的卡片纵向外边距） */
  gapNodeY: number
}

/** 行窗口状态；null = 该行不参与窗口化（全量渲染） */
export interface VirtualWindowState {
  /** 渲染区间 [start, end)，基于「可见兄弟」下标 */
  start: number
  end: number
  /** 行首占位块的尺寸（vertical 为宽、horizontal 为高），0 表示无 */
  leadSize: number
  /** 行末占位块的尺寸，0 表示无 */
  trailSize: number
  /** 行内全部可见兄弟的尺寸总和（vertical 为行宽、horizontal 为列高），供容器显式定宽/高 */
  totalSize: number
}

/** vertical（兄弟横排）节点盒宽：与 float shrink-wrap 的 DOM 结果一致 */
export function vNodeWidth(node: TreeNode, ctx: OkrTreeVirtualContext): number {
  const pad = ctx.gapSibling * 2
  const base = ctx.labelW + pad
  if (!node.expanded) return base
  let row = 0
  let has = false
  for (const child of node.childNodes) {
    if (!child.visible) continue
    has = true
    row += vNodeWidth(child, ctx)
  }
  if (!has) return base
  return Math.max(ctx.labelW, row) + pad
}

/** horizontal（兄弟竖排）节点盒高：与 flex 纵向堆叠的 DOM 结果一致 */
export function hNodeHeight(node: TreeNode, ctx: OkrTreeVirtualContext): number {
  const base = ctx.labelH + ctx.gapNodeY * 2
  if (!node.expanded) return base
  let stack = 0
  let has = false
  for (const child of node.childNodes) {
    if (!child.visible) continue
    has = true
    stack += hNodeHeight(child, ctx)
  }
  if (!has) return base
  return Math.max(base, stack)
}

const stateOf = (
  prefix: Float64Array,
  total: number,
  start: number,
  end: number
): VirtualWindowState => ({
  start,
  end,
  leadSize: prefix[start],
  trailSize: total - prefix[end],
  totalSize: total,
})

const minWindow = (list: TreeNode[], prefix: Float64Array, total: number): VirtualWindowState => {
  const end = Math.min(list.length, VIRTUAL_MIN_WINDOW)
  return stateOf(prefix, total, 0, end)
}

/**
 * 行级窗口（渲染期调用）：items 为该行「可见兄弟」列表（模型序），
 * containerEl 为子容器元素（首帧可能为 null → 走兜底小窗口，挂载后的第一次 tick 修正）。
 */
export function computeWindowState(options: {
  ctx: OkrTreeVirtualContext | undefined
  items: TreeNode[]
  containerEl: HTMLElement | null
  sizeOf: (node: TreeNode, ctx: OkrTreeVirtualContext) => number
}): VirtualWindowState | null {
  const { ctx, items, containerEl, sizeOf } = options
  if (!ctx) return null
  if (!ctx.labelW) return null
  if (ctx.axis === 'y' && !ctx.labelH) return null
  if (items.length < VIRTUAL_THRESHOLD) return null

  const prefix = new Float64Array(items.length + 1)
  for (let i = 0; i < items.length; i++) prefix[i + 1] = prefix[i] + sizeOf(items[i], ctx)
  const total = prefix[items.length]

  const reveal = ctx.getReveal()
  if (reveal) {
    const idx = items.indexOf(reveal.node)
    if (idx >= 0) {
      const start = Math.max(0, idx - VIRTUAL_REVEAL_HALF)
      const end = Math.min(items.length, idx + VIRTUAL_REVEAL_HALF + 1)
      return stateOf(prefix, total, start, end)
    }
  }

  const view = ctx.getViewRect()
  if (!containerEl || !view || typeof containerEl.getBoundingClientRect !== 'function') {
    return minWindow(items, prefix, total)
  }
  const rect = containerEl.getBoundingClientRect()
  const crossA = ctx.axis === 'x' ? rect.top : rect.left
  const crossB = ctx.axis === 'x' ? rect.bottom : rect.right
  const viewA = ctx.axis === 'x' ? view.top : view.left
  const viewB = ctx.axis === 'x' ? view.bottom : view.right
  if (crossB < viewA - VIRTUAL_CROSS_MARGIN || crossA > viewB + VIRTUAL_CROSS_MARGIN) {
    return minWindow(items, prefix, total)
  }
  const lo = (ctx.axis === 'x' ? view.left - rect.left : view.top - rect.top) - VIRTUAL_OVERSCAN_PX
  const hi =
    (ctx.axis === 'x' ? view.right - rect.left : view.bottom - rect.top) + VIRTUAL_OVERSCAN_PX
  let start = 0
  while (start < items.length && prefix[start + 1] <= lo) start++
  let end = start
  while (end < items.length && prefix[end] < hi) end++
  if (start >= items.length) return minWindow(items, prefix, total)
  start = Math.max(0, start - 2)
  end = Math.min(items.length, end + 2)
  return stateOf(prefix, total, start, end)
}
