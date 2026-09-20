# react-okr-tree 开发计划清单

> 依据 `docs/requirements.md`（下称 R 编号 = 第 3 节移植决策，D 编号 = 第 8 节有意差异，Q 编号 = 继承自源项目的修复决策）。按阶段推进，每阶段有明确产出与验收点。⭐ = 关键路径。
>
> 推进纪律：一轮只做完你批准的阶段，阶段内发现问题报出来等你排期，不顺手扩范围（与源项目 roadmap 把功能改动压在发布之后的做法一致）。

## 阶段 0：预飞行验证（两个不确定项先落定，再开工）

- [x] ⭐ 0.1 **R1 订阅层最小验证** —— **结论：方案成立**。`tests/spike-r1.spec.tsx`（6 条）实测：300+ 节点原型树里点击单个节点的展开只重渲染该节点（其余 320 个节点渲染数为 0）；跨节点交互态只重渲染新旧两个节点；一次事件内 4 次赋值合并为 1 次重渲染；整树批量展开 = 每节点恰好一次（总渲染次数 == 节点数）。落地形态已回写 requirements R1 第 6/7 条：**用「私有字段 + 访问器」承载通知**（赋值语句可逐字平移、结构上不可能忘记 bump），并新增硬约束「render 阶段禁止调用会触发通知的方法」。
- [x] ⭐ 0.2 **fumadocs 静态导出 spike** —— **结论：静态导出与站内搜索不冲突，且不需要 Pagefind**。从 `fumadocs-core@16.15.7` 的 exports 清单核实到面向无服务端场景的静态搜索客户端 `search/client/orama-static`（`oramaStaticClient` + `StaticOptions.from`，可指向构建期导出的静态索引）与 `search/client/flexsearch-static`。已回写 requirements 6.5 的搜索方案。**留一项待阶段 7 收口**：这是包产物层面的核实而非运行时验证，`next build` + export + 浏览器实搜由 `website-build` job 兜。
- [ ] 0.3 dist 产物三条引入路径的最小消费验证方案定稿（ESM import / CJS require / UMD script，React 18.2 与 19.2 各一遍）——延后到 9.5/9.8 落地（需要有真实导出面之后才有意义）。

## 阶段 1：workspace 与库脚手架

- [x] 1.1 pnpm workspace：根 `pnpm-workspace.yaml`（`packages/*` + `apps/*`）、根 `.npmrc` 设 `save-exact=true`、根 `.gitignore` / `.prettierignore` / `.editorconfig`
- [x] ⭐ 1.2 版本锁定清单落地（见附录 A）。特别注意两点：`typescript` 只能到 **5.9.3**（`typescript-eslint@8.70` 的 peer 是 `>=4.8.4 <6.1.0`，TS 7 用不了；同时与参考站同版）；`@vitejs/plugin-react@6.1.1` 的 peer 是 `vite ^8`，与「Vite 用最新」一致。
- [x] 1.3 `packages/react-okr-tree/package.json`：`name` / MIT / `type: module` / `main`+`module`+`types`+`unpkg`+`jsdelivr` / `exports`（`.` + `./style.css` + `./dist/style.css` + `./package.json`，含 `import`/`require` 双 types）/ `sideEffects: ["**/*.css"]` / `files` / `peerDependencies`（`react`+`react-dom` `>=18.2.0`、`html-to-image ^1.11.0` optional + `peerDependenciesMeta`）/ `size-limit` 段
- [x] 1.4 Vite 8 库构建：`lib` 模式三格式（`react-okr-tree.es.js` / `.cjs` / `.umd.js`，UMD 全局名 `ReactOkrTree`）+ `cssCodeSplit: false` + `cssFileName: 'style'` + external `react` / `react-dom` / `react/jsx-runtime` + `sourcemap` + `vite-plugin-dts`（`bundleTypes`、单文件 `index.d.ts`）+ `scripts/post-build.mjs`（`.d.cts` 与 ESM 压缩）
  - ⏳ `verify:dist` 脚本与 `pnpm build` 实跑**顺延到阶段 4**：入口还没有组件时不会产出 `style.css`，产物断言没有意义。
- [x] 1.5 TS / ESLint / Prettier：`tsconfig.json`（`jsx: react-jsx`、`strict`）、flat config 接 `typescript-eslint` + `eslint-plugin-react-hooks@5.2.0`；**`react-hooks/exhaustive-deps` 不得关闭**
- [x] 1.6 目录结构约定（R4）：`packages/react-okr-tree/{src,model,hooks,styles,tests}` + `shared/api.ts`（workspace 根或 packages 内，供 website import）+ `apps/website` + `docs/`
- [ ] 1.7 冒烟：一个空 `OkrTree` 组件能被 website import 并渲染（走 workspace 源码路径，验证两包打通）

## 阶段 2：数据模型层（纯 TS，移植 + 订阅层）

- [x] ⭐ 2.1 `model/util.ts`：`NODE_KEY`(`$treeNodeId`) + `markNodeData`（`defineProperty` 失败降级 WeakMap）、`getNodeKey`、`isDev`、`warn`（去重 + `resetWarnings`）、`warnReadonlySource`
- [x] ⭐ 2.2 `model/node.ts`：TreeNode 全量移植（`setData` / `insertChild` / `insertBefore` / `insertAfter` / `removeChild` / `getChildren` / `updateLeafState` / `expand` / `collapse` / `updateChildren`（Q4 增量 + 逐层脏检查）/ 懒加载 `loadData` / `finishLoad` / `whenLoaded` / `setChecked` / `refreshCheckedUpward`）；**去掉 `shallowReactive`**，`childNodes` 改普通数组
- [x] ⭐ 2.3 `model/tree-store.ts`：全量移植（`setData` / `setLeftData` / `filter`+`filterRight`（Q1 全树）/ `registerNode` / `deregisterNode`（左右分表 Q2）/ `updateChildren` / `getNode` / `setDefaultExpandedKeys` / `getExpandedKeys` / `setExpandedKeys` / `setCurrentNode` / `setCurrentNodeKey` / `setUserCurrentNode` / `clearCurrent` / `getCurrentNode` / `remove` / `append` / `insertBefore` / `insertAfter` / `expandAll` / `collapseAll` / `expandNode` / `collapseNode` / `collapseSiblings` / 勾选六方法 / `contains` / `moveNode`（+`reassignSide` / `reRegisterSubtree` / `fixLevels`）/ `getVisibleNodes` / `getNodePath` / `forEachNode`）
- [x] ⭐ 2.4 **订阅层（R1）** —— 实现形态与计划里的设想不同，按 0.1 的结论落地：**私有字段 + 公开访问器**（`get expanded()` / `set expanded(v)`）而不是 `setExpanded()` 方法族。理由：源项目里 `node.expanded = true` 这类直接赋值有几十处，方法族要么改光调用点、要么留下「裸赋值不通知」的暗坑；访问器让赋值语句逐字平移且结构上不可能漏通知，并自带等值短路。子列表变更由 `replaceChildNodes` / `replaceLeftChildNodes` + `insertChild` / `removeChild` 内部通知（通知的是拥有列表的节点）。`Notifier` 见 `src/model/notifier.ts`；另有 `store.subscribeMutation()` 只服务命令式消费者（SVG 重绘），React 组件一律订阅自己那个节点。
- [x] 2.5 `viewport.ts`：`clampZoom` / `computeFit` / `renderToDataUrl` / `loadHtmlToImage`（**说明符经变量传递**，防打包器内联 optional peer）原样移植
- [x] ⭐ 2.6 模型层单测：**65 条全绿**（源项目 63 条逐条搬 + 2 条新增：可订阅契约与等值短路替代原「shallowReactive 代理」断言；框架边界 2 条计入 2.7）。Q1 多根过滤、Q2 左右同 key 分表、Q3 源数据回写、Q4 原地变更与引用回切、倒序显示、懒加载全流程、OKR 左树独立加载均已覆盖。
  - ⏳ 勾选联动与半选、`moveNode` 防自嵌套与跨树注册表迁移、冻结数据降级三类源项目放在 `components/checkbox`、`components/draggable`、`components/frozen-data` 里的用例，随阶段 5 一起补。
- [x] 2.7 断言模型层零框架依赖：`grep` 检查 `src/model/**` 不 import `react`（写成一条测试或 lint 规则）

## 阶段 3：样式与 DOM 契约平移

- [x] ⭐ 3.1 `styles/style.css`（1048 行）与 `styles/transition.css`（182 行）**逐字平移**，仅改头部注释里的包名；禁止"优化"选择器、合并硬编码值（10px stub、12px/11px 三元组、`-1px` 修正、`margin-right:-1px` 等）、加 Tailwind 或 CSS Module
  - 核对过 diff：`transition.css` 与源项目**字节一致**；`style.css` 仅差 `@import` 路径一行 + 头部注释（新增一段「不要优化这些几何值」的说明）。
- [x] 3.2 移植期核对清单（因 3.1 是逐字复制，这份清单天然满足；抽查确认 `:where()` 块、`.okr-unstyled` 5 类、`.connector-svg` 中和块、print 与两处 reduced-motion 均在）
- [x] 3.3 DOM 契约文档化：`src/dom-contract.ts`（结构类 / 状态类 / `themeClass` / `animClass` + 四条承重选择器：`GROUP_LEFT_WIDTH_SELECTOR`、`TREEITEM_SELECTOR`、`HIDDEN_ANCESTOR_SELECTOR`、`CARD_SELECTOR`）
- [ ] 3.4 从源项目抓一份渲染 HTML 作 fixture（三套布局各一份），为 4.7 的结构比对单测做准备 —— **顺延到 4.7**（需要先把源项目 playground 跑起来取渲染结果）

## 阶段 4：视图层核心

- [ ] ⭐ 4.1 `context.ts` + `hooks/use-node-version.ts`：三个 Context 的 value 一次创建、引用永久稳定（R3）；`useSyncExternalStore` 绑定 R1，SSR 走 0.2 的常量 `getServerSnapshot`
- [ ] ⭐ 4.2 `OkrTreeNode.tsx`：递归渲染 + 左右子树容器 + 展开圆盘（`showNodeNum` 计数只算可见子节点）+ `renderExpandBtn` / `nodeBtnContent` 优先级 + 折叠态内联样式（`visibility` / 延迟 `height:0;overflow:hidden`，R7）+ `is-hidden` / `is-animated` / `okr-anim-*` 状态类
- [ ] ⭐ 4.3 `OkrTree.tsx`：全部 props（4.1 表）、`store` 创建（不可变配置快照）、`useImperativeHandle` 暴露 27 方法 + `store` / `root`、回调事件映射（4.3 / 4.5）、抛错文案（R9）、运行时 prop 同步 effects（1.6.0 策略：能同步的同步、不能的警告）
- [ ] 4.4 渲染定制：`renderNode` > `nodeComponent` > `renderContent` > `node.label`；`renderContent(node)` 无 `h`（D1）；`empty`
- [ ] 4.5 选中态与样式计算：`labelClassName` / `currentLableClassName`（函数入参是 TreeNode）、`is-current` 双处、`is-disabled`、`data-level`、`theme` 类映射（`default` 不加类）
- [ ] 4.6 事件：`onNodeClick` / `onNodeExpand` / `onNodeCollapse`；`onNodeContextMenu` 存在才 `preventDefault`（R3）；回调去掉 `nodeComponent`（D2）
- [ ] ⭐ 4.7 组件单测（对应 `tests/components/{okr-tree,interaction,prop-sync,frozen-data,transition-robustness}.spec.ts`）：三套布局渲染、展开收起与事件、`filter()`、选中态、受控与非受控、抛错文案；**加一条 DOM 结构比对测试**（4 的产物 vs 3.4 fixture，允许差异白名单：React 注入的属性）
- [ ] 4.8 局部更新回归测试落地（0.1 的断言固化成常规用例，进 CI）

## 阶段 5：交互与数据进阶

- [ ] 5.1 `accordion`（只作用交互路径，`collapseSiblings`）+ `expandOnClickNode`（叶子只选中；OKR 根只切右侧）→ `tests/components/interaction` 扩充
- [ ] 5.2 复选框模式：`showCheckbox` / `checkStrictly` / `defaultCheckedKeys`、`onCheck` / `onCheckChange`（每受影响节点各一次）、六方法、`aria-checked="mixed"`、OKR 左右独立 + 按 key 双侧生效 → 对应 `tests/components/checkbox.spec.ts`（13 条）
- [ ] 5.3 拖拽：`draggable` / `allowDrag` / `allowDrop`、25/50/25 分区且**按方向换轴**、`drop-prev/inner/next` 指示类、六个拖拽事件、`moveNode` 程序化入口、跨左右树默认禁止与放开后的注册表迁移 → `tests/components/draggable.spec.ts`（11 条）
- [ ] ⭐ 5.4 懒加载：`lazy` + `load(node, resolve, reject?)`、`is-loading` 旋转、失败可重试、`props.isLeaf`、`showNodeNum` 未加载不显示、`#expand-btn` 的 `loading`、左树节点区分 → `tests/components/lazy-load.spec.ts`（8 条）
- [ ] 5.5 受控/非受控：`expandedKeys` + `onExpandedKeysChange`、`currentKey` + `onCurrentKeyChange`（D3）；重建后按受控值恢复（含 `leftData` 变更后的左树恢复，1.6.0 修复项）→ `tests/components/controlled.spec.ts`（12 条）
- [ ] 5.6 `deepWatch` 与 `refreshData()`（R2 / D7）：三种变更场景的行为矩阵各一条单测 + README 说明段落成文

## 阶段 6：组合件、外观与可访问性

- [ ] 6.1 键盘与 ARIA（`OkrTree` 的 `nodeEls` / `elNodes` WeakMap、`visibleTreeItems`、`moveFocus`、`focusParent`、漫游 tabindex、`aria-expanded` 双侧与门、`aria-setsize/posinset` 按可见兄弟）+ `OkrTreeNode` 的 `handleKeydown` 全套（含左树镜像、节点内输入控件不拦截）→ `tests/components/a11y-group.spec.ts`（15 条）
- [ ] 6.2 焦点环样式与 `--okr-focus-*`（`:focus-visible > label > label-inner`）
- [ ] 6.3 `OkrTreeGroup`：`is-measuring` → 测量 → `--okr-group-left-width` 的时序、请求去重（R3 的 nextTick 等价物）、ResizeObserver + `document.fonts.ready`、成员挂载/更新/卸载上报、`align={false}` 清空、`refresh()`
- [ ] ⭐ 6.4 `OkrTreeViewport`：缩放/平移/捏合/双击复位、3px 阈值与平移后吞 click、`wheelBehavior` 三态、`fitToScreen` / `centerNode`（跨多树登记 `getNodeEl`+`expandNode`）、`renderToolbar` 与默认工具栏、`exportImage`（D10：错误前缀改包名）→ `tests/components/viewport.spec.ts`（19 条）
- [ ] 6.5 主题：6 套变量包（`colorful` 的 `data-level` 着色 + 选中规则顺序）、自定义主题名 + 开发期警告 → `tests/components/theme.spec.ts`（6 条）
- [ ] ⭐ 6.6 SVG 连接线：抽 `svg-connector.ts`（`buildPath` 三形状 / `stubPath` 残枝 / 锚点按 `isLeftChild` 镜像 / 批量测量一次成形）、rAF 合并重绘 + animate 期间逐帧、ResizeObserver、运行时切换 → `tests/components/connector.spec.ts`（12 条）
- [ ] 6.7 `unstyled`、`alignRoot`（纯 CSS `flex:1 1 0` + `min-width:max-content`）、`getVisibleNodes` / `getNodePath` / `getNodeEl` 查询方法 → `tests/components/query-methods.spec.ts`（6 条）
- [ ] 6.8 `prefers-reduced-motion`：`usePrefersReducedMotion` 全局单监听 + SSR 安全 + JS 侧关掉 animate 与平滑滚动 → `tests/components/reduced-motion.spec.ts`（3 条）

## 阶段 7：文档站基建（Next.js + fumadocs）

- [ ] 7.1 `apps/website` 脚手架：Next 16.2.6 + `output: 'export'`（0.2 结论）+ `trailingSlash` + `createMDX()` + Tailwind 4.3.3 + fumadocs `neutral`/`preset` + `--color-fd-*` 与 shadcn oklch token 同源（6.2）
- [ ] 7.2 照搬参考站基建：`lib/{site,source,i18n}.ts`、`app/layout.tsx`（`RootProvider` + zh-CN + next-themes class 策略）、`app/docs/layout.tsx`（`DocsLayout` + Logo nav + GitHub icon link）、`not-found` / `sitemap` / `robots`、静态 `public/og.png`（替代 `opengraph-image.tsx`）、Maple Mono CN 子集字体、`scripts/with-memory-cap.mjs`
- [ ] 7.3 落地页：`Navbar` / `Hero`（含 `LightRays`，参数照参考站收着用）/ `Features`（7 张卡）/ `Stacks`→布局展示位 / `Cta` / `Faq` / `Footer`
- [ ] ⭐ 7.4 MDX 组件白名单：`getMDXComponents()` 注册 `Cards` / `Callout` / `Steps` / `Tabs` + 本站新增的 `<DemoBlock>` / `<EventLog>` / `<ThemeSwitcher>` / `<ApiTable>`（6.3 第 1 点：demo 组件全部 `'use client'`）
- [ ] 7.5 搜索：Pagefind 构建后索引 `out/`，接入 fumadocs 静态搜索
- [ ] 7.6 `content/` 骨架与 `meta.json` 分组（`start` / `guide` / `theme` / `api` / `migration` / `changelog`）；`guide/typed` 改为「泛型与类型推导」（D5）

## 阶段 8：24 个 Demo 用例

- [ ] 8.1 数据集移植 `playground/data.ts`（7 个工厂函数，保证每用例独立副本——Q3 回写下的必要设计）
- [ ] ⭐ 8.2 基础组（1–9）：基础 / 水平 / 可展开 / 全展开 / key 展开 / 节点样式 / 三种内容定制对比 / 按钮内容 / 动画（6 名 + 时长）
- [ ] ⭐ 8.3 OKR 组（10–12）：OKR 模式 + `OkrTreeGroup` 两树对比 / OKR 自定义内容（`node.isLeftChild` 分支）/ OKR 节点数
- [ ] 8.4 过滤与事件组（13–16）：Filter（含 11 个方法按钮 + **空值恢复语义**）/ OKR Filter（左右同时命中）/ 事件 / OKR 事件
- [ ] 8.5 状态组（17–19）：受控与方法 / 懒加载 / Viewport（含 `exportImage` 注入 `toPng` 避开动态导入）
- [ ] 8.6 交互组（20–24）：手风琴 / 点击展开 / 复选框 / 拖拽 / SVG 连接线（非 svg 时形状按钮 disabled）
- [ ] 8.7 主题切换条（6 套，含 6.3 第 3 点的「站级 `.dark` ≠ `theme="auto"`」说明与跟随站点主题的变体）
- [ ] 8.8 源码展示：RSC 侧 `readFileSync` 读 demo 组件原文传 `<DemoBlock code>`（6.3 第 2 点），代码块用 fumadocs `CodeBlock`

## 阶段 9：文档、验收与发布

- [ ] ⭐ 9.1 逐项对照验收（requirements 9.1–9.4）：R1–R9 各条、D1–D10 各条、Q1–Q9 与 2.3 继承结论逐条打钩并记录证据（测试文件名）
- [ ] 9.2 视觉回归基线：Playwright 截文档站 Demo 路由，win32 + linux 两套基线；含 print 媒体断言、`unstyled` 计算样式断言（阴影清掉且节点盒尺寸不变）
- [ ] 9.3 性能基线：移植 `scripts/benchmark.mjs`（2041 节点，6 个场景）+ Chromium 首渲染 < 300 ms 门禁；产出 `docs/perf.md`
- [ ] 9.4 工程门禁：`publint` + `attw --pack` + `size-limit`（ESM ≤20 kB / UMD ≤21 kB / CSS ≤4 kB）+ 覆盖率阈值（80/75/80/80）
- [ ] 9.5 CI：`verify` / `peer-matrix`（React 18.2 + `@types/react@18` 下编译一份消费者示例，确保 d.ts 不引用 19 独有类型）/ `visual` / `website-build`（export 静态性断言）/ `website-deploy`（Cloudflare，仅 main）/ `release`（tag → 门禁 → `npm publish --provenance` → GitHub Release）
- [ ] 9.6 README（结构见 requirements 7 的「文档」行）：**必须显式写** D7（原地变更与 `refreshData()`）、Q3（增删方法回写源数据）、`nodeKey` 缺失时注册表为空导致哪些方法静默、冻结数据边界、CDN 无开发期警告
- [ ] 9.7 `shared/api.ts` 驱动文档站 `<ApiTable>`（首版）；`gen:readme` + README 生成段留到 1.1.0（11.4）
- [ ] 9.8 dist 双路径收口：website 切到引 `dist` 产物跑一遍 24 个 Demo（源项目 6.8 的做法，验证发布产物与源码路径渲染一致）
- [ ] 9.9 `CHANGELOG.md` 1.0.0、`LICENSE`、`repository` 字段、`npm publish --dry-run`

## 里程碑

| 里程碑 | 内容 | 验收 |
| --- | --- | --- |
| M0 | 阶段 0 | 两个 spike 结论回写 requirements（R1 方案定稿、6.5 部署方式定稿），无遗留未知 |
| M1 | 阶段 1–3 | workspace 两包打通；模型层单测全绿（含 Q1–Q4）；样式与 DOM 契约就位 |
| M2 | 阶段 4–5 | 三套布局可渲染可交互，组件与结构比对测试通过，局部更新断言进 CI |
| M3 | 阶段 6 | Group / Viewport / 主题 / 连接线 / a11y / 懒加载全部对齐并有测试 |
| M4 | 阶段 7–8 | 文档站可浏览、24 个 Demo 可交互、静态导出与 Pagefind 生效 |
| M5 | 阶段 9 | 达到 requirements 第 9 节全部验收标准，可发 `1.0.0` |

## 附录 A：版本锁定清单

workspace 根 `.npmrc`：`save-exact=true`。全部精确版本，不用 `^` / `~`（参考站自身用 caret 的 `@types/mdx` / `prettier` 两项也改为精确）。

**共享（workspace 根 / 两包一致）**

| 包 | 版本 | 来源 |
| --- | --- | --- |
| `typescript` | 5.9.3 | 参考站；且 `typescript-eslint@8.70` peer 要求 `<6.1.0`，TS 7 不可用 |
| `prettier` | 3.9.6 | 参考站 |
| `@types/node` | 24.7.2 | 参考站 |
| `eslint` / `@eslint/js` | 9.39.5 | **不按「取最新」执行**：`eslint-plugin-react-hooks@7.1.1`（eslint 10 唯一可用档）经 `@babel/core` 传递依赖 `semver@6.3.1`，被 pnpm 供应链策略判为 trust downgrade 拦下。绕开方式是往 `pnpm-workspace.yaml` 加 `trustPolicyExclude`，即放宽安全策略——不值得为一版 eslint 这么做。改锁 eslint 9.39.5 + `react-hooks@5.2.0`（**零运行时依赖**，含 `rules-of-hooks` / `exhaustive-deps` 两条我们要的规则），同时与源项目同版。代价：eslint 9 已标记 deprecated |
| `eslint-plugin-react-hooks` | 5.2.0 | 同上；peer 支持 eslint ≤9 |
| `typescript-eslint` | 8.70.0 | peer 兼容 eslint 9 |
| `globals` | 17.12.0 | flat config 环境 |
| `pnpm` workspace | 11.24.0 | `pnpm-workspace.yaml` 仅保留 `allowBuilds: esbuild`（vite/vitest 的二进制下载），无需任何 trust 豁免 |

**库（`packages/react-okr-tree`）**

| 包 | 版本 | 备注 |
| --- | --- | --- |
| `react` / `react-dom` | 19.2.6（devDep） | peer `>=18.2.0`（11.1）；peer-matrix job 另装 18.2 |
| `@types/react` / `@types/react-dom` | 19.2.2 | d.ts 不得引用 React 19 独有类型（9.5 用 `@types/react@18` 编译消费者示例兜住） |
| `vite` | 8.3.0 | 按你的要求取最新；`@vitejs/plugin-react@6.1.1` peer 正是 `vite ^8` |
| `@vitejs/plugin-react` | 6.1.1 | — |
| `vite-plugin-dts` | 5.1.0 | peer `vite >=3`，兼容 |
| `vitest` / `@vitest/coverage-v8` | 5.0.1 | peer 支持 `vite ^8` |
| `jsdom` | 30.1.0 | — |
| `@testing-library/react` | 16.3.3 | peer 需要 `@testing-library/dom ^10` |
| `@testing-library/dom` | 10.4.2 | 显式装，避免隐式提升 |
| `@testing-library/jest-dom` | 7.0.1 | — |
| `@testing-library/user-event` | 14.6.7 | 拖拽 / 键盘用例用 |
| `eslint-plugin-react-hooks` | 5.2.0 | 零运行时依赖（见附录 A 共享段的说明） |
| `@playwright/test` | 1.63.0 | 与源项目同版（视觉基线口径一致） |
| `size-limit` / `@size-limit/file` | 14.0.0 | — |
| `publint` | 0.3.24 | — |
| `@arethetypeswrong/cli` | 0.18.5 | — |
| `html-to-image` | 1.11.13 | **devDependency only** + optional peer（导出用例用） |

**文档站（`apps/website`）** —— 全部锁参考站：`next` 16.2.6、`react`/`react-dom` 19.2.6、`fumadocs-core`/`fumadocs-ui` 16.15.7、`fumadocs-mdx` 15.4.0、`tailwindcss`/`@tailwindcss/postcss` 4.3.3、`next-themes` 0.4.6、`lucide-react` 0.545.0、`ogl` 1.0.11、`theme-switch-animation` 0.1.0、`@types/mdx` 2.0.14；新增两项：`pagefind` 1.5.2（6.5 静态搜索）、`wrangler` 4.135.0（部署）。

> 注：`fumadocs-ui@16.15.7` 的 peer 是 `react ^19.2.0`，所以文档站必须是 React 19——这与库的 peer 下限 18.2 不冲突（两包各自独立）。

## 附录 B：源项目测试用例移植映射（226 条）

| 源 spec | 条数 | 落在阶段 |
| --- | --- | --- |
| `model/{node,tree-store,lazy-load,expand-methods}` | 63 | 2.6 |
| `components/okr-tree` | 27 | 4.7 |
| `components/{interaction,prop-sync,frozen-data,transition-robustness}` | 20 | 4.7 / 5.6 |
| `components/{controlled,lazy-load,checkbox,draggable}` | 44 | 5.2 / 5.3 / 5.4 / 5.5 |
| `components/{a11y-group,theme,connector,viewport,query-methods,reduced-motion}` | 61 | 6.1 / 6.5 / 6.6 / 6.4 / 6.7 / 6.8 |
| `components/perf` + `ssr/render-to-string` | 11 | 9.3 / R8 |

## 附录 C：开工前需要你拍的最后一件事

无。R1（订阅层）与 6.5（静态导出）的两种退路都已在文档里写明触发条件，我会在阶段 0 结束后带结论回来找你对一次，再进阶段 1。
