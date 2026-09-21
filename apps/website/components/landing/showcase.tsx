import { HeroTree } from '@/components/demo/hero-tree'

/**
 * 布局展示位（参考站 stacks.tsx 的位置）
 *
 * 参考站那一格是「同一产品的五种技术栈实现」，本站对应的可变量是布局与外观，
 * 所以这里换成三种 direction/onlyBothTree 组合 + 两种连接线 + 六套主题的实拍：
 * 全部是同一个 `<OkrTree>` 实例配置不同 props，不是截图或假界面。
 */
const LAYOUTS = [
  {
    layout: 'vertical',
    title: '垂直（direction="vertical"）',
    description: '默认形态：自上而下分层，子节点在父节点下方居中排布。',
  },
  {
    layout: 'horizontal',
    title: '水平（direction="horizontal"）',
    description: '组织架构图常用形态：同层节点竖排成一列，向右生长。',
  },
  {
    layout: 'okr',
    title: 'OKR 双树（onlyBothTree + alignRoot）',
    description: '飞书 OKR 形态：leftData 在根节点左侧展开，右树同组件同 API，左树是完整镜像。',
  },
] as const

const THEMES = [
  { theme: 'default', label: 'default（原版外观）' },
  { theme: 'feishu', label: 'feishu' },
  { theme: 'dark', label: 'dark' },
  { theme: 'auto', label: 'auto（跟随系统）' },
  { theme: 'minimal', label: 'minimal' },
  { theme: 'colorful', label: 'colorful（按层级着色）' },
] as const

export function Showcase() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="pill-badge mx-auto mb-5 w-fit rounded-full px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Layouts
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight">三种布局，一个组件</h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            下面每一块都是真实渲染的 <code className="font-mono text-[0.9em]">OkrTree</code>
            ，差别只有 props。几何（节点间距、连线端点、层叠顺序）由同一套 CSS 变量驱动。
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {LAYOUTS.map(item => (
            <figure key={item.layout} className="card-premium flex flex-col overflow-hidden p-0">
              <div className="overflow-x-auto px-4 py-8">
                <HeroTree layout={item.layout} showCollapsable defaultExpandAll labelWidth={104} />
              </div>
              <figcaption className="mt-auto border-t px-6 py-5">
                <p className="font-mono text-sm font-semibold">{item.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <figure className="card-premium flex flex-col overflow-hidden p-0">
            <div className="overflow-x-auto px-4 py-8">
              <HeroTree
                layout="horizontal"
                connector="svg"
                connectorShape="curve"
                defaultExpandAll
              />
            </div>
            <figcaption className="mt-auto border-t px-6 py-5">
              <p className="font-mono text-sm font-semibold">connector="svg"（curve）</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                连接线换成覆盖层路径，布局零改动；展开收起时经突变订阅重绘，另有 orthogonal 与
                straight 两种形状。
              </p>
            </figcaption>
          </figure>
          <figure className="card-premium flex flex-col overflow-hidden p-0">
            <div className="overflow-x-auto px-4 py-8">
              <HeroTree layout="vertical" unstyled defaultExpandAll />
            </div>
            <figcaption className="mt-auto border-t px-6 py-5">
              <p className="font-mono text-sm font-semibold">unstyled</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                只保留结构与布局，卡片外观与连线全部中和——需要完全自绘样式时的起点，打印样式也走这条路。
              </p>
            </figcaption>
          </figure>
        </div>

        <div className="mt-12">
          <h3 className="text-center text-lg font-semibold">六套内置主题</h3>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
            主题只是根容器上的一个 <code className="font-mono text-[0.9em]">okr-theme-*</code>{' '}
            类，全部取值来自 <code className="font-mono text-[0.9em]">--okr-*</code> 变量；
            自写一个类即可接入第 7 套。注意组件主题与站点明暗是两回事。
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map(item => (
              <div key={item.theme} className="panel-premium p-5">
                <p className="mb-4 font-mono text-xs text-muted-foreground">{item.label}</p>
                <div className="overflow-x-auto">
                  <div className="mx-auto w-fit">
                    <HeroTree theme={item.theme} defaultExpandAll labelWidth={104} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
