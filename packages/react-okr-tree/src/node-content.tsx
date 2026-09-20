import { createElement, type ReactNode } from 'react'
import type { TreeNode } from './model/node'
import type {
  ExpandBtnScope,
  NodeBtnContentFunction,
  NodeComponent,
  RenderContentFunction,
} from './types'

/** 节点内容的作用域参数（对应源项目 #default 插槽的 { node, data }） */
export interface NodeScope {
  node: TreeNode
  data: Record<string, any>
}

/**
 * 节点内容渲染，优先级（requirements 4.4）：
 * 1. renderNode（对应 #default 插槽）
 * 2. nodeComponent：以 { node, data } 为 props 渲染
 * 3. renderContent：调用 renderContent(node)（React 版不传 h，见 D1）
 * 4. 兜底：node.label
 */
export function renderNodeContent(
  node: TreeNode,
  renderers: {
    renderNode?: (scope: NodeScope) => ReactNode
    nodeComponent?: NodeComponent
    renderContent?: RenderContentFunction
  },
  fallback: ReactNode
): ReactNode {
  const scope: NodeScope = { node, data: node.data }
  if (renderers.renderNode) return renderers.renderNode(scope)
  if (renderers.nodeComponent) return createElement(renderers.nodeComponent, scope)
  if (renderers.renderContent) return renderers.renderContent(node)
  return fallback
}

/**
 * 展开按钮内容：数字（showNodeNum）在调用方已优先处理，这里只剩两种定制口。
 * 顺序与源项目一致：renderExpandBtn > nodeBtnContent。
 */
export function renderExpandBtnContent(
  node: TreeNode,
  scope: Omit<ExpandBtnScope, 'node' | 'data'>,
  renderers: {
    renderExpandBtn?: (scope: ExpandBtnScope) => ReactNode
    nodeBtnContent?: NodeBtnContentFunction
  }
): ReactNode {
  const full: ExpandBtnScope = { node, data: node.data, ...scope }
  if (renderers.renderExpandBtn) return renderers.renderExpandBtn(full)
  if (renderers.nodeBtnContent) return renderers.nodeBtnContent(node)
  return null
}
