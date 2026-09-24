# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。**版本号自 1.13.0 起与 [`vue3-okr-tree`](https://github.com/baiwumm/vue3-okr-tree) 锁步发布**：同号即同一功能面，版本决策（patch / minor / major）永远先在上游发生，本包跟随——上游发版后对齐移植，无对应变更也发同号空版本；特性面差异只发生在机制层（见 `docs/requirements.md` 第 8 节的 D1–D12）。

## Unreleased

### 性能

- **`aria-setsize` / `aria-posinset` 不再每子扫一遍兄弟**：`renderChildren` 与根层各自 `list.filter(...)` 后在 `map` 里对可见数组做 `indexOf(child)`，同层 s 个节点就是 O(s²)。新增 `src/aria-set.ts` 的 `setPositions(list)` 单遍算好 `{size,pos}` 两处共用（语义逐字不变：隐藏兄弟不计入、自身不可见时 pos 为 0、左右两树各自成组）。改后源码里已无 `visible.indexOf` 残留。
- **复选框一次点击从 4 次全树遍历降到 1 次**：`check` 事件的 payload 原先由 `getCheckedNodes()` / `getCheckedKeys()` / `getHalfCheckedNodes()` / `getHalfCheckedKeys()` 四次调用拼成，而两个 key 版内部各自还要再调一次节点版 ⇒ 一次点击要走 4 遍全树（含整棵 OKR 左树）。新增 `collectCheckState(leafOnly)` 一次遍历算齐四份，四个公开方法原样保留。语义逐字不变：`String(key)` 去重、遍历顺序、跳过空 key、checked 的节点不进半选列表。与上游 `vue3-okr-tree` 同批同形。
- **同层整批换引用时 `updateChildren` 的 key 回退降为线性**：回退原本是 `oldNodes.find(n => !used.has(n) && n.key === k)`，同层 s 项全部换引用时第 i 项平均要扫 i 次 ⇒ 该层退化到 O(s²)。现改成一次建好的 `Map<key, TreeNode[]>` 索引。两处语义刻意保住——键不做 `String` 归一（原判断是 `===`，`11` 与 `'11'` 不该互配）、桶存数组而非单值（同层重复 key 时第二项要能命中第二个旧节点），各有一条用例钉住，换成朴素的 `Map<string, TreeNode>` 就当场红。量化取上游 `vue3-okr-tree` 的实测（把 `key` getter 包住计数）：`s=3200` 整轮换引用时 key 访问 16,005 次（=5s），旧实现按公式为 5,121,600 次（`s(s+1)/2`）；本包为同形实现，未单独复测计时。

### 修复

- **换绑 data 引用不再把整棵后代摘出注册表**：`data` 数组引用保持不变、只把某一层对象换成同 key 的新对象（轮询接口的典型局部更新）时，`TreeNode.updateChildren()` 的换绑分支原先调递归版 `store.deregisterNode()`——它连带删掉该节点全部后代在 `nodesMap` 里的登记，而复用路径不会重新登记，于是这些后代的 `getNode` / `getNodePath` / `setCurrentKey` / `remove` / `moveNode` 等按 key 的公开方法全部静默无操作，而节点仍照常渲染、仍可点击。改用新增的 `deregisterNodeSelf()`（只摘本节点）：该分支的匹配条件本就是 key 相等，后代的实例与 key 都没变，留在注册表里才是正确状态；真正被移除的节点仍由尾部注销循环递归清理。与上游 `vue3-okr-tree` 同批同形修复。

- **OKR 左树顶层的结构性增删不再只改模型**：`setLeftData` 把左树挂到右树首节点时原先浅拷贝 `[...leftRoot.childNodes]`，而左树顶层节点的 `parent` 正是 `leftRoot`——`remove` / `append` / `insertBefore` 与拖拽落点全都改在 `leftRoot` 的数组上，渲染读的 `firstRoot.leftChildNodes` 却是另一份，于是删掉的节点仍留在画面里（且已从 `nodesMap` 注销，按 key 再也碰不到它）、新增的节点看不见。改为与上游同形共用同一个数组（`shareLeftChildNodes`），并把 `leftRoot` 的结构性通知转给真正渲染这份列表的 `firstRoot`（`forwardStructuralNotify` + `notifyTarget`）：**只共数组引用不转通知，模型改了画面照样不动，两半缺一不可**（各做过一次只留一半的实验，都是三条用例全红）。上游 `vue3-okr-tree` 本就共用引用，同批补了一组同形用例当基线。

- **`contains` 把 OKR 左子树算进子树范围**：`moveNode` 的自环硬守卫与 `dropValid` 都靠 `TreeStore.contains()` 回答「目标是不是被拖节点的后代」，但它只递归 `childNodes`，而 OKR 左子树挂在 `leftChildNodes` 上——于是 `moveNode(OKR 根, 其左子树内的节点, 'inner')` 放行，根与左子树互相指向，`getVisibleNodes` 这类同时走两侧的遍历不再收敛。现一并递归 `leftChildNodes`；同时钉一条「右树节点仍可移进左子树」的用例，防止把 `reassignSide` 那条合法的跨侧路径一起堵死。与上游 `vue3-okr-tree` 同批同形。

- **挂载期不再白建一次 OKR 左树**：字段映射同步那个 effect 的依赖是 `[props.props]`，而 React 首次挂载后必然执行一次，于是每次挂载都跑一遍 `setData(同一引用)` + `bumpAll()`——前者末尾照样 `setLeftData` 把整棵左树重建（左树节点实例全换、子节点刚登记的 `nodeEls` 指向作废的旧实例），后者让全部节点多渲染一遍（实测 `n=1500` 时增量约 +31%）。改为与 `store.props` 现值逐项比对、内容相同直接跳过；这一并同时挡住使用方行内写 `props={{ label: 'title' }}` 时每次父渲染都重建的那条路。上游 `vue3-okr-tree` 的对应 watch 没有 `immediate`，挂载期本就不跑，故只有本包需要改（它的行内字面量路径仍会随父渲染重建，已记待办）。

- **运行中改 `animate` / `animateDuration` 不再把已折叠的容器凭空撑高**：`useDelayedCollapse` 的 effect 依赖原先是 `[isExpanded, animateOn, duration]`，后两项只是「下次收起时用哪个值」，一旦变化就让 effect 重跑一遍 `setKeepHeight(true)` + `setTimeout(duration)`——改一次时长就把树上每个已收起到位的容器重撑一遍高度。现在两项收进 ref、依赖只留 `isExpanded`，与上游 `vue3-okr-tree` 的 `watch(isExpanded, …)` 同形（上游形状本就正确，只有本包需要改）。两条新用例各钉一个方向：改值不再重开撑高窗口（依赖数组改回旧写法当场红）、改过的时长对下一次收起仍然生效（ref 写成只初始化不更新的冻结值当场红）。

- **平移后吞点击不再往视口元素上堆监听**：`handlePointerUp` 原先每次平移结束都 `viewportEl.current.addEventListener('click', …, { capture: true, once: true })`，而触摸平移压根不派发 click——监听于是按平移次数累积挂在元素上，直到某一次真出现 click 才被一次性摘掉（组件卸载时仍挂着）。现改记一个 `swallowNextClick` ref，由视口 div 上常驻的 `onClickCapture` 判断并消费；对外语义与改动前逐字一致（平移后紧跟的那一次 click 被吞，第二次照常送到节点），只是不再残留注册。两条新用例分别钉「吞一次且只吞一次」与「平移过程中元素上 `click` 注册数为 0」——还原成 once 监听、或把标志赋值摘掉，各打红一条（后者同时证明 React 合成事件的捕获阶段确实担起了原来那条原生捕获监听的活）。与上游 `vue3-okr-tree` 同批同形。

- **产物三种格式都保住 html-to-image 的三条 ignore 注释，压缩器由 Oxc 换为 Terser**：可选 peer 靠变量说明符的动态 import 避开打包，但 bundler 只认注释——`@vite-ignore` 管 Vite/Rollup，Next 16 的 Turbopack 只认 `webpackIgnore` / `turbopackIgnore`。此前 `verify:dist` 只断 ESM 那份，而 **CJS / UMD 走 Oxc 压缩后三条注释一条不剩**（实测 grep 计数全为 0）——即三条引入路径只守住了一条。现改 `build.minify: 'terser'` + `format.comments` 白名单，ESM / `.cjs` / `.umd` 三种产物全部保留，门禁随之从「只断 ESM」铺开成 7 条（每种格式各断「注释齐全」+「未静态引入」，另断 ESM 仍有 `import(` 调用点），`verify:dist` 42 → **45** 条 ok。
  - 换压缩器踩到一条隐蔽回归：**Terser 会把 `'use client'` banner 当无用表达式删掉**（三种产物首行全空，`verify:dist` 的 R8 断言当场三项全红）。它不是注释，`format.comments` 管不到，必须配 `terserOptions.compress.directives: false`。已写进 `docs/requirements.md` R8。
  - 顺带收口第 1 轮报告的 2.7：本包 ES 产物此前是**未压缩**的（65 kB / 2,030 行），gzip 比自身压缩档多 10.8%；换 Terser 之后 ESM gzip **18.65 → 16.91 kB**（预算 20 kB，余量 6.7% → 15.5%），"保注释就得放弃体积" 这个二选一本就不成立。新增 devDependency `terser`。上游 `vue3-okr-tree` 同批同形（那边还顺手删掉了 `post-build.mjs` 里的 esbuild 补压）。

- **组对齐宽度不再被首量钉死（`is-measuring` 此前从未落到 DOM 上）**：`OkrTreeGroup` 的 measure 原先在同一个同步块里 `setMeasuring(true)` → 读 rect → `setMeasuring(false)`，而这个类绑在 state 上、DOM 要等一次提交才更新，于是临时测量态压根没生效，读到的永远是当前分配宽度；偏偏 `.is-measured` 把左容器宽度钉成 `var(--okr-group-left-width)`，下一轮又把那个钉住的值当「自然宽度」读回来 —— 结果**首量之后再也涨不上去**（实测 320px 容器里首量得 140px，放宽到 1280px 仍是 140px；组里后加入一棵左子树宽得多的成员，var 仍停在首量值，`refresh()` 走同一条 measure 也救不了）。现改为测量期间直接操作 `classList`：摘 `is-measured` → 加 `is-measuring` → 读 → 复原，`measuring` 这个 state 一并删掉。两条缺一不可：只加不摘等于没加，因为 `style.css` 里 `.is-measured` 的钉宽规则排在 `.is-measuring` 的 `max-content` **之后**且特异度相同。刻意不走「置 state 后等一帧」：那会让测量跨帧，被真渲染出来的测量态触发组件更新 → 成员树无依赖的 `useEffect` 再请求测量，容易绕成自持环。回归两条：`a11y-group.spec.tsx` 的测量用例新增「读 rect 那一刻 `is-measuring` 必须在 DOM 上」（摘掉类操作 → `expected [false, false] to equal [true, true]`）；新增浏览器级 `tests/visual/group-align.spec.ts` + 夹具 `fixtures/group-align-entry.tsx`（与性能夹具同一套 IIFE 打包路径，`global-setup.ts` 里一并生成），断「组内后加入更宽成员时对齐宽度必须涨」（同一变异当场红）。视觉套件 26 → 27 条全过、像素基线无需重拍；`requirements.md` 与文档站 `guide/group` 的机制描述补上这两条约束（描述本身此前就是理想设计，是实现对不上它）。与上游 `vue3-okr-tree` 同批同形。

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

### 工程化（无对外行为变更）

- **跨实现 DOM 比对转为常驻门禁（G15）**：新增 `tests/visual/cross-impl.spec.ts` 与 `tests/visual/fixtures/cross-impl-vue3.json`（10 个模式：三种布局、OKR 左右均收起、复选框+拖拽、animate + 时长变量、`defaultExpandedKeys` + `showNodeNum`、`theme` + `unstyled`、标签尺寸、空数据）。vue3 侧真实浏览器渲染的 outerHTML 由 `pnpm gen:cross-impl`（`scripts/gen-cross-impl-fixture.mjs`，需同机有上游仓且已 build）固化进夹具，react 侧在测试里用 `dist/*.cjs` + `renderToStaticMarkup` 现算，props 直接取夹具那份，然后两侧在同一个 Chromium 内各过一遍 DOM 往返、用同一个归一化器 diff。断言拆两条：**structure**（剔 `style` 与 `draggable`，比类名 / 层级 / `role` / `aria-*` / 文本）与 **geometry**（纳入 `style`，逐条声明取 CSSOM 规范值，于是 `height:0` 与 `height: 0px`、声明顺序这些写法差异都不算差异）。第 1 轮审计报告的「含内联样式逐字一致」是错判——仓里的 `structureHtml` 把整条 style filter 掉了，快照中 `style=` 出现 0 次，内联样式这一半此前没有任何门禁守着，现在才真的有人守。两条各自验过强度：`hiddenStyle` 的 `height: '0'` 改成 `'2px'` 只打红 geometry（4 个含折叠容器的模式），`CLS.labelInner` 改一个字母则两条一起红（9 个模式）。视觉套件 14 → **26** 条，单测数不受影响。
- **补齐 G15 的另一半：`connector="svg"` 的 path `d` 值跨实现比对**。上面那条 DOM 门禁对 svg 是明确让路的——`d` 由挂载后的真实布局算出，SSR 只给出一条空覆盖层（vue3 侧同模式有 3–4 条 path），比不了；而 `src/svg-connector.ts` 与上游逐字同源、又整份是几何常量，正是最容易单侧漂移的一类文件。现新增 `tests/visual/cross-impl-svg.spec.ts`：react 侧也起真实浏览器，由 `tests/visual/fixtures/cross-impl-svg-entry.tsx` + `vite.cross-impl-svg.config.mjs` 打成自包含 IIFE（与性能 / 组对齐夹具同一套路径，`global-setup.ts` 里加第三个 job 现构建），逐条 path 比指令序列并把数字按 **0.01px** 容差对齐；vue3 侧的 `d` 列表由扩展后的 `pnpm gen:cross-impl` 存进同一份夹具的 `paths` 字段（夹具从 10 个模式增到 15）。两个自证式假绿风险各自有守卫：**环境漂移**——用例先断 `innerWidth / innerHeight / dpr` 与夹具 `source.viewport / deviceScaleFactor` 一致（生成器最初的视口与套件实际视口就不一致——`playwright.config.ts:37` 顶层写 1280×800，而 `projects[0].use = devices['Desktop Chrome']` 覆盖成 1280×720，这条自检当场判失败；此后生成器显式钉 `viewport / deviceScaleFactor / locale / reducedMotion` 并全部记进夹具 `source`）；**字体度量**——svg 模式一律显式给 `labelWidth / labelHeight`，盒子定死后 `d` 只由 style.css 的 gap / 线宽常量决定，Linux CI 才可比。变异五条逐个跑过（详见 `docs/acceptance.md` 第 7 节的表）：curve 封顶 `40 → 5` 打红 2 个 curve 模式（15px）、折线水平段 `l -20 0 → l -14 0` 打红含 stub 的模式（6px）、`stubPath` 侧向 `10 → 7` 同模式红（3px）、`straight` 端点 `+3` 与 `orthogonal` 竖中点 `+4` 各打红自己的模式——第二、三条**首版夹具抓不到**，因为里面没有带 stub 的模式，补了「OKR 左树收起，含 stubPath」并重新捕获后才变红。同时把 DOM 用例的分流写成断言（`ssrModes.length >= 10`，附「svg 模式被误分流会让这条门禁悄悄退化」），避免将来夹具一变多形态时两条门禁互相吞掉。视觉套件 27 → **33** 条，单测数不受影响。
- **CSS 几何常量钉进 `verify:dist`（收口 G17）**：G17 原本设想的是「两仓 CSS 逐字 diff，白名单只放行包名注释」，**这条实测走不通**——两仓 `src` 的 style.css 确实只差头注释与 `@import` 路径两处、`transition.css` 全等，但**产物**由两套压缩器各写一遍（本仓走 rolldown 内置的那套，上游 esbuild），差异全在写法层：合并声明体相同的相邻规则（本仓因此少 2 条规则、`var(--okr-line-width,1px)` 少 1 次）、重排声明顺序、`transparent` 写成 `0 0`、`.3s height` 写成 `height .3s`、`rgba(255,255,255,.94)` 折成 `#fffffff0`。故按 G17 的轻量分支落 **21** 条断言：六个几何变量（`--okr-gap-level:20px` / `--okr-gap-sibling:5px` / `--okr-line-width:1px` / `--okr-line-radius:5px` / `--okr-btn-size:20px` / `--okr-gap-node-y:10px`）各断「每处使用都带兜底」+「兜底值处处同值」；左子树短头三元组 `width:12px` / `height:10px` / `left:calc(100% - 11px)` 与两处 `-1px` / `!important` 修正各断**恰好出现一次**（出现两次就是有人复制规则没删原件，同特异度下后者说了算）；`okr-unstyled` 的中和规则断为**五类**选择器且基础 + `:hover` 共两处；再断 `.is-measuring` 排在 `.is-measured` **之前**——上一条组对齐修复的承重前提就是这条顺序（同特异度、后者胜），顺序颠倒则 `measure()` 怎么改都会读回被钉住的宽度，压缩器实测保留规则顺序，故能在产物层钉。匹配前先归一两种形态：声明体抹掉全部空白（绕开两侧逗号后空格差异），选择器只把空白折成单空格（`.a b` 压成 `.ab` 就走形了）。五条变异两仓各跑一遍、全部打红：兜底值 `20px→24px`、两条规则顺序颠倒、五类降四类、`calc(100% - 11px)→-12px`、`width:12px→14px`。顺带补了**两端各缺一条**的对称问题：本仓有「含打印与减弱动效块」、上游有「连接线颜色无残留硬编码」，现两边都有；CSS 段两端各 33 条、逐条同序同字面（探针实测，唯一差别是消息里内插的实测数字）。`verify:dist` 45 → **66** 条 ok，上游同批 41 → 62。
- **补 `connector="svg"` 的稳态计数用例**（对齐上游 1.3 的守卫）：`tests/components/connector.spec.tsx` 新增「静置 8 帧内 rect 读取增量为 0」，把 `sameEdges` 短路从「注释里说有效」变成有人守的断言——把 `setEdges(prev => sameEdges(prev, next) ? prev : next)` 改回无条件 `setEdges(next)` 当场红（静置窗内多读 40 次）。另加一条「探针必须计数 > 0」的前置断言，防「两边都没响所以增量为 0」的假绿。**踩坑（初版结论是错的，已实测更正）**：本文件里给 `Element.prototype.getBoundingClientRect` 装 `mockImplementation` 计数器是**无效**的——`stubCards` 会对每个卡片做同名的**实例级** `vi.spyOn`，而那方法在元素上是继承来的，实例级 spy 会把原型层那个 mock 的自定义实现作废（实测：`mock.calls` 照常增长、自增计数器一步不动）。所以计数只取 `spy.mock.calls.length`。顺带排除一条错判：挂载后元素原型链上持有该方法的确实就是测试模块的 `Element.prototype`（`===` 为真），不存在「另一个 realm」。上游同名用例用自增计数器是有效的（实测计数 10），因为那边没有实例级同名 spy——两边写法看着同形，能响的东西并不相同。单测 277 → **278** 条。

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
