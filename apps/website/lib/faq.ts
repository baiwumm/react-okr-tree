/**
 * 首页 FAQ 真源：页面手风琴与 FAQPage JSON-LD 共用同一份数据。
 *
 * 用纯字符串而不是 ReactNode：结构化数据要的是纯文本，两份各写一遍必然漂移。
 * 反引号在这里是「行内代码」的轻标记，由 `components/landing/faq.tsx` 里的
 * `renderInline()` 拆开渲染；喂给 JSON-LD 前会把反引号剥掉。
 */
export const FAQ_ITEMS = [
  {
    value: 'react-version',
    title: 'React 版本要求是多少？',
    content:
      'peer 是 `react` / `react-dom >= 18.2.0`，React 19 也在范围内。18.2 起 `useSyncExternalStore` 与并发渲染已经齐备，再抬高下限只会白丢用户。peer 矩阵作业会额外用 React 18.2 + `@types/react@18` 编一份消费者示例，确保产出的 d.ts 不引用 React 19 独有类型。',
  },
  {
    value: 'ssr',
    title: '支持 SSR / 静态导出吗？',
    content:
      '支持。渲染路径上不碰 `window` / `document`，浏览器专属能力（ResizeObserver、滚轮监听、字体就绪测量）全部放在 effect 里；订阅层给 `useSyncExternalStore` 备了常量 `getServerSnapshot`，服务端不会报 hydration 警告。一个约束：受控初始值（`expandedKeys` / `currentKey`）在 store 创建期就写入，首屏 HTML 即最终状态。',
  },
  {
    value: 'vue-relation',
    title: '和 vue3-okr-tree 是什么关系？',
    content:
      '同一套功能的 React 移植，属性 / 事件 / 方法逐项对齐，连原版的拼写错误也原样保留（`showCollapsable` / `currentLableClassName`），这样两端可以共用一份功能核对清单。差异集中在机制层面：kebab-case → camelCase、事件 → `onXxx` 回调、插槽 → render props、`v-model:x` → `x` + `onXxxChange`。完整对照见「迁移说明」文档。',
  },
  {
    value: 'data-update',
    title: '我直接改了 data 里的对象，树为什么没更新？',
    content:
      'React 没有 Vue 那套深监听。`data` 换了引用一定会重建；同引用原地 push / splice 则靠组件渲染时的结构脏检查接住，前提是宿主确实重渲染了。如果是第三方状态库改的数据而组件没重渲染，显式调用 `ref.refreshData()` 兜底。另外增删类方法会回写你传入的源数据，冻结对象上这类回写会静默跳过并给一次开发期警告。',
  },
  {
    value: 'size',
    title: '包有多大？会不会带进一堆依赖？',
    content:
      '零运行时依赖：`react` / `react-dom` 是 peer，`html-to-image` 只是 optional peer（只有 `exportImage` 用到，走变量化的动态 import，不装也不会被打进包）。CSS 单独一条 `react-okr-tree/style.css`，不引样式就是纯结构树。体积门禁写在 package.json 的 size-limit 段，CI 每次都量。',
  },
  {
    value: 'a11y-theme',
    title: '键盘可用吗？暗色怎么给？',
    content:
      '`role=tree / treeitem / group` 齐备，漫游 tabindex 全局唯一，方向键与 Home / End 沿可见节点移动，OKR 模式下左右树之间用 ← / → 跨接；系统开了「减弱动态效果」时，展开动画与平滑滚动自动按关闭处理。外观是 `theme` prop（6 套内置）加 `--okr-*` 变量覆盖，`auto` 跟随系统，也可以完全自绘（`unstyled`）。',
  },
] as const
