import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import { CLS, GROUP_LEFT_WIDTH_SELECTOR, STATE } from './dom-contract'
import { cx, cxState } from './cx'
import { OkrTreeGroupProvider, type OkrTreeGroupContextValue } from './context'

export interface OkrTreeGroupProps {
  /** 是否对组内的 OKR 树做跨实例根对齐；false 时各树独立排布 */
  align?: boolean
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

export interface OkrTreeGroupHandle {
  /** 手动触发一次重新测量（字体加载、外部样式变化等特殊场景） */
  refresh: () => void
}

/**
 * 多棵 OKR 树的跨实例根对齐。
 *
 * align-root 让每棵树的根节点在自身容器内居中；并排对比时若左右子树深度不同，
 * "各自居中"的位置会各不相同——这正是原版需要业务层手动量 DOM 的场景。
 * 这里测量组内所有左子树容器的最大自然宽度并统一，使各树根节点水平坐标一致。
 */
function OkrTreeGroupInner(props: OkrTreeGroupProps, ref: Ref<OkrTreeGroupHandle>) {
  const align = props.align !== false
  const groupEl = useRef<HTMLDivElement | null>(null)
  const [measured, setMeasured] = useState(false)
  const [groupLeftWidth, setGroupLeftWidth] = useState(0)
  const alignRef = useRef(align)
  alignRef.current = align

  /**
   * 测量：临时让左容器按 max-content 排布（is-measuring 那条规则），读取各成员左子树
   * 容器的自然宽度取最大值，再统一写回 --okr-group-left-width。
   *
   * 两个坑，都是与上游同批实测踩出来的（详见 vue3-okr-tree 的 OkrTreeGroup 注释）：
   * 1. 测量态必须**直接写 DOM**。绑到 state 上的话 DOM 要等一次异步提交才更新，而读取就在
   *    同一个同步块里 —— 那个类从来没生效过，读到的一直是当前分配宽度。
   * 2. 加 is-measuring 的同时必须摘掉 is-measured：style.css 里 .is-measured 的钉宽规则
   *    （width: var(--okr-group-left-width)）排在 .is-measuring 的 max-content 之后且特异度
   *    相同，两个类同时在场时钉宽赢 —— 只加不摘等于没加。
   * 后果原本是首量之后宽度再也涨不上去（.is-measured 把左容器钉住，下一轮又把那个钉住的值
   * 当「自然宽度」读回来）。同步 add → 读（读 rect 自带强制布局）→ 复原在一个任务内完成，
   * 浏览器不绘制中间态，所以不闪；刻意不用「置 state 后等一帧」，那会让测量跨帧并与
   * 「渲染 → useEffect 再请求测量」绕成自持环。
   */
  const measure = useCallback(() => {
    const el = groupEl.current
    if (!el || !alignRef.current) return
    const lefts = Array.from(el.querySelectorAll<HTMLElement>(GROUP_LEFT_WIDTH_SELECTOR))
    if (!lefts.length) {
      setMeasured(false)
      return
    }
    const wasMeasured = el.classList.contains(STATE.isMeasured)
    el.classList.remove(STATE.isMeasured)
    el.classList.add(STATE.isMeasuring)
    let max = 0
    try {
      for (const left of lefts) {
        const w = Math.ceil(left.getBoundingClientRect().width)
        if (w > max) max = w
      }
    } finally {
      el.classList.remove(STATE.isMeasuring)
      if (wasMeasured) el.classList.add(STATE.isMeasured)
    }
    if (max > 0) {
      setGroupLeftWidth(prev => (prev === max ? prev : max))
      setMeasured(true)
    }
  }, [])

  const pending = useRef(false)
  /** 去重的测量请求：成员挂载/更新/卸载时高频调用，合并到下一帧 */
  const requestMeasure = useCallback(() => {
    if (!alignRef.current || pending.current) return
    pending.current = true
    requestAnimationFrame(() => {
      pending.current = false
      measure()
    })
  }, [measure])

  const contextValue = useMemo<OkrTreeGroupContextValue>(
    () => ({ requestMeasure }),
    [requestMeasure]
  )

  // 成员展开/收起会改变内容尺寸；字体加载完成会改变文本宽度
  useEffect(() => {
    if (typeof ResizeObserver !== 'undefined' && groupEl.current) {
      const observer = new ResizeObserver(() => requestMeasure())
      observer.observe(groupEl.current)
      requestMeasure()
      return () => observer.disconnect()
    }
    requestMeasure()
  }, [requestMeasure])

  useEffect(() => {
    if (typeof document !== 'undefined' && (document as Document & { fonts?: FontFaceSet }).fonts) {
      ;(document as Document & { fonts: FontFaceSet }).fonts.ready
        .then(() => requestMeasure())
        .catch(() => {})
    }
  }, [requestMeasure])

  useEffect(() => {
    if (align) requestMeasure()
    else {
      setMeasured(false)
      setGroupLeftWidth(0)
    }
  }, [align, requestMeasure])

  useImperativeHandle(ref, () => ({ refresh: requestMeasure }), [requestMeasure])

  return (
    <OkrTreeGroupProvider value={contextValue}>
      <div
        ref={groupEl}
        className={cx(CLS.group, cxState({ [STATE.isMeasured]: measured }), props.className)}
        style={
          {
            ...(measured ? { '--okr-group-left-width': `${groupLeftWidth}px` } : {}),
            ...props.style,
          } as CSSProperties
        }
      >
        {props.children}
      </div>
    </OkrTreeGroupProvider>
  )
}

export const OkrTreeGroup = forwardRef(OkrTreeGroupInner) as (
  props: OkrTreeGroupProps & { ref?: Ref<OkrTreeGroupHandle> }
) => ReactNode
