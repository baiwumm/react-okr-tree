import { BookOpen, Github } from 'lucide-react'
import Link from 'next/link'
import LightRays from '@/components/background/light-ray'
import { HeroTree } from '@/components/demo/hero-tree'
import { SITE } from '@/lib/site'

/**
 * 主视觉窗口（对应参考站的 AdminMockup）
 *
 * 差别在于这里**不是**仿制界面，而是真实的 `<OkrTree>`：组件本身 SSR 安全
 * （requirements R8），静态导出下首屏就是渲染好的树，点 ± 圆盘可以现场收起展开。
 * 因此整块不再 `aria-hidden` / `pointer-events-none`，只做一层轻微透视——
 * 参考站敢把角度给到 8deg，是因为那是假界面；真组件要留可点击的阅读性。
 */
function TreeWindow() {
  const host = SITE.url.replace(/^https?:\/\//, '')

  return (
    <div
      className="mx-auto mt-20 max-w-4xl"
      style={{ transform: 'perspective(1500px) rotateX(5deg)' }}
    >
      {/*
        透视挂外层、入场动画挂内层：`fade-up` 末帧是 `transform: none`，
        而动画在层叠里优先于内联 style，同元素叠加会把透视静默吃掉（参考站同注释）。
      */}
      <div className="animate-fade-up-delay-4">
        <div className="window-premium overflow-hidden rounded-2xl text-left">
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="ms-3 flex h-5 flex-1 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground/70">
              {host}/docs
            </span>
          </div>
          <div className="overflow-x-auto px-6 py-10">
            <HeroTree layout="vertical" showCollapsable defaultExpandAll animate />
          </div>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-40 pb-24 text-center">
      {/*
        背景光效参数照参考站收着用：`opacity` 压低整体强度、`rayLength` 收窄影响范围，
        只留首屏顶部这束光，不往页面下半部渗——白底上光束过量会像蒙了层灰纱。
      */}
      <LightRays
        className="pointer-events-none absolute inset-0 z-0 opacity-65"
        raysOrigin="top-center"
        rayLength={1.5}
        followMouse
      />
      {/* 极淡点阵材质，只在主视觉背后可见 */}
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-60"
      />
      <div className="relative">
        <div className="pill-badge animate-fade-up mx-auto mb-6 w-fit rounded-full px-4 py-1 text-xs font-medium text-muted-foreground">
          React 移植 · 与 vue3-okr-tree 特性逐条对齐
        </div>
        <h1 className="animate-fade-up-delay-1 text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          一套树组件
          <br />
          三种布局形态
        </h1>
        <p className="animate-fade-up-delay-2 mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          垂直、水平与飞书 OKR 双树三种布局的组织架构图 React 组件，内置六套主题、六种展开动画、CSS
          与 SVG 两种连接线，复选框、拖拽排序与懒加载开箱即用。
        </p>
        <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/docs/start" className="btn-solid px-6 py-2.5 text-sm font-bold">
            <BookOpen size={16} />
            快速开始
          </Link>
          <a
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            className="btn-outline px-6 py-2.5 text-sm font-bold text-foreground"
          >
            <Github size={16} />
            GitHub
          </a>
        </div>
        <TreeWindow />
        <p className="animate-fade-up-delay-4 mx-auto mt-5 max-w-md text-xs text-muted-foreground">
          上面是真实组件而非截图：点节点下方的 ± 圆盘，看默认动画收起整棵子树。
        </p>
      </div>
    </section>
  )
}
