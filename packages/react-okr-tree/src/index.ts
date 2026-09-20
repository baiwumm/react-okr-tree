export { OkrTree } from './OkrTree'
export type { OkrTreeHandle, OkrTreeProps } from './OkrTree'
export { OkrTreeGroup } from './OkrTreeGroup'
export type { OkrTreeGroupHandle, OkrTreeGroupProps } from './OkrTreeGroup'
/** renderNode / children 的作用域参数类型：不导出的话消费者只能自己重新声明一遍 */
export type { NodeScope } from './node-content'
export { OkrTreeViewport } from './OkrTreeViewport'
export type {
  OkrTreeViewportHandle,
  OkrTreeViewportProps,
  ViewportToolbarScope,
} from './OkrTreeViewport'
export { TreeNode, createNode, resetNodeIdSeed } from './model/node'
export { TreeStore, DEFAULT_PROPS } from './model/tree-store'
export type { TreeStoreOptions } from './model/tree-store'
export { NODE_KEY, getNodeKey, markNodeData, warn, resetWarnings } from './model/util'
export type { Subscribable } from './model/notifier'
export { clampZoom, computeFit, renderToDataUrl, loadHtmlToImage } from './viewport'
export type {
  ExportImageOptions,
  ViewportOffset,
  ViewportTreeApi,
  ViewportWheelBehavior,
} from './viewport'
export type {
  AnimateName,
  ConnectorMode,
  ConnectorShape,
  DropType,
  ExpandBtnScope,
  FilterNodeMethod,
  LabelClassName,
  NodeBtnContentFunction,
  NodeComponent,
  NodeComponentProps,
  RenderContentFunction,
  ScrollToNodeOptions,
  TreeCheckInfo,
  TreeDirection,
  TreeKey,
  TreeLoadFunction,
  TreeNodeData,
  TreeOptionProps,
  TreeTheme,
} from './types'
export { BUILT_IN_THEMES } from './types'

/**
 * D6：源项目的默认导出是 `VueOkrTreePlugin`（`app.use()` 用的插件对象），React 没有对应物，
 * 这里的默认导出改为组件本身，与具名导出 `OkrTree` 是同一个引用。
 * UMD 消费者写 `const OkrTree = ReactOkrTree.default`，ESM/CJS 走具名即可。
 */
export { OkrTree as default } from './OkrTree'
