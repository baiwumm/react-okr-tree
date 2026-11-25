import { useEffect, useRef, useState } from 'react'

/**
 * animate 开启时，收起动作先保留容器高度让内容完成淡出/缩放过渡，过渡结束后再置 height: 0
 * （height auto→0 不可插值，直接切换会让下方节点先跳位）。移植自源项目 useDelayedCollapse。
 *
 * 首次渲染不生效：源项目用的是非 immediate 的 watch。若挂载时就置 keepHeight，
 * 折叠子树会在最初 animateDuration 毫秒里撑出高度，根节点位置与源项目不一致。
 * 现在靠「记录上一次展开态」实现：挂载时初始值相等，本来就不会触发。
 *
 * 依赖只有 isExpanded：animate / duration 运行中改动只表示「下次收起时用新值」，
 * 不该让已经收起到位的容器再走一遍撑高。两者收进 ref 供 effect 读最新值，
 * 与源项目 `watch(isExpanded, …)` 的形状一致。
 *
 * **撑高必须在渲染期跟进，不能放进 effect**（2026-11-20 修）：effect 在提交并绘制之后
 * 才跑，收起的那一帧会先按 height: 0 提交、下一帧才被 effect 撑回来，于是高度序列是
 * 「塌一下 → 弹回 → 过渡期间保持 → 过渡结束再塌」，肉眼就是窗口（连同它下面的内容）
 * 抖两下。实测终端窗口 279 → 195 → 279 → 195。渲染期 setState 由 React 在同一次提交里
 * 合并，屏幕上不会出现中间态；只剩过渡结束后那一次必然的 height: 0。
 */
export function useDelayedCollapse(
  isExpanded: boolean,
  animateOn: boolean,
  duration: number
): boolean {
  const [keepHeight, setKeepHeight] = useState(false)
  /** 上一次提交看到的展开态：与 Vue 侧非 immediate 的 watch 对齐，挂载时不触发 */
  const [prevExpanded, setPrevExpanded] = useState(isExpanded)
  const timing = useRef({ animateOn, duration })
  timing.current.animateOn = animateOn
  timing.current.duration = duration

  if (prevExpanded !== isExpanded) {
    setPrevExpanded(isExpanded)
    const keep = !isExpanded && animateOn
    if (keep !== keepHeight) setKeepHeight(keep)
  }

  // 只负责「撑高窗口到期归零」。展开时上面的渲染期分支已经把它置回 false，
  // 这里 keepHeight 为 false 就直接返回，不再重复 setState。
  useEffect(() => {
    if (!keepHeight) return
    const timer = setTimeout(() => setKeepHeight(false), timing.current.duration)
    return () => clearTimeout(timer)
  }, [keepHeight])

  return keepHeight
}
