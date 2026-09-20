import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { CLS, STATE } from './dom-contract'
import { cx, cxState } from './cx'
import { OkrTreeViewportProvider, type OkrTreeViewportContextValue } from './context'
import {
  clampZoom,
  computeFit,
  renderToDataUrl,
  type ExportImageOptions,
  type ViewportOffset,
  type ViewportTreeApi,
  type ViewportWheelBehavior,
} from './viewport'

export interface OkrTreeViewportProps {
  /** 最小缩放 */
  minZoom?: number
  /** 最大缩放 */
  maxZoom?: number
  /** 每次 zoomIn / zoomOut / 滚轮一格的缩放系数（乘除） */
  zoomStep?: number
  /** 受控缩放（对应源项目 v-model:zoom）；未传时内部维护 */
  zoom?: number
  onZoomChange?: (zoom: number) => void
  /** 受控平移偏移；未传时内部维护 */
  offset?: ViewportOffset
  onOffsetChange?: (offset: ViewportOffset) => void
  /**
   * 滚轮行为：ctrl-zoom（默认，按住 Ctrl/⌘ 才缩放，不劫持页面滚动）/ zoom（始终缩放）/
   * scroll（从不缩放）
   */
  wheelBehavior?: ViewportWheelBehavior
  /** 显示默认工具栏；传了 renderToolbar 时无需开启 */
  toolbar?: boolean
  /** 自定义工具栏（对应源项目 #toolbar 插槽） */
  renderToolbar?: (scope: ViewportToolbarScope) => ReactNode
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

export interface ViewportToolbarScope {
  zoom: number
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  fit: (padding?: number) => void
}

export interface OkrTreeViewportHandle {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  fitToScreen: (padding?: number) => void
  centerNode: (data: Parameters<ViewportTreeApi['getNodeEl']>[0]) => Promise<boolean>
  exportImage: (options?: ExportImageOptions) => Promise<string>
  getZoom: () => number
  getOffset: () => ViewportOffset
}

/** 拖拽位移超过该阈值才算平移（避免干扰节点点击） */
const PAN_THRESHOLD = 3

function OkrTreeViewportInner(props: OkrTreeViewportProps, ref: Ref<OkrTreeViewportHandle>) {
  const { minZoom = 0.2, maxZoom = 4 } = props

  const viewportEl = useRef<HTMLDivElement | null>(null)
  const canvasEl = useRef<HTMLDivElement | null>(null)
  const contentEl = useRef<HTMLDivElement | null>(null)

  // ---- 缩放 / 偏移状态：内部值始终为当前事实，受控时额外回调（与树组件的受控策略一致）----
  const [innerZoom, setInnerZoom] = useState(() => props.zoom ?? 1)
  const [innerOffset, setInnerOffset] = useState<ViewportOffset>(() => ({
    x: props.offset?.x ?? 0,
    y: props.offset?.y ?? 0,
  }))
  // 读最新值用（事件回调里不能用闭包里的旧 state）
  const zoomRef = useRef(innerZoom)
  const offsetRef = useRef(innerOffset)
  zoomRef.current = innerZoom
  offsetRef.current = innerOffset

  const latest = useRef(props)
  latest.current = props

  useEffect(() => {
    if (props.zoom !== undefined) setInnerZoom(props.zoom)
  }, [props.zoom])

  useEffect(() => {
    const next = props.offset
    if (!next) return
    // 依赖整个对象：只有引用变了才同步，避免受控方每次渲染新建 {x,y} 时反复 setState
    setInnerOffset(prev =>
      prev.x === next.x && prev.y === next.y ? prev : { x: next.x, y: next.y }
    )
  }, [props.offset])

  const applyZoom = useCallback((next: number) => {
    const clamped = clampZoom(next, latest.current.minZoom ?? 0.2, latest.current.maxZoom ?? 4)
    zoomRef.current = clamped
    setInnerZoom(clamped)
    if (latest.current.zoom !== undefined) latest.current.onZoomChange?.(clamped)
  }, [])

  const applyOffset = useCallback((next: ViewportOffset) => {
    offsetRef.current = next
    setInnerOffset(next)
    if (latest.current.offset !== undefined) latest.current.onOffsetChange?.({ ...next })
  }, [])

  /** 以视口内某点为锚缩放：锚点下的内容点保持不动 */
  const zoomAt = useCallback(
    (nextZoom: number, anchorX: number, anchorY: number) => {
      const prevZoom = zoomRef.current
      const offset = offsetRef.current
      const clamped = clampZoom(
        nextZoom,
        latest.current.minZoom ?? 0.2,
        latest.current.maxZoom ?? 4
      )
      const contentX = (anchorX - offset.x) / prevZoom
      const contentY = (anchorY - offset.y) / prevZoom
      applyZoom(clamped)
      applyOffset({ x: anchorX - contentX * clamped, y: anchorY - contentY * clamped })
    },
    [applyZoom, applyOffset]
  )

  const center = (): [number, number] => {
    const vp = viewportEl.current
    return vp ? [vp.clientWidth / 2, vp.clientHeight / 2] : [0, 0]
  }

  const zoomIn = useCallback(() => {
    const [cx, cy] = center()
    zoomAt(zoomRef.current * (latest.current.zoomStep ?? 1.2), cx, cy)
  }, [zoomAt])

  const zoomOut = useCallback(() => {
    const [cx, cy] = center()
    zoomAt(zoomRef.current / (latest.current.zoomStep ?? 1.2), cx, cy)
  }, [zoomAt])

  const reset = useCallback(() => {
    applyZoom(1)
    applyOffset({ x: 0, y: 0 })
  }, [applyZoom, applyOffset])

  /** 适应窗口：内容完整可见并居中，默认四周留 20px */
  const fitToScreen = useCallback(
    (padding = 20) => {
      const content = contentEl.current
      const vp = viewportEl.current
      if (!content || !vp) return
      const fit = computeFit(
        content.offsetWidth,
        content.offsetHeight,
        vp.clientWidth,
        vp.clientHeight,
        padding,
        latest.current.minZoom ?? 0.2,
        latest.current.maxZoom ?? 4
      )
      applyZoom(fit.zoom)
      applyOffset(fit.offset)
    },
    [applyZoom, applyOffset]
  )

  // ---- 滚轮缩放：React 的 onWheel 是 passive 监听，preventDefault 无效，必须挂原生监听 ----
  useEffect(() => {
    const vp = viewportEl.current
    if (!vp) return
    const handleWheel = (event: WheelEvent) => {
      const behavior = latest.current.wheelBehavior ?? 'ctrl-zoom'
      if (behavior === 'scroll') return // 不劫持页面滚动
      if (behavior === 'ctrl-zoom' && !(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      const rect = vp.getBoundingClientRect()
      const step = latest.current.zoomStep ?? 1.2
      zoomAt(
        zoomRef.current * (event.deltaY < 0 ? step : 1 / step),
        event.clientX - rect.left,
        event.clientY - rect.top
      )
    }
    vp.addEventListener('wheel', handleWheel, { passive: false })
    return () => vp.removeEventListener('wheel', handleWheel)
  }, [zoomAt])

  // ---- 拖拽平移与双指捏合（Pointer Events 统一处理鼠标 / 触控）----
  const [panning, setPanning] = useState(false)
  const pointers = useRef(new Map<number, { x: number; y: number }>()).current
  const panStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const pinchStart = useRef<{
    dist: number
    zoom: number
    cx: number
    cy: number
    ox: number
    oy: number
  } | null>(null)
  const movedRef = useRef(false)

  const capturePinch = () => {
    const [a, b] = [...pointers.values()]
    const rect = viewportEl.current?.getBoundingClientRect()
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      zoom: zoomRef.current,
      cx: rect ? (a.x + b.x) / 2 - rect.left : 0,
      cy: rect ? (a.y + b.y) / 2 - rect.top : 0,
      ox: offsetRef.current.x,
      oy: offsetRef.current.y,
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    movedRef.current = false
    if (pointers.size === 1) {
      panStart.current = {
        px: event.clientX,
        py: event.clientY,
        ox: offsetRef.current.x,
        oy: offsetRef.current.y,
      }
    } else if (pointers.size === 2) {
      pinchStart.current = capturePinch()
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointers.size >= 2 && pinchStart.current) {
      const pinch = pinchStart.current
      const [a, b] = [...pointers.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const nextZoom = pinch.zoom * (dist / pinch.dist)
      const contentX = (pinch.cx - pinch.ox) / pinch.zoom
      const contentY = (pinch.cy - pinch.oy) / pinch.zoom
      const clamped = clampZoom(
        nextZoom,
        latest.current.minZoom ?? 0.2,
        latest.current.maxZoom ?? 4
      )
      movedRef.current = true
      applyZoom(clamped)
      applyOffset({ x: pinch.cx - contentX * clamped, y: pinch.cy - contentY * clamped })
      return
    }

    if (panStart.current) {
      const start = panStart.current
      const dx = event.clientX - start.px
      const dy = event.clientY - start.py
      if (!movedRef.current && Math.hypot(dx, dy) > PAN_THRESHOLD) {
        movedRef.current = true
        setPanning(true)
      }
      if (movedRef.current) applyOffset({ x: start.ox + dx, y: start.oy + dy })
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.delete(event.pointerId)
    if (pointers.size < 2) pinchStart.current = null
    if (pointers.size === 1) {
      const [p] = [...pointers.values()]
      panStart.current = { px: p.x, py: p.y, ox: offsetRef.current.x, oy: offsetRef.current.y }
      pinchStart.current = null
    } else if (pointers.size === 0) {
      panStart.current = null
      setPanning(false)
    }
    // 平移过则吞掉随后的一次 click，避免误触 node-click
    if (movedRef.current) {
      const el = viewportEl.current
      if (el) {
        el.addEventListener(
          'click',
          e => {
            e.stopPropagation()
            e.preventDefault()
          },
          { capture: true, once: true }
        )
      }
      movedRef.current = false
    }
  }

  // ---- 组内树实例登记（centerNode 定位）----
  const trees = useRef(new Set<ViewportTreeApi>()).current
  const viewportContext = useMemo<OkrTreeViewportContextValue>(
    () => ({
      registerTree: api => {
        trees.add(api)
      },
      unregisterTree: api => {
        trees.delete(api)
      },
    }),
    [trees]
  )

  const findNodeEl = (data: Parameters<ViewportTreeApi['getNodeEl']>[0]): HTMLElement | null => {
    for (const tree of trees) {
      const el = tree.getNodeEl(data)
      if (el) return el
    }
    return null
  }

  /** 居中指定节点：先展开其祖先使其可见，再把视口中心对准该节点 */
  async function centerNode(data: Parameters<ViewportTreeApi['getNodeEl']>[0]): Promise<boolean> {
    for (const tree of trees) tree.expandNode(data)
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    const el = findNodeEl(data)
    const content = contentEl.current
    const vp = viewportEl.current
    if (!el || !content || !vp) return false
    const zoom = zoomRef.current
    const nodeRect = el.getBoundingClientRect()
    const contentRect = content.getBoundingClientRect()
    const contentCx = (nodeRect.left + nodeRect.width / 2 - contentRect.left) / zoom
    const contentCy = (nodeRect.top + nodeRect.height / 2 - contentRect.top) / zoom
    applyOffset({
      x: vp.clientWidth / 2 - contentCx * zoom,
      y: vp.clientHeight / 2 - contentCy * zoom,
    })
    return true
  }

  /** 导出画布内容为 PNG / SVG 并触发下载，返回 dataURL */
  async function exportImage(options: ExportImageOptions = {}): Promise<string> {
    const content = contentEl.current
    if (!content) throw new Error('[react-okr-tree] exportImage: 画布尚未挂载')
    const type = options.type ?? 'png'
    const dataUrl = await renderToDataUrl(content, options)
    const link = document.createElement('a')
    link.download = `okr-tree-${Date.now()}.${type}`
    link.href = dataUrl
    link.click()
    return dataUrl
  }

  useEffect(() => {
    // 初始受控值越界时钳制
    if (props.zoom !== undefined && props.zoom !== clampZoom(props.zoom, minZoom, maxZoom)) {
      applyZoom(props.zoom)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => trees.clear(), [trees])

  useImperativeHandle(ref, () => ({
    zoomIn,
    zoomOut,
    reset,
    fitToScreen,
    centerNode,
    exportImage,
    getZoom: () => zoomRef.current,
    getOffset: () => ({ ...offsetRef.current }),
  }))

  const toolbarVisible = props.toolbar === true || !!props.renderToolbar
  const scope: ViewportToolbarScope = {
    zoom: innerZoom,
    zoomIn,
    zoomOut,
    reset,
    fit: fitToScreen,
  }

  return (
    <OkrTreeViewportProvider value={viewportContext}>
      <div
        ref={viewportEl}
        className={cx(CLS.viewport, cxState({ [STATE.isPanning]: panning }), props.className)}
        style={props.style}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={reset}
      >
        <div
          ref={canvasEl}
          className={CLS.viewportCanvas}
          style={{
            transform: `translate(${innerOffset.x}px, ${innerOffset.y}px) scale(${innerZoom})`,
          }}
        >
          <div ref={contentEl} className={CLS.viewportContent}>
            {props.children}
          </div>
        </div>
        {toolbarVisible ? (
          <div className={CLS.viewportToolbar} onDoubleClick={e => e.stopPropagation()}>
            {props.renderToolbar ? (
              props.renderToolbar(scope)
            ) : (
              <>
                <button
                  type="button"
                  className={CLS.viewportToolbarBtn}
                  aria-label="缩小"
                  onClick={zoomOut}
                >
                  −
                </button>
                <span className={CLS.viewportToolbarZoom}>{Math.round(innerZoom * 100)}%</span>
                <button
                  type="button"
                  className={CLS.viewportToolbarBtn}
                  aria-label="放大"
                  onClick={zoomIn}
                >
                  ＋
                </button>
                <button type="button" className={CLS.viewportToolbarBtn} onClick={reset}>
                  重置
                </button>
                <button
                  type="button"
                  className={CLS.viewportToolbarBtn}
                  onClick={() => fitToScreen()}
                >
                  适应窗口
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </OkrTreeViewportProvider>
  )
}

/** 画布容器：只做外层变换，不侵入树本体，也不改变树的任何 API */
export const OkrTreeViewport = forwardRef(OkrTreeViewportInner) as (
  props: OkrTreeViewportProps & { ref?: Ref<OkrTreeViewportHandle> }
) => ReactNode
