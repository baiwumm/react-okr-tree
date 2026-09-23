import { HeroTree } from '@/components/demo/hero-tree'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/motion/tabs'
import { AnimatedBadge } from '@/components/motion/animated-badge'

/**
 * 布局展示位（参考站 stacks.tsx 的位置）
 *
 * 参考站那一格是「同一产品的五种技术栈实现」，本站对应的可变量是布局与外观，
 * 所以这里换成三种 direction/onlyBothTree 组合 + 两种连接线 + 六套主题的实拍：
 * 全部是同一个 `<OkrTree>` 实例配置不同 props，不是截图或假界面。
 *
 * 三种布局改用 Tabs 单格切换而不是三张卡并排：并排时每格只有约 370px，
 * 而 OKR 双树的自然宽度约 600px、水平约 420px，会被压出横向滚动条，
 * 视觉上就是节点挤到下一行。参考站同样是用切换器承载这类「同物多态」。
 */
const LAYOUTS = [
  {
    layout: 'vertical',
    label: '垂直',
    title: 'direction="vertical"',
    description: '默认形态：自上而下分层，子节点在父节点下方居中排布。',
  },
  {
    layout: 'horizontal',
    label: '水平',
    title: 'direction="horizontal"',
    description: '组织架构图常用形态：同层节点竖排成一列，向右生长。',
  },
  {
    layout: 'okr',
    label: 'OKR 双树',
    title: 'onlyBothTree + alignRoot',
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

function DemoCard({
  children,
  title,
  description,
}: {
  children: React.ReactNode
  title: string
  description: string
}) {
  return (
    <figure className="glass-card flex flex-col overflow-hidden rounded-3xl">
      <div className="overflow-x-auto px-4 py-8">
        {/* 装得下就居中，装不下就横向滚动——不这样树会贴着卡片左边 */}
        {/* w-max 让树按自然宽度铺开（w-fit / min-w-full 都会被压回可用宽度而换行），
            mx-auto 则在卡片够宽时水平居中，不够宽时退化为横向滚动 */}
        <div className="mx-auto w-max">{children}</div>
      </div>
      <figcaption className="mt-auto border-t border-border/60 px-6 py-5">
        <p className="font-mono text-sm font-semibold">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </figcaption>
    </figure>
  )
}

export function Showcase() {
  return (
    <section className="relative border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-4 flex justify-center">
            <AnimatedBadge size="sm">Layouts</AnimatedBadge>
          </div>
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            三种布局，一个组件
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            下面每一块都是真实渲染的 <code className="font-mono text-[0.9em]">OkrTree</code>
            ，差别只有 props。几何（节点间距、连线端点、层叠顺序）由同一套 CSS 变量驱动。
          </p>
        </div>

        <Tabs defaultValue="vertical">
          <div className="mb-6 flex justify-center">
            <TabsList>
              {LAYOUTS.map(item => (
                <TabsTrigger key={item.layout} value={item.layout}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {LAYOUTS.map(item => (
            <TabsContent key={item.layout} value={item.layout}>
              <DemoCard title={item.title} description={item.description}>
                <HeroTree layout={item.layout} showCollapsable defaultExpandAll labelWidth={104} />
              </DemoCard>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <DemoCard
            title='connector="svg"（curve）'
            description="连接线换成覆盖层路径，布局零改动；展开收起时经突变订阅重绘，另有 orthogonal 与 straight 两种形状。"
          >
            <HeroTree layout="horizontal" connector="svg" connectorShape="curve" defaultExpandAll />
          </DemoCard>
          <DemoCard
            title="unstyled"
            description="只保留结构与布局，卡片外观与连线全部中和——需要完全自绘样式时的起点，打印样式也走这条路。"
          >
            <HeroTree layout="vertical" unstyled defaultExpandAll />
          </DemoCard>
        </div>

        <div className="mt-14">
          <h3 className="text-center text-lg font-semibold">六套内置主题</h3>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
            主题只是根容器上的一个 <code className="font-mono text-[0.9em]">okr-theme-*</code>{' '}
            类，全部取值来自 <code className="font-mono text-[0.9em]">--okr-*</code> 变量；
            自写一个类即可接入第 7 套。注意组件主题与站点明暗是两回事。
          </p>
          {/* 一行两列：三列时每格只有约 370px，装不下这棵树（自然宽约 340 + 卡片内边距），
              节点会被压到下一行 */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {THEMES.map(item => (
              <div key={item.theme} className="glass-card rounded-3xl p-5">
                <p className="mb-4 font-mono text-xs text-muted-foreground">{item.label}</p>
                <div className="overflow-x-auto">
                  <div className="mx-auto w-max">
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
