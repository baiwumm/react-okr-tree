'use client'

import { BookOpen, Github } from 'lucide-react'
import { motion } from 'motion/react'
import { HeroTree } from '@/components/demo/hero-tree'
import { AnimatedBadge } from '@/components/motion/animated-badge'
import { ButtonLink } from '@/components/motion/button/base'
import { TextReveal } from '@/components/motion/text-reveal'
import { SITE } from '@/lib/site'

/**
 * 主视觉窗口（对应参考站的 AdminMockup）
 *
 * 光线背景不在这里：它挂在 app/(home)/page.tsx 上作为整页 fixed 层（与参考实现同挂法），
 * 只留首屏一块会显得像贴了张渐变图。
 *
 * 差别在于这里**不是**仿制界面，而是真实的 `<OkrTree>`：组件本身 SSR 安全
 * （requirements R8），静态导出下首屏就是渲染好的树，点 ± 圆盘可以现场收起展开。
 * 因此整块不再 `aria-hidden` / `pointer-events-none`。窗口不做透视倾斜：参考站敢倾斜
 * 是因为那是假界面，这里要留可点击的阅读性，正放更清楚。
 */
const MAC_DOTS = ['#ff5f57', '#febc2e', '#28c840']

function TreeWindow() {
  const host = SITE.url.replace(/^https?:\/\//, '')

  return (
    <div className="mx-auto mt-20 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="glass-card overflow-hidden rounded-3xl border-border/60 text-left">
          {/* 仿 macOS 窗控：三颗彩色圆点 + 居中的地址条 */}
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
            {MAC_DOTS.map(color => (
              <span
                key={color}
                className="size-3 rounded-full ring-1 ring-inset ring-black/10"
                style={{ backgroundColor: color }}
              />
            ))}
            <span className="ms-3 flex h-5 flex-1 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground/70">
              {host}/docs
            </span>
          </div>
          <div className="overflow-x-auto px-6 py-10">
            <div className="mx-auto w-max">
              <HeroTree layout="vertical" showCollapsable defaultExpandAll animate />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-40 pb-24 text-center">
      {/* 背景光效参数照参考站收着用：白底上光束过量会像蒙了层灰纱，只留首屏顶部这一束 */}
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-60"
      />
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex justify-center"
        >
          <AnimatedBadge status="info" size="md" pulse>
            React 移植 · 与 vue3-okr-tree 特性逐条对齐
          </AnimatedBadge>
        </motion.div>

        <TextReveal
          as="h1"
          text={['一套树组件', '三种布局形态']}
          className="mx-auto text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl"
          delay={0.12}
        />

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground"
        >
          垂直、水平与飞书 OKR 双树三种布局的组织架构图 React 组件，内置六套主题、六种展开动画、CSS
          与 SVG 两种连接线，复选框、拖拽排序与懒加载开箱即用。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <ButtonLink href="/docs/start" variant="primary" size="lg">
            <BookOpen size={16} />
            快速开始
          </ButtonLink>
          <ButtonLink
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            variant="outline"
            size="lg"
          >
            <Github size={16} />
            GitHub
          </ButtonLink>
        </motion.div>

        <TreeWindow />
        <p className="mx-auto mt-5 max-w-md text-xs text-muted-foreground">
          上面是真实组件而非截图：点节点下方的 ± 圆盘，看默认动画收起整棵子树。
        </p>
      </div>
    </section>
  )
}
