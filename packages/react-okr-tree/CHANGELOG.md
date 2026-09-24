# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。**版本号自 1.13.0 起与 [`vue3-okr-tree`](https://github.com/baiwumm/vue3-okr-tree) 锁步发布**：同号即同一功能面，版本决策（patch / minor / major）永远先在上游发生，本包跟随——上游发版后对齐移植，无对应变更也发同号空版本；特性面差异只发生在机制层（见 `docs/requirements.md` 第 8 节的 D1–D12）。

## Unreleased

### 性能

- **同层整批换引用时 `updateChildren` 的 key 回退降为线性**：回退原本是 `oldNodes.find(n => !used.has(n) && n.key === k)`，同层 s 项全部换引用时第 i 项平均要扫 i 次 ⇒ 该层退化到 O(s²)。现改成一次建好的 `Map<key, TreeNode[]>` 索引。两处语义刻意保住——键不做 `String` 归一（原判断是 `===`，`11` 与 `'11'` 不该互配）、桶存数组而非单值（同层重复 key 时第二项要能命中第二个旧节点），各有一条用例钉住，换成朴素的 `Map<string, TreeNode>` 就当场红。量化取上游 `vue3-okr-tree` 的实测（把 `key` getter 包住计数）：`s=3200` 整轮换引用时 key 访问 16,005 次（=5s），旧实现按公式为 5,121,600 次（`s(s+1)/2`）；本包为同形实现，未单独复测计时。

### 修复

- **换绑 data 引用不再把整棵后代摘出注册表**：`data` 数组引用保持不变、只把某一层对象换成同 key 的新对象（轮询接口的典型局部更新）时，`TreeNode.updateChildren()` 的换绑分支原先调递归版 `store.deregisterNode()`——它连带删掉该节点全部后代在 `nodesMap` 里的登记，而复用路径不会重新登记，于是这些后代的 `getNode` / `getNodePath` / `setCurrentKey` / `remove` / `moveNode` 等按 key 的公开方法全部静默无操作，而节点仍照常渲染、仍可点击。改用新增的 `deregisterNodeSelf()`（只摘本节点）：该分支的匹配条件本就是 key 相等，后代的实例与 key 都没变，留在注册表里才是正确状态；真正被移除的节点仍由尾部注销循环递归清理。与上游 `vue3-okr-tree` 同批同形修复。

- **OKR 左树顶层的结构性增删不再只改模型**：`setLeftData` 把左树挂到右树首节点时原先浅拷贝 `[...leftRoot.childNodes]`，而左树顶层节点的 `parent` 正是 `leftRoot`——`remove` / `append` / `insertBefore` 与拖拽落点全都改在 `leftRoot` 的数组上，渲染读的 `firstRoot.leftChildNodes` 却是另一份，于是删掉的节点仍留在画面里（且已从 `nodesMap` 注销，按 key 再也碰不到它）、新增的节点看不见。改为与上游同形共用同一个数组（`shareLeftChildNodes`），并把 `leftRoot` 的结构性通知转给真正渲染这份列表的 `firstRoot`（`forwardStructuralNotify` + `notifyTarget`）：**只共数组引用不转通知，模型改了画面照样不动，两半缺一不可**（各做过一次只留一半的实验，都是三条用例全红）。上游 `vue3-okr-tree` 本就共用引用，同批补了一组同形用例当基线。

- **`contains` 把 OKR 左子树算进子树范围**：`moveNode` 的自环硬守卫与 `dropValid` 都靠 `TreeStore.contains()` 回答「目标是不是被拖节点的后代」，但它只递归 `childNodes`，而 OKR 左子树挂在 `leftChildNodes` 上——于是 `moveNode(OKR 根, 其左子树内的节点, 'inner')` 放行，根与左子树互相指向，`getVisibleNodes` 这类同时走两侧的遍历不再收敛。现一并递归 `leftChildNodes`；同时钉一条「右树节点仍可移进左子树」的用例，防止把 `reassignSide` 那条合法的跨侧路径一起堵死。与上游 `vue3-okr-tree` 同批同形。

- **挂载期不再白建一次 OKR 左树**：字段映射同步那个 effect 的依赖是 `[props.props]`，而 React 首次挂载后必然执行一次，于是每次挂载都跑一遍 `setData(同一引用)` + `bumpAll()`——前者末尾照样 `setLeftData` 把整棵左树重建（左树节点实例全换、子节点刚登记的 `nodeEls` 指向作废的旧实例），后者让全部节点多渲染一遍（实测 `n=1500` 时增量约 +31%）。改为与 `store.props` 现值逐项比对、内容相同直接跳过；这一并同时挡住使用方行内写 `props={{ label: 'title' }}` 时每次父渲染都重建的那条路。上游 `vue3-okr-tree` 的对应 watch 没有 `immediate`，挂载期本就不跑，故只有本包需要改（它的行内字面量路径仍会随父渲染重建，已记待办）。

### 首页与文档站

- **首页改走 beUI 组件**：从参考站 copy-in `components/motion/**` 六件（`Button` / `ButtonLink`、`TextReveal`、`AnimatedBadge`、`Tabs`、`BouncyAccordion`）与 `lib/{utils,ease}`、`lib/hooks/use-hover-capable`，新增依赖 `motion@^12.27.5`、`clsx@^2.1.1`、`tailwind-merge@^3.4.0`（beUI 是 shadcn registry 的源码件，不是 npm 包）。Hero 眉标 / 标题 / 按钮、Capabilities 卡、Layouts、FAQ、CTA 与导航版本胶囊全部换用这几件，入场动效由自研 `fade-up` keyframes 改为 `motion` 的 `whileInView`（自带 `useReducedMotion` 降级）。
- **删掉自研的「高级感」组件层**：`globals.css` 里 `.btn-solid` / `.btn-outline` / `.card-premium` / `.panel-premium` / `.window-premium` / `.pill-badge` / `.icon-tile` 与 `@keyframes fade-up` 一并移除（换成 beUI 的玻璃卡 `.glass-card` 后它们零引用），文件 552 → 261 行。亮色 `--card` 由 `oklch(1 0 0)` 改为 `oklch(0.97 0 0)`——beUI 的卡要求 card 与 background 有分离度；文档区走独立的 `--color-fd-card`，仍是纯白，不受影响。
- **Layouts 的节点溢出从根上解决**：三种布局原先三张卡并排，每格实测只有 371px，而树的自然宽度是垂直 337 / 水平 417 / OKR 双树 601，后两者被压着换行、节点掉到下面。改成 `Tabs` 单格切换（与参考站承载「同物多态」的做法一致），活动面板实测卡片 1088px、树 1054px、页面无横向溢出；卡内保留「装得下居中、装不下横向滚动」的 `w-max min-w-full` 兜底，两列的 connector / unstyled 两张同样受益。
- **Capabilities 七条特性文案精简**：每条从两三行压到一句，六套主题名与变量清单不再堆在卡片里（它们在主题页）。
- **对齐已发布实现修正五处**：`/docs/changelog` 把首次发布写成 1.0.0 且缺 1.13.0 / 1.14.0，而包 CHANGELOG 明确「0.1.0 / 1.0.0 只是规划号，从未发布」——现更正为首发 1.13.0（2026-09-21）并补 1.14.0 条目，真源路径改为 `packages/react-okr-tree/CHANGELOG.md`（仓库根并没有 CHANGELOG）；`deepWatch` 的「创建期快照、运行时不生效」与实现相反（它在 `OkrTree.tsx:796` 每次渲染读取），`guide/data`、`shared/api.ts`、`src/OkrTree.tsx` 注释与本包 README 四处一起更正，并点明这正是与 Vue 版的行为差异（Vue 侧 `deep-watch` 确为创建期快照）；`/docs/start` 的 peer 矩阵说成「18.2 与 19.2 两档」，实际 `ci.yml` 钉的是 `~18.2.0` 与 `~18.3.0`（React 19 由默认安装的 `verify` 作业覆盖）；`guide/typed` 的导出类型表补 `NodeScope` 与 `DropType`；主题页补 `BUILT_IN_THEMES` 这个可枚举导出（此前只在类型清单里出现）。

- **首页第二轮微调五项**：顶部导航由 `rounded-2xl` 改 `rounded-full`（实测高 50px，呈胶囊）；Hero 的演示窗口去掉 `perspective(1500px) rotateX(5deg)` 倾斜正放（真组件要留阅读性，倾斜是假界面的特权），左上三颗窗控点改成 macOS 配色 `#ff5f57 / #febc2e / #28c840` 并加 1px 内描边；Layouts 三个面板的树改为**水平居中**——关键是包裹层用 `w-max` 而不是 `w-fit` / `min-w-full`（后两者都会被压回可用宽度，于是内容在满宽容器里靠左），实测垂直 / 水平 / OKR 三档的左右间隙分别 363/363、333/333、241/241，完全对称；六套主题区从一行三列改一行两列（三列时每格约 370px 装不下自然宽约 362px 的树，节点会掉到下一行），改后卡宽 534、树 362、左右各 86px 且无需横向滚动。
- **换掉已废弃的 lucide 品牌图标**：新建 `apps/website/components/ui/brand-icons.tsx`（`GithubIcon` / `VueIcon`，路径取 simple-icons 当前版本，统一 `currentColor` 以适配明暗），替换 `docs/layout.tsx`、navbar（两处）、hero、cta、footer 共 6 处 `import { Github } from 'lucide-react'`。Vue 标志原图两色，这里两条路径同填 `currentColor` 取单色剪影——暗色底上原图的深灰那一半会看不见。
- **文档区侧栏底部加姊妹包入口**：GitHub 图标旁边新增一个 icon 型链接指向 [vue3-okr-tree 文档站](https://vue3-okr-tree.baiwumm.com)（`aria-label` 写明是「Vue 3 版」）。实测两个图标都是 30×30 按钮 / 18×18 图形、`fill` 解析为 currentColor，与同排的主题切换一致。
- **`theme-switch-animation` 升到 0.2.0**：`theme-toggle.tsx` 用的 `ThemeAnimationType` / `useThemeAnimation` 接口未变，`tsc` 与静态导出均通过。
- **补两页与上游对齐**：新增 `/docs/guide/node-content`（三种内容写法与优先级、`renderContent` 不接 `h` 即 D1、展开按钮优先序、`empty`）与 `/docs/guide/interaction`（复选框联动含 `disabled` 后代、`checkStrictly`、`onCheck` 与 `onCheckChange` 的触发差异、OKR 左右独立；拖拽 25/50/25 按 `direction` 换轴、防自嵌套硬规则、跨左右树默认禁止与放开后的注册表迁移、六个拖拽回调签名与合成事件）。这两页对应上游本批新加的 `guide/node-content.md` 与 `guide/interaction.md`——上轮只给 vue3 补了、react 没补，属于当时引入的不对称。注册进 `guide/meta.json` 与指南总览子页卡片，包 README 的指路表同步（「定制节点内容」从指向指南总览改为指向正式页）。
- **主题页补「连接线：CSS 与 SVG 两种渲染模式」一节**：三形状与 40px 控制点上限、锚点随模式镜像、非法 `connector` 值警告并按 css 渲染、**突变订阅 + ResizeObserver + 过渡期逐帧 rAF** 三重触发（只靠 ResizeObserver 不够，展开深层节点未必改动树根尺寸）。此前 `connector` 在 react 站只出现在用例标题与速查表一行。
- **正文不再写死 API 条数**：`42 个 props / 14 个回调 / 28 个 ref 方法` 这类数字原先散在 10 处（含三处 frontmatter description），全部改为不带条数的说法，条数只由 `shared/api.ts` 的表在 API 页呈现——与上游 vue3 站口径一致，也彻底消掉这类漂移面；历史发布说明里当期的数字保留（那是当时的事实）。规则写进仓库根 `AGENTS.md`。
- **README 指路表补两行**：「不知道从哪找：按能力速查 → 指南总览」与「目录结构、三份真源、命令与发布 → 仓库与本地开发」——这两页本包早就有，只是 README 没指；上游 vue3 同批补齐后两边指路表逐行对齐。
- **两处「当前对齐 v1.13.0」的表述去掉版本号**：`content/index.mdx` 与 `migration/index.mdx` 改为「自 1.13.0 起锁步发布」这类不会过期的说法；`/docs/changelog` 顶部写明**只摘要最近两个版本**，并记录为什么不做成 include（CHANGELOG 是纯 Markdown，含 `{` / `<` 的行会被 MDX 当表达式解析，将来任意一条新记录就能打断整站构建）。

### 文档（无对外行为变更）

- **README 由 659 行精简到 158 行**：只留定位、特性清单、安装、快速开始、OKR 模式、API 概览、「数据变更检测（React 侧必读）」与「需要注意的行为」要点，完整用法指向文档站对应页面（新增一节「完整文档」按场景列指路表）。上游 `vue3-okr-tree` 同批精简，两端章节骨架与措辞对齐；requirements 9.6 要求的五处硬性说明（D7 原地变更、Q3 回写源数据、`nodeKey` 缺失时注册表为空、冻结 / 只读边界、CDN 无开发期警告）仍以要点形式留在 README，展开机制说明落到 `guide/data`。
- **README 的 API 一节明确为手写概览，并把三处幽灵表述改成现状**：删掉「完整表格将在 1.1.0 由 `gen:readme` 从同一份数据生成」这条从未落地的计划（本包不提供该脚本），`shared/api.ts` 头注释的「三处消费」改为两处（`<ApiTable>` + `tests/api-surface.spec.tsx`）并写明 README 只留概览，文档站 `/docs/api` 首段与 `/docs/start/repo` 的「三份真源」表同步改写。仓库内 `docs/requirements.md`（6.4、11.4）与 `docs/development-plan.md`（9.7）各追加现状修正并把 `gen:readme` 后续项标作废，`docs/acceptance.md` 指向 `README:190` 的证据指针改指章节名（精简后行号失效）。
- 新增仓库根 `AGENTS.md`：固化「完整 API 表改 `shared/api.ts`、README 概览手写需顺手同步、单元格行内代码用 `<code>`、两端 README 骨架同步」四条约定。

## 1.14.0（2026-09-22）

跟随上游 `vue3-okr-tree` 1.14.0 同号发布（锁步约定）。上游本版本唯一的对外变更是新增 `BUILT_IN_THEMES` 导出——**本包早已导出它，故本版本对外 API 无变化**，内容全部是下面这批门禁断言补强。

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
