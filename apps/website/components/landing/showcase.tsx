'use client'

import { Tabs, Typography } from '@heroui/react'

import { HeroTree } from '@/components/demo/hero-tree'
import { SectionHeader } from '@/components/landing/section-header'
import { THEME_LIST } from '@/lib/facts'

/**
 * 布局与外观展示位（对应参考站的 Stacks 段）
 *
 * 参考站那一格是「同一产品的五种技术栈实现」，本站对应的可变量是布局与外观，
 * 所以这里换成三种 direction/onlyBothTree 组合 + 两种连接线 + 六套主题的实拍：
 * 全部是同一个 `<OkrTree>` 实例配置不同 props，不是截图或假界面。
 *
 * 三种布局用 Tabs 单格切换而不是三张卡并排：并排时每格只有约 370px，
 * 而 OKR 双树的自然宽度约 600px、水平约 420px，会被压出横向滚动条，
 * 视觉上就是节点挤到下一行。切换器用 HeroUI 的 Tabs（react-aria），
 * 键盘方向键与 `aria-selected` 由它自带，本站不再手搓滑块。
 */
const LAYOUTS = [
  {
    key: 'vertical',
    label: '垂直',
    title: 'direction="vertical"',
    description: '默认形态：自上而下分层，子节点在父节点下方居中排布。',
  },
  {
    key: 'horizontal',
    label: '水平',
    title: 'direction="horizontal"',
    description: '组织架构图常用形态：同层节点竖排成一列，向右生长。',
  },
  {
    key: 'okr',
    label: 'OKR 双树',
    title: 'onlyBothTree + alignRoot',
    description: '飞书 OKR 形态：leftData 在根节点左侧展开，右树同组件同 API，左树是完整镜像。',
  },
] as const

/** 主题标签：键来自库的 BUILT_IN_THEMES，这里只补人类可读的说明 */
const THEME_LABELS: Record<(typeof THEME_LIST)[number], string> = {
  default: 'default（原版外观）',
  feishu: 'feishu',
  dark: 'dark',
  auto: 'auto（跟随系统）',
  minimal: 'minimal',
  colorful: 'colorful（按层级着色）',
}

function DemoFrame({
  children,
  title,
  description,
}: {
  children: React.ReactNode
  title: string
  description: string
}) {
  return (
    <figure className="frame flex h-full flex-col">
      <div className="okr-demo-canvas overflow-x-auto px-4 py-8">
        {/* 装得下就居中，装不下就横向滚动——不这样树会贴着卡片左边。
            w-max 让树按自然宽度铺开（w-fit / min-w-full 都会被压回可用宽度而换行）；
            `okr-demo-canvas` 是站点侧暗色适配锚点，显式传 theme 的树不受影响 */}
        <div className="mx-auto w-max">{children}</div>
      </div>
      <figcaption className="mt-auto border-t border-border px-6 py-5">
        <p className="font-mono text-sm font-semibold">{title}</p>
        <Typography className="mt-1.5 leading-relaxed" color="muted" type="body-xs">
          {description}
        </Typography>
      </figcaption>
    </figure>
  )
}

export function Showcase() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="02 / 布局与外观"
          sub="下面每一块都是真实渲染的 OkrTree，差别只有 props。几何（节点间距、连线端点、层叠顺序）由同一套 CSS 变量驱动。"
          title="三种布局，一个组件"
        />

        {/* 切换器：紧凑的 segmented control，不用全宽下划线。
            选中态用 data-[selected=true]: 变体直接上底色，而不是 HeroUI 的 `Tabs.Indicator`
            （RAC 的 SelectionIndicator 在静态导出预渲染时抛 `SharedElement` 上下文错误，
            见 docs/acceptance.md 的暗黑终端改版批）。react-aria 的键盘方向键与 aria-selected
            不受影响。 */}
        <Tabs align="center" className="mt-10" defaultSelectedKey="vertical">
          <Tabs.ListContainer className="mx-auto w-fit rounded-full border border-border bg-surface p-1">
            <Tabs.List>
              {LAYOUTS.map(item => (
                <Tabs.Tab
                  key={item.key}
                  className="h-9 w-auto rounded-full px-5 text-muted transition-colors data-[selected=true]:bg-default data-[selected=true]:text-foreground"
                  id={item.key}
                >
                  {item.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>

          {LAYOUTS.map(item => (
            <Tabs.Panel key={item.key} className="pt-6" id={item.key}>
              <DemoFrame title={item.title} description={item.description}>
                {/* labelWidth 120：OKR 左树的「战略投资部」在 104 宽下会折成两行 */}
                <HeroTree layout={item.key} showCollapsable defaultExpandAll labelWidth={120} />
              </DemoFrame>
            </Tabs.Panel>
          ))}
        </Tabs>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <DemoFrame
            title='connector="svg"（curve）'
            description="连接线换成覆盖层路径，布局零改动；展开收起时经突变订阅重绘，另有 orthogonal 与 straight 两种形状。"
          >
            <HeroTree layout="horizontal" connector="svg" connectorShape="curve" defaultExpandAll />
          </DemoFrame>
          <DemoFrame
            title="unstyled"
            description="只保留结构与布局，卡片外观与连线全部中和——需要完全自绘样式时的起点，打印样式也走这条路。"
          >
            <HeroTree layout="vertical" unstyled defaultExpandAll />
          </DemoFrame>
        </div>

        <div className="mt-16">
          <Typography className="text-center" type="h3" weight="semibold">
            六套内置主题
          </Typography>
          <Typography className="mx-auto mt-2 max-w-lg text-center" color="muted" type="body-xs">
            主题只是根容器上的一个 <code className="font-mono">okr-theme-*</code> 类，全部取值来自{' '}
            <code className="font-mono">--okr-*</code> 变量；自写一个类即可接入第 7
            套。主题卡片内衙中性浅色画布：六套里有四套只改线色 / 圆角 / 阴影 / 选中色，
            离开浅底就看不出区别。
          </Typography>
          {/* 一行两列：三列时每格只有约 370px，装不下这棵树（自然宽约 340 + 卡片内边距），
              节点会被压到下一行 */}
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {THEME_LIST.map(theme => (
              <div key={theme} className="frame p-5">
                <Typography className="mb-4 font-mono" color="muted" type="body-xs">
                  {THEME_LABELS[theme]}
                </Typography>
                {/* 主题本色画布刻意钉浅色：四套主题只改线色 / 圆角 / 阴影 / 选中色，
                    暗底上会全部糊成一团（原因见 app/globals.css 的 .canvas-light） */}
                <div className="canvas-light overflow-x-auto rounded-sm px-3 py-4">
                  <div className="mx-auto w-max">
                    <HeroTree theme={theme} defaultExpandAll labelWidth={104} />
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
