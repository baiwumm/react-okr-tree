import { CLS } from './dom-contract'
import type { TreeNode } from './model/node'
import type { TreeStore } from './model/tree-store'
import type { ConnectorShape } from './types'

/** 卡片相对树根的位置 */
export interface CardRect {
  left: number
  right: number
  top: number
  bottom: number
  cx: number
  cy: number
}

export interface ConnectorEdge {
  id: string
  d: string
}

const round = (v: number): number => Math.round(v * 100) / 100

/** 按形状生成两点间路径；orient 为连线主轴（h 水平 / v 垂直），未知形状回退 curve */
export function buildPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  orient: 'h' | 'v',
  shape: ConnectorShape
): string {
  if (shape === 'straight') return `M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}`
  if (shape === 'orthogonal') {
    if (orient === 'h') {
      const m = round((x1 + x2) / 2)
      return `M ${round(x1)} ${round(y1)} L ${m} ${round(y1)} L ${m} ${round(y2)} L ${round(x2)} ${round(y2)}`
    }
    const m = round((y1 + y2) / 2)
    return `M ${round(x1)} ${round(y1)} L ${round(x1)} ${m} L ${round(x2)} ${m} L ${round(x2)} ${round(y2)}`
  }
  const g = Math.min(40, (orient === 'h' ? Math.abs(x2 - x1) : Math.abs(y2 - y1)) / 2)
  if (orient === 'h') {
    const s = x2 >= x1 ? 1 : -1
    return `M ${round(x1)} ${round(y1)} C ${round(x1 + g * s)} ${round(y1)}, ${round(x2 - g * s)} ${round(y2)}, ${round(x2)} ${round(y2)}`
  }
  const s = y2 >= y1 ? 1 : -1
  return `M ${round(x1)} ${round(y1)} C ${round(x1)} ${round(y1 + g * s)}, ${round(x2)} ${round(y2 - g * s)}, ${round(x2)} ${round(y2)}`
}

/** 收起残枝：与 CSS 模式的 stub 同形（垂直向下 20、水平侧向 10） */
export function stubPath(
  from: { x: number; y: number },
  side: 'right' | 'left' | 'bottom'
): string {
  const len = side === 'bottom' ? 20 : 10
  const dx = side === 'right' ? len : side === 'left' ? -len : 0
  return `M ${round(from.x)} ${round(from.y)} l ${dx} ${side === 'bottom' ? len : 0}`
}

/** 批量测量全部可见节点卡片相对树根的位置。DOM 读取集中在这里，纯逻辑交给 computeEdges */
export function collectCardRects(
  store: TreeStore,
  nodeEls: WeakMap<TreeNode, HTMLElement>,
  base: DOMRect
): Map<TreeNode, CardRect> {
  const rects = new Map<TreeNode, CardRect>()
  const measure = (node: TreeNode) => {
    if (node.visible) {
      const el = nodeEls.get(node)
      const card = el
        ? el.querySelector<HTMLElement>(`:scope > .${CLS.label} > .${CLS.labelInner}`)
        : null
      if (card) {
        const r = card.getBoundingClientRect()
        rects.set(node, {
          left: r.left - base.left,
          right: r.right - base.left,
          top: r.top - base.top,
          bottom: r.bottom - base.top,
          cx: r.left - base.left + r.width / 2,
          cy: r.top - base.top + r.height / 2,
        })
      }
    }
    node.childNodes.forEach(measure)
  }
  store.root.childNodes.forEach(measure)
  if (store.isLeftChilds) store.isLeftChilds.childNodes.forEach(measure)
  return rects
}

/**
 * 生成父子边路径（connector="svg"）。
 * 布局完全由 CSS 负责，这里只测量与连线；锚点随方向与左右树镜像，
 * 收起时画与 CSS 模式同形的残枝。
 */
export function computeEdges(
  store: TreeStore,
  rects: Map<TreeNode, CardRect>,
  shape: ConnectorShape
): ConnectorEdge[] {
  const horizontal = store.direction === 'horizontal'
  const edges: ConnectorEdge[] = []
  let seq = 0

  const outAnchor = (r: CardRect, side: 'right' | 'left' | 'bottom') =>
    side === 'bottom'
      ? { x: r.cx, y: r.bottom }
      : { x: side === 'right' ? r.right : r.left, y: r.cy }
  const inAnchor = (r: CardRect, side: 'left' | 'right' | 'top') =>
    side === 'top' ? { x: r.cx, y: r.top } : { x: side === 'left' ? r.left : r.right, y: r.cy }
  const outSide = (node: TreeNode) =>
    !horizontal ? ('bottom' as const) : node.isLeftChild ? ('left' as const) : ('right' as const)
  const inSide = (node: TreeNode) =>
    !horizontal ? ('top' as const) : node.isLeftChild ? ('right' as const) : ('left' as const)

  const walk = (node: TreeNode) => {
    if (node.visible) {
      const r = rects.get(node)
      if (r && node.level > 0) {
        const expandedFlag = node.isLeftChild ? node.leftExpanded : node.expanded
        const orient = horizontal ? ('h' as const) : ('v' as const)
        // 常规父子边（右树的 childNodes；左树节点的 childNodes 即其左子节点）
        if (node.childNodes.length) {
          const from = outAnchor(r, outSide(node))
          if (expandedFlag) {
            for (const child of node.childNodes) {
              if (!child.visible) continue
              const cr = rects.get(child)
              if (!cr) continue
              const to = inAnchor(cr, inSide(child))
              edges.push({
                id: `e${seq++}`,
                d: buildPath(from.x, from.y, to.x, to.y, orient, shape),
              })
            }
          } else {
            edges.push({ id: `e${seq++}`, d: stubPath(from, outSide(node)) })
          }
        }
        // OKR 根节点的左子树：根卡片左锚点 → 左树顶层节点右锚点
        if (store.onlyBothTree && node.level === 1 && !node.isLeftChild && horizontal) {
          const from = outAnchor(r, 'left')
          if (node.leftChildNodes.length && node.leftExpanded) {
            for (const child of node.leftChildNodes) {
              if (!child.visible) continue
              const cr = rects.get(child)
              if (!cr) continue
              edges.push({
                id: `e${seq++}`,
                d: buildPath(from.x, from.y, cr.right, cr.cy, 'h', shape),
              })
            }
          } else if (node.leftChildNodes.length) {
            // 根左侧的指向线（与 CSS 的 only-both-tree-node ::before 同位，宽 20）
            edges.push({ id: `e${seq++}`, d: `M ${round(from.x)} ${round(from.y)} l -20 0` })
          }
        }
      }
    }
    node.childNodes.forEach(walk)
  }
  store.root.childNodes.forEach(walk)
  if (store.isLeftChilds) store.isLeftChilds.childNodes.forEach(walk)
  return edges
}
