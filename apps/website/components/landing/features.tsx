import { Typography } from '@heroui/react'
import { ImageDown, Keyboard, MousePointerClick, Palette, TreeDeciduous, Zap } from 'lucide-react'
import Link from 'next/link'

import { SectionHeader } from '@/components/landing/section-header'
import { FACTS } from '@/lib/facts'

/**
 * 特性段：与 vue3-okr-tree 文档站首页的六张特性卡逐条对齐（3 列 × 2 行）。
 *
 * 每条都对应真实存在的 prop 或组件，不做「规划中的能力」的宣传：
 * 虚拟滚动、反向布局、Devtools 是源项目 roadmap 未开工项，这里一律不提。
 * 版式用 hairline 网格（外层 bg-border + gap-px，每格铺 bg-background），
 * 不用卡片阴影——终端风格里分隔靠线不靠光影；整格仍可点，跳到对应文档页。
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
    description: `${FACTS.themes} 套内置主题，外观取值全部可用 --okr-* 变量覆写。`,
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
  return (
    <section className="border-t border-border" id="features">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="03 / 特性"
          sub="渲染、交互、导出全部内建；外观走 CSS 变量，不需要构建期配置。"
          title="一棵树覆盖组织架构与 OKR 两类场景"
        />

        <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(feature => (
            <Link
              key={feature.title}
              className="flex flex-col gap-2.5 bg-background px-6 py-7 transition-colors hover:bg-surface"
              href={feature.href}
            >
              <feature.icon
                aria-hidden
                className="size-5 text-accent"
                size={20}
                strokeWidth={1.6}
              />
              <Typography type="body-sm" weight="medium">
                {feature.title}
              </Typography>
              <Typography color="muted" type="body-xs">
                {feature.description}
              </Typography>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
