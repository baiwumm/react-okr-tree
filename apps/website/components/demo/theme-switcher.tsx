'use client'

import { useTheme } from 'next-themes'
import { useState, type ReactNode } from 'react'
import { BUILT_IN_THEMES } from 'react-okr-tree'

/**
 * 主题切换条（计划 8.7）
 *
 * 六个内置主题 + 第七个「跟随站点主题」。第七个是关键的一条：
 * `theme="auto"` 走的是 `@media (prefers-color-scheme: dark)`，**站级的 `.dark` 类不会改变媒体查询**，
 * 所以点了站上的主题按钮而树没反应不是 bug。要跟随站点主题，得自己按当前主题传 prop——
 * 这里就是这个写法的活样例（`resolvedTheme` 来自 next-themes）。
 *
 * 另一条同样成立的路是给祖先容器覆盖 `--okr-*` 变量（变量可以写在任意祖先），
 * 那条不需要组件配合，见本页「自定义主题 / 覆盖变量」。
 */
const FOLLOW_SITE = '__follow-site__'

export function ThemeSwitcher({ children }: { children: ReactNode }) {
  const [picked, setPicked] = useState<string>('default')
  const { resolvedTheme } = useTheme()
  const theme = picked === FOLLOW_SITE ? (resolvedTheme === 'dark' ? 'dark' : 'default') : picked

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-fd-border">
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
      <div className="overflow-x-auto p-4">{children}</div>
    </div>
  )
}
