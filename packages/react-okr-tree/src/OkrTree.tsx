import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type ForwardedRef,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { flushSync } from 'react-dom'
import './styles/style.css'
import { OkrTreeNode } from './OkrTreeNode'
import { CLS, HIDDEN_ANCESTOR_SELECTOR, STATE, TREEITEM_SELECTOR, themeClass } from './dom-contract'
import { cx, cxState, reactKey } from './cx'
import { setPositions } from './aria-set'
import {
  computeWindowState,
  hNodeHeight,
  vNodeWidth,
  type OkrTreeVirtualContext,
} from './virtual'
import {
  OkrTreeProvider,
  useOkrTreeGroupContext,
  useOkrTreeViewportContext,
  type OkrTreeEventName,
  type OkrTreeContextValue,
  type OkrTreeRenderConfig,
} from './context'
import { DEFAULT_PROPS, TreeStore } from './model/tree-store'
import type { TreeNode } from './model/node'
import { getNodeKey, warn } from './model/util'
import { prefersReducedMotion } from './hooks/use-reduced-motion'
import { collectCardRects, computeEdges, type ConnectorEdge } from './svg-connector'
import { useNodeVersion } from './hooks/use-node-version'
import { BUILT_IN_THEMES } from './types'
import type { NodeScope } from './node-content'
import type { ViewportTreeApi } from './viewport'
import type {
  AnimateName,
  ConnectorMode,
  ConnectorShape,
  DropType,
  ExpandBtnScope,
  FilterNodeMethod,
  LabelClassName,
  NodeBtnContentFunction,
  NodeComponent,
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

export interface OkrTreeProps<T extends TreeNodeData = TreeNodeData> {
  /** 展示数据（数组，支持多根） */
  data: T[]
  /** 左子树数据，仅在 onlyBothTree 模式启用 */
  leftData?: T[]
  /** 树的展开方向 */
  direction?: TreeDirection
  /** 飞书 OKR 模式：子树在根节点左右两边展开（需 direction='horizontal' 且提供 leftData） */
  onlyBothTree?: boolean
  /** 节点是否可被展开（显示 +/- 圆形按钮）。为 false 时组件强制全部展开 */
  showCollapsable?: boolean
  /** 手风琴模式：用户展开某节点时自动收起其同级兄弟（只作用于交互展开） */
  accordion?: boolean
  /** 点击节点内容时切换该节点的展开 / 收起 */
  expandOnClickNode?: boolean
  /** 复选框选择模式 */
  showCheckbox?: boolean
  /** 复选框父子不联动 */
  checkStrictly?: boolean
  /** 初始勾选的节点 key 数组（必须设置 nodeKey） */
  defaultCheckedKeys?: TreeKey[]
  /** 拖拽调整层级 */
  draggable?: boolean
  /** 拖拽规则钩子：返回 false 禁止拖动该节点 */
  allowDrag?: (node: TreeNode) => boolean
  /** 放置规则钩子 */
  allowDrop?: (draggingNode: TreeNode, dropNode: TreeNode, type: DropType) => boolean
  /** 连接线渲染模式 */
  connector?: ConnectorMode
  /** svg 模式的路径形状 */
  connectorShape?: ConnectorShape
  /** 去掉卡片外观，只保留布局与连接线 */
  unstyled?: boolean
  /** 节点宽度：number → px；string → 直接作为 style.width */
  labelWidth?: string | number
  /** 节点高度：number → px；string → 直接作为 style.height */
  labelHeight?: string | number
  /** 节点 className，支持 Function(node) 或固定字符串 */
  labelClassName?: LabelClassName
  /** 当前选中节点的 className（保留原版拼写） */
  currentLableClassName?: LabelClassName
  /** 折叠时在圆形按钮内显示子节点数量 */
  showNodeNum?: boolean
  /** 默认展开全部（仅在 showCollapsable 为 true 时有意义） */
  defaultExpandAll?: boolean
  /** 节点内容区渲染函数（React 版不传 h，见 D1） */
  renderContent?: RenderContentFunction
  /** 展开按钮内容渲染函数 */
  nodeBtnContent?: NodeBtnContentFunction
  /** 节点内容组件，以 { node, data } 为 props 渲染 */
  nodeComponent?: NodeComponent
  /** 字段映射配置 */
  props?: TreeOptionProps
  /** 节点唯一标识字段名 */
  nodeKey?: string
  /** 默认展开节点的 key 数组（需 nodeKey） */
  defaultExpandedKeys?: TreeKey[]
  /** 初始选中节点 key */
  currentNodeKey?: TreeKey
  /** 过滤方法 */
  filterNodeMethod?: FilterNodeMethod
  /** 是否开启展开过渡动画 */
  animate?: boolean
  /** 动画名 */
  animateName?: AnimateName
  /** 动画时长 ms */
  animateDuration?: number
  /** OKR 模式下自动按左右子树对齐根节点 */
  alignRoot?: boolean
  /** 内置主题名或自定义名字 */
  theme?: TreeTheme
  /** 懒加载开关 */
  lazy?: boolean
  /** 懒加载取数函数 */
  load?: TreeLoadFunction
  /** data 深度侦听开关（创建期生效），见 requirements R2 */
  deepWatch?: boolean
  /**
   * 虚拟滚动（1.16.0 新增，创建期生效）：同层可见兄弟数 ≥ 阈值（50）的行只渲染视口内
   * 窗口，用等尺寸占位块保持布局与连接线逐像素等价。要求数字型 labelWidth
   * （horizontal 布局还要求 labelHeight），auto 尺寸下达标行退回全量渲染。
   */
  virtual?: boolean
  /** 受控展开态（需 nodeKey）；未传 = 非受控 */
  expandedKeys?: TreeKey[]
  onExpandedKeysChange?: (keys: TreeKey[]) => void
  /** 受控选中态（需 nodeKey）；null 表示无选中 */
  currentKey?: TreeKey | null
  onCurrentKeyChange?: (key: TreeKey | null) => void

  // ---- 事件（回调形式，见 R3 / D2：不带 nodeComponent 第三参）----
  onNodeClick?: (data: T, node: TreeNode) => void
  onNodeExpand?: (data: T, node: TreeNode) => void
  onNodeCollapse?: (data: T, node: TreeNode) => void
  onNodeContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, data: T, node: TreeNode) => void
  onCheck?: (data: T, info: TreeCheckInfo) => void
  onCheckChange?: (data: T, checked: boolean, indeterminate: boolean) => void
  onNodeDragStart?: (node: TreeNode, event: ReactDragEvent<HTMLDivElement>) => void
  onNodeDragEnter?: (
    draggingNode: TreeNode,
    dropNode: TreeNode,
    event: ReactDragEvent<HTMLDivElement>
  ) => void
  onNodeDragLeave?: (
    draggingNode: TreeNode,
    dropNode: TreeNode,
    event: ReactDragEvent<HTMLDivElement>
  ) => void
  onNodeDragOver?: (
    draggingNode: TreeNode,
    dropNode: TreeNode,
    event: ReactDragEvent<HTMLDivElement>
  ) => void
  onNodeDragEnd?: (
    draggingNode: TreeNode,
    dropNode: TreeNode | null,
    dropType: DropType | null,
    event: ReactDragEvent<HTMLDivElement>
  ) => void
  onNodeDrop?: (
    draggingNode: TreeNode,
    dropNode: TreeNode,
    dropType: DropType,
    event: ReactDragEvent<HTMLDivElement>
  ) => void

  // ---- 渲染定制（对应源项目插槽）----
  /** 节点内容（等价 #default 插槽，优先级最高） */
  renderNode?: (scope: NodeScope) => ReactNode
  /** 展开按钮内容（等价 #expand-btn 插槽；showNodeNum 的数字优先于它） */
  renderExpandBtn?: (scope: ExpandBtnScope) => ReactNode
  /** data 为空数组时渲染（等价 #empty 插槽） */
  empty?: ReactNode
  /** 只接受函数形式，等价 `renderNode`（传 JSX 节点不会渲染，开发期给一次警告） */
  children?: (scope: NodeScope) => ReactNode

  className?: string
  style?: CSSProperties
}

/** 通过 ref 调用的方法集合（对齐源项目 defineExpose） */
export interface OkrTreeHandle {
  store: TreeStore
  root: TreeNode
  filter: (value: any) => void
  getNodeKey: (node: TreeNode) => unknown
  getNode: (data: TreeNode | TreeKey | TreeNodeData | null | undefined) => TreeNode | null
  getNodeEl: (data: TreeNode | TreeKey | TreeNodeData) => HTMLElement | null
  setCurrentNode: (node: TreeNode) => void
  setCurrentKey: (key: TreeKey | null | undefined) => void
  getCurrentNode: () => TreeNodeData | null
  getCurrentKey: () => TreeKey | null
  remove: (data: TreeNode | TreeKey | TreeNodeData) => void
  append: (data: TreeNodeData, parentNode?: TreeNode | TreeKey | TreeNodeData | null) => void
  insertBefore: (data: TreeNodeData, refNode: TreeNode | TreeKey | TreeNodeData) => void
  insertAfter: (data: TreeNodeData, refNode: TreeNode | TreeKey | TreeNodeData) => void
  updateKeyChildren: (key: TreeKey, data: TreeNodeData[]) => void
  expandAll: () => void
  collapseAll: () => void
  expandNode: (data: TreeNode | TreeKey | TreeNodeData, expandParent?: boolean) => TreeNode | null
  collapseNode: (data: TreeNode | TreeKey | TreeNodeData) => TreeNode | null
  scrollToNode: (
    data: TreeNode | TreeKey | TreeNodeData,
    options?: ScrollToNodeOptions
  ) => Promise<boolean>
  getCheckedNodes: (leafOnly?: boolean) => TreeNode[]
  getCheckedKeys: (leafOnly?: boolean) => TreeKey[]
  getHalfCheckedNodes: () => TreeNode[]
  getHalfCheckedKeys: () => TreeKey[]
  setCheckedKeys: (keys: TreeKey[] | null | undefined, leafOnly?: boolean) => void
  isChecked: (data: TreeNode | TreeKey | TreeNodeData) => boolean
  moveNode: (
    data: TreeNode | TreeKey | TreeNodeData,
    target: TreeNode | TreeKey | TreeNodeData,
    type: DropType
  ) => boolean
  getVisibleNodes: () => TreeNode[]
  getNodePath: (data: TreeNode | TreeKey | TreeNodeData) => TreeNode[]
  /** React 版新增：源数据被原地改动且宿主未换引用时，显式触发增量更新（requirements R2 / D7） */
  refreshData: () => void
}

/** 引用变化但元素逐个相同（宿主每次渲染新建数组字面量的常见写法） */
function sameItems(a?: TreeNodeData[], b?: TreeNodeData[]): boolean {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  return a.every((item, i) => item === b[i])
}

/** 两批路径是否等价：边 id 按序生成，故 d 逐项相同即为同一批路径 */
function sameEdges(a: ConnectorEdge[], b: ConnectorEdge[]): boolean {
  return a.length === b.length && a.every((edge, i) => edge.d === b[i].d)
}

function OkrTreeInner<T extends TreeNodeData = TreeNodeData>(
  props: OkrTreeProps<T>,
  ref: ForwardedRef<OkrTreeHandle>
) {
  const { data, leftData, nodeKey, deepWatch = true } = props
  const group = useOkrTreeGroupContext()
  const viewport = useOkrTreeViewportContext()

  // ---- store 只创建一次：创建期快照的字段（nodeKey / direction / onlyBothTree）
  // 运行时变更不支持，与源项目一致。deepWatch 不在其列——它在下面的渲染期判定里逐次读取，
  // 运行时切换即生效（源项目的 deep-watch 是 watch 创建期取的快照，两边这一点行为不同）。----
  const [store] = useState(() => {
    const created = new TreeStore({
      key: props.nodeKey,
      data: props.data,
      leftData: props.leftData,
      props: props.props,
      defaultExpandedKeys: props.defaultExpandedKeys,
      showCollapsable: props.showCollapsable,
      accordion: props.accordion,
      expandOnClickNode: props.expandOnClickNode,
      showCheckbox: props.showCheckbox,
      checkStrictly: props.checkStrictly,
      defaultCheckedKeys: props.defaultCheckedKeys,
      draggable: props.draggable,
      allowDrag: props.allowDrag,
      allowDrop: props.allowDrop,
      currentNodeKey: props.currentNodeKey,
      defaultExpandAll: props.defaultExpandAll,
      filterNodeMethod: props.filterNodeMethod,
      labelClassName: props.labelClassName,
      currentLableClassName: props.currentLableClassName,
      onlyBothTree: props.onlyBothTree,
      direction: props.direction,
      animate: props.animate,
      animateName: props.animateName,
      animateDuration: props.animateDuration,
      lazy: props.lazy,
      load: props.load,
    })
    // 受控初始值在创建期就应用（源项目同样在 setup 里同步做）：
    // 放 effect 里会导致 SSR 首屏与「受控」语义不符，也会让首帧闪一下非受控状态。
    // 此刻还没有任何订阅者，不违反 R1 第 7 条（render 期间不得触发通知）。
    if (props.nodeKey) {
      if (props.expandedKeys !== undefined) created.setExpandedKeys(props.expandedKeys)
      if (props.currentKey !== undefined) created.setCurrentNodeKey(props.currentKey)
    }
    return created
  })
  const root = store.root

  /** 回调与 render props 每次渲染刷新到 ref：context 引用因此恒定，不会整树重渲染 */
  const propsRef = useRef(props)
  propsRef.current = props

  const configRef = useRef<OkrTreeRenderConfig>(null as unknown as OkrTreeRenderConfig)
  configRef.current = {
    showCollapsable: !!props.showCollapsable,
    labelWidth: props.labelWidth,
    labelHeight: props.labelHeight,
    renderContent: props.renderContent,
    nodeComponent: props.nodeComponent,
    nodeBtnContent: props.nodeBtnContent,
    renderNode: typeof props.children === 'function' ? props.children : props.renderNode,
    renderExpandBtn: props.renderExpandBtn,
    nodeKey: props.nodeKey,
    showNodeNum: !!props.showNodeNum,
    alignRoot: props.alignRoot !== false,
  }

  const orgChartRoot = useRef<HTMLDivElement | null>(null)
  const nodeEls = useRef(new WeakMap<TreeNode, HTMLElement>()).current
  const elNodes = useRef(new WeakMap<HTMLElement, TreeNode>()).current
  const focusedRef = useRef<TreeNode | null>(null)
  const draggingRef = useRef<TreeNode | null>(null)
  const dragOverRef = useRef<{ node: TreeNode | null; type: DropType | null }>({
    node: null,
    type: null,
  })

  useNodeVersion(root)

  const emit = useCallback((event: OkrTreeEventName, ...args: any[]) => {
    const p = propsRef.current
    switch (event) {
      case 'node-click':
        return p.onNodeClick?.(args[0], args[1])
      case 'node-expand':
        return p.onNodeExpand?.(args[0], args[1])
      case 'node-collapse':
        return p.onNodeCollapse?.(args[0], args[1])
      case 'node-contextmenu':
        return p.onNodeContextMenu?.(args[0], args[1], args[2])
      case 'check':
        return p.onCheck?.(args[0], args[1])
      case 'check-change':
        return p.onCheckChange?.(args[0], args[1], args[2])
      case 'node-drag-start':
        return p.onNodeDragStart?.(args[0], args[1])
      case 'node-drag-enter':
        return p.onNodeDragEnter?.(args[0], args[1], args[2])
      case 'node-drag-leave':
        return p.onNodeDragLeave?.(args[0], args[1], args[2])
      case 'node-drag-over':
        return p.onNodeDragOver?.(args[0], args[1], args[2])
      case 'node-drag-end':
        return p.onNodeDragEnd?.(args[0], args[1], args[2], args[3])
      case 'node-drop':
        return p.onNodeDrop?.(args[0], args[1], args[2], args[3])
    }
  }, [])

  // ---- 受控 / 非受控 ----
  const isExpandedControlled = () => propsRef.current.expandedKeys !== undefined
  const isCurrentControlled = () => propsRef.current.currentKey !== undefined

  function currentKeyValue(): TreeKey | null {
    const node = store.getCurrentNode()
    const key = node?.key
    return key === undefined ? null : key
  }

  const syncExpandedKeys = useCallback(() => {
    if (isExpandedControlled() && propsRef.current.nodeKey)
      propsRef.current.onExpandedKeysChange?.(store.getExpandedKeys())
  }, [store])

  const syncCurrentKey = useCallback(() => {
    if (isCurrentControlled() && propsRef.current.nodeKey)
      propsRef.current.onCurrentKeyChange?.(currentKeyValue())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store])

  // 懒加载展开完成后同步受控展开态
  store.onExpandSettled = syncExpandedKeys

  /** 运行时改了会影响渲染的配置时，逐节点通知（源项目靠 shallowReactive 自动做到这件事） */
  const bumpAll = useCallback(() => {
    store.bumpAll()
  }, [store])

  // ---- 虚拟滚动（virtual）：滚动 / resize / viewport 变换 → tick 广播，行组件重算窗口 ----
  const [virtualTick, bumpVirtualTick] = useReducer((x: number) => x + 1, 0)
  const [virtualReveal, setVirtualReveal] = useState<{ node: TreeNode; n: number } | null>(null)
  const revealSeq = useRef(0)
  const virtualViewRect = useRef<DOMRect | null>(null)
  const scrollRootRef = useRef<HTMLElement | null>(null)
  const measureRafRef = useRef(0)
  /** virtual 是否开启（创建期快照：useState 初始化只读一次，运行时变更不支持） */
  const [virtualOn] = useState(() => !!props.virtual)

  /** 从计算样式解析 --okr-* 间距变量（用户可能覆盖默认值，模型必须跟上） */
  const readGapVar = (el: HTMLElement | null, name: string, fallback: number): number => {
    if (!el || typeof getComputedStyle !== 'function') return fallback
    const parsed = Number.parseFloat(getComputedStyle(el).getPropertyValue(name).trim())
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const measureVirtual = useCallback(() => {
    if (!virtualOn) return
    if (measureRafRef.current) return
    measureRafRef.current = requestAnimationFrame(() => {
      measureRafRef.current = 0
      const rootEl = scrollRootRef.current
      if (!rootEl || typeof rootEl.getBoundingClientRect !== 'function') return
      virtualViewRect.current = rootEl.getBoundingClientRect()
      setVirtualReveal(prev => (prev ? null : prev))
      bumpVirtualTick()
    })
  }, [virtualOn])

  /** 让某个节点必然渲染（scrollToNode / 键盘漫游在窗口外定位目标前调用）。
   * flushSync 同步提交：调用返回后揭示窗口已在 DOM 上，调用方的 el 查找不依赖提交时序 */
  const revealVirtualNode = useCallback(
    (node: TreeNode) => {
      if (!virtualOn) return
      const entry = { node, n: ++revealSeq.current }
      flushSync(() => {
        setVirtualReveal(entry)
      })
    },
    [virtualOn]
  )

  useEffect(() => {
    if (!virtualOn) return
    // 间距变量从最终计算样式读取（挂在主题/祖先上的覆盖也能拿到）
    gapsRef.current.gapSibling = readGapVar(orgChartRoot.current, '--okr-gap-sibling', 5)
    gapsRef.current.gapNodeY = readGapVar(orgChartRoot.current, '--okr-gap-node-y', 10)
    // 找最近的滚动祖先（overflow: auto/scroll/overlay）
    let cur = orgChartRoot.current?.parentElement ?? null
    while (cur && cur !== document.body) {
      const s = getComputedStyle(cur)
      if (/(auto|scroll|overlay)/.test(s.overflowX + s.overflowY)) {
        scrollRootRef.current = cur
        break
      }
      cur = cur.parentElement
    }
    if (!scrollRootRef.current) scrollRootRef.current = document.documentElement
    // scroll 不冒泡但捕获阶段可达：document 上的捕获监听能收到任意后代的滚动
    document.addEventListener('scroll', measureVirtual, { capture: true, passive: true })
    window.addEventListener('resize', measureVirtual)
    // viewport 的平移/缩放直接写 canvas 的 transform，不走滚动：盯住 style 变更
    const canvas = orgChartRoot.current?.closest('.okr-viewport-canvas')
    let observer: MutationObserver | null = null
    if (canvas && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(measureVirtual)
      observer.observe(canvas, { attributes: true, attributeFilter: ['style'] })
    }
    const initial = requestAnimationFrame(() => measureVirtual())
    return () => {
      document.removeEventListener('scroll', measureVirtual, { capture: true })
      window.removeEventListener('resize', measureVirtual)
      observer?.disconnect()
      cancelAnimationFrame(initial)
      if (measureRafRef.current) cancelAnimationFrame(measureRafRef.current)
      measureRafRef.current = 0
    }
  }, [virtualOn, measureVirtual])

  const gapsRef = useRef({ gapSibling: 5, gapNodeY: 10 })
  /**
   * virtual 上下文：tick / reveal 是 React state，进入 deps 后 bump 即换 context 身份，
   * 整树消费者重渲染并重算窗口（渲染期 getTick / getReveal 读到的都是本次 state）。
   */
  const virtualCtx = useMemo<OkrTreeVirtualContext | undefined>(
    () =>
      virtualOn
        ? {
            axis: store.direction === 'horizontal' ? 'y' : 'x',
            getTick: () => virtualTick,
            getViewRect: () => virtualViewRect.current,
            getReveal: () => virtualReveal,
            labelW:
              typeof propsRef.current.labelWidth === 'number' ? propsRef.current.labelWidth : 0,
            labelH:
              typeof propsRef.current.labelHeight === 'number' ? propsRef.current.labelHeight : 0,
            gapSibling: gapsRef.current.gapSibling,
            gapNodeY: gapsRef.current.gapNodeY,
          }
        : undefined,
    [store, virtualOn, virtualTick, virtualReveal]
  )

  // ---- 节点根元素登记 ----
  const registerNodeEl = useCallback(
    (node: TreeNode, el: HTMLElement) => {
      nodeEls.set(node, el)
      elNodes.set(el, node)
    },
    [nodeEls, elNodes]
  )

  const unregisterNodeEl = useCallback(
    (node: TreeNode) => {
      const el = nodeEls.get(node)
      if (el) elNodes.delete(el)
      nodeEls.delete(node)
      if (focusedRef.current === node) focusedRef.current = null
    },
    [nodeEls, elNodes]
  )

  // ---- 键盘可访问性：漫游 tabindex 与焦点移动 ----
  const setFocusedNode = useCallback(
    (node: TreeNode | null) => {
      const prev = focusedRef.current
      if (prev === node) return
      focusedRef.current = node
      // 只 bump tabIndex 变了的那几个：上一个持有者、新持有者，
      // 以及「尚无焦点节点时按兜底规则持有 0」的第一个根节点——
      // 漏掉它会让两个 treeitem 同时可 Tab 进入（漫游 tabindex 要求全局唯一）。
      for (const n of new Set([prev, node, store.root.childNodes[0]])) n?.notify()
    },
    [store]
  )

  /** 当前可见的 treeitem（文档顺序），排除处于收起容器中的节点 */
  const visibleTreeItems = useCallback((): HTMLElement[] => {
    const container = orgChartRoot.current
    if (!container) return []
    return Array.from(container.querySelectorAll<HTMLElement>(TREEITEM_SELECTOR)).filter(
      el => !el.closest(HIDDEN_ANCESTOR_SELECTOR)
    )
  }, [])

  const focusElement = useCallback(
    (el: HTMLElement) => {
      const node = elNodes.get(el)
      if (node) setFocusedNode(node)
      el.focus()
    },
    [elNodes, setFocusedNode]
  )

  const focusNode = useCallback(
    (node: TreeNode) => {
      const el = nodeEls.get(node)
      if (el) {
        focusElement(el)
        return
      }
      // virtual：目标可能还没渲染，先揭示（强制窗口收编）再聚焦
      if (virtualOn) {
        revealVirtualNode(node)
        setTimeout(() => {
          const late = nodeEls.get(node)
          if (late) focusElement(late)
        }, 0)
      }
    },
    [nodeEls, focusElement, virtualOn, revealVirtualNode]
  )

  /** virtual 模式的模型序可见列表（前序遍历，与 DOM 顺序一致） */
  const modelOrderedVisibleItems = useCallback((): TreeNode[] => {
    const list: TreeNode[] = []
    const walk = (children: TreeNode[], isLeftBranch: boolean) => {
      for (const child of children) {
        if (!child.visible) continue
        list.push(child)
        const leftKids =
          store.onlyBothTree && store.direction === 'horizontal'
            ? isLeftBranch
              ? child.childNodes
              : child.leftChildNodes
            : []
        if (leftKids.length > 0 && child.leftExpanded) walk(leftKids, true)
        if (!isLeftBranch && child.childNodes.length > 0 && child.expanded) {
          walk(child.childNodes, false)
        }
      }
    }
    walk(root.childNodes, false)
    return list
  }, [store, root])

  const moveFocus = useCallback(
    (from: HTMLElement | null, step: 1 | -1 | 'first' | 'last') => {
      // virtual：DOM 里只有窗口内条目，按模型序漫游才能跨出窗口边界
      if (virtualOn) {
        const items = modelOrderedVisibleItems()
        if (!items.length) return
        const focusTarget = (target: TreeNode | undefined) => {
          if (!target) return
          const el = nodeEls.get(target)
          if (el) {
            focusElement(el)
            return
          }
          revealVirtualNode(target)
          setTimeout(() => {
            const late = nodeEls.get(target)
            if (late) focusElement(late)
          }, 0)
        }
        if (step === 'first') {
          focusTarget(items[0])
        } else if (step === 'last') {
          focusTarget(items[items.length - 1])
        } else {
          const current = from ? elNodes.get(from) : null
          const index = current ? items.indexOf(current) : -1
          const next = index + step
          if (!current || next < 0 || next >= items.length) return
          focusTarget(items[next])
        }
        return
      }
      const items = visibleTreeItems()
      if (!items.length) return
      let target: HTMLElement | undefined
      if (step === 'first') target = items[0]
      else if (step === 'last') target = items[items.length - 1]
      else {
        const index = from ? items.indexOf(from) : -1
        const next = index + step
        if (next < 0 || next >= items.length) return
        target = items[next]
      }
      if (target) focusElement(target)
    },
    [virtualOn, modelOrderedVisibleItems, nodeEls, elNodes, revealVirtualNode, focusElement, visibleTreeItems]
  )

  const focusParent = useCallback(
    (node: TreeNode, isLeftChildNode: boolean) => {
      let parent = node.parent
      // 左树顶层节点的 parent 是未渲染的临时根，视觉上的父节点是 OKR 根节点
      if (isLeftChildNode && (!parent || parent.level <= 1)) parent = root.childNodes[0] ?? null
      if (!parent || parent.level < 1) return
      focusNode(parent)
    },
    [root, focusNode]
  )

  // ---- 拖拽指示状态：变更时 bump 新旧两个节点 ----
  const setDraggingNode = useCallback((node: TreeNode | null) => {
    draggingRef.current = node
  }, [])

  const setDragOver = useCallback((node: TreeNode | null, type: DropType | null) => {
    const prev = dragOverRef.current
    if (prev.node === node && prev.type === type) return
    dragOverRef.current = { node, type }
    if (prev.node) prev.node.notify()
    if (node) node.notify()
  }, [])

  /** virtual：展开/过滤等模型变化会改宽度模型，bump 度量时钟让行组件重算窗口 */
  const onExpandChangeAndMeasure = useCallback(() => {
    syncExpandedKeys()
    if (virtualOn) measureVirtual()
  }, [syncExpandedKeys, virtualOn, measureVirtual])

  const contextValue = useMemo<OkrTreeContextValue>(
    () => ({
      store,
      root,
      configRef,
      emit,
      hasContextmenuListener: () => !!propsRef.current.onNodeContextMenu,
      onExpandChange: onExpandChangeAndMeasure,
      onCurrentChange: syncCurrentKey,
      registerNodeEl,
      unregisterNodeEl,
      getFocusedNode: () => focusedRef.current,
      setFocusedNode,
      focusElement,
      focusNode,
      moveFocus,
      focusParent,
      getDraggingNode: () => draggingRef.current,
      setDraggingNode,
      getDragOver: () => dragOverRef.current,
      setDragOver,
      virtual: virtualCtx,
    }),
    [
      store,
      root,
      emit,
      onExpandChangeAndMeasure,
      syncCurrentKey,
      registerNodeEl,
      unregisterNodeEl,
      setFocusedNode,
      focusElement,
      focusNode,
      moveFocus,
      focusParent,
      setDraggingNode,
      setDragOver,
      // virtual 的 tick / reveal bump 经 virtualCtx 身份变化传导到整树消费者
      virtualCtx,
    ]
  )

  // ---- SVG 连接线：按可见父子边绘制覆盖层路径 ----
  const [edges, setEdges] = useState<ConnectorEdge[]>([])
  const redraw = useCallback(() => {
    if (propsRef.current.connector !== 'svg') return
    const baseEl = orgChartRoot.current
    if (!baseEl) {
      setEdges(prev => (prev.length ? [] : prev))
      return
    }
    const base = baseEl.getBoundingClientRect()
    const next = computeEdges(
      store,
      collectCardRects(store, nodeEls, base),
      propsRef.current.connectorShape ?? 'curve'
    )
    /**
     * 稳态短路：路径逐字未变时保持原数组引用。
     * 渲染后的 effect 每次提交都会排一帧重绘，若无条件换引用就会「重绘 → 重渲染 → 再排帧」
     * 永不停止（源项目 onUpdated 直接写 DOM，没有这条回路）。
     */
    setEdges(prev => (sameEdges(prev, next) ? prev : next))
  }, [store, nodeEls])

  const rafRef = useRef(0)
  const untilRef = useRef(0)
  const requestRedraw = useCallback(
    (withTransition = false) => {
      if (propsRef.current.connector !== 'svg') return
      if (withTransition && store.animate && !prefersReducedMotion()) {
        untilRef.current = performance.now() + store.animateDuration + 32
      }
      if (rafRef.current) return
      const step = () => {
        rafRef.current = 0
        redraw()
        if (performance.now() < untilRef.current) rafRef.current = requestAnimationFrame(step)
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [redraw, store]
  )

  useEffect(() => {
    if (props.connector === 'svg') requestRedraw(true)
  })

  /**
   * 订阅模型突变。
   *
   * ResizeObserver 只在树根盒尺寸真的变化时才回调，而展开一个深层节点未必改动树根
   * 尺寸（收起的子树本来就占位）；源项目靠 onUpdated + ResizeObserver + 过渡期逐帧重绘
   * 三重触发，这里对等补上「任意节点状态变化」这一路——否则连接线会停在旧路径上。
   */
  useEffect(() => {
    if (props.connector !== 'svg') return
    return store.subscribeMutation(() => requestRedraw())
  }, [props.connector, store, requestRedraw])

  useEffect(() => {
    if (props.connector !== 'svg') return
    const el = orgChartRoot.current
    if (typeof ResizeObserver === 'undefined' || !el) return
    const observer = new ResizeObserver(() => requestRedraw())
    observer.observe(el)
    return () => observer.disconnect()
  }, [props.connector, requestRedraw])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ---- 开发期配置校验（放 effect：StrictMode 下渲染会被双调用）----
  useEffect(() => {
    const p = propsRef.current
    if (p.onlyBothTree && p.direction !== 'horizontal') {
      warn(`onlyBothTree 仅在 direction="horizontal" 时有效，当前 direction 为 "${p.direction}"。`)
    }
    if (p.leftData && !p.onlyBothTree)
      warn('传入了 leftData 但未开启 onlyBothTree，leftData 会被忽略。')
    if (!p.nodeKey) {
      if (p.defaultExpandedKeys) warn('default-expanded-keys 需要同时设置 node-key，否则不会生效。')
      if (p.expandedKeys !== undefined)
        warn('expanded-keys（受控）需要同时设置 node-key，否则不会生效。')
      if (p.currentKey !== undefined || p.currentNodeKey !== undefined) {
        warn('current-key / currentNodeKey 需要同时设置 node-key，否则不会生效。')
      }
      if (p.defaultCheckedKeys) warn('default-checked-keys 需要同时设置 node-key，否则不会生效。')
    }
    if (p.lazy && !p.load) warn('lazy 需要同时提供 load 函数，否则未加载节点无法展开。')
    if (p.virtual && typeof p.labelWidth !== 'number') {
      warn(
        '开启 virtual 需要数字型 labelWidth（占位块尺寸来自宽度模型，auto 宽度不可知）；当前行会退回全量渲染。'
      )
    }
    if (p.virtual && p.direction === 'horizontal' && typeof p.labelHeight !== 'number') {
      warn('horizontal 布局开启 virtual 还需要数字型 labelHeight，否则达标行退回全量渲染。')
    }
    if (!p.lazy && p.load) warn('传入 load 但未开启 lazy，load 不会生效。')
    if (p.connector !== undefined && p.connector !== 'css' && p.connector !== 'svg') {
      warn(`connector 仅支持 "css" / "svg"，收到 "${p.connector}"，将按 "css" 渲染。`)
    } else if (
      p.connector === 'svg' &&
      !['curve', 'orthogonal', 'straight'].includes(p.connectorShape ?? 'curve')
    ) {
      warn(
        `connectorShape 仅支持 curve / orthogonal / straight，收到 "${p.connectorShape}"，将回退为 curve。`
      )
    }
    const theme = p.theme ?? 'default'
    if (!(BUILT_IN_THEMES as readonly string[]).includes(theme)) {
      warn(
        `theme="${theme}" 不是内置主题（${BUILT_IN_THEMES.join(' / ')}），` +
          `需自行编写 .okr-theme-${theme} { --okr-*: ... } 变量，否则主题不会有任何视觉变化。`
      )
    }
  }, [
    props.onlyBothTree,
    props.direction,
    props.leftData,
    props.nodeKey,
    props.lazy,
    props.load,
    props.connector,
    props.connectorShape,
    props.theme,
  ])

  // ---- 配置同步：运行时变更的 prop 写回 store ----
  const syncStoreField = useCallback(
    <K extends keyof TreeStore>(key: K, value: TreeStore[K], affectsRender: boolean) => {
      if ((store[key] as unknown) === value) return
      store[key] = value
      if (affectsRender) bumpAll()
    },
    [store, bumpAll]
  )

  useEffect(
    () => syncStoreField('filterNodeMethod', props.filterNodeMethod ?? null, false),
    [props.filterNodeMethod, syncStoreField]
  )
  useEffect(
    () => syncStoreField('labelClassName', props.labelClassName ?? null, true),
    [props.labelClassName, syncStoreField]
  )
  useEffect(
    () => syncStoreField('currentLableClassName', props.currentLableClassName ?? null, true),
    [props.currentLableClassName, syncStoreField]
  )
  useEffect(() => syncStoreField('animate', !!props.animate, true), [props.animate, syncStoreField])
  useEffect(
    () => syncStoreField('animateName', props.animateName ?? 'okr-zoom-in-center', true),
    [props.animateName, syncStoreField]
  )
  useEffect(
    () => syncStoreField('animateDuration', props.animateDuration ?? 200, true),
    [props.animateDuration, syncStoreField]
  )
  useEffect(
    () => syncStoreField('showCollapsable', !!props.showCollapsable, true),
    [props.showCollapsable, syncStoreField]
  )
  useEffect(
    () => syncStoreField('accordion', !!props.accordion, false),
    [props.accordion, syncStoreField]
  )
  useEffect(
    () => syncStoreField('expandOnClickNode', !!props.expandOnClickNode, false),
    [props.expandOnClickNode, syncStoreField]
  )
  useEffect(
    () => syncStoreField('showCheckbox', !!props.showCheckbox, true),
    [props.showCheckbox, syncStoreField]
  )
  useEffect(
    () => syncStoreField('checkStrictly', !!props.checkStrictly, false),
    [props.checkStrictly, syncStoreField]
  )
  useEffect(
    () => syncStoreField('draggable', !!props.draggable, false),
    [props.draggable, syncStoreField]
  )
  useEffect(
    () => syncStoreField('allowDrag', props.allowDrag ?? null, false),
    [props.allowDrag, syncStoreField]
  )
  useEffect(
    () => syncStoreField('allowDrop', props.allowDrop ?? null, false),
    [props.allowDrop, syncStoreField]
  )
  useEffect(
    () => syncStoreField('defaultExpandAll', !!props.defaultExpandAll, false),
    [props.defaultExpandAll, syncStoreField]
  )
  /**
   * 渲染定制与卡片尺寸这一组只存在 configRef 里（context 的引用必须永久稳定，R3），
   * 而节点组件是 memo + 只订阅自己那个节点的版本（R1）——所以换 renderContent、
   * 换 labelWidth 之类**没有任何人会重绘**。源项目里它们是普通 props，换一个就整树重渲染。
   * 这里补一次等价的全树通知。
   *
   * 挂载时那次跳过：此刻 configRef 已经是最新值，bump 只会白重渲染一遍。
   */
  const firstConfigSync = useRef(true)
  useEffect(() => {
    if (firstConfigSync.current) {
      firstConfigSync.current = false
      return
    }
    bumpAll()
  }, [
    props.renderContent,
    props.nodeComponent,
    props.nodeBtnContent,
    props.renderNode,
    props.children,
    props.renderExpandBtn,
    props.showNodeNum,
    props.labelWidth,
    props.labelHeight,
    props.alignRoot,
    bumpAll,
  ])
  useEffect(() => {
    if (props.defaultCheckedKeys === store.defaultCheckedKeys) return
    store.setDefaultCheckedKeys(props.defaultCheckedKeys)
  }, [props.defaultCheckedKeys, store])

  // children 只是 renderNode 的别名（函数形式）；传 JSX 节点没有可落点（树的容器结构由组件自己拥有），
  // 类型上已经收严，这里再给一次运行期警告兜住 JS 消费者。
  useEffect(() => {
    if (props.children !== undefined && typeof props.children !== 'function')
      warn(
        'children 只接受函数形式（等价 renderNode）；JSX 节点不会被渲染，请改用 renderNode 或 empty。'
      )
  }, [props.children])

  // 字段映射：label / disabled 为动态读取本就即时生效；children 字段变更需按新映射增量重建
  useEffect(() => {
    const next: TreeOptionProps = { ...DEFAULT_PROPS, ...(props.props ?? {}) }
    // 与 store 上的现值逐项比对再决定是否重建：
    // ① 挂载期这次赋的是构造时（tree-store.ts:130）算过的同一份内容，原先会白跑一次
    //    setData(同引用) + bumpAll —— 整棵 OKR 左树重建、全部节点多渲染一次；
    // ② 使用方行内写 props={{ label: 'title' }} 时依赖每帧都是新引用，内容比对也顺手挡掉。
    const keys = Object.keys(next) as (keyof TreeOptionProps)[]
    const stored = store.props
    const same =
      keys.length === Object.keys(stored).length && keys.every(key => stored[key] === next[key])
    if (same) return
    store.props = next
    store.setData(props.data)
    bumpAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.props])

  // 创建期快照 prop：运行时变更不受支持，输出开发期警告（需换 key 重挂载实例）
  // 比较的是「归一化后的默认值」——未传的 prop 是 undefined，不等于 store 里的默认值
  useEffect(() => {
    if (props.nodeKey !== store.key)
      warn('nodeKey 运行时变更不会生效，请为组件绑定 key 以重挂载实例。')
    if ((props.direction ?? 'vertical') !== store.direction)
      warn('direction 运行时变更不会生效，请为组件绑定 key 以重挂载实例。')
    if (!!props.onlyBothTree !== store.onlyBothTree)
      warn('onlyBothTree 运行时变更不会生效，请为组件绑定 key 以重挂载实例。')
  }, [props.nodeKey, props.direction, props.onlyBothTree, store])

  // ---- 受控值应用 ----
  const applyControlled = useCallback(() => {
    if (!propsRef.current.nodeKey) return
    const p = propsRef.current
    if (p.expandedKeys !== undefined) store.setExpandedKeys(p.expandedKeys)
    if (p.currentKey !== undefined) store.setCurrentNodeKey(p.currentKey)
  }, [store])

  // ---- 数据变更（requirements R2）----
  // 每次本组件渲染后判定一次：引用变了、或（deepWatch 时）结构脏了，才交给 store 重建。
  // 不能无脑每帧 setData——它会连带 setLeftData 整棵重建左树，把左子树的过滤 / 展开结果冲掉。
  const dataOrLeftChanged = (): boolean => {
    const dataRefChanged = store.data !== data
    const leftRefChanged = !!props.onlyBothTree && store.leftData !== leftData
    // 宿主每次渲染都新建数组字面量时，元素引用逐个相同 ⇒ 视为未变，不重建
    // （否则展开态会被反复冲掉——这种写法在 React 里比 Vue 常见得多）
    if (dataRefChanged && !sameItems(store.data, data)) return true
    if (leftRefChanged && !sameItems(store.leftData ?? undefined, leftData)) return true
    if (!dataRefChanged && !leftRefChanged) return deepWatch && store.isStructureDirty()
    return false
  }

  useEffect(() => {
    if (!dataOrLeftChanged()) return
    if (props.onlyBothTree) store.leftData = leftData ?? null
    store.setData(data)
    applyControlled()
    requestRedraw(true)
  })

  useEffect(() => {
    store.setDefaultExpandedKeys(props.defaultExpandedKeys)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.defaultExpandedKeys])

  useEffect(() => {
    if (props.nodeKey && props.currentNodeKey !== undefined)
      store.setCurrentNodeKey(props.currentNodeKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.currentNodeKey])

  useEffect(() => {
    if (props.nodeKey && props.expandedKeys !== undefined) {
      store.setExpandedKeys(props.expandedKeys)
      bumpAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.expandedKeys])

  useEffect(() => {
    if (props.nodeKey && props.currentKey !== undefined) store.setCurrentNodeKey(props.currentKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.currentKey])

  // ---- 组对齐 / 画布登记 ----
  useEffect(() => {
    if (!group) return
    group.requestMeasure()
  })

  useEffect(() => {
    if (!viewport) return
    const api: ViewportTreeApi = {
      getNodeEl: d => getNodeEl(d),
      expandNode: (d, expandParent) => expandNode(d, expandParent),
    }
    viewport.registerTree(api)
    return () => viewport.unregisterTree(api)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport])

  // ---- 对外方法 ----
  function filter(value: any) {
    if (!propsRef.current.filterNodeMethod)
      throw new Error('[Tree] filterNodeMethod is required when filter')
    store.filter(value)
    if (propsRef.current.onlyBothTree) store.filter(value, 'leftChildNodes')
    syncExpandedKeys()
    bumpAll()
    // virtual：可见性变化改宽度模型，bump 度量时钟让行组件重算窗口
    if (virtualOn) measureVirtual()
  }

  function getNodeEl(d: TreeNode | TreeKey | TreeNodeData): HTMLElement | null {
    const node = store.getNode(d)
    return node ? (nodeEls.get(node) ?? null) : null
  }

  function setCurrentNode(node: TreeNode) {
    if (!propsRef.current.nodeKey) throw new Error('[Tree] nodeKey is required in setCurrentNode')
    store.setUserCurrentNode(node)
    syncCurrentKey()
  }

  function setCurrentKey(key: TreeKey | null | undefined) {
    if (!propsRef.current.nodeKey) throw new Error('[Tree] nodeKey is required in setCurrentKey')
    store.setCurrentNodeKey(key)
    syncCurrentKey()
  }

  function remove(d: TreeNode | TreeKey | TreeNodeData) {
    const before = store.getCurrentNode()
    store.remove(d)
    if (before && store.getCurrentNode() !== before) syncCurrentKey()
  }

  function getCurrentNode(): TreeNodeData | null {
    const currentNode = store.getCurrentNode()
    return currentNode ? currentNode.data : null
  }

  function getCurrentKey(): TreeKey | null {
    const key = propsRef.current.nodeKey
    if (!key) throw new Error('[Tree] nodeKey is required in getCurrentKey')
    const currentNode = getCurrentNode()
    return currentNode ? currentNode[key] : null
  }

  function updateKeyChildren(key: TreeKey, children: TreeNodeData[]) {
    if (!propsRef.current.nodeKey) throw new Error('[Tree] nodeKey is required in updateKeyChild')
    store.updateChildren(key, children)
  }

  function expandNode(d: TreeNode | TreeKey | TreeNodeData, expandParent = true) {
    const node = store.expandNode(d, expandParent)
    if (node) syncExpandedKeys()
    return node
  }

  function collapseNode(d: TreeNode | TreeKey | TreeNodeData) {
    const node = store.collapseNode(d)
    if (node) syncExpandedKeys()
    return node
  }

  async function scrollToNode(
    d: TreeNode | TreeKey | TreeNodeData,
    options: ScrollToNodeOptions = {}
  ): Promise<boolean> {
    const node = store.getNode(d)
    if (!node) return false
    const { expand = true, ...scrollOptions } = options
    if (expand) {
      const pending: TreeNode[] = []
      let parent = node.parent
      while (parent && parent.level > 0) {
        pending.push(parent)
        parent = parent.parent
      }
      pending.forEach(ancestor => ancestor.expand(false))
      if (store.lazy && store.load && !node.loaded && !node.isLeaf && node.level > 0) {
        node.loadData()
      }
      if (node.isLeftChild && store.onlyBothTree) {
        const okrRoot = root.childNodes[0]
        if (okrRoot) okrRoot.leftExpanded = true
      }
      syncExpandedKeys()
      bumpAll()
      pending.push(node)
      await Promise.all(pending.map(pendingNode => pendingNode.whenLoaded()))
    }
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    let el = nodeEls.get(node)
    // virtual：目标在窗口外时先揭示（强制渲染其邻近区间）。
    // React 的提交时机不与 rAF 对齐，用有界 macrotask 重试等提交完成（微任务先于宏任务）
    if (!el && virtualOn) {
      revealVirtualNode(node)
      for (let i = 0; i < 10 && !nodeEls.get(node); i++) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      el = nodeEls.get(node)
    }
    if (!el || typeof el.scrollIntoView !== 'function') return false
    el.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'center',
      inline: 'center',
      ...scrollOptions,
    })
    return true
  }

  useImperativeHandle(ref, () => ({
    store,
    root,
    filter,
    getNodeKey: (node: TreeNode) => getNodeKey(propsRef.current.nodeKey, node.data),
    getNode: d => store.getNode(d),
    getNodeEl,
    setCurrentNode,
    setCurrentKey,
    getCurrentNode,
    getCurrentKey,
    remove,
    append: (d, parentNode) => store.append(d, parentNode),
    insertBefore: (d, refNode) => store.insertBefore(d, refNode),
    insertAfter: (d, refNode) => store.insertAfter(d, refNode),
    updateKeyChildren,
    expandAll: () => {
      store.expandAll()
      syncExpandedKeys()
      bumpAll()
    },
    collapseAll: () => {
      store.collapseAll()
      syncExpandedKeys()
      bumpAll()
    },
    expandNode,
    collapseNode,
    scrollToNode,
    getCheckedNodes: leafOnly => store.getCheckedNodes(leafOnly),
    getCheckedKeys: leafOnly => store.getCheckedKeys(leafOnly),
    getHalfCheckedNodes: () => store.getHalfCheckedNodes(),
    getHalfCheckedKeys: () => store.getHalfCheckedKeys(),
    setCheckedKeys: (keys, leafOnly) => {
      store.setCheckedKeys(keys, leafOnly)
      bumpAll()
    },
    isChecked: d => store.isChecked(d),
    moveNode: (d, target, type) => store.moveNode(d, target, type),
    getVisibleNodes: () => store.getVisibleNodes(),
    getNodePath: d => store.getNodePath(d),
    refreshData: () => {
      store.setData(store.data)
      applyControlled()
      bumpAll()
    },
  }))

  const isEmpty = root.childNodes.length === 0
  const theme = props.theme ?? 'default'
  const containerClass = cx(
    CLS.container,
    themeClass(theme),
    props.connector === 'svg' ? STATE.connectorSvg : '',
    props.unstyled ? STATE.unstyled : '',
    props.className
  )
  const treeClass = cx(
    CLS.children,
    cxState({
      [STATE.vertical]: props.direction !== 'horizontal',
      [STATE.horizontal]: props.direction === 'horizontal',
      [STATE.showCollapsable]: !!props.showCollapsable,
      [STATE.oneBranch]: (props.data?.length ?? 0) === 1,
    })
  )

  // ---- 根行的虚拟窗口（virtual 关闭时 state 为 null，维持全量渲染） ----
  const topVisible = root.childNodes.filter(child => child.visible)
  const topWin = computeWindowState({
    ctx: virtualCtx,
    items: topVisible,
    containerEl: orgChartRoot.current,
    sizeOf: (n, c) => (c.axis === 'x' ? vNodeWidth(n, c) : hNodeHeight(n, c)),
  })
  const topEntries = topWin
    ? setPositions(topVisible).slice(topWin.start, topWin.end)
    : setPositions(root.childNodes)
  const topSpacer = (size: number) =>
    virtualCtx?.axis === 'y' ? { height: `${size}px` } : { width: `${size}px` }

  return (
    <OkrTreeProvider value={contextValue}>
      <div className={containerClass} style={props.style}>
        {props.connector === 'svg' ? (
          <svg className={CLS.connectorSvg} aria-hidden="true">
            {edges.map(edge => (
              <path key={edge.id} d={edge.d} />
            ))}
          </svg>
        ) : null}
        <div ref={orgChartRoot} className={treeClass} role="tree">
          {isEmpty && props.empty ? <div className={CLS.empty}>{props.empty}</div> : null}
          {topWin && topWin.leadSize > 0 ? (
            <div
              className={virtualCtx?.axis === 'y' ? 'okr-h-spacer' : 'okr-v-spacer'}
              style={topSpacer(topWin.leadSize)}
              aria-hidden="true"
            />
          ) : null}
          {topEntries.map(({ node: child, size, pos }) => (
            <OkrTreeNode
              key={reactKey(nodeKey, child)}
              node={child}
              ariaSetSize={size}
              ariaPosInSet={pos}
            />
          ))}
          {topWin && topWin.trailSize > 0 ? (
            <div
              className={virtualCtx?.axis === 'y' ? 'okr-h-spacer' : 'okr-v-spacer'}
              style={topSpacer(topWin.trailSize)}
              aria-hidden="true"
            />
          ) : null}
        </div>
      </div>
    </OkrTreeProvider>
  )
}

/**
 * 泛型组件（requirements D5：取代源项目的 createTypedOkrTree<T>()）。
 * data / leftData 为 T[]，渲染作用域里的 data 带 T 类型。
 */
export const OkrTree = forwardRef(OkrTreeInner) as <T extends TreeNodeData = TreeNodeData>(
  props: OkrTreeProps<T> & { ref?: Ref<OkrTreeHandle> }
) => ReactElement | null
