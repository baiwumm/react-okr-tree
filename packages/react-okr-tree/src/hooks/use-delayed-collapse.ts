import { useEffect, useRef, useState } from 'react'

/**
 * animate 开启时，收起动作先保留容器高度让内容完成淡出/缩放过渡，过渡结束后再置 height: 0
 * （height auto→0 不可插值，直接切换会让下方节点先跳位）。移植自源项目 useDelayedCollapse。
 *
 * 首次渲染不生效：源项目用的是非 immediate 的 watch。若挂载时就置 keepHeight，
 * 折叠子树会在最初 animateDuration 毫秒里撑出高度，根节点位置与源项目不一致。
 */
export function useDelayedCollapse(
  isExpanded: boolean,
  animateOn: boolean,
  duration: number
): boolean {
  const [keepHeight, setKeepHeight] = useState(false)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!isExpanded && animateOn) {
      setKeepHeight(true)
      const timer = setTimeout(() => setKeepHeight(false), duration)
      return () => clearTimeout(timer)
    }
    setKeepHeight(false)
  }, [isExpanded, animateOn, duration])

  return keepHeight
}
