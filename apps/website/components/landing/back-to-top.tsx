'use client'

import { ArrowUp } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

/** 浮现阈值：滚过约半屏后出现 */
const THRESHOLD = 480

/**
 * 回到顶部：滚过半屏后从右下角浮起，点击平滑滚回顶部。
 * 系统开了「减弱动态效果」时跳转退化为直接归位（behavior: auto），
 * 出现/退场动画也随之关闭。
 */
export function BackToTop() {
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 挂载时先同步一次：刷新时页面可能停在半山腰
    const onScroll = () => setVisible(window.scrollY > THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toTop = () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          key="back-to-top"
          type="button"
          aria-label="回到顶部"
          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          whileHover={reduce ? undefined : { y: -3 }}
          onClick={toTop}
          className="fixed bottom-6 end-6 z-40 flex size-11 items-center justify-center rounded-full border border-border/60 bg-card/80 text-foreground shadow-md backdrop-blur-md transition-colors hover:bg-card"
        >
          <ArrowUp size={18} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  )
}
