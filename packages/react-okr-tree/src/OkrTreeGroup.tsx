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
  const [measuring, setMeasuring] = useState(false)
  const [groupLeftWidth, setGroupLeftWidth] = useState(0)
  const alignRef = useRef(align)
  alignRef.current = align

  /**
   * 测量：给组加 is-measuring 类（左容器临时按 max-content 排布），
   * 读取各成员左子树容器的自然宽度取最大值，再统一写回 --okr-group-left-width。
   */
  const measure = useCallback(() => {
    const el = groupEl.current
    if (!el || !alignRef.current) return
    const lefts = Array.from(el.querySelectorAll<HTMLElement>(GROUP_LEFT_WIDTH_SELECTOR))
    if (!lefts.length) {
      setMeasured(false)
      return
    }
    setMeasuring(true)
    let max = 0
    try {
      for (const left of lefts) {
        const w = Math.ceil(left.getBoundingClientRect().width)
        if (w > max) max = w
      }
    } finally {
      setMeasuring(false)
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
        className={cx(
          CLS.group,
          cxState({ [STATE.isMeasured]: measured, [STATE.isMeasuring]: measuring }),
          props.className
        )}
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
