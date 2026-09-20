import Link from 'next/link'
import {
  GitCompareArrows,
  ListChecks,
  Palette,
  SlidersHorizontal,
  Spline,
  LayoutGrid,
  WandSparkles,
} from 'lucide-react'

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
    description:
      'direction 切垂直 / 水平，onlyBothTree 让子树在根节点左右两侧展开，左树是同一组件的完整镜像。',
  },
  {
    icon: GitCompareArrows,
    title: 'OKR 根对齐',
    description:
      'alignRoot 用纯 CSS 固定根节点水平坐标，展开收起不再跳位；OkrTreeGroup 让多棵树的左栏取最宽者对齐。',
  },
  {
    icon: Palette,
    title: '六套主题与 --okr-* 变量',
    description:
      'default / feishu / dark / auto / minimal / colorful 内置，全部外观由 --okr-* 变量推导，自定义主题只需自写一个类。',
  },
  {
    icon: WandSparkles,
    title: '六种展开动画',
    description:
      'animateName 提供 fade 与 zoom 四向共 6 组过渡，时长可调；系统开启「减弱动态效果」时自动按关闭处理。',
  },
  {
    icon: Spline,
    title: 'CSS 与 SVG 双连接线',
    description:
      '默认伪元素画线，connector="svg" 换成覆盖层路径且布局零改动，三种形状随展开收起自动重绘。',
  },
  {
    icon: ListChecks,
    title: '勾选、拖拽与懒加载',
    description:
      '复选框带父子联动与半选态，HTML5 拖拽换父级含 prev / inner / next 三区校验，lazy 首次展开时取数。',
  },
  {
    icon: SlidersHorizontal,
    title: '受控与非受控双模',
    description:
      'expandedKeys / currentKey 成对 props 即受控，不传即非受控；ref 上的方法接受 key、data、TreeNode 三种入参。',
  },
]

export function Features() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="pill-badge mx-auto mb-5 w-fit rounded-full px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Capabilities
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight">
            组件能做的事，全部写进 API 表
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            以下每一条都对应一个真实 prop 或方法，与 vue3-okr-tree 的运行时行为逐项核对过。
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(feature => (
            <div key={feature.title} className="card-premium p-6">
              <span className="icon-tile">
                <feature.icon size={20} className="text-foreground" strokeWidth={1.75} />
              </span>
              <h3 className="mt-5 font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}

          {/* API 面统计卡：对齐参考站「功能对齐状态」那张卡的位置与作用——
              把抽象的「功能全」换成三个可数的数字，顺带补足 4 列栅格的最后一格 */}
          <div className="card-premium flex flex-col p-6">
            <span className="icon-tile-sm">
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
              六张表由 shared/api.ts 单一来源驱动文档站与 README。
            </p>
            <Link
              href="/docs"
              className="mt-auto pt-4 text-sm font-semibold text-foreground underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              查看 API 表 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
