'use client'

import { Button, Typography } from '@heroui/react'
import { BookOpen, MonitorPlay } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { HeroTree } from '@/components/demo/hero-tree'
import { SpecSheet } from '@/components/landing/spec-sheet'
import { GithubIcon } from '@/components/ui/brand-icons'
import { FACTS } from '@/lib/facts'
import { SITE } from '@/lib/site'

/**
 * 主视觉（对应参考站的 Hero + SpecSheet + 数据行）
 *
 * 右侧不是仿制界面也不是插画，而是组件真实接受的 props 规格表；下方窗口里是**真实的
 * `<OkrTree>`**——组件本身 SSR 安全（requirements R8），静态导出下首屏就是渲染好的树，
 * 点 ± 圆盘可以现场收起展开。窗口只做终端样式的外框，不做透视倾斜：这块内容要能读、能点。
 */
const MAC_DOTS = ['#ff5f57', '#febc2e', '#28c840']

const STATS = [
  { label: '布局形态', value: FACTS.layouts },
  { label: '内置主题', value: FACTS.themes },
  { label: '展开动画', value: FACTS.animations },
  { label: '运行时依赖', value: FACTS.runtimeDeps },
]

function TreeWindow() {
  const host = SITE.url.replace(/^https?:\/\//, '')

  return (
    <div className="reveal frame mt-14" style={{ animationDelay: '480ms' }}>
      {/* 终端窗框：三颗窗控圆点 + 地址条，只用 hairline 与表面色，不带阴影 */}
      <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2.5">
        {MAC_DOTS.map(color => (
          <span
            key={color}
            className="size-2.5 rounded-full ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="ms-3 flex h-5 flex-1 items-center justify-center rounded-full bg-default font-mono text-[10px] text-muted">
          {host}/docs
        </span>
      </div>
      <div className="overflow-x-auto px-6 py-10">
        <div className="okr-demo-canvas mx-auto w-max rounded-md p-2">
          <HeroTree layout="vertical" showCollapsable defaultExpandAll animate />
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  const router = useRouter()

  return (
    <section className="relative overflow-hidden">
      {/* 朱红氛围光：低占比 radial，只铺首屏右上方 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(760px circle at 80% 22%, color-mix(in oklab, var(--accent) 14%, transparent), transparent 70%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-6 pt-16 pb-14 sm:pt-24">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <Typography className="eyebrow reveal" type="body-xs" weight="semibold">
              React 组件 · 与 vue3-okr-tree 锁步 · MIT
            </Typography>

            <Typography
              className="reveal max-w-xl text-balance text-4xl leading-[1.12] tracking-tight sm:text-5xl"
              style={{ animationDelay: '80ms' }}
              type="h1"
              weight="semibold"
            >
              一套树组件
              <br />
              三种布局形态
            </Typography>

            <Typography
              className="reveal max-w-xl text-pretty leading-relaxed"
              color="muted"
              style={{ animationDelay: '160ms' }}
              type="body-sm"
            >
              垂直、水平与飞书 OKR 双树三种布局的组织架构图组件，内置六套主题、六种展开动画、CSS 与
              SVG 两种连接线，复选框、拖拽排序与懒加载开箱即用。
            </Typography>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                className="reveal"
                size="lg"
                style={{ animationDelay: '240ms' }}
                variant="primary"
                onPress={() => router.push('/docs/')}
              >
                <BookOpen className="size-4" />
                快速开始
              </Button>
              <Button
                className="reveal"
                size="lg"
                style={{ animationDelay: '320ms' }}
                variant="outline"
                onPress={() => router.push('/docs/guide/demos/')}
              >
                <MonitorPlay className="size-4" />
                Demo 总览
              </Button>
              <Button
                className="reveal"
                size="lg"
                style={{ animationDelay: '400ms' }}
                variant="tertiary"
                onPress={() => window.open(SITE.github, '_blank', 'noopener,noreferrer')}
              >
                <GithubIcon className="size-4" />
                GitHub
              </Button>
            </div>
          </div>

          <div className="reveal min-w-0 flex-1" style={{ animationDelay: '400ms' }}>
            <SpecSheet />
          </div>
        </div>

        {/* 数据行：hairline 分隔，等宽数字，不做卡片 */}
        <dl
          className="reveal mt-14 grid grid-cols-2 gap-8 border-t border-border pt-8 sm:grid-cols-4"
          style={{ animationDelay: '480ms' }}
        >
          {STATS.map(stat => (
            <div key={stat.label} className="flex min-w-0 flex-col gap-1">
              <dt>
                <Typography color="muted" type="body-xs">
                  {stat.label}
                </Typography>
              </dt>
              <dd className="font-mono text-3xl tabular-nums sm:text-4xl">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <TreeWindow />
      </div>
    </section>
  )
}
