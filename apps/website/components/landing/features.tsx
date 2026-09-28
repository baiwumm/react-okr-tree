'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { ImageDown, Keyboard, MousePointerClick, Palette, TreeDeciduous, Zap } from 'lucide-react'
import { AnimatedBadge } from '@/components/motion/animated-badge'
import { TiltCard } from '@/components/motion/tilt-card'

/**
 * 特性卡：与 vue3-okr-tree 文档站首页的六张特性卡逐条对齐（3 列 × 2 行）。
 *
 * 每条都对应真实存在的 prop 或组件，不做「规划中的能力」的宣传：
 * 虚拟滚动、反向布局、Devtools 是源项目 roadmap 未开工项，这里一律不提（见 §10）。
 * 卡片整体可点，跳到本站对应的文档页。
 */
const FEATURES = [
  {
    icon: TreeDeciduous,
    title: 'OKR 左右双向展开',
    description: '内建 alignRoot 根对齐，展开收起不位移。',
    href: '/docs/start',
  },
  {
    icon: Palette,
    title: 'CSS 变量主题化',
    description: '六套内置主题，外观取值全部可用 --okr-* 变量覆写。',
    href: '/docs/theme',
  },
  {
    icon: MousePointerClick,
    title: '交互完备',
    description: '复选框联动、拖拽换父级、手风琴、点击节点展开。',
    href: '/docs/guide/interaction',
  },
  {
    icon: Zap,
    title: '大数据量友好',
    description: '懒加载 + 逐层脏检查，2000 节点首渲染 < 300ms。',
    href: '/docs/guide/lazy',
  },
  {
    icon: ImageDown,
    title: '画布缩放与导出',
    description: '滚轮缩放、拖拽平移、适应窗口、PNG / SVG 导出。',
    href: '/docs/guide/viewport',
  },
  {
    icon: Keyboard,
    title: 'WAI-ARIA 可访问性',
    description: '漫游 tabindex、方向键导航、OKR 左树镜像。',
    href: '/docs/guide/keyboard',
  },
]

export function Features() {
  const reduce = useReducedMotion()

  return (
    <section className="relative border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-4 flex justify-center">
            <AnimatedBadge size="sm">Features</AnimatedBadge>
          </div>
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            一棵树覆盖组织架构与 OKR 两类场景
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            渲染、交互、导出全部内建；外观走 CSS 变量，不需要构建期配置。
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: (i % 3) * 0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              {/* TiltCard 做外层倾斜 wrapper：glare 光斑的圆角裁剪
                  与卡片圆角对齐都在这层 */}
              <TiltCard max={6} className="h-full rounded-[1.5rem]">
                <Link
                  href={feature.href}
                  className="glass-card flex h-full flex-col rounded-[1.5rem] p-6"
                >
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-foreground/10 to-transparent">
                    <feature.icon size={20} className="text-foreground" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-5 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </Link>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
