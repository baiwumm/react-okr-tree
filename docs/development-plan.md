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
- [x] 1.6 目录结构约定（R4）：`packages/react-okr-tree/{src,model,hooks,styles,tests}` + `shared/api.ts`（**定在包内 `packages/react-okr-tree/shared/`**，website 相对引用；原计划的 workspace 根落地后改掉了，原因见 requirements 1.6 段末）+ `apps/website` + `docs/`
  - 防漂移测试 `tests/api-surface.spec.tsx`（3 条）：拿 `OkrTreeHandle` 的运行时成员与 `methodsSection` 的行做双向差集，两侧都不许多。vitest **不能** import 本包以外的文件（实测 `server.fs.allow` 也放不开），这就是上面改位置的原因。
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

- [x] ⭐ 4.1 `context.ts` + `hooks/use-node-version.ts`：三个 Context 的 value 一次创建、引用永久稳定（R3）；`useSyncExternalStore` 绑定 R1，SSR 走常量 `getServerSnapshot`。落地补充：**渲染配置（labelWidth / renderNode / showCollapsable …）放在 `configRef` 里而不是 context value**，否则回调换身份就整树重渲染；改这些 prop 时由 `store.bumpAll()` 显式通知。
- [x] ⭐ 4.2 `OkrTreeNode.tsx`：递归渲染 + 左右子树容器 + 展开圆盘（`showNodeNum` 计数只算可见子节点）+ `renderExpandBtn` / `nodeBtnContent` 优先级 + 折叠态内联样式（`visibility` / 延迟 `height:0;overflow:hidden`，R7）+ `is-hidden` / `is-animated` / `okr-anim-*` 状态类。`aria-setsize/posinset` 由父节点算好作 props 下传（避免订阅旧父节点）。
- [x] ⭐ 4.3 `OkrTree.tsx`：全部 props、`store` 创建、`useImperativeHandle` 暴露 27 方法 + `store` / `root` + `refreshData()`、回调事件映射、抛错文案、运行时 prop 同步 effects。
  - **阶段 8 补上的第三个缺口**：渲染定制与卡片尺寸那一组 prop（`renderContent` / `nodeComponent` / `nodeBtnContent` / `renderNode`+`children` / `renderExpandBtn` / `showNodeNum` / `labelWidth` / `labelHeight` / `alignRoot`）只写在 `configRef` 里，而节点组件是 memo + 只订阅自己那份版本（R1/R3 的直接后果），所以**运行时换它们完全不出图**——违反 requirements 第 82 行「要么生效、要么警告，不存在静默失效」。修法是给这组加一次全树通知（挂载那次跳过）。两个 agent 各撞一次并各自用 `key` 重挂载绕过，才把它暴露出来；demo 里的绕过已全部撤掉，`prop-sync.spec.tsx` 加了 2 条断言钉住。**同一轮**：`NodeScope` 没从包出口导出（消费者没法给 `renderNode` 参数标类型）、`onNodeDrop` 第 4 参标成 DOM `DragEvent` 而实参是 React 合成事件，也都修了。
  - 移植过程中修掉两个真 bug：① `TreeStore` 构造器的选项拷贝会把 `undefined` 覆盖到类字段默认值上（源项目靠 Vue prop default 挡住了，React 必须跳过 `undefined`）；② R2 的「每次渲染扫描」不能无脑调 `store.setData`——它会连带 `setLeftData` 整棵重建左树、把左子树的过滤结果冲掉，改为先跑只读脏检查 `store.isStructureDirty()`。
- [x] 4.4 渲染定制：`renderNode` > `nodeComponent` > `renderContent` > `node.label`；`renderContent(node)` 无 `h`（D1）；`empty`
- [x] 4.5 选中态与样式计算：`labelClassName` / `currentLableClassName`、`is-current` 双处、`is-disabled`、`data-level`、`theme` 类映射（`default` 不加类）
- [x] 4.6 事件：`onNodeClick` / `onNodeExpand` / `onNodeCollapse`；`onNodeContextMenu` 存在才 `preventDefault`；回调去掉 `nodeComponent`（D2）。**新增 D11：事件参数是 React 合成事件**，原生事件取 `event.nativeEvent`。
- [x] ⭐ 4.7 组件单测：`tests/components/{okr-tree,interaction,prop-sync,frozen-data,transition-robustness}.spec.tsx` 共 48 条（源项目同序 47 条 + 1 条渲染定制优先级）。
  - DOM 结构：`dom-structure.spec.tsx` 先锁**本实现**的三套布局快照（结构属性归一化后 `toMatchSnapshot`）；与 vue3-okr-tree 的**跨实现比对**挪到 9.2（那时用 Playwright 起源项目 playground 静态产物取真实 DOM，比在本仓库里造第二套渲染更省事）。
- [x] 4.8 局部更新回归测试：`local-update.spec.tsx` 用「只有被点节点的版本前进 + 单次突变通知」做判据（等价于只有一个组件重渲染），另覆盖键盘漫游只 bump 新旧两个焦点节点。
  - 顺带一个教训：断言别去 deep-equal `TreeNode` 实例，失败时打印 300 个嵌套对象的 diff 能把一条用例拖到 11 秒。

## 阶段 5：交互与数据进阶

- [x] 5.1 `accordion`（只作用交互路径，`collapseSiblings`）+ `expandOnClickNode`（叶子只选中；OKR 根只切右侧）→ `tests/components/interaction.spec.tsx`（9 条，含键盘触发与运行时切换）
- [x] 5.2 复选框模式：`showCheckbox` / `checkStrictly` / `defaultCheckedKeys`、`onCheck` / `onCheckChange`（每受影响节点各一次）、六方法、`aria-checked="mixed"`、OKR 左右独立 + 按 key 双侧生效 → `tests/components/checkbox.spec.tsx`（13 条，逐条对齐）
- [x] 5.3 拖拽：`draggable` / `allowDrag` / `allowDrop`、25/50/25 分区且**按方向换轴**、`drop-prev/inner/next` 指示类、六个拖拽事件、`moveNode` 程序化入口、跨左右树默认禁止与放开后的注册表迁移 → `tests/components/draggable.spec.tsx`（11 条）
  - jsdom 30 **没有 `DragEvent` 实现**：`fireEvent.dragOver(el, { clientY })` 会退化成普通 `Event` 并静默丢掉坐标（且 rect 恒为 0），所有分区都会算成 `inner`。做法是 `new MouseEvent(type, { clientX, clientY })` + `defineProperty` 塞 `dataTransfer`，几何靠 mock 目标元素的 `getBoundingClientRect`。React 侧同样是原生 `MouseEvent` 冒充 `DragEvent`，所以 `event.dataTransfer` 要走可选链。
- [x] ⭐ 5.4 懒加载：`lazy` + `load(node, resolve, reject?)`、`is-loading` 旋转、失败可重试、`props.isLeaf`、`showNodeNum` 未加载不显示、`renderExpandBtn` 的 `loading`、左树节点区分 → `tests/components/lazy-load.spec.tsx`（8 条，逐条对齐源项目；另补两条源用例名承诺但没断言的行为：reject 后 `expanded === false` 且无残留 `is-loading`、配置齐全时零新增警告）
- [x] 5.5 受控/非受控：`expandedKeys` + `onExpandedKeysChange`、`currentKey` + `onCurrentKeyChange`（D3）；重建后按受控值恢复（含 `leftData` 变更后的左树恢复，1.6.0 修复项）→ `tests/components/controlled.spec.tsx`（12 条）
- [x] 5.6 `deepWatch` 与 `refreshData()`（R2 / D7）→ `tests/components/data-refresh.spec.tsx` 5 条，覆盖四条路径：换引用重建；**数组换外壳、元素同引用 ⇒ 不重建**（否则宿主每帧新建字面量会把展开态冲掉，这比 Vue 常见得多）；同引用原地变更靠渲染时脏检查接住；`refreshData()` 显式兜底；`deepWatch=false` 只认整批新对象。README 说明段随阶段 9.6 一并落。

## 阶段 6：组合件、外观与可访问性

> 实现与 6 个 spec（61 条）全部落地，本阶段共 25 文件 244 条测试。6.6 记一处移植中补出的真实缺口。

- [x] 6.1 键盘与 ARIA（`OkrTree` 的 `nodeEls` / `elNodes` WeakMap、`visibleTreeItems`、`moveFocus`、`focusParent`、漫游 tabindex、`aria-expanded` 双侧与门、`aria-setsize/posinset` 按可见兄弟）+ `OkrTreeNode` 的 `handleKeydown` 全套（含左树镜像、节点内输入控件不拦截）→ `tests/components/a11y-group.spec.tsx`（15 条）
  - **移植中补出的两个缺陷**：React 的 `onFocus` 由会冒泡的 `focusin` 映射而来，祖先 treeitem 会抢走后代的焦点归属（`handleFocus` 现按 `target === currentTarget` 限定，等价源项目的不冒泡 `focus`）；以及「无焦点节点时由首个根节点持有 0」这条兜底规则的持有者未被通知，转移后有两个节点同时可 Tab 进入。
- [x] 6.2 焦点环样式与 `--okr-focus-*`（`:focus-visible > label > label-inner`）
- [x] 6.3 `OkrTreeGroup`：`is-measuring` → 测量 → `--okr-group-left-width` 的时序、请求去重（R3 的 nextTick 等价物）、ResizeObserver + `document.fonts.ready`、成员挂载/更新/卸载上报、`align={false}` 清空、`refresh()`
- [x] ⭐ 6.4 `OkrTreeViewport`：缩放/平移/捏合/双击复位、3px 阈值与平移后吞 click、`wheelBehavior` 三态、`fitToScreen` / `centerNode`（跨多树登记 `getNodeEl`+`expandNode`）、`renderToolbar` 与默认工具栏、`exportImage`（D10：错误前缀改包名）→ `tests/components/viewport.spec.tsx`（19 条）
  - React 特有处理：滚轮缩放不能用 `onWheel`（React 把它注册成 passive 监听，`preventDefault()` 无效），改为在容器上挂原生 `addEventListener('wheel', handler, { passive: false })`。
- [x] 6.5 主题：6 套变量包（`colorful` 的 `data-level` 着色 + 选中规则顺序）、自定义主题名 + 开发期警告 → `tests/components/theme.spec.tsx`（6 条）
- [x] ⭐ 6.6 SVG 连接线：抽 `svg-connector.ts`（`buildPath` 三形状 / `stubPath` 残枝 / 锚点按 `isLeftChild` 镜像 / 批量测量一次成形）、rAF 合并重绘 + animate 期间逐帧、ResizeObserver、运行时切换 → `tests/components/connector.spec.tsx`（12 条）
  - **移植中补出的缺口**：源项目靠 `onUpdated` 保证「任何节点状态变化都重绘」，而 React 下展开单个节点不会重渲染 `OkrTree`（这正是 R1 局部更新的目的），ResizeObserver 又只在树根盒尺寸真的变化时才回调。因此接上 `store.subscribeMutation()` 作为 `onUpdated` 的等价物——否则连接线会停在旧路径上。
  - 反向的 React 特有缺陷：「渲染后 effect 排帧重绘 + `setEdges` 无条件换新引用」构成 排帧→重绘→重渲染→再排帧 的稳态死循环（Vue 直接写 DOM，没有这条回路）。改为 `sameEdges` 逐项比对 `d`、未变则保持原引用；connector 第 2 条以「连排三帧后 rAF 队列必须为空」守住它。
  - 源项目 shape 三用例未推进帧，`paths` 为空时 `every()` 恒真；移植后先 flush 再断言路径条数与精确 `d`，同一断言由空转变为真实。
- [x] 6.7 `unstyled`、`alignRoot`（纯 CSS `flex:1 1 0` + `min-width:max-content`）、`getVisibleNodes` / `getNodePath` / `getNodeEl` 查询方法 → `tests/components/query-methods.spec.tsx`（6 条）
- [x] 6.8 `prefers-reduced-motion`：`usePrefersReducedMotion` 全局单监听 + SSR 安全 + JS 侧关掉 animate 与平滑滚动 → `tests/components/reduced-motion.spec.tsx`（3 条）
- [x] 6.9 兄弟节点 React key（`cx.reactKey`）：`nodeKey` 已配置但数据缺该字段时，同层 key 全为 `undefined`，React 无法区分兄弟会误复用子树；回退到 `TreeNode` 自增 id。由 prop-sync 的 stderr 警告发现（源项目的 `:key="getNodeKey(child)"` 无此风险）。

## 阶段 7：文档站基建（Next.js + fumadocs）

- [x] 7.1 `apps/website` 脚手架：Next 16.2.6 + `output: 'export'`（0.2 结论）+ `trailingSlash` + `createMDX()` + Tailwind 4.3.3 + fumadocs `neutral`/`preset` + `--color-fd-*` 与 shadcn oklch token 同源（6.2）
  - 落地补充：`turbopack.root` 要显式设到仓库根（文档站跨包 import `packages/react-okr-tree/shared/api.ts`）；`images.unoptimized`（静态导出没有图片优化服务端）。
  - **坑**：`output: 'export'` 下 `robots.ts` / `sitemap.ts` 必须写 `export const dynamic = 'force-static'`，否则 `next build` 在「收集页面数据」阶段直接失败（错误信息只说没配 force-static，不告诉你是元数据路由的问题）。
- [x] 7.2 照搬参考站基建：`lib/{site,source,i18n}.ts`、`app/layout.tsx`（`RootProvider` + zh-CN + next-themes class 策略）、`app/docs/layout.tsx`（`DocsLayout` + Logo nav + GitHub icon link）、`not-found` / `sitemap` / `robots`、Maple Mono CN 子集字体、`scripts/with-memory-cap.mjs`
  - 未完成的一项：静态 `public/og.png` 还没有（`opengraph-image.tsx` 在 export 下不可用），`metadata.openGraph.images` 暂时留空，留到 9.9 与设计资源一起做；`favicon.svg` / `logo.svg` / `logo-dark.svg` 已换成本项目自己的树形标记。
  - 版本号统一走 `lib/version.ts`（`react-okr-tree/package.json` 真源），站上不出现第二份版本号副本。
- [x] 7.3 落地页：`Navbar` / `Hero`（含 `LightRays`，参数照参考站收着用）/ `Features`（7 张卡 + 1 张 API 面统计卡）/ `Stacks`→布局展示位（三种布局 + SVG 连接线 + unstyled + 六套主题，全是真实组件）/ `Cta` / `Faq` / `Footer`
  - 落地页首屏 HTML 里已有 62 个节点标签（11 个活体 `<OkrTree>` 实例）——这是库在 Next 静态导出下 SSR 安全的真实证据，比 R8 的单测更有说服力。
  - **消费侧发现的库缺陷（已修）**：optional peer 的动态导入只有 `@vite-ignore`，Turbopack 不认，会对变量说明符报构建期 Module not found——库能发出去但下游装不上。补 `webpackIgnore` / `turbopackIgnore`，并在 `verify:dist` 加 4 条断言钉住。
  - 浏览器内视觉自检做不了：内置浏览器够不到本机端口（`ERR_FAILED`，curl 同一端口 200）。视觉与几何一律留给 9.2 的 Playwright，不在这里靠猜测下结论。
- [ ] ⭐ 7.4 MDX 组件白名单：`getMDXComponents()` 注册 `Cards` / `Callout` / `Steps` / `Tabs` + 本站新增的 `<DemoBlock>` / `<EventLog>` / `<ThemeSwitcher>` / `<ApiTable>`（6.3 第 1 点：demo 组件全部 `'use client'`）
  - 已注册 `DemoBlock` + `ApiTable`；`EventLog` / `ThemeSwitcher` 随阶段 8 的 Demo 一起登记（没有对应 Demo 之前先注册就是死代码）。
  - `DemoBlock` 现在用的是 `DynamicCodeBlock`（客户端 shiki）。8.8 落地时若确认首屏体积吃不消，改 RSC 侧 `fumadocs-core/highlight` 预高亮 + `<CodeBlock>`——这与 6.3 第 2 点「源码不经 loader、构建期出 HTML」的原意更贴。
- [x] 7.5 搜索：构建期导出静态 Orama 索引 + `staticClient`（0.2 结论：静态导出下不需要 Pagefind）
  - 实现比预想更省：`app/api/search/route.ts` 里 `createFromSource(source).staticGET` 配 `export const dynamic = 'force-static'`，`next build` 就把索引当静态文件写到 `out/api/search`；前端 `RootProvider search={{ options: { type: 'static', api: '/api/search' } }}`。零额外构建步骤、零额外依赖。
  - 运行时验证方式：本机没有可用浏览器环境（见 7.3），改为用**同一份 `staticClient`** 对导出的 `out/api/search` 做取回-加载-检索往返，命中与 `<mark>` 高亮正常。0.2 遗留的「包产物核实 ≠ 运行时验证」到此收口；浏览器里的那一遍归 9.2。
- [x] 7.6 `content/` 骨架与 `meta.json` 分组（`start` / `guide` / `theme` / `api` / `migration` / `changelog`）；`guide/typed` 改为「泛型与类型推导」（D5）；`guide/data` 是 React 新增页（R2 数据变更检测 + Q3 回写 + 冻结数据边界）
  - 落地 22 个文件、15 条 `/docs/*` 路由；`verify:export` 断言死链为 0、sitemap 覆盖全部 15 页。
  - 内容与 D6/R8 的补齐有先后：agent 写作时产物还没有 `'use client'`，所以 `start/index.mdx` 那段「发布产物里没有 'use client'」与 `repo.mdx` 里对 `verify:dist` 的描述（说它在 jsdom 挂载产物）在提交前已按最终实现改回；默认导出也补了一句。
- [x] 7.7（新增，原记在 9.5）静态导出真实性门禁：`scripts/verify-export.mjs` —— 无服务端残留 / 站内零死链 / 索引与资产齐备 / sitemap 覆盖每个文档页。写它的理由：部署是纯静态资产，「构建通过」≠「可部署」。落地当天就抓到页脚 7 个指向未创建页面的死链。

## 阶段 8：24 个 Demo 用例

> **契约表（文件名与导出名定死，页面按此引用，写文件的与装配页面的互不猜测）**
> Demo 组件放 `apps/website/components/demo/`，一个用例一个文件、默认导出一个客户端组件；
> 共享数据在 `components/demo/data.ts`（7 个工厂函数，每次调用返回新副本——Q3 回写下的必要设计）。
> 模板见 `components/demo/basic.tsx`；页面装配在 `content/guide/demos.mdx`，源码由 `<DemoBlock file="…">`
> 在构建期 `readFileSync` 读本文件，所以 demo 组件里**不要再抄一份代码字符串**。

| #   | 源项目用例                    | React 文件                  | 导出名                    |
| --- | ----------------------------- | --------------------------- | ------------------------- |
| 1   | `Base01` 基础用法             | `basic.tsx`                 | `BasicDemo`               |
| 2   | `Base02` 水平方向             | `horizontal.tsx`            | `HorizontalDemo`          |
| 3   | `Base03` 是否可展开           | `collapsable.tsx`           | `CollapsableDemo`         |
| 4   | `Base04` 默认全部展开         | `expand-all.tsx`            | `ExpandAllDemo`           |
| 5   | `Base041` 指定默认展开        | `default-expanded-keys.tsx` | `DefaultExpandedKeysDemo` |
| 6   | `Base05` 节点的样式           | `node-style.tsx`            | `NodeStyleDemo`           |
| 7   | `Base06` 内容定制三种写法对比 | `content-modes.tsx`         | `ContentModesDemo`        |
| 8   | `Base062` 展开按钮自定义      | `expand-btn.tsx`            | `ExpandBtnDemo`           |
| 9   | `Base061` 节点动画            | `animation.tsx`             | `AnimationDemo`           |
| 10  | `Base07` OKR + Group 两树对比 | `okr-group.tsx`             | `OkrGroupDemo`            |
| 11  | `Base08` OKR 自定义内容       | `okr-content.tsx`           | `OkrContentDemo`          |
| 12  | `Base081` OKR 节点数          | `okr-node-num.tsx`          | `OkrNodeNumDemo`          |
| 13  | `Base09` 受控状态与方法       | `controlled.tsx`            | `ControlledDemo`          |
| 14  | `Base10` 懒加载               | `lazy.tsx`                  | `LazyDemo`                |
| 15  | `Base11` 画布 Viewport        | `viewport.tsx`              | `ViewportDemo`            |
| 16  | `BaseFilter` 过滤             | `filter.tsx`                | `FilterDemo`              |
| 17  | `BaseFilterOkr` OKR 过滤      | `filter-okr.tsx`            | `FilterOkrDemo`           |
| 18  | `BaseEvents` 事件             | `events.tsx`                | `EventsDemo`              |
| 19  | `BaseEventsOkr` OKR 事件      | `events-okr.tsx`            | `EventsOkrDemo`           |
| 20  | `BaseAccordion` 手风琴        | `accordion.tsx`             | `AccordionDemo`           |
| 21  | `BaseNodeClick` 点击展开/选中 | `node-click.tsx`            | `NodeClickDemo`           |
| 22  | `BaseCheckbox` 复选框         | `checkbox.tsx`              | `CheckboxDemo`            |
| 23  | `BaseDraggable` 拖拽          | `draggable.tsx`             | `DraggableDemo`           |
| 24  | `BaseConnector` SVG 连接线    | `connector.tsx`             | `ConnectorDemo`           |

- [x] 8.1 数据集移植 `playground/data.ts`（7 个工厂函数 → `components/demo/data.ts`）
- [x] 8.2 基础组（1–6）：基础 / 水平 / 可展开 / 全展开 / 指定 key 展开 / 节点样式
- [x] 8.3 内容定制与动画（7–9）：三种写法对比（含「三种同传」验优先级）/ 展开按钮自定义（须套 org-chart-node-btn-text 盖掉伪元素 +/−）/ 六个动画名 + 时长
- [x] 8.4 状态组（13–15）：受控与方法（两对受控 props + 十几个 ref 按钮 + R2 三条路径）/ 懒加载（假 300ms、固定失败分支、重试、isLeaf）/ Viewport（exportImage 走注入 toPng）
- [x] 8.5 过滤与事件组（16–19）：Filter 含方法按钮与**空值恢复语义** / OKR Filter 左右同时命中 / 事件 14 个全挂（须同时给 expandedKeys+currentKey 才看得到两个 change 回调）/ OKR 事件
- [x] 8.6 交互组（20–24）：手风琴（另给 expandAll 反例）/ 点击展开 / 复选框（含半选与取设 key）/ 拖拽（三区 + 禁自嵌套）/ SVG 连接线（非 svg 时形状按钮 disabled）
- [x] 8.7 主题切换条（6 套 + 「跟随站点主题」第七个按钮）：`components/demo/theme-switcher.tsx`，已登记进 MDX 白名单并接在 `content/theme/index.mdx` 那条「`auto` 跟的是媒体查询、不是 `.dark` 类」的警告后面，作为该结论的活样例（不新增任何站点 CSS：跟随站点走的是 `resolvedTheme` → `theme` prop 这条路，另一条「祖先覆盖变量」的路子在页面上用代码块说明）
- [x] 8.8 源码展示：`<DemoBlock file>` 在 RSC 侧 `readFileSync` + 构建期 shiki 高亮 + 原生 `<details>` 折叠（已落地，24 个用例复用同一条链路；不做客户端 shiki）
  - DemoBlock 因此是**服务端组件**（别加 `'use client'`，那会把高亮推回浏览器）；`file` 只允许 `components/demo/` 下的 `.tsx`，带 `..` 直接抛错。
  - 已知告警一条，不修：`next build` 会报 `Turbopack build encountered 1 warnings: Encountered unexpected file in NFT list`，原因正是这里的 `readFileSync(process.cwd() + file)` —— Next 的产物追踪见到动态文件读就把周边整体纳入 trace。它只影响 `.next/` 里的 serverless trace 清单，而静态导出部署的是 `out/`（`verify:export` 也断言过产物里没有服务端残留），所以是噪声；消除它的办法是回到「源码抄一份字符串」，那正是这一步要消灭的漂移。

## 阶段 9：文档、验收与发布

- [ ] ⭐ 9.1 逐项对照验收（requirements 9.1–9.4）：R1–R9 各条、D1–D10 各条、Q1–Q9 与 2.3 继承结论逐条打钩并记录证据（测试文件名）
- [x] 9.2 视觉回归基线：Playwright 截文档站 Demo 路由，win32 + linux 两套基线；含 print 媒体断言、`unstyled` 计算样式断言（阴影清掉且节点盒尺寸不变）
  - win32 基线 15 张已提交并连跑两次全绿（13 条用例：11 张像素 + 冒烟 + 两条计算样式契约）。Linux 基线由新增的 `snapshot-bootstrap.yml` 生成后提交，与源项目同一套路
  - 截图目标是 **demo 卡片**而不是 `.org-chart-container`：后者在垂直布局下高度合法为 0（子容器出排布），Playwright 把空包围盒判成 not visible、元素截图直接超时。基线人工看过一张（layout-vertical）：树、连线、卡片阴影、DemoBlock 的标题/说明/查看源码都正常。
  - 服务器是自写的 `apps/website/scripts/serve-out.mjs`（跑 `out/`）而不是 `next dev`：基线要拍部署形态。端口默认从 4173 换到 4520——这台 Windows 的 TCP 排除区间是 4229–4328，4173 整段被保留，listen 直接 EACCES（源项目 CHANGELOG 1.13.0 记过同一条）。
  - 待核的一条：Next 对 `[[...slug]]` 的 RSC 预取请求 `__next.docs.$oc$slug.txt`，而产物落的是 `__next.docs/$oc$slug.txt`（点号 vs 目录），静态服务器上必 404。冒烟把它单独计数并要求「资源加载失败条数 == 预取缺失条数」，新的真 404 藏不进去；**Cloudflare Pages 上是否同样 404 要在部署后核一次**（若同样，考虑 `redirects` 或接受为预取降级）。
- [x] 9.3 性能基线：移植 `scripts/benchmark.mjs`（2041 节点，6 个场景）+ Chromium 首渲染 < 300 ms 门禁；产出 `docs/perf.md`
  - 已落地（阶段 7 期间）：`scripts/benchmark.mjs`（此前 `pnpm bench` 指向一个不存在的文件）+ `docs/perf.md`。7 个场景（比源项目多一条「展开单个节点」），关键数：首渲染 220 ms / 全展开首渲染 182 ms / expandAll 91 ms / filter 两轮 153 ms / 原地 push+pop 6.6 ms / 深层改名 0.5 ms / 展开单节点 0.6 ms。
  - 与 Vue 基线对照的三条结构性差异写进 `docs/perf.md`：首渲染快 2.8–5.9 倍（无 reactive 代理）、expandAll/collapseAll 慢约 20 倍（组件粒度 vs 依赖粒度）、原地变更快 10–86 倍（无 deep watch 的 O(N) 遍历，就是 R2/D7 的取舍）。
  - **一条假数字的教训**：场景 7 第一次测出 0.01 ms，看着像「局部更新快得离谱」，实为 `measure()` 跑 3 轮而 `expandNode` 不幂等，第二轮起什么都没发生。现在每轮前 `collapseAll()` 重置，并在函数内断言「可见节点数必须增加」，不满足直接抛错。以后所有计时场景都要配一个这种「测量有效性」断言。
  - Chromium 门禁也已落地：`tests/visual/fixtures/perf-entry.tsx` + `vite.perf.config.mjs` + `global-setup.ts` + `perf.spec.ts`，实测 **36.9 ms / 2040 节点**（门禁 300 ms，CI 1500 ms），数值与两条踩坑记进 `docs/perf.md`。
  - 为什么不用源项目那套「route 拦截 + importmap 引 vue 浏览器版」：React 19 取消了 UMD，`react-dom` 没有能直接给 `<script>` 用的浏览器构建，所以改成 Vite 打一个自包含 IIFE 夹具、`addScriptTag` 注入 about:blank——不依赖网络也不依赖 webServer。
  - 夹具连踩两条「测量跑空」：并发根 `render()` 只排更新不提交（必须 `flushSync`），而 `flushSync` 在 `react-dom` 上不在 `react` 上（从 react 引会打包期静默变 undefined、运行期才炸）。用例里「节点数必须 > 2000」那条断言两次把这类假数字拦下。
- [x] 9.4 工程门禁：`publint` + `attw --pack` + `size-limit`（ESM ≤20 kB / UMD ≤21 kB / CSS ≤4 kB）+ 覆盖率阈值（80/75/80/80）
  - 覆盖率实跑：92.96% 语句 / 85.52% 分支 / 94.96% 函数 / 95.71% 行，阈值 80/75/80/80 全过；`publint` "All good!"、`attw` 四格全 🟢、size-limit 三条全过（见 9.4 上方那条提前跑的记录）。**顺带修了一条门禁自碰**：vitest 的 include 原是 `tests/**/*.spec.{ts,tsx}`，加了视觉门禁后它会去跑 Playwright 的 `test.describe`（252 条通过但 2 个文件失败），改成目录白名单，与源项目同一做法
  - 提前跑过（阶段 7 期间，dist 为今日构建）：`verify:package` publint "All good!" + attw 全 🟢（node10 / node16 CJS / node16 ESM / bundler 四格）；`size` 三条全过——**ESM 18.48 kB / 20 kB（已用掉 92%）**、CSS 3.79 / 4 kB、UMD 16.66 / 21 kB。CSS 与 ESM 余量都很薄，阶段 8/9 若再加特性要先看这两条。覆盖率阈值待 9.4 正式收口时跑 `test:coverage`。
- [x] 9.5 CI：`verify` / `peer-matrix`（React 18.2 + `@types/react@18` 下编译一份消费者示例，确保 d.ts 不引用 19 独有类型）/ `visual` / `website-build`（export 静态性断言）/ `website-deploy`（Cloudflare，仅 main）/ `release`（tag → 门禁 → `npm publish --provenance` → GitHub Release）
  - 已落地（阶段 7 期间）：`.github/workflows/ci.yml` 的 `verify`（node 22/24 两档，含 format:check / lint / typecheck / test / coverage / build / verify:dist / verify:package / size / npm pack --dry-run）、`website`（先出库 dist → typecheck:website → next build → verify:export）、`peer-matrix`（pnpm overrides 钉 react ~18.2 / ~18.3 + @types/react ~18.3，跑全套测试）。
  - ① 已落地：`tests-consumer/consumer.tsx` + `tests-consumer/tsconfig.json`（`paths` 指到 `../dist/index.d.ts`）+ `pnpm verify:peer-types`，已挂进 peer-matrix 作业。写它时撞出三条臆测（`filterNodeMethod` 不做泛型收窄、没有 `onNodeSelect` / `onZoomCommit` / `getCurrentKey` 这三个 prop），全是示例写错而不是库的问题。
  - 部署链路已就地核过一遍：`npx --yes wrangler@4.135.0 deploy --dry-run` 从仓库根读到 `apps/website/out` 的 261 个文件并正常退出（`--dry-run` 不需要凭据，也不产生任何远端变更）。wrangler 仍不进 devDependencies——源项目同样只在 Workers Builds 里 `npx wrangler deploy`。requirements 验收项 15 的后半句到此有据可查。
  - ③ release 链路已补齐：`release.yml`（tag 触发 → version 与 tag 比对 → lint/typecheck/test/coverage → build + verify:dist + verify:package + verify:peer-types + size → **文档站跟着构建**（它是产物的第一个真实消费者，发布前发现「装不上/类型不对」比发出去再撤版便宜）→ `npm publish --provenance` → GitHub Release）。②已补齐：`visual.yml`（ubuntu-24.04 固定镜像，构建走「库 dist → 静态导出」与 website job 同链路）+ `snapshot-bootstrap.yml`（生成 Linux 基线的 workflow_dispatch 作业，套路照抄源项目）。**部署不走 GH Actions**：与源项目一致由 Cloudflare Workers Builds 跑 `npx wrangler deploy` 读仓库根 `wrangler.jsonc`，所以原计划里的 `website-deploy` 作业取消（等价的静态性断言已在 website job 里）。
  - 预扫结论（阶段 7 期间，dist 为当日构建）：`dist/index.d.ts` 的公开面上只出现 `ReactNode`(13) / `useSyncExternalStore`(1) 与项目自己的 `useEvent`，没有任何 `@types/react@19` 独有类型——18.2 起这些都在。消费者示例要做的是把这个结论钉成门禁。
- [x] 9.6 README（结构见 requirements 7 的「文档」行）：**必须显式写** D7（原地变更与 `refreshData()`）、Q3（增删方法回写源数据）、`nodeKey` 缺失时注册表为空导致哪些方法静默、冻结数据边界、CDN 无开发期警告
  - 已落地 `packages/react-okr-tree/README.md`（657 行，结构与源项目 README 对齐，仅中文）。五处硬性说明全部写了，其中「数据变更检测」独立成节按三条路径分述。
  - 它反过来查到三处「文档说有、实现没有」：默认导出（D6）与 `'use client'`（R8）确实缺，已补进实现；`getCheckedKeys` 未设 nodeKey 返回 `[]` 是实现/源项目/requirements 三方一致，是我给 agent 的任务书写错，库侧无改动。
- [x] 9.7 `shared/api.ts` 驱动文档站 `<ApiTable>`（首版）；`gen:readme` + README 生成段留到 1.1.0（11.4）
  - `<ApiTable>` 六张表由 `packages/react-okr-tree/shared/api.ts` 单一来源驱动（/docs/api 16 条路由之一）；`gen:readme` 按计划留到 1.1.0
- [x] 9.8 dist 双路径收口：website 切到引 `dist` 产物跑一遍 24 个 Demo（源项目 6.8 的做法，验证发布产物与源码路径渲染一致）
  - 文档站本来就是引 workspace 的 **dist 产物**（`react-okr-tree` + `react-okr-tree/style.css`，根脚本 `build:website` 先 `pnpm build` 再导出），24 个 Demo 全部跑在产物上并被 15 张基线拍过——源项目 6.8 那条「源码路径与产物路径渲染一致」在这里等价于「产物路径 + 单测走源码路径」，两条都覆盖到了
- [x] 9.9 `CHANGELOG.md` 1.0.0、`LICENSE`、`repository` 字段、`npm publish --dry-run`
  - CHANGELOG 1.0.0 已写（按源项目写法：不只列特性，把这一路修出来的 React 侧缺陷连成因一起列进去）；LICENSE 之前只在仓库根而 package.json 的 files 列了它，npm 只从包目录取文件 → 补进包内；`npm publish --dry-run` 通过（13 个文件，293 kB）。**version 仍是 0.1.0：升版 + 打 tag + 真发布是同一步，等你点头。**

## 里程碑

| 里程碑 | 内容     | 验收                                                                                                                              |
| ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| M0     | 阶段 0   | 两个 spike 结论回写 requirements（R1 方案定稿、6.5 部署方式定稿），无遗留未知                                                     |
| M1     | 阶段 1–3 | workspace 两包打通；模型层单测全绿（含 Q1–Q4）；样式与 DOM 契约就位                                                               |
| M2     | 阶段 4–5 | 三套布局可渲染可交互，组件与结构比对测试通过，局部更新断言进 CI                                                                   |
| M3     | 阶段 6   | Group / Viewport / 主题 / 连接线 / a11y / 懒加载全部对齐并有测试                                                                  |
| M4     | 阶段 7–8 | ✅ 达成：16 条文档路由 + 24 个活体 Demo（demos 页静态 HTML 里 276 个节点标签），`out/` 零死链、搜索走浏览器内静态索引并已往返验证 |
| M5     | 阶段 9   | 达到 requirements 第 9 节全部验收标准，可发 `1.0.0`                                                                               |

## 附录 A：版本锁定清单

workspace 根 `.npmrc`：`save-exact=true`。全部精确版本，不用 `^` / `~`（参考站自身用 caret 的 `@types/mdx` / `prettier` 两项也改为精确）。

**共享（workspace 根 / 两包一致）**

| 包                          | 版本    | 来源                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript`                | 5.9.3   | 参考站；且 `typescript-eslint@8.70` peer 要求 `<6.1.0`，TS 7 不可用                                                                                                                                                                                                                                                                                                                                                                                        |
| `prettier`                  | 3.9.6   | 参考站                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `@types/node`               | 24.7.2  | 参考站                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `eslint` / `@eslint/js`     | 9.39.5  | **不按「取最新」执行**：`eslint-plugin-react-hooks@7.1.1`（eslint 10 唯一可用档）经 `@babel/core` 传递依赖 `semver@6.3.1`，被 pnpm 供应链策略判为 trust downgrade 拦下。绕开方式是往 `pnpm-workspace.yaml` 加 `trustPolicyExclude`，即放宽安全策略——不值得为一版 eslint 这么做。改锁 eslint 9.39.5 + `react-hooks@5.2.0`（**零运行时依赖**，含 `rules-of-hooks` / `exhaustive-deps` 两条我们要的规则），同时与源项目同版。代价：eslint 9 已标记 deprecated |
| `eslint-plugin-react-hooks` | 5.2.0   | 同上；peer 支持 eslint ≤9                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `typescript-eslint`         | 8.70.0  | peer 兼容 eslint 9                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `globals`                   | 17.12.0 | flat config 环境                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm` workspace            | 11.24.0 | `pnpm-workspace.yaml` 的 `allowBuilds` 现有三项：`esbuild`（vite/vitest 二进制）、`@tailwindcss/oxide`（文档站）、`sharp`（next 可选依赖）；仍然不需要任何 trust 豁免                                                                                                                                                                                                                                                                                      |

**库（`packages/react-okr-tree`）**

| 包                                  | 版本             | 备注                                                                           |
| ----------------------------------- | ---------------- | ------------------------------------------------------------------------------ |
| `react` / `react-dom`               | 19.2.6（devDep） | peer `>=18.2.0`（11.1）；peer-matrix job 另装 18.2                             |
| `@types/react` / `@types/react-dom` | 19.2.2           | d.ts 不得引用 React 19 独有类型（9.5 用 `@types/react@18` 编译消费者示例兜住） |
| `vite`                              | 8.3.0            | 按你的要求取最新；`@vitejs/plugin-react@6.1.1` peer 正是 `vite ^8`             |
| `@vitejs/plugin-react`              | 6.1.1            | —                                                                              |
| `vite-plugin-dts`                   | 5.1.0            | peer `vite >=3`，兼容                                                          |
| `vitest` / `@vitest/coverage-v8`    | 5.0.1            | peer 支持 `vite ^8`                                                            |
| `jsdom`                             | 30.1.0           | —                                                                              |
| `@testing-library/react`            | 16.3.3           | peer 需要 `@testing-library/dom ^10`                                           |
| `@testing-library/dom`              | 10.4.2           | 显式装，避免隐式提升                                                           |
| `@testing-library/jest-dom`         | 7.0.1            | —                                                                              |
| `@testing-library/user-event`       | 14.6.7           | 拖拽 / 键盘用例用                                                              |
| `eslint-plugin-react-hooks`         | 5.2.0            | 零运行时依赖（见附录 A 共享段的说明）                                          |
| `@playwright/test`                  | 1.63.0           | 与源项目同版（视觉基线口径一致）                                               |
| `size-limit` / `@size-limit/file`   | 14.0.0           | —                                                                              |
| `publint`                           | 0.3.24           | —                                                                              |
| `@arethetypeswrong/cli`             | 0.18.5           | —                                                                              |
| `html-to-image`                     | 1.11.13          | **devDependency only** + optional peer（导出用例用）                           |

**文档站（`apps/website`）** —— 全部锁参考站：`next` 16.2.6、`react`/`react-dom` 19.2.6、`fumadocs-core`/`fumadocs-ui` 16.15.7、`fumadocs-mdx` 15.4.0、`tailwindcss`/`@tailwindcss/postcss` 4.3.3、`next-themes` 0.4.6、`lucide-react` 0.545.0、`ogl` 1.0.11、`theme-switch-animation` 0.1.0、`@types/mdx` 2.0.14。**两项原计划新增已取消**：`pagefind`（0.2 的 spike 结论：fumadocs 自带的 `staticClient` 静态索引够用，阶段 7 已跑通并做过往返验证）、`wrangler`（源项目也不装，靠 Workers Builds 的 `npx wrangler deploy` 读 `wrangler.jsonc`）。

> 落地时另外放行过一个构建脚本：`sharp`（next@16 的可选依赖）。pnpm 11 的 `verify-deps-before-run` 会把「存在被忽略的构建脚本」判为安装失败，故与参考站一样写进 `pnpm-workspace.yaml` 的 `allowBuilds`——不是新增依赖，是 next 自己带进来的。

> 注：`fumadocs-ui@16.15.7` 的 peer 是 `react ^19.2.0`，所以文档站必须是 React 19——这与库的 peer 下限 18.2 不冲突（两包各自独立）。

## 附录 B：源项目测试用例移植映射（226 条）

| 源 spec                                                                         | 条数 | 落在阶段                          |
| ------------------------------------------------------------------------------- | ---- | --------------------------------- |
| `model/{node,tree-store,lazy-load,expand-methods}`                              | 63   | 2.6                               |
| `components/okr-tree`                                                           | 27   | 4.7                               |
| `components/{interaction,prop-sync,frozen-data,transition-robustness}`          | 20   | 4.7 / 5.6                         |
| `components/{controlled,lazy-load,checkbox,draggable}`                          | 44   | 5.2 / 5.3 / 5.4 / 5.5             |
| `components/{a11y-group,theme,connector,viewport,query-methods,reduced-motion}` | 61   | 6.1 / 6.5 / 6.6 / 6.4 / 6.7 / 6.8 |
| `components/perf` + `ssr/render-to-string`                                      | 11   | 9.3 / R8                          |

## 附录 C：开工前需要你拍的最后一件事

无。R1（订阅层）与 6.5（静态导出）的两种退路都已在文档里写明触发条件，我会在阶段 0 结束后带结论回来找你对一次，再进阶段 1。
