import { createContext, useContext, type MutableRefObject, type ReactNode } from 'react'
import type { TreeStore } from './model/tree-store'
import type { TreeNode } from './model/node'
import type { NodeScope } from './node-content'
import type {
  DropType,
  ExpandBtnScope,
  NodeBtnContentFunction,
  NodeComponent,
  RenderContentFunction,
} from './types'
import type { ViewportTreeApi } from './viewport'
import type { OkrTreeVirtualContext } from './virtual'

export type OkrTreeEventName =
  | 'node-click'
  | 'node-expand'
  | 'node-collapse'
  | 'node-contextmenu'
  | 'check'
  | 'check-change'
  | 'node-drag-start'
  | 'node-drag-enter'
  | 'node-drag-leave'
  | 'node-drag-over'
  | 'node-drag-end'
  | 'node-drop'

/**
 * 节点渲染配置。
 *
 * 源项目这些值靠 props 逐层透传 + provide/inject 的可追踪字段；React 版放进一个
 * **每次渲染刷新的 ref**（context value 本身引用不变），这样它们换身份不会把整棵树
 * 连带重渲染——运行时要生效的 prop 由 OkrTree 显式 bump 节点（requirements R3）。
 */
export interface OkrTreeRenderConfig {
  showCollapsable: boolean
  labelWidth?: string | number
  labelHeight?: string | number
  renderContent?: RenderContentFunction
  nodeComponent?: NodeComponent
  nodeBtnContent?: NodeBtnContentFunction
  /** 对应源项目的 #default 插槽，优先级最高 */
  renderNode?: (scope: NodeScope) => ReactNode
  /** 对应源项目的 #expand-btn 插槽，优先级高于 nodeBtnContent */
  renderExpandBtn?: (scope: ExpandBtnScope) => ReactNode
  nodeKey?: string
  showNodeNum: boolean
  alignRoot: boolean
}

export interface OkrTreeContextValue {
  store: TreeStore
  root: TreeNode
  configRef: MutableRefObject<OkrTreeRenderConfig>
  emit: (event: OkrTreeEventName, ...args: any[]) => void
  /** 仅当外部传了 onNodeContextMenu 时才阻断浏览器默认右键菜单（与源项目一致） */
  hasContextmenuListener: () => boolean
  /** 节点展开态发生用户交互变化后调用：同步受控 expandedKeys */
  onExpandChange: () => void
  /** 选中节点发生用户交互变化后调用：同步受控 currentKey */
  onCurrentChange: () => void

  /** 节点根元素登记（scrollToNode / getNodeEl / 键盘导航使用） */
  registerNodeEl: (node: TreeNode, el: HTMLElement) => void
  unregisterNodeEl: (node: TreeNode) => void

  /**
   * 键盘与拖拽的跨节点交互态。
   * 它们不走 React state（那会让整棵树重渲染），而是「谁变了就 bump 谁」：
   * setFocusedNode / setDragOver 内部负责通知上一个与下一个持有者。
   */
  getFocusedNode: () => TreeNode | null
  setFocusedNode: (node: TreeNode | null) => void
  focusElement: (el: HTMLElement) => void
  focusNode: (node: TreeNode) => void
  /** 沿可见 treeitem 的文档顺序移动焦点 */
  moveFocus: (from: HTMLElement | null, step: 1 | -1 | 'first' | 'last') => void
  /** 聚焦父节点（左树顶层节点的视觉父节点是 OKR 根节点） */
  focusParent: (node: TreeNode, isLeftChildNode: boolean) => void

  getDraggingNode: () => TreeNode | null
  setDraggingNode: (node: TreeNode | null) => void
  getDragOver: () => { node: TreeNode | null; type: DropType | null }
  /** 同时 bump 上一个与下一个目标节点，drop-prev / drop-inner / drop-next 类才会跟着走 */
  setDragOver: (node: TreeNode | null, type: DropType | null) => void

  /**
   * 虚拟滚动上下文（virtual prop 开启时存在；未开启为 undefined）。
   * tick / reveal 走 React state：bump 即整树消费者重渲染并重算窗口，
   * 所以行组件在渲染期直接调用 computeWindowState 即可。
   */
  virtual?: OkrTreeVirtualContext
}

const OkrTreeContext = createContext<OkrTreeContextValue | null>(null)

export const OkrTreeProvider = OkrTreeContext.Provider

/** 找不到树上下文时抛错，语义对齐源项目 OkrTreeNode 的 "[OkrTreeNode] Can not find node's tree." */
export function useOkrTreeContext(): OkrTreeContextValue {
  const ctx = useContext(OkrTreeContext)
  if (!ctx) {
    throw new Error("[OkrTreeNode] Can not find node's tree.")
  }
  return ctx
}

/** OkrTreeGroup 提供给组内 OkrTree 的上下文 */
export interface OkrTreeGroupContextValue {
  /** 成员挂载 / 更新 / 卸载后请求重新测量（内部按帧去重） */
  requestMeasure: () => void
}

const OkrTreeGroupContext = createContext<OkrTreeGroupContextValue | null>(null)

export const OkrTreeGroupProvider = OkrTreeGroupContext.Provider

export function useOkrTreeGroupContext(): OkrTreeGroupContextValue | null {
  return useContext(OkrTreeGroupContext)
}

/** OkrTreeViewport 提供给内部 OkrTree 的上下文（登记以便 centerNode 定位） */
export interface OkrTreeViewportContextValue {
  registerTree: (api: ViewportTreeApi) => void
  unregisterTree: (api: ViewportTreeApi) => void
}

const OkrTreeViewportContext = createContext<OkrTreeViewportContextValue | null>(null)

export const OkrTreeViewportProvider = OkrTreeViewportContext.Provider

export function useOkrTreeViewportContext(): OkrTreeViewportContextValue | null {
  return useContext(OkrTreeViewportContext)
}
