'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import {
  GitCompareArrows,
  ListChecks,
  Palette,
  SlidersHorizontal,
  Spline,
  LayoutGrid,
  WandSparkles,
} from 'lucide-react'
import { AnimatedBadge } from '@/components/motion/animated-badge'

/**
 * 能力卡（requirements 4.1 / 5.x 的取样子集）
 *
 * 每条都对应真实存在的 prop 或组件，不做「规划中的能力」的宣传：
 * 虚拟滚动、反向布局、Devtools 是源项目 roadmap 未开工项，这里一律不提（见 §10）。
 */
const FEATURES = [
  {
    icon: LayoutGrid,
    title: '三种布局形态',
    description: '垂直、水平，以及子树在根节点左右两侧展开的 OKR 双树。',
  },
  {
    icon: GitCompareArrows,
    title: 'OKR 根对齐',
    description: 'alignRoot 纯 CSS 锁定根节点坐标；OkrTreeGroup 让多棵树左栏取最宽者对齐。',
  },
  {
    icon: Palette,
    title: '六套主题与 --okr-* 变量',
    description: '外观全部由 CSS 变量推导，自写一个类即可接入第 7 套主题。',
  },
  {
    icon: WandSparkles,
    title: '六种展开动画',
    description: 'fade 与四向 zoom 共 6 组过渡，时长可调，减弱动效时自动关闭。',
  },
  {
    icon: Spline,
    title: 'CSS 与 SVG 双连接线',
    description: '默认伪元素画线；connector="svg" 换成覆盖层路径，布局零改动。',
  },
  {
    icon: ListChecks,
    title: '勾选、拖拽与懒加载',
    description: '父子联动与半选、拖拽换父级、首次展开时按需取数。',
  },
  {
    icon: SlidersHorizontal,
    title: '受控与非受控双模',
    description: '传 expandedKeys / currentKey 即受控，不传即非受控；ref 方法三种入参通用。',
  },
]

export function Features() {
  const reduce = useReducedMotion()

  return (
    <section className="relative border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-4 flex justify-center">
            <AnimatedBadge size="sm">Capabilities</AnimatedBadge>
          </div>
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            组件能做的事，全部写进 API 表
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            以下每一条都对应一个真实 prop 或方法，与 vue3-okr-tree 的运行时行为逐项核对过。
          </p>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: (i % 4) * 0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="glass-card rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.12)]"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-foreground/10 to-transparent">
                <feature.icon size={20} className="text-foreground" strokeWidth={1.75} />
              </span>
              <h3 className="mt-5 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}

          {/* API 面统计卡：对齐参考站「功能对齐状态」那张卡的位置与作用——
              把抽象的「功能全」换成三个可数的数字，顺带补足 4 列栅格的最后一格 */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card flex flex-col rounded-3xl p-6"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-foreground/10 to-transparent">
              <span className="font-mono text-[11px] font-semibold text-foreground">API</span>
            </span>
            <h3 className="mt-5 font-semibold">API 面一览</h3>
            <dl className="mt-3 space-y-1.5 font-mono text-xs text-muted-foreground">
              <div className="flex items-baseline justify-between gap-2">
                <dt>props</dt>
                <dd className="text-foreground">42</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt>事件回调</dt>
                <dd className="text-foreground">14</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt>ref 方法</dt>
                <dd className="text-foreground">28</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              六张表由 shared/api.ts 单一来源驱动文档站，README 只留分组概览。
            </p>
            <Link
              href="/docs"
              className="mt-auto pt-4 text-sm font-semibold text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              查看 API 表 →
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
