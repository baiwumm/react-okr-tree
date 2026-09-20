'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ThemeAnimationType, useThemeAnimation } from 'theme-switch-animation/react'

/**
 * 顶部主题切换（与参考站同一实现）
 *
 * 切换动作走 `theme-switch-animation` 的 view transition 动画：
 * 以这颗按钮为圆心做「圆形模糊扩散」，新主题从按钮位置晕开覆盖整屏；
 * 浏览器不支持 View Transitions、或用户开了 `prefers-reduced-motion` 时，
 * 库内部会自动降级为直接切换，状态照常更新。
 *
 * 受控模式（`isDark` + `onChange` 同时提供）：库不碰 localStorage、不自己改 class，
 * 主题的单一事实源仍然是 next-themes（`app/layout.tsx` 的 RootProvider 里配置）。
 * 注意 `disableTransitionOnChange: true` 必须保留——它保证转场末帧的 DOM 颜色不处于
 * 过渡中间态，否则动画结束时会露出半透明的旧配色。
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  const { ref, toggleTheme } = useThemeAnimation<HTMLButtonElement>({
    animationType: ThemeAnimationType.CIRCLE_BLUR,
    isDark,
    onChange: next => setTheme(next ? 'dark' : 'light'),
  })

  return (
    <button
      ref={ref}
      type="button"
      aria-label={isDark ? '切换到浅色主题' : '切换到深色主题'}
      onClick={toggleTheme}
      className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      {/* 图标表示「点下去会切到哪一档」：亮色显示月亮，暗色显示太阳 */}
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
