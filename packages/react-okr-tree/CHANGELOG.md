# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。**版本号自 1.13.0 起与 [`vue3-okr-tree`](https://github.com/baiwumm/vue3-okr-tree) 锁步发布**：同号即同一功能面，版本决策（patch / minor / major）永远先在上游发生，本包跟随——上游发版后对齐移植，无对应变更也发同号空版本；特性面差异只发生在机制层（见 `docs/requirements.md` 第 8 节的 D1–D12）。

## Unreleased

### 工程化（无对外行为变更）

与上游 `vue3-okr-tree` 同批次的断言补全，收口 `docs/acceptance.md` 的 G3 / G5 / G10：

- **`verify:dist` 的 UMD 断言由恒真改为真实执行**（G10）。原先是 `assert(/factory\(exports, React\)/.test(src) || /React/.test(src))`——第一个分支因产物被压缩成 `(e,t)` 而永不匹配，第二个分支对任何含 `ReactOkrTree` 字样的产物恒真，等于没有断言。现在改为：断言 UMD 的 CJS 分支确实 `require('react')`（即 react 未被内联），并用 `new Function('module','exports','require', src)` 真跑一遍，断言 `default === OkrTree`、`BUILT_IN_THEMES` 为 6 项
- **六种内置过渡名逐个断言**（G5）。此前只有 `okr-fade-in` 一种进测试，其余五种被删掉也不会有人发现；`verify:dist` 的 CSS 侧同步由「只钉一组」改为逐个断 `enter-active` / `leave-active`
- **警告前缀 `[react-okr-tree]` 补断言**（G3）。此前测试只断警告文案，前缀本身零覆盖
- 单测 252 → **259** 条（26 个文件），覆盖率维持 92.96 / 85.52 / 94.96 / 95.71

## 1.13.0（2026-09-21）

首个发布版本，版本号直接取所对齐的上游版本（此前的 0.1.0 / 1.0.0 规划号从未发布到 npm）：
把 `vue3-okr-tree` 1.13.0 的全部能力搬到 React 上，并继承源项目 1.0.0 → 1.13.0 一路修出来的
九条行为结论（Q1–Q9）。42 个 props / 14 个事件 / 28 个 ref 方法 / 3 种布局 / 6 套主题 / 6 种动画，
`docs/requirements.md` 第 9 节是逐项验收清单。

### 新增

- **三种布局形态**：`direction` 垂直 / 水平，`onlyBothTree` + `leftData` 让子树在根节点左右两侧展开，
  左树是同一组件的完整镜像（同一套 props、同一套事件），不是另一份实现。
- **`alignRoot` 与 `OkrTreeGroup`**：前者用纯 CSS 固定根节点水平坐标，展开收起不再跳位；
  后者把多棵树的左栏宽度取组内最宽者对齐，测量走 `is-measuring` → 量 → 写 `--okr-group-left-width`，
  由 rAF 去重 + `ResizeObserver` + `document.fonts.ready` 三路触发。
- **`connector="svg"`**：伪元素连线换成覆盖层路径，布局零改动，三种形状（curve / orthogonal / straight）
  在展开收起时自动重绘。React 侧需要一条源项目没有的订阅：展开单个节点不会重渲染 `OkrTree`
  （这正是局部更新的目的），所以 `store.subscribeMutation()` 顶上 Vue 的 `onUpdated`。
- **勾选、拖拽、懒加载、受控与非受控双模**：复选框带父子联动与半选；HTML5 拖拽分上/中/下三区
  （prev / inner / next）并禁止放进自身子树；`lazy` 首次展开时取数；`expandedKeys` / `currentKey`
  成对 props 即受控，不传即非受控。
- **`refreshData()`（D7）**：React 没有深监听，源数据被原地改动而宿主没重渲染时的显式兜底。
  三条路径的语义写进 README「数据变更检测」一节，`docs/perf.md` 有对应的耗时对照。
- **SSR / 静态导出安全**：渲染路径不碰 `window`，浏览器专属能力全在 effect 里，
  `useSyncExternalStore` 带常量 `getServerSnapshot`；受控初始值在 store 创建期就写入，
  首屏 HTML 即最终状态。三种产物格式首行都带 `'use client'`（RSC 边界）。
- **文档站即 Playground**：Next 16 + fumadocs 静态导出，24 个可交互 Demo 直接长在文档里，
  源码由构建期 `readFileSync` 读真实组件文件生成，不存在第二份会漂移的代码字符串。
  站内搜索跑在浏览器里（`staticClient` + 导出的静态索引），不需要任何服务端。

### 变更（相对 `vue3-okr-tree`，即框架强制的差异）

- 事件 → `onXxx` 回调 props；具名插槽 → render props（`renderNode` / `renderExpandBtn` / `empty` /
  `renderToolbar`）；`v-model:x` → `x` + `onXxxChange`；`kebab-case` → `camelCase`。
- `renderContent(node)` 不再收 Vue 的 `h`（D1）；回调参数去掉 `nodeComponent`（D2）。
- 不再有 `createTypedOkrTree<T>`，`OkrTree<T>` 本身就是泛型组件（D5）；插件式全局注册移除，
  默认导出改为组件本身（D6）。
- 原版的拼写错误 `showCollapsable` / `currentLableClassName` **刻意保留**，好让两端能共用同一份
  功能核对清单。

### 修复过程中补上的 React 侧缺陷（都有测试钉住）

- `connector="svg"` 的稳态死循环：渲染后排帧重绘 + `setEdges` 无条件换新引用会形成
  重绘 → 重渲染 → 再排帧的永动回路（Vue 直接写 DOM，没有这条）。改为逐项比对路径 `d`，未变则保持引用。
- 漫游 tabindex 不再唯一：`onFocus` 由会冒泡的 `focusin` 映射而来，祖先 treeitem 会抢走后代的焦点归属；
  以及「无焦点节点时由首个根节点持有 0」的兜底持有者未被通知。
- 兄弟节点 key 在 `nodeKey` 指向缺失字段时全为 `undefined`，React 无法区分兄弟会误复用子树；
  回退到 `TreeNode` 自增 id。
- 渲染定制与卡片尺寸那一组 props 运行时变更静默失效（只写在 `configRef` 里，而节点组件是 memo 的），
  违反「要么生效、要么警告」的策略；补一次全树通知。
- `onNodeDrop` 的第 4 个参数类型标成 DOM `DragEvent`，实参是 React 合成事件。
- optional peer 的动态导入只带 `@vite-ignore`：Next 16 的 Turbopack 不认，会对变量说明符报构建期
  Module not found——库能发出去但下游装不上。补齐 `webpackIgnore` / `turbopackIgnore`，
  并在 `verify:dist` 加了断言（含「`'use client'` 必须以分号收尾」，否则压缩后变成把字符串当函数调用）。

### 质量门禁

252 条 Vitest 用例（模型层 / 组件 / SSR / 产物边界，覆盖率 92.96% 语句 / 85.52% 分支）；
15 张 Playwright 视觉基线 + 冒烟 + 计算样式契约；`publint` + `attw` 全绿；
size-limit：ESM 18.48 kB、CSS 3.79 kB、UMD 16.66 kB（gzip）。
