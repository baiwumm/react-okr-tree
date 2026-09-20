import {
  memo,
  useEffect,
  useRef,
  type CSSProperties,
  type DragEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { CLS, STATE, animClass } from './dom-contract'
import { cx, cxState, reactKey } from './cx'
import { useOkrTreeContext } from './context'
import { useNodeVersion } from './hooks/use-node-version'
import { usePrefersReducedMotion } from './hooks/use-reduced-motion'
import { useDelayedCollapse } from './hooks/use-delayed-collapse'
import { renderExpandBtnContent, renderNodeContent } from './node-content'
import type { TreeNode } from './model/node'
import type { DropType } from './types'

export interface OkrTreeNodeProps {
  node: TreeNode
  /** 左子树的节点：样式与展开方向都是镜像的 */
  isLeftChildNode?: boolean
  /** 可见兄弟总数 / 自身序号。由父节点算好传下来，见 use-node-version 的说明 */
  ariaSetSize?: number
  ariaPosInSet?: number
}

function OkrTreeNodeComponent({
  node,
  isLeftChildNode = false,
  ariaSetSize,
  ariaPosInSet,
}: OkrTreeNodeProps): ReactNode {
  const ctx = useOkrTreeContext()
  const { store } = ctx
  // 只订阅自己：点击本节点的 +/- 不会牵动兄弟与祖先
  useNodeVersion(node)
  // 渲染配置放在 ref 里（context 引用因此恒定，不会整树重渲染）；
  // 改动这些配置的 prop 时由 OkrTree 显式 bump 全部节点，所以这里读到的始终是最新值
  const cfg = ctx.configRef.current
  const prefersReducedMotion = usePrefersReducedMotion()
  const animateOn = !!store.animate && !prefersReducedMotion

  const rootEl = useRef<HTMLDivElement | null>(null)
  const registered = useRef<TreeNode | null>(null)

  useEffect(() => {
    const el = rootEl.current
    if (el) {
      if (registered.current && registered.current !== node)
        ctx.unregisterNodeEl(registered.current)
      registered.current = node
      ctx.registerNodeEl(node, el)
    }
    return () => {
      if (registered.current === node) {
        ctx.unregisterNodeEl(node)
        registered.current = null
      }
    }
  }, [ctx, node])

  const leftChildNodes: TreeNode[] = store.onlyBothTree
    ? isLeftChildNode
      ? node.childNodes
      : node.leftChildNodes
    : []

  /** 懒加载待展开：lazy 且未加载、未标记叶子（点开后会先加载数据） */
  const lazyPending = !!store.lazy && !node.loaded && !node.isLeaf && node.level > 0

  const isLeaf = lazyPending
    ? false
    : node.level === 1
      ? leftChildNodes.length === 0 && node.childNodes.length === 0
      : node.isLeaf

  const hasRightChildren = node.childNodes.length > 0 || lazyPending
  const hasLeftChildren = leftChildNodes.length > 0 || (isLeftChildNode && lazyPending)

  // 系统要求减少动效时按「animate 关闭」处理：CSS 媒体查询只掐掉过渡，
  // 若 JS 仍保留撑高度的延迟，收起后会出现一段空白
  const keepLeftHeight = useDelayedCollapse(node.leftExpanded, animateOn, store.animateDuration)
  const keepRightHeight = useDelayedCollapse(node.expanded, animateOn, store.animateDuration)

  /** 折叠态容器：保留在 DOM 中但隐藏且高度为 0；animate 开启时附带过渡时长变量 */
  const animVar: CSSProperties | Record<string, string> = animateOn
    ? { '--okr-anim-duration': `${store.animateDuration}ms` }
    : {}
  // height: 0 后追加 overflow: hidden，避免不可见子树继续撑出滚动区域（原版有幻影滚动条）
  const hiddenStyle = (keepHeight: boolean): CSSProperties =>
    (keepHeight
      ? { visibility: 'hidden' }
      : { visibility: 'hidden', height: '0', overflow: 'hidden' }) as CSSProperties
  const leftChildrenStyle = {
    ...animVar,
    ...(node.leftExpanded ? {} : hiddenStyle(keepLeftHeight)),
  } as CSSProperties
  const childrenStyle = {
    ...animVar,
    ...(node.expanded ? {} : hiddenStyle(keepRightHeight)),
  } as CSSProperties
  const animClassList = animateOn ? [STATE.isAnimated, animClass(store.animateName)] : []

  const showNodeBtn = isLeftChildNode
    ? store.direction === 'horizontal' &&
      cfg.showCollapsable &&
      (leftChildNodes.length > 0 || lazyPending)
    : cfg.showCollapsable && (node.childNodes.length > 0 || lazyPending)

  const showNodeLeftBtn =
    store.direction === 'horizontal' &&
    cfg.showCollapsable &&
    (leftChildNodes.length > 0 || (isLeftChildNode && lazyPending))

  const showLeftChildNode =
    store.onlyBothTree && store.direction === 'horizontal' && leftChildNodes.length > 0

  /** show-node-num 与 aria 都按「未被 filter 隐藏」的子节点计数，保证数字与视觉一致 */
  const visibleCount = (nodes: TreeNode[]) =>
    nodes.reduce((count, child) => (child.visible ? count + 1 : count), 0)

  const rightBtnCount = visibleCount(node.childNodes)
  const leftBtnCount =
    node.level === 1 && leftChildNodes.length > 0
      ? visibleCount(leftChildNodes)
      : visibleCount(node.childNodes)

  /** show-node-num：未加载（未加载完成 / 加载中）时不显示子节点数 */
  const showRightBtnText = !node.expanded && (node.loaded || !store.lazy)
  const showLeftBtnText = !node.leftExpanded && (node.loaded || !store.lazy)

  const isOkrRoot = node.level === 1 && store.onlyBothTree

  const nodeClass = cx(
    CLS.node,
    cxState({
      [STATE.collapsed]: !node.leftExpanded || !node.expanded,
      [STATE.isLeaf]: isLeaf,
      [STATE.isCurrent]: node.isCurrent,
      [STATE.isLeftChildNode]: isLeftChildNode,
      [STATE.isNotChild]:
        node.level === 1 && node.childNodes.length <= 0 && leftChildNodes.length <= 0,
      [STATE.onlyBothTreeNode]: isOkrRoot,
      [STATE.alignRoot]: isOkrRoot && cfg.alignRoot && store.direction === 'horizontal',
    })
  )

  const dragOver = ctx.getDragOver()
  const labelWrapperClass = cx(
    CLS.label,
    cxState({
      [STATE.isRootLabel]: node.level === 1,
      [STATE.isNotRightChild]: node.level === 1 && node.childNodes.length <= 0,
      [STATE.isNotLeftChild]: node.level === 1 && leftChildNodes.length <= 0,
      [STATE.dropPrev]: dragOver.node === node && dragOver.type === 'prev',
      [STATE.dropInner]: dragOver.node === node && dragOver.type === 'inner',
      [STATE.dropNext]: dragOver.node === node && dragOver.type === 'next',
    })
  )

  const computeLabelStyle = (): CSSProperties => {
    let width: string | number = cfg.labelWidth ?? 'auto'
    let height: string | number = cfg.labelHeight ?? 'auto'
    if (typeof width === 'number') width = `${width}px`
    if (typeof height === 'number') height = `${height}px`
    return { width, height }
  }

  const computeLabelClass = (): string => {
    const labelClass = store.labelClassName
    const currentClass = store.currentLableClassName
    const parts: Array<string | string[] | Record<string, boolean> | undefined> = []
    if (labelClass) parts.push(typeof labelClass === 'function' ? labelClass(node) : labelClass)
    if (currentClass && node.isCurrent)
      parts.push(typeof currentClass === 'function' ? currentClass(node) : currentClass)
    if (node.isCurrent) parts.push(STATE.isCurrent)
    if (node.disabled) parts.push(STATE.isDisabled)
    return parts.flat().filter(Boolean).join(' ')
  }

  /**
   * 该 treeitem 控制的子树是否展开（无子节点时不输出 aria-expanded）。
   * OKR 根节点要左右两侧都展开才报 true——与源项目一致。
   */
  const ariaExpanded = (): 'true' | 'false' | undefined => {
    if (isLeftChildNode) {
      return hasLeftChildren ? (node.leftExpanded ? 'true' : 'false') : undefined
    }
    if (!hasRightChildren && !hasLeftChildren) return undefined
    const rightOpen = hasRightChildren ? node.expanded : true
    const leftOpen = hasLeftChildren ? node.leftExpanded : true
    return rightOpen && leftOpen ? 'true' : 'false'
  }

  const ariaChecked = (): 'true' | 'false' | 'mixed' | undefined => {
    if (!store.showCheckbox) return undefined
    if (node.indeterminate && !node.checked) return 'mixed'
    return node.checked ? 'true' : 'false'
  }

  const tabIndex = (() => {
    const focused = ctx.getFocusedNode()
    if (focused) return focused === node ? 0 : -1
    // 尚无焦点节点：第一个根节点可 Tab 进入
    return ctx.root.childNodes[0] === node && !isLeftChildNode ? 0 : -1
  })()

  // ---- check-change：每个受影响节点各触发一次（含联动、批量 setCheckedKeys 与增删级联） ----
  const prevCheck = useRef<[boolean, boolean] | null>(null)
  useEffect(() => {
    const current: [boolean, boolean] = [node.checked, node.indeterminate]
    const prev = prevCheck.current
    prevCheck.current = current
    if (!store.showCheckbox || !prev) return
    if (current[0] === prev[0] && current[1] === prev[1]) return
    ctx.emit('check-change', node.data, current[0], current[1])
  })

  /**
   * React 的 onFocus 由 focusin 映射而来，而 focusin 会冒泡：后代 treeitem 或节点内控件
   * 被聚焦时，祖先节点的 onFocus 同样会触发。少了这层判定，漫游 tabindex 会被祖先抢回去
   * （源项目 @focus 绑的是不冒泡的原生 focus 事件，天然只有自身触发）。
   */
  function handleFocus(event: FocusEvent<HTMLDivElement>): void {
    if (event.target !== event.currentTarget) return
    ctx.setFocusedNode(node)
  }

  function handleBtnClick(side: 'left' | 'right'): void {
    const isLeft = side === 'left'
    // OKR 飞书模式：根节点的左侧按钮直接切换 leftExpanded（左子树数据前置给定，无懒加载）
    if (store.onlyBothTree && isLeft && !isLeftChildNode) {
      if (node.leftExpanded) {
        node.leftExpanded = false
        ctx.onExpandChange()
        ctx.emit('node-collapse', node.data, node)
      } else {
        node.leftExpanded = true
        ctx.onExpandChange()
        ctx.emit('node-expand', node.data, node)
      }
      return
    }
    // 左树节点的展开态在 leftExpanded；懒加载由 expand() 内部处理（首次展开先加载）
    if (isLeftChildNode ? node.leftExpanded : node.expanded) {
      if (isLeftChildNode) node.leftExpanded = false
      else node.collapse()
      ctx.onExpandChange()
      ctx.emit('node-collapse', node.data, node)
    } else {
      node.expand()
      // accordion：用户交互展开时收起同级兄弟（仅作用于交互路径）
      if (store.accordion) store.collapseSiblings(node)
      ctx.onExpandChange()
      ctx.emit('node-expand', node.data, node)
    }
  }

  function handleNodeClick(): void {
    if (node.disabled) return
    store.setCurrentNode(node)
    ctx.onCurrentChange()
    // expand-on-click-node：与 el-tree 一致，先切换展开再触发点击；叶子不切换。
    // OKR 根节点点击内容只切换右侧子树（左侧有自己的按钮），左树节点切换自身子树。
    if (store.expandOnClickNode) {
      const hasKids = isLeftChildNode ? hasLeftChildren : hasRightChildren
      if (hasKids) handleBtnClick(isLeftChildNode ? 'left' : 'right')
    }
    ctx.emit('node-click', node.data, node)
  }

  /** 复选框点击 / 空格键：切换勾选并携带当前全量勾选信息 */
  function handleCheckToggle(): void {
    if (!store.showCheckbox || node.disabled) return
    node.setChecked(!node.checked, !store.checkStrictly)
    ctx.emit('check', node.data, {
      checkedNodes: store.getCheckedNodes().map(n => n.data),
      checkedKeys: store.getCheckedKeys(),
      halfCheckedNodes: store.getHalfCheckedNodes(),
      halfCheckedKeys: store.getHalfCheckedKeys(),
    })
  }

  /** 展开（或进入）该节点某一侧的子树 */
  function expandOrEnter(side: 'left' | 'right'): void {
    const isOpen = side === 'left' ? node.leftExpanded : node.expanded
    const hasKids = side === 'left' ? hasLeftChildren : hasRightChildren
    if (!hasKids) return
    if (!isOpen) {
      if (cfg.showCollapsable) handleBtnClick(side)
      return
    }
    const kids = side === 'left' ? leftChildNodes : node.childNodes
    const first = kids.find(child => child.visible)
    if (first) ctx.focusNode(first)
  }

  /** 收起该节点某一侧的子树，已收起则回到父节点 */
  function collapseOrLeave(side: 'left' | 'right'): void {
    const isOpen = side === 'left' ? node.leftExpanded : node.expanded
    const hasKids = side === 'left' ? hasLeftChildren : hasRightChildren
    if (hasKids && isOpen && cfg.showCollapsable) {
      handleBtnClick(side)
      return
    }
    ctx.focusParent(node, isLeftChildNode)
  }

  function handleKeydown(event: KeyboardEvent<HTMLDivElement>): void {
    // 只处理焦点落在 treeitem 本身的情况，避免干扰节点内的输入控件
    if (event.target !== rootEl.current) return
    switch (event.key) {
      case 'Enter':
        event.preventDefault()
        handleNodeClick()
        break
      case ' ':
        event.preventDefault()
        // 复选框模式下空格 = 勾选/取消勾选；否则与 Enter 一致为选中
        if (store.showCheckbox) handleCheckToggle()
        else handleNodeClick()
        break
      case 'ArrowDown':
        event.preventDefault()
        ctx.moveFocus(rootEl.current, 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        ctx.moveFocus(rootEl.current, -1)
        break
      case 'Home':
        event.preventDefault()
        ctx.moveFocus(rootEl.current, 'first')
        break
      case 'End':
        event.preventDefault()
        ctx.moveFocus(rootEl.current, 'last')
        break
      case 'ArrowRight':
        event.preventDefault()
        // 左树节点的子树在视觉左侧：→ 表示离开 / 收起；其余节点 → 表示展开 / 进入右侧子树
        if (isLeftChildNode) collapseOrLeave('left')
        else expandOrEnter('right')
        break
      case 'ArrowLeft':
        event.preventDefault()
        if (isLeftChildNode) expandOrEnter('left')
        else if (isOkrRoot && hasLeftChildren) expandOrEnter('left')
        else collapseOrLeave('right')
        break
      default:
        return
    }
  }

  function handleContextMenu(event: MouseEvent<HTMLDivElement>): void {
    if (ctx.hasContextmenuListener()) {
      event.stopPropagation()
      event.preventDefault()
    }
    ctx.emit('node-contextmenu', event, node.data, node)
  }

  // ---- 拖拽调整层级（HTML5 DnD）----
  const isDraggable =
    !!store.draggable && !node.disabled && !(store.allowDrag && store.allowDrag(node) === false)

  /**
   * 放置分区（对齐 el-tree 的 25% / 50% / 25%）：按布局方向选轴——
   * horizontal（同级上下排列）按 Y 轴；vertical（同级左右排列）按 X 轴。
   */
  function calcDropType(event: DragEvent<HTMLDivElement>): DropType | null {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const horizontal = store.direction === 'horizontal'
    const size = horizontal ? rect.height : rect.width
    const offset = horizontal ? event.clientY - rect.top : event.clientX - rect.left
    const ratio = size > 0 ? offset / size : 0.5
    if (ratio < 0.25) return 'prev'
    if (ratio > 0.75) return 'next'
    return 'inner'
  }

  /** 放置校验：自身 / 自身子树内硬性禁止；跨左右树默认禁止（allow-drop 返回 true 放开） */
  function dropValid(dragged: TreeNode, type: DropType): boolean {
    if (dragged === node || store.contains(dragged, node)) return false
    if (dragged.isLeftChild !== node.isLeftChild) {
      return store.allowDrop?.(dragged, node, type) === true
    }
    return store.allowDrop ? store.allowDrop(dragged, node, type) !== false : true
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>): void {
    if (!isDraggable) {
      event.preventDefault()
      return
    }
    ctx.setDraggingNode(node)
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', String(node.key ?? node.id))
      event.dataTransfer.effectAllowed = 'move'
    }
    ctx.emit('node-drag-start', node, event)
  }

  function handleDragEnd(event: DragEvent<HTMLDivElement>): void {
    if (ctx.getDraggingNode() !== node) return
    const over = ctx.getDragOver()
    ctx.setDraggingNode(null)
    ctx.setDragOver(null, null)
    ctx.emit('node-drag-end', node, over.node, over.type, event)
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>): void {
    const dragged = ctx.getDraggingNode()
    if (dragged) ctx.emit('node-drag-enter', dragged, node, event)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    const dragged = ctx.getDraggingNode()
    if (!dragged) return
    const type = calcDropType(event)
    if (!type || !dropValid(dragged, type)) {
      if (ctx.getDragOver().node === node) ctx.setDragOver(null, null)
      return
    }
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    ctx.setDragOver(node, type)
    ctx.emit('node-drag-over', dragged, node, event)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>): void {
    const dragged = ctx.getDraggingNode()
    if (!dragged) return
    // 移动到本节点的子元素上时 relatedTarget 仍在本元素内，不算离开
    const related = event.relatedTarget as Node | null
    if (related && (event.currentTarget as HTMLElement).contains(related)) return
    if (ctx.getDragOver().node === node) ctx.setDragOver(null, null)
    ctx.emit('node-drag-leave', dragged, node, event)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    const dragged = ctx.getDraggingNode()
    const over = ctx.getDragOver()
    if (!dragged || !over.type || over.node !== node) return
    event.preventDefault()
    const ok = store.moveNode(dragged, node, over.type)
    ctx.setDragOver(null, null)
    if (!ok) return
    // inner 放置在 moveNode 内已展开目标；同步受控展开态并通知
    ctx.onExpandChange()
    ctx.emit('node-drop', dragged, node, over.type, event)
  }

  const renderChildren = (list: TreeNode[], asLeft: boolean): ReactNode => {
    const visible = list.filter(child => child.visible)
    return list.map(child => (
      <OkrTreeNode
        key={reactKey(cfg.nodeKey, child)}
        node={child}
        isLeftChildNode={asLeft}
        ariaSetSize={visible.length}
        ariaPosInSet={visible.indexOf(child) + 1}
      />
    ))
  }

  const btnRenderers = {
    renderExpandBtn: cfg.renderExpandBtn,
    nodeBtnContent: cfg.nodeBtnContent,
  }

  const leftBtn =
    showNodeLeftBtn && leftChildNodes.length > 0 ? (
      <div
        className={cx(
          CLS.leftBtn,
          cxState({ [STATE.expanded]: node.leftExpanded, [STATE.isLoading]: node.loading })
        )}
        aria-hidden="true"
        onClick={() => handleBtnClick('left')}
      >
        {cfg.showNodeNum ? (
          showLeftBtnText ? (
            <span className={CLS.btnText}>{leftBtnCount}</span>
          ) : null
        ) : (
          renderExpandBtnContent(
            node,
            { expanded: node.leftExpanded, side: 'left', loading: node.loading },
            btnRenderers
          )
        )}
      </div>
    ) : null

  const rightBtn =
    showNodeBtn && !isLeftChildNode ? (
      <div
        className={cx(
          CLS.btn,
          cxState({ [STATE.expanded]: node.expanded, [STATE.isLoading]: node.loading })
        )}
        aria-hidden="true"
        onClick={() => handleBtnClick('right')}
      >
        {cfg.showNodeNum ? (
          showRightBtnText ? (
            <span className={CLS.btnText}>{rightBtnCount}</span>
          ) : null
        ) : (
          renderExpandBtnContent(
            node,
            { expanded: node.expanded, side: 'right', loading: node.loading },
            btnRenderers
          )
        )}
      </div>
    ) : null

  const content = renderNodeContent(
    node,
    {
      renderNode: cfg.renderNode,
      nodeComponent: cfg.nodeComponent,
      renderContent: cfg.renderContent,
    },
    node.label
  )

  if (!node.visible) return null

  return (
    <div
      ref={rootEl}
      className={nodeClass}
      data-level={node.level}
      role="treeitem"
      tabIndex={tabIndex}
      aria-level={node.level}
      aria-selected={node.isCurrent ? 'true' : 'false'}
      aria-expanded={ariaExpanded()}
      aria-checked={ariaChecked()}
      aria-disabled={node.disabled ? 'true' : undefined}
      aria-setsize={ariaSetSize}
      aria-posinset={ariaPosInSet}
      onContextMenu={handleContextMenu}
      onFocus={handleFocus}
      onKeyDown={handleKeydown}
    >
      {showLeftChildNode ? (
        <div
          className={cx(
            CLS.leftChildren,
            animClassList,
            cxState({ [STATE.isHidden]: !node.leftExpanded })
          )}
          style={leftChildrenStyle}
          role="group"
        >
          {renderChildren(leftChildNodes, true)}
        </div>
      ) : null}

      <div
        className={labelWrapperClass}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {leftBtn}
        <div
          className={cx(CLS.labelInner, computeLabelClass())}
          style={computeLabelStyle()}
          draggable={isDraggable ? 'true' : 'false'}
          onClick={handleNodeClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {store.showCheckbox ? (
            <span
              className={cx(
                CLS.checkbox,
                cxState({
                  [STATE.isChecked]: node.checked,
                  [STATE.isIndeterminate]: node.indeterminate && !node.checked,
                  [STATE.isDisabled]: node.disabled,
                })
              )}
              aria-hidden="true"
              onClick={event => {
                event.stopPropagation()
                handleCheckToggle()
              }}
            />
          ) : null}
          {content}
        </div>
        {rightBtn}
      </div>

      {!isLeftChildNode && node.childNodes.length > 0 ? (
        <div
          className={cx(CLS.children, animClassList, cxState({ [STATE.isHidden]: !node.expanded }))}
          style={childrenStyle}
          role="group"
        >
          {renderChildren(node.childNodes, false)}
        </div>
      ) : null}
    </div>
  )
}

/**
 * memo：父节点因为自己的状态重渲染时，子节点 props 未变就不跟着渲染。
 * 订阅关系在组件内部，所以模型变更依然能驱动该渲染的节点重渲染。
 */
export const OkrTreeNode = memo(OkrTreeNodeComponent)
OkrTreeNode.displayName = 'OkrTreeNode'
