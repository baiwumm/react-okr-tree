/**
 * DOM 契约（requirements R6）。
 *
 * 类名在这份代码里不是实现细节，而是**契约**：源项目有三处逻辑靠类名字符串工作
 * （OkrTreeGroup 的跨实例测量、键盘导航的可见节点查询、SVG 连接线的卡片锚点），
 * 而 style.css 的全部几何都挂在这些类上。集中定义在这里，避免同一字符串在四下手写漂移。
 *
 * 改动任何一个值之前先确认：src/styles/style.css 与视觉回归基线是否同步。
 */

/** 结构类 */
export const CLS = {
  container: 'org-chart-container',
  /** 同时用于 role=tree 的顶层容器——这是源项目行为，它因此吃到层级 padding 与一条自己的连接线 */
  children: 'org-chart-node-children',
  leftChildren: 'org-chart-node-left-children',
  node: 'org-chart-node',
  label: 'org-chart-node-label',
  labelInner: 'org-chart-node-label-inner',
  btn: 'org-chart-node-btn',
  leftBtn: 'org-chart-node-left-btn',
  btnText: 'org-chart-node-btn-text',
  checkbox: 'org-chart-node-checkbox',
  /** 故意没有任何 CSS 规则：纯用户钩子 */
  empty: 'org-chart-empty',
  connectorSvg: 'okr-connector-svg',
  group: 'okr-tree-group',
  viewport: 'okr-viewport',
  viewportCanvas: 'okr-viewport-canvas',
  /** 同样没有 CSS 规则，只作为测量锚点 */
  viewportContent: 'okr-viewport-content',
  viewportToolbar: 'okr-viewport-toolbar',
  viewportToolbarBtn: 'okr-viewport-toolbar-btn',
  viewportToolbarZoom: 'okr-viewport-toolbar-zoom',
} as const

/** 状态 / 修饰类 */
export const STATE = {
  vertical: 'vertical',
  horizontal: 'horizontal',
  /** 同样无 CSS 规则，纯用户钩子 */
  showCollapsable: 'show-collapsable',
  oneBranch: 'one-branch',
  collapsed: 'collapsed',
  isLeaf: 'is-leaf',
  isCurrent: 'is-current',
  isDisabled: 'is-disabled',
  isLeftChildNode: 'is-left-child-node',
  isNotChild: 'is-not-child',
  isRootLabel: 'is-root-label',
  isNotRightChild: 'is-not-right-child',
  isNotLeftChild: 'is-not-left-child',
  onlyBothTreeNode: 'only-both-tree-node',
  alignRoot: 'align-root',
  expanded: 'expanded',
  isLoading: 'is-loading',
  isHidden: 'is-hidden',
  isAnimated: 'is-animated',
  isChecked: 'is-checked',
  isIndeterminate: 'is-indeterminate',
  dropPrev: 'drop-prev',
  dropInner: 'drop-inner',
  dropNext: 'drop-next',
  isMeasured: 'is-measured',
  isMeasuring: 'is-measuring',
  isPanning: 'is-panning',
  connectorSvg: 'connector-svg',
  unstyled: 'okr-unstyled',
} as const

/** 主题类：`theme="default"` 刻意不加任何类（保持与 vue-okr-tree 逐像素一致） */
export const themeClass = (theme: string): string =>
  theme && theme !== 'default' ? `okr-theme-${theme}` : ''

/** 动画类：animateName prop 直接拼在 okr-anim- 之后 */
export const animClass = (animateName: string): string => `okr-anim-${animateName}`

/**
 * OkrTreeGroup 的测量选择器：组内所有 OKR 树的左子树容器。
 * 必须与 style.css 里 `.okr-tree-group.is-measured …` 那条规则指向同一批元素。
 */
export const GROUP_LEFT_WIDTH_SELECTOR = [
  `.${CLS.container}`,
  `.${STATE.horizontal}`,
  `.${CLS.node}.${STATE.onlyBothTreeNode}.${STATE.alignRoot}`,
  `> .${CLS.leftChildren}`,
].join(' ')

/** 键盘导航：可见 treeitem 的枚举（配合 HIDDEN_ANCESTOR_SELECTOR 过滤收起子树） */
export const TREEITEM_SELECTOR = `.${CLS.node}[role="treeitem"]`

/** 收起容器：`el.closest(...)` 命中即表示该节点在视觉上不可达 */
export const HIDDEN_ANCESTOR_SELECTOR = [
  `.${CLS.children}.${STATE.isHidden}`,
  `.${CLS.leftChildren}.${STATE.isHidden}`,
].join(', ')

/** SVG 连接线测量：节点自己的卡片（不含后代节点） */
export const CARD_SELECTOR = `:scope > .${CLS.label} > .${CLS.labelInner}`
