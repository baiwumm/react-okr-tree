'use client'

import { useMemo, useRef, useState } from 'react'
import { OkrTree, type AnimateName, type OkrTreeHandle } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { baseData } from './data'

/**
 * 展开 / 收起过渡动画（对应源项目 playground/components/demos/Base061.vue）
 *
 * `animate` 是开关，`animateName` 选六个内置名字之一，`animateDuration` 给时长（ms）。
 * 「全部收起 / 全部展开」两个按钮走 ref，点一次能看到整树同时在动。
 *
 * 与 Vue 用例的差别：
 * 1. 名字与取值集合完全一致（`AnimateName`），类名形态是 `is-animated` + `okr-anim-{name}`，
 *    写在子节点容器上，不是包一层 `<Transition>` 组件；
 * 2. `animateDuration` 在 React 侧不只是 CSS 变量：收起要等这么久才把容器压成 `height: 0`
 *    （`useDelayedCollapse`，R7），因为 `height: auto → 0` 不可插值，早压会让下方节点跳位。
 *    所以把时长调到 1500ms 时，收起后的「留白」也一起变长；
 * 3. 系统开「减弱动态效果」时组件按 animate=false 处理（JS 与 CSS 两侧都判），
 *    所以这台机器上可能看不到动效，不是 bug；
 * 4. 这三个 prop 运行时切换都真的生效（内部会逐节点通知），不需要像别的定制口那样重挂载。
 */

const NAMES: AnimateName[] = [
  'okr-zoom-in-center',
  'okr-zoom-in-top',
  'okr-zoom-in-bottom',
  'okr-zoom-in-left',
  'okr-fade-in',
  'okr-fade-in-linear',
]

export function AnimationDemo() {
  const data = useMemo(baseData, [])
  const tree = useRef<OkrTreeHandle>(null)
  const [animate, setAnimate] = useState(true)
  const [animateName, setAnimateName] = useState<AnimateName>('okr-zoom-in-center')
  const [animateDuration, setAnimateDuration] = useState(200)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fd-muted-foreground">animate-name：</span>
        {NAMES.map(name => (
          <button
            key={name}
            type="button"
            onClick={() => setAnimateName(name)}
            className={`rounded-lg border border-fd-border px-2 py-1 text-sm ${
              animateName === name ? 'bg-fd-accent font-medium' : 'text-fd-muted-foreground'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={animate}
            onChange={event => setAnimate(event.target.checked)}
          />
          animate
        </label>
        <label className="flex items-center gap-2">
          <span className="text-fd-muted-foreground">animate-duration</span>
          <input
            className="w-24 rounded-lg border border-fd-border px-2 py-1"
            type="number"
            min={0}
            step={100}
            value={animateDuration}
            onChange={event => setAnimateDuration(Number(event.target.value))}
          />
          ms
        </label>
        <button
          type="button"
          onClick={() => tree.current?.collapseAll()}
          className="rounded-lg border border-fd-border px-2 py-1"
        >
          全部收起
        </button>
        <button
          type="button"
          onClick={() => tree.current?.expandAll()}
          className="rounded-lg border border-fd-border px-2 py-1"
        >
          全部展开
        </button>
      </div>
      <OkrTree
        ref={tree}
        data={data}
        direction="horizontal"
        showCollapsable
        defaultExpandAll
        animate={animate}
        animateName={animateName}
        animateDuration={animateDuration}
      />
    </div>
  )
}
