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
    <Image
      src={src}
      alt="react-okr-tree Logo"
      width={size}
      height={size}
      className={className}
      priority
    />
  )
}
