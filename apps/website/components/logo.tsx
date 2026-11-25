'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

/** 项目 Logo（亮/暗双变体，与源项目 docs 站的配色体系无关，只看站点主题） */
export function Logo({
  size = 32,
  className = 'rounded-lg',
}: {
  size?: number
  className?: string
}) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const src = mounted && resolvedTheme === 'dark' ? '/logo-dark.svg' : '/logo.svg'

  return (
    // 不传 `priority` / `loading`：`priority` 会给这个 28px 的 SVG 加一条
    // `<link rel=preload as=image>`，与首屏真正的大件（1.7MB 字体，见 app/layout.tsx）
    // 抢预加载名额；`loading="eager"` 在 Next 16 下同样会触发那条 preload（实测）。
    // 交给默认行为：SVG 很小，进入视口就加载。
    <Image src={src} alt="react-okr-tree Logo" width={size} height={size} className={className} />
  )
}
