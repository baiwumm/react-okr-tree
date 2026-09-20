'use client'

import { useTheme } from 'next-themes'
import { useMemo, useState } from 'react'
import { BUILT_IN_THEMES, OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData } from './data'

/**
 * 主题切换条（计划 8.7）：六个内置主题 + 第七个「跟随站点主题」。
 *
 * 它自己就渲染一棵树，而不是包一层 children——主题要落到 `.org-chart-container` 的类上
 * （`theme` prop 的唯一作用），包在外层的中性 div 上挂 `okr-theme-*` 是不生效的，
 * 让 children 各自接 theme prop 又得给每个 demo 加一个参数。
 *
 * 第七个按钮是这里的重点：`theme="auto"` 走 `@media (prefers-color-scheme: dark)`，
 * **站级 `.dark` 类不会改变媒体查询**，所以点了站点主题按钮而树没反应不是 bug。
 * 要跟随站点主题，就按 next-themes 的 `resolvedTheme` 自己传 prop——这里就是这个写法。
 * 另一条同样成立的路是在任意祖先上覆盖 `--okr-*` 变量，见本页「自定义主题 / 覆盖变量」。
 */
const FOLLOW_SITE = '__follow-site__'

export function ThemeSwitcher() {
  const [picked, setPicked] = useState<string>('default')
  // next-themes 在服务端渲染阶段没有值（hydration 之后才有），所以静态导出的首屏按 default 渲染；
  // 这也是 resolvedTheme 而不是 theme：theme 可能是 'system'。
  const { resolvedTheme } = useTheme()
  const theme = picked === FOLLOW_SITE ? (resolvedTheme === 'dark' ? 'dark' : 'default') : picked
  const data = useMemo(keyedData, [])

  return (
    <div id="theme-switcher" className="my-6 overflow-hidden rounded-xl border border-fd-border">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-fd-border px-3 py-2.5">
        {[...BUILT_IN_THEMES, FOLLOW_SITE].map(name => {
          const active = picked === name
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active}
              onClick={() => setPicked(name)}
              className={`rounded-full border px-2.5 py-1 font-mono text-xs transition-colors ${
                active
                  ? 'border-fd-foreground bg-fd-foreground text-fd-background'
                  : 'border-fd-border text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground'
              }`}
            >
              {name === FOLLOW_SITE ? '跟随站点主题' : name}
            </button>
          )
        })}
        <span className="ms-auto hidden font-mono text-xs text-fd-muted-foreground sm:inline">
          theme=&quot;{theme}&quot;
        </span>
      </div>
      <div className="overflow-x-auto p-4">
        <OkrTree data={data} nodeKey="id" direction="horizontal" theme={theme} showCollapsable />
      </div>
    </div>
  )
}
