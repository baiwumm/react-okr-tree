'use client'

import { type ElementType, useEffect, useState } from 'react'

type TextScrambleProps = {
  children: string
  duration?: number
  speed?: number
  characterSet?: string
  as?: ElementType
  className?: string
  trigger?: boolean
  onScrambleComplete?: () => void
}

const defaultChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * 乱码渐显文字效果（移植自参考站，其动画逻辑本就是纯 setInterval，无 motion 依赖）。
 * 页脚用它做「Built by baiwumm」的周期性重放。
 */
export function TextScramble({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = defaultChars,
  className,
  as: Component = 'span',
  trigger = true,
  onScrambleComplete,
}: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(children)
  const [isAnimating, setIsAnimating] = useState(false)
  const text = children

  useEffect(() => {
    if (!trigger || isAnimating) return
    setIsAnimating(true)

    const steps = duration / speed
    let step = 0

    const interval = setInterval(() => {
      let scrambled = ''
      const progress = step / steps

      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          scrambled += ' '
          continue
        }

        if (progress * text.length > i) {
          scrambled += text[i]
        } else {
          scrambled += characterSet[Math.floor(Math.random() * characterSet.length)]
        }
      }

      setDisplayText(scrambled)
      step++

      if (step > steps) {
        clearInterval(interval)
        setDisplayText(text)
        setIsAnimating(false)
        onScrambleComplete?.()
      }
    }, speed * 1000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger])

  return <Component className={className}>{displayText}</Component>
}
