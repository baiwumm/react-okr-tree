'use client'

import Link from 'next/link'
import { AnimatedBadge } from '@/components/motion/animated-badge'
import { BouncyAccordion } from '@/components/motion/bouncy-accordion'

/**
 * 问答区：只回答「装之前就要知道」的六件事，答案与 docs/requirements.md 对齐。
 *
 * 手风琴用 beUI 的 BouncyAccordion（与参考站同一件）：分组联动展开、共享 layoutId
 * 滑块、减弱动效时降级。代价是这块从「零 JS 的 <details>」变成客户端组件——
 * 静态导出下答案文本仍在 SSR 的 HTML 里（非活动面板用 hidden 保留，不脱离 DOM）。
 */
const FAQ = [
  {
    q: 'React 版本要求是多少？',
    a: (
      <>
        peer 是 <code className="font-mono">react / react-dom &gt;= 18.2.0</code>，React 19
        也在范围内。 之所以不停在 19：18.2 起{' '}
        <code className="font-mono">useSyncExternalStore</code>{' '}
        与并发渲染已经齐备，再抬高等级只会白丢用户。 本仓库的 peer 矩阵作业会额外用 React 18.2 +{' '}
        <code className="font-mono">@types/react@18</code> 编一份消费者示例，确保产出的 d.ts 不引用
        React 19 独有类型。
      </>
    ),
  },
  {
    q: '支持 SSR / 静态导出吗？',
    a: (
      <>
        支持。渲染路径上不碰 <code className="font-mono">window</code> /{' '}
        <code className="font-mono">document</code>
        ，浏览器专属能力（ResizeObserver、滚轮监听、字体就绪测量） 全部放在 effect 里；订阅层给{' '}
        <code className="font-mono">useSyncExternalStore</code> 备了常量{' '}
        <code className="font-mono">getServerSnapshot</code>，所以服务端不会 hydration 报警。
        一个约束：受控初始值（<code className="font-mono">expandedKeys</code> /{' '}
        <code className="font-mono">currentKey</code>）在 store 创建期就写入，首屏 HTML 即最终状态。
      </>
    ),
  },
  {
    q: '和 vue3-okr-tree 是什么关系？',
    a: (
      <>
        同一套功能的 React 移植，属性 / 事件 / 方法逐项对齐，连原版的拼写错误也原样保留（
        <code className="font-mono">showCollapsable</code>、
        <code className="font-mono">currentLableClassName</code>
        ），这样两端可以共用一份功能核对清单。 差异集中在机制层面：kebab-case → camelCase、事件 →{' '}
        <code className="font-mono">onXxx</code> 回调、插槽 → render props、
        <code className="font-mono">v-model:x</code> → <code className="font-mono">x</code> +{' '}
        <code className="font-mono">onXxxChange</code>。 完整对照见
        <Link href="/docs/migration"> 迁移说明</Link>。
      </>
    ),
  },
  {
    q: '我直接改了 data 里的对象，树为什么没更新？',
    a: (
      <>
        React 没有 Vue 那套深监听。<code className="font-mono">data</code>{' '}
        换了引用一定会重建；同引用原地 push / splice
        则靠组件渲染时的结构脏检查接住——前提是宿主确实重渲染了。
        如果是第三方状态库改的数据而组件没重渲染，显式调用{' '}
        <code className="font-mono">ref.refreshData()</code>{' '}
        兜底。另外增删类方法会回写你传入的源数据（与源项目一致），冻结对象上这类回写会静默跳过并给一次开发期警告。
      </>
    ),
  },
  {
    q: '包有多大？会不会带进一堆依赖？',
    a: (
      <>
        零运行时依赖：<code className="font-mono">react</code> /{' '}
        <code className="font-mono">react-dom</code> 是 peer，
        <code className="font-mono">html-to-image</code> 只是 optional peer（只有{' '}
        <code className="font-mono">exportImage</code> 用到，走变量化的动态
        import，不装也不会被打进包）。 CSS 单独一条{' '}
        <code className="font-mono">react-okr-tree/style.css</code>，不引样式就是纯结构。
        体积门禁写在 package.json 的 size-limit 段，CI 每次都量。
      </>
    ),
  },
  {
    q: '键盘可用吗？暗色怎么给？',
    a: (
      <>
        <code className="font-mono">role=tree / treeitem / group</code> 齐备，漫游 tabindex
        全局唯一， 方向键与 Home / End 沿可见节点移动，OKR 模式下左右树之间用 ← / → 跨接；
        系统开了「减弱动态效果」时，展开动画与平滑滚动自动按关闭处理。 外观是{' '}
        <code className="font-mono">theme</code> prop（6 套内置）加{' '}
        <code className="font-mono">--okr-*</code> 变量覆盖，
        <code className="font-mono">auto</code> 跟随系统，也可以完全自绘（
        <code className="font-mono">unstyled</code>）。
      </>
    ),
  },
]

export function Faq() {
  return (
    <section className="relative border-b border-dashed border-black/10 py-20 dark:border-white/10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-4 flex justify-center">
            <AnimatedBadge size="sm">FAQ</AnimatedBadge>
          </div>
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            装之前大概会问的
          </h2>
        </div>
        <BouncyAccordion
          collapsible
          defaultValue={null}
          items={FAQ.map((item, i) => ({ id: `faq-${i}`, title: item.q, description: item.a }))}
        />
      </div>
    </section>
  )
}
