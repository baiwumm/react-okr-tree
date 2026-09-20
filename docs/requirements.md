# react-okr-tree 需求分析文档

> 基于 `E:\personal-project\vue3-okr-tree`（Vue 3 版本，v1.13.0）的功能分析，目标是用 React 完整复刻为 npm 包 `react-okr-tree`，**功能全部对齐**，并交付功能对齐的 Demo 演示页。
>
> 对齐基准是 vue3-okr-tree 的**运行时行为**与 `shared/api.ts`（API 表的单一来源）。因框架范式不同而产生的必然差异，全部集中在第 3 节（移植决策）与第 8 节（有意差异清单），**这两节之外一律要求逐字对齐**——包括默认值、抛错文案、DOM 结构与类名。
>
> 版本范围：vue3-okr-tree 从 1.0.0 到 1.13.0 累积的全部能力都在复刻范围内（含主题、受控、懒加载、画布、复选框、拖拽、SVG 连接线、查询辅助方法、`unstyled`）。roadmap 中尚未实现的项（虚拟滚动、反向布局、Devtools）不在本期内，见第 9 节。

---

## 1. 项目概述

- **源项目**：`vue3-okr-tree` —— 组织架构树 / OKR 树组件。核心特性是飞书 OKR 的**根节点左右双向展开**，以及纯 CSS 伪元素绘制的连接线。它本身是 `vue-okr-tree`(Vue 2 v1.0.17) 的复刻 + 增强，已发布形态为组件库 + VitePress 文档站 + Playground。
- **新项目**：`react-okr-tree`（npm 包名已确认可用，registry 返回 404），用 React + TypeScript 重新实现，对外 API 与源项目**逐项对齐**（命名按 React 惯例做 kebab-case→camelCase、事件→回调、插槽→render props 的机械转换），视觉与交互效果一致。
- **许可与复用**：两个仓库同为 MIT、同一作者。`src/lib/okr-tree/style.css` 与 `model/transition.css` **原样平移**（不改内容、只改包名注释），这是刻意的工程决策而非偷懒，理由见 3.7。
- **交付物**：
  1. 可发布的 React 组件库：ESM + CJS + UMD + `dist/style.css` + 类型声明；
  2. 功能对齐的文档站（**Next.js + fumadocs**）：Demo 与文档合一，覆盖源项目 Playground 全部 24 个用例 + 主题切换器 + 6 张 API 表；视觉与技术选型对齐参考站 `E:\personal-project\better-admin\apps\website`（见 6.2）；
  3. 移植的测试套件（226 条单测等价覆盖 + SSR 冒烟 + 视觉回归基线）。
- **仓库形态**：pnpm workspace 两包 —— `packages/react-okr-tree`（库）+ `apps/website`（文档站，同时承担源项目 playground 的职责）。文档站以 workspace 依赖直接引库源码（HMR 可用），不再需要源项目那套 `vite.playground.config.ts` + `docs:build:full` 的并站脚本——那是 VitePress 与 Vite playground 双栈造成的负担，统一到 Next 后消失。

---

## 2. 源项目盘点（复刻范围的事实来源）

### 2.1 源码构成

```
src/lib/index.ts                       # 导出面：组件 / 类 / 工具 / 类型 / 插件
src/types/index.ts                     # 公共类型（TreeOptionProps / DropType / ExpandBtnSlotScope …）
src/lib/okr-tree/
  ├─ OkrTree.vue          (1112)       # 树容器：props、store 创建与同步、对外方法、SVG 连接线、键盘焦点管理
  ├─ OkrTreeNode.vue       (758)       # 递归节点：左右子树、展开按钮、复选框、拖拽、a11y、过渡
  ├─ OkrTreeGroup.vue      (112)       # 跨实例根对齐容器
  ├─ OkrTreeViewport.vue   (404)       # 画布：缩放 / 平移 / 居中 / 导出
  ├─ viewport.ts            (113)       # clampZoom / computeFit / renderToDataUrl / loadHtmlToImage（纯函数）
  ├─ context.ts              (78)       # 三个 provide/inject 契约
  ├─ node-content.ts          (57)       # 节点内容渲染优先级
  ├─ use-reduced-motion.ts    (24)       # 全局共享的 matchMedia 监听
  ├─ style.css             (1048)       # 全部外观与布局（含 6 套主题、SVG 连接线、打印）
  └─ model/
      ├─ tree-store.ts      (699)       # TreeStore：注册表、过滤、勾选、展开集合、增删改、moveNode
      ├─ node.ts            (494)       # TreeNode：数据节点模型、懒加载、updateChildren 增量重建
      ├─ util.ts             (68)       # getNodeKey / markNodeData($treeNodeId) / warn
      └─ transition.css     (182)       # 6 组 okr-* 挂载/卸载过渡 + 全局工具类
shared/api.ts              (546)       # API 表单一来源（playground / docs / README 三处消费）
```

**值得原样平移的部分**：`model/` 全部四个文件（纯 TS，无框架依赖）、`viewport.ts`（纯函数）、`style.css` + `transition.css`、`shared/api.ts` 的表结构与文案。这是源项目设计上最正确的地方——数据模型与视图完全分离。

**必须重写的部分**：`OkrTree.vue` / `OkrTreeNode.vue` / `OkrTreeGroup.vue` / `OkrTreeViewport.vue` / `context.ts` / `node-content.ts` / `use-reduced-motion.ts`。

### 2.2 能力清单（按域）

| 能力域   | 内容                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 布局     | 三套布局：`vertical`（float + 伪元素轨）、`horizontal`（flex + 左侧连接线）、OKR 双向（根节点左右各挂一棵子树，左树是同一组件的完整镜像）             |
| 渲染定制 | `renderContent` / `nodeBtnContent` / `nodeComponent` / `#default` / `#expand-btn` / `#empty`，优先级：插槽 > nodeComponent > renderContent > 默认文本 |
| 交互     | 点击选中、右键菜单、展开/收起、手风琴、点击节点展开、拖拽换父级（25/50/25 分区）、复选框（父子联动 + 半选）、键盘导航（完整 WAI-ARIA tree）           |
| 数据     | 过滤（全树，父随可见后代）、增删改（同步回写源数据）、`updateKeyChildren`、懒加载、`data` 原地变更增量重建                                            |
| 状态     | 非受控（default-*）与受控（`expandedKeys` / `currentKey`）双模                                                                                        |
| 外观     | 27 个 `--okr-*` 变量、6 套内置主题、`unstyled`、6 组动画、CSS/SVG 双连接线模式（SVG 三种形状）、打印样式、`prefers-reduced-motion`                    |
| 组合件   | `OkrTreeGroup`（跨实例根对齐）、`OkrTreeViewport`（画布缩放平移 + `exportImage`）                                                                     |
| 查询     | `getVisibleNodes` / `getNodePath` / `getNodeEl` / `getCheckedKeys` 等                                                                                 |
| 工程     | ESM/CJS/UMD 三产物 + 单文件 d.ts、publint + attw、size-limit、视觉回归、CI、文档站                                                                    |

### 2.3 源项目已修正的原版缺陷（React 版必须继承修复结果，不得回退）

源项目 `docs/requirements.md` 第 6 节的 Q1–Q9 是它的验收结论，React 版**直接采纳同一决策**：

| 项               | 结论（React 版要求）                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1 过滤范围      | 从**全部根节点**遍历，所有节点执行 `filterNodeMethod`；父节点不匹配但有可见后代时保持可见（element-ui 语义）                                                                                     |
| Q2 左右树同 key  | **左右分表**（`nodesMap` / `leftNodesMap`）。`getNode` 右树优先、未命中回退左树；`defaultExpandedKeys` / `currentNodeKey` / `defaultCheckedKeys` / `setExpandedKeys` 按 key **同时作用于两棵树** |
| Q3 源数据回写    | **复刻**：`insertChild` / `removeChild` / `moveNode` / 懒加载 `resolve` 同步修改用户源数据的 `children` 数组，作为正式行为写进 README                                                            |
| Q4 原地变更      | 实现 `updateChildren` 增量重建（脏检查：同引用同长度则跳过本层，仅向下检查），复用子节点的 `expanded` / `leftExpanded` / `isCurrent` / `checked`                                                 |
| Q5/Q8 动画       | `animate` / `animateName` / `animateDuration` 三个 prop 必须真实生效；展开/收起走 CSS 状态类过渡，**折叠子树仍保持挂载并占位**（根节点不位移）                                                   |
| Q6 动画数量      | 6 组 `okr-*` 全部迁移                                                                                                                                                                            |
| Q7 死代码        | `selectedKey` / `orkstyle` / `props.leftChildren` / `props.disabled`(原版) / `findNearestComponent` / `updateLeftLeafState` / `computNodeStyle` / `ondeClass` / `okrEventBus` —— **不移植**      |
| Q9 双格式        | `"type": "module"` 下额外产出 `.cjs`，保证 `import` / `require` / `<script>` 三条路径都可用                                                                                                      |
| 冻结数据         | 只读源数据下 `defineProperty` 降级到 WeakMap 兜底；回写类操作跳过并输出开发期警告，不抛错、不静默                                                                                                |
| 1.6.0 props 策略 | 运行时 prop「要么生效、要么警告」，不存在静默失效（见 4.1 表最后一列）                                                                                                                           |

---

## 3. React 移植的核心架构决策

这一节是本文档的实现约束重点。每条都有编号（R1…），代码评审与验收按编号核对。

### R1 响应式模型：可变 store + `useSyncExternalStore`

源项目用 `shallowReactive` 包装 `TreeStore` 与 `TreeNode`，靠字段级代理做精细更新。React 无法观察普通对象突变，但**不应为此改写成不可变模型**——那会破坏 Q3（回写源数据）与 Q4（按引用比较、`children.indexOf(child.data)`）的全部语义。

方案：**模型层保持可变，加一层显式订阅**。

1. `TreeNode` / `TreeStore` 去掉 `shallowReactive`，新增订阅原语：
   - `TreeNode.subscribe(fn) / bump()`，`TreeStore.subscribe(fn) / bumpStructural()`。
2. **所有状态写入必须经过 setter**，直接赋值视为 bug（用 ESLint 自定义规则或 code review 卡死）：
   `setExpanded` / `setLeftExpanded` / `setIsCurrent` / `setVisible` / `setChecked` / `setIndeterminate` / `setLoading` / `setLoaded`。
   需要一次性写多个字段的批量操作（`filter`、`expandAll` / `collapseAll`、`setCheckedKeys` / `setExpandedKeys`、`moveNode`、`setData` / `updateChildren`、勾选向上重算）走 `store.bumpStructural()` 单次通知。
3. React 绑定：
   - `OkrTree` 容器订阅 store 结构版本（同时用于 `connector="svg"` 的重绘触发）；
   - `OkrTreeNode` 只订阅自己那个节点的版本 → **局部重渲染**：点击单个节点的 `+/-` 只重渲染该节点，不重渲染全树（这是与 Vue 版 fine-grained 更新的等价性要求，见 9.3 验收）。
   - 子节点数组变化（增删/重排）bump **父节点**（父负责渲染子列表与 `show-collapsable` / `one-branch` 等派生类）。
4. `useSyncExternalStore` 必须传 `getServerSnapshot`（见 R8）。
5. **React `key` 与 Vue `:key` 取同一套值**：`nodeKey` 字段值，未配置时回退源数据上的不可枚举 `$treeNodeId`。key 不稳定会让可变 Node 实例被重新挂载、丢掉节点级局部状态（如 `useDelayedCollapse` 的高度保持）。
6. **落地形态（阶段 0.1 spike 已验证，见 `tests/spike-r1.spec.tsx`）**：状态字段用「私有字段 + 公开访问器」承载通知（`set expanded(v){ if (v===old) return; old=v; notify() }`）。这样源项目里 `node.expanded = true` 这类赋值语句可以**逐字平移**，结构上不存在「忘记 bump」的可能；等值短路顺带避免重复赋值造成的无谓重渲染。子列表的增删通知的是**拥有该列表的节点**（它负责渲染子循环）。同步 notify + React 18+ 的自动批处理已足够：实测对 321 个挂载节点做整树批量展开，每个节点恰好重渲染一次；点击单个节点只重渲染该节点；跨节点交互态只重渲染新旧两个节点。
7. **由此产生的硬约束**：不得在组件 render 阶段调用任何会触发通知的模型方法——可变外部 store 在并发渲染下无法自我检测「渲染中途被改」，会静默产生撕裂。所有突变只发生在事件处理器、effect 与命令式 handle 中。

### R2 `data` 变更检测：React 下的现实与兜底

源项目靠 `watch(() => props.data, …, { deep })` 同时覆盖「引用变化」与「同引用原地变更」。React 只有前者天然成立：同引用变异不会触发重渲染，因此**根本进不了比较逻辑**。

| 场景                                           | Vue                                                | React 方案                                                                                                                                                                            |
| ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data` 引用变化                                | `setData` → 引用不同 → `root.setData()` 全量重建   | 一致：effect 依赖 `data` 引用，走 `store.setData()` 全量重建；重建后按受控值恢复 `expandedKeys` / `currentKey`                                                                        |
| 同引用、内部 push/splice，且宿主组件恰好重渲染 | deep watch → `updateChildren()` 增量、保留节点状态 | `deepWatch !== false` 时，每次 `OkrTree` 渲染做一次**结构脏检查**（复用 `updateChildren` 已有的「逐项同引用 + 长度一致」判据），命中差异则调用 `store.setData(同一引用)` 以走增量路径 |
| 同引用内部变更、宿主组件不重渲染               | 同样不触发（Vue 也要求父组件持有响应式代理）       | 无法感知。**新增命令式兜底 `handle.refreshData()`**：显式触发上述增量路径（等价 `store.setData(store.data)`），供 zustand/jotai/直接 mutate 的场景使用。文档必须写明                  |
| 超大数据量                                     | `deep-watch: false` 只响应引用变化                 | `deepWatch` prop 保留同名同语义（创建期生效），`false` 时跳过每次渲染的脏检查                                                                                                         |

这是本期唯一的**能力降级 + 新增 API** 组合，登记为 D7（第 8 节）。

### R3 Vue 机制 → React 机制对照表

| Vue 机制                                                                            | 出现位置                           | React 方案                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shallowReactive` 模型                                                              | node / tree-store                  | R1：bump + `useSyncExternalStore`                                                                                                                                                                                |
| `provide` / `inject`                                                                | 树→递归节点、Group→树、Viewport→树 | 三个 Context：`OkrTreeContext` / `OkrTreeGroupContext` / `OkrTreeViewportContext`。**Context value 必须全程引用稳定**（一次创建、字段挂在可变对象上），否则任一状态变更会把所有节点连带重渲染、R1 的局部更新失效 |
| 跨节点交互态（`focusedNode` / `draggingNode` / `dragOverNode` / `dragOverType`）    | `ShallowRef` + 组件读取            | 存在 `OkrTreeContext` 的可变字段里；变更时**只 bump「上一个」与「下一个」受影响的节点**（漫游 tabindex、drop 指示类名），不得全树重渲染。这是 React 版最容易写出性能塌方的点，列为专门验收项                     |
| `defineExpose` + 模板 ref                                                           | 27 个方法 + `store` / `root`       | `forwardRef` + `useImperativeHandle` → `OkrTreeHandle`；`store` / `root` 一并暴露（源项目公开了它们）                                                                                                            |
| `v-model:expanded-keys` / `v-model:current-key` / `v-model:zoom` / `v-model:offset` | 受控                               | 成对的 `xxx` + `onXxxChange`；**prop 为 `undefined` = 非受控**（与源项目判定方式一致），需支持「传值但不传回调」的锁定态                                                                                         |
| `watch` prop → store 字段同步                                                       | 运行时同步策略                     | 每个可同步 prop 一个 `useEffect`；创建期快照类 prop（`nodeKey` / `direction` / `onlyBothTree`）变更后按源项目文案改写为「请为组件绑定 `key` 以重挂载实例」                                                       |
| 插槽 `#default` / `#expand-btn` / `#empty` / `#toolbar`                             | 渲染定制                           | `renderNode` / `renderExpandBtn` / `empty` / `renderToolbar`（参数形状保持与插槽作用域一致），同时允许 `children` 作为函数形式的节点渲染器                                                                       |
| `renderContent(h, node)`                                                            | 自定义内容                         | 去掉 `h`：`renderContent(node) => ReactNode`（D1）                                                                                                                                                               |
| `<transition>` + `TransitionProps`                                                  | 子容器挂载/卸载过渡                | 见 R7                                                                                                                                                                                                            |
| 插件 `app.component(...)`                                                           | `VueOkrTreePlugin`                 | 移除（React 无全局注册），默认导出改为 `OkrTree` 组件本身（D6）                                                                                                                                                  |
| `createTypedOkrTree<T>()`                                                           | 类型收窄                           | 移除：React 泛型组件 `function OkrTree<T extends TreeNodeData>(props: OkrTreeProps<T>)` 原生达到同一效果（D5）                                                                                                   |
| `import { h } from 'vue'`                                                           | node-content                       | 不需要                                                                                                                                                                                                           |
| `getCurrentInstance().vnode.props.onNodeContextmenu`                                | 「绑了才 preventDefault」          | `props.onNodeContextMenu !== undefined`，行为等价                                                                                                                                                                |
| `useSlots()`                                                                        | 插槽存在性判定                     | 回调 prop 存在性判定                                                                                                                                                                                             |

### R4 组件划分

保持 1:1 的组件边界，便于逐条对照行为与移植测试：

```
src/
  index.ts                     # 导出面（对齐 src/lib/index.ts）
  types.ts                     # 公共类型
  shared/api.ts                # API 表单一来源（React 命名），驱动 Demo 表 / 文档 / README 生成
  model/                       # 移植：tree-store.ts / node.ts / util.ts（+ 订阅层）
  hooks/use-reduced-motion.ts  # matchMedia 单例监听，SSR 安全
  hooks/use-node-version.ts    # R1 的订阅绑定
  OkrTree.tsx                  # forwardRef + useImperativeHandle
  OkrTreeNode.tsx              # 递归节点
  OkrTreeGroup.tsx
  OkrTreeViewport.tsx
  context.ts
  node-content.tsx
  svg-connector.ts             # 源项目内联在 OkrTree 里的 buildPath / stubPath / collectCardRects，独立成纯函数便于移植单测
  styles/style.css             # 原样平移
  styles/transition.css
```

上面的 `src/` 位于 `packages/react-okr-tree/`。workspace 另一侧是 `apps/website/`（`app` / `components/{landing,docs,demo,background}` / `content` / `lib` / `scripts` / `source.config.ts`）。`shared/api.ts`（6.4）放在 **workspace 根**，让库与文档站都能 import 同一份表数据。

### R5 事件回调签名

`node` 一律是内部 `TreeNode` 实例（源数据在 `node.data`，文本在 `node.label`）——这一点对齐源项目而非 element-ui 惯例，**不得改为只传 data**。

| Vue 事件                     | React prop                   | 签名                                                                       |
| ---------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `node-click`                 | `onNodeClick`                | `(data, node)`                                                             |
| `node-expand`                | `onNodeExpand`               | `(data, node)`                                                             |
| `node-collapse`              | `onNodeCollapse`             | `(data, node)`                                                             |
| `node-contextmenu`           | `onNodeContextMenu`          | `(event, data, node)`，仅当传入该回调时 `preventDefault`                   |
| `update:expandedKeys`        | `onExpandedKeysChange`       | `(keys)`                                                                   |
| `update:currentKey`          | `onCurrentKeyChange`         | `(key \| null)`                                                            |
| `check`                      | `onCheck`                    | `(data, { checkedNodes, checkedKeys, halfCheckedNodes, halfCheckedKeys })` |
| `check-change`               | `onCheckChange`              | `(data, checked, indeterminate)`                                           |
| `node-drag-start`            | `onNodeDragStart`            | `(node, event)`                                                            |
| `node-drag-enter/leave/over` | `onNodeDragEnter/Leave/Over` | `(draggingNode, dropNode, event)`                                          |
| `node-drag-end`              | `onNodeDragEnd`              | `(draggingNode, dropNode \| null, dropType \| null, event)`                |
| `node-drop`                  | `onNodeDrop`                 | `(draggingNode, dropNode, dropType, event)`                                |

第三参数 `nodeComponent` 在 React 无对应概念，移除并登记为 D2；DOM 定位需求由 `handle.getNodeEl(data)` 满足。

`onCheckChange` 语义保持：每个受影响节点各触发一次，含父子联动、`setCheckedKeys` 批量变更与增删子节点引发的级联。

### R6 状态类与 DOM 结构：硬约束

源项目有三处 JS 逻辑**依赖类名字符串**，因此 DOM/类名不是实现细节而是契约：

1. `OkrTreeGroup.measure()`：`querySelectorAll('.org-chart-container .horizontal .org-chart-node.only-both-tree-node.align-root > .org-chart-node-left-children')`
2. `OkrTree.visibleTreeItems()`：`querySelectorAll('.org-chart-node[role="treeitem"]')` + `closest('.org-chart-node-children.is-hidden, .org-chart-node-left-children.is-hidden')`
3. `OkrTree.collectCardRects()`：`querySelector(':scope > .org-chart-node-label > .org-chart-node-label-inner')`

要求：**渲染出的 DOM 层级、标签（`div`）、类名、`role` / `aria-*` / `data-level` 属性与源项目完全一致**。必须存在的容器：
`.org-chart-container`（根，承载 `okr-theme-*` / `connector-svg` / `okr-unstyled`）→ 可选 `svg.okr-connector-svg` → `div.org-chart-node-children[role=tree]`（注意它**同时**带 `.org-chart-node-children`，因此吃到层级 padding 和一条自己的连接线伪元素——这是源项目行为，保留）→ 递归 `.org-chart-node[role=treeitem]` → `.org-chart-node-left-children` / `.org-chart-node-label`（`.org-chart-node-left-btn` / `.org-chart-node-label-inner`(内含 `.org-chart-node-checkbox`) / `.org-chart-node-btn`）/ `.org-chart-node-children`。

状态类清单（缺一即视觉不等价）：
`vertical` `horizontal` `show-collapsable` `one-branch` `collapsed` `is-leaf` `is-current` `is-disabled` `is-left-child-node` `is-not-child` `is-root-label` `is-not-right-child` `is-not-left-child` `only-both-tree-node` `align-root` `expanded` `is-loading` `is-hidden` `is-animated` `okr-anim-<name>` `is-checked` `is-indeterminate` `drop-prev` `drop-inner` `drop-next` `is-measured` `is-measuring` `is-panning` `org-chart-empty`（**故意无样式**）`connector-svg` `okr-unstyled`。

`is-current` 同时加在 `.org-chart-node` 与 `.org-chart-node-label-inner` 两处；`.org-chart-node` 是 `div`（源项目已从原版的 `li` 改为 `div` + ARIA）。

### R7 样式与过渡：零依赖

- `style.css` / `transition.css` **原样平移**，含全部硬编码几何值与注释。理由：连接线是伪元素上的像素几何，多处取值相互咬合（如左子树 stub 的 `width:12px` / `left:calc(100% - 11px)` / `height:10px` 三元组，源码注释明确禁止参数化），任何「用 React 方式重写样式」的尝试都会产生亚像素漂移，而视觉回归基线正是按这套 CSS 截的。
- **不得引入 Tailwind / CSS-in-JS / `@headlessui` 等**，也不引入 `react-transition-group`、`@dnd-kit`、`html-to-image`（后者仍是 optional peer）。
- 消费者引入方式与源项目一致：`import 'react-okr-tree/dist/style.css'`（库不自动注入样式）。
- 过渡分两套机制，都要移植：
  1. **展开/收起状态过渡**（主路径）：容器上 `is-animated okr-anim-<name> is-hidden` 类 + 内联 `--okr-anim-duration`，纯 CSS。`animate` 且未开启减弱动效时才加类。
  2. **子容器挂载/卸载过渡**：源项目用 Vue `<transition>`。React 侧**允许简化**（P2）：不引入新依赖，用与 `useDelayedCollapse` 同构的「延迟卸载」实现；但必须保留源项目两个语义——(a) `animate` 关闭时卸载**同步完成、不依赖 rAF**（后台标签页 rAF 被节流会让卸载挂起）；(b) `height:auto→0` 不可插值，因此收起时先只置 `visibility:hidden` 保持 `animateDuration` 毫秒，再补 `height:0; overflow:hidden`（避免幻影滚动条与下方节点跳位）。

### R8 SSR / Next.js 兼容

源项目由 `tests/ssr` 的 `renderToString` 冒烟测试证明可用，React 版要求同等且更明确：

- 模块顶层不得访问 `window` / `document` / `matchMedia` / `ResizeObserver`；`usePrefersReducedMotion` 服务端返回 `false`。
- `useSyncExternalStore` 必须提供 `getServerSnapshot`（常量即可，首屏正确性来自直接读模型字段，不依赖订阅）。
- 交互相关的 effect（ResizeObserver、`document.fonts.ready`、pointer/wheel 监听）只在挂载后注册。
- `exportImage`、`html-to-image` 动态 import、`scrollToNode` 均为客户端专属。
- 组件文件加 `'use client'`（App Router 下可直接 import）。
- 冒烟用例覆盖与源项目对齐：三套布局、OKR 左树、受控 props、`renderNode` / `empty`、`OkrTreeGroup` / `OkrTreeViewport` 包裹。
- **实现约束（SSR 用例抓到的一条）**：受控初始值（`expandedKeys` / `currentKey`）必须在 store 创建期同步应用，不能只放 effect——effect 在服务端不执行，首屏渲染结果会与「受控」语义不符，客户端首帧也会闪一下非受控状态。创建期赋值不违反 R1 第 7 条，因为那时还没有订阅者。

### R9 开发期警告与错误

前缀改为 `[react-okr-tree]`，其余文案对齐。警告在 React 下必须放到 `useEffect`（渲染期告警会被 StrictMode 双调用重复触发），沿用「同一文案只输出一次」的去重集合 + 测试用 `resetWarnings()`。`isDev` 判定 `process.env.NODE_ENV !== 'production'`，UMD/CDN 下 `process` 不存在视为生产、不输出。

警告清单（13 条）：`onlyBothTree` 而 `direction !== 'horizontal'`；传 `leftData` 但未开 `onlyBothTree`；缺 `nodeKey` 却使用 `defaultExpandedKeys` / `expandedKeys` / `currentKey` / `currentNodeKey` / `defaultCheckedKeys`；`lazy` 无 `load`；有 `load` 但 `lazy` 为 false；`connector` 非法值（回退 css）；`connectorShape` 非法值（回退 curve）；`theme` 非内置名；注册期检测到重复 `nodeKey`；运行时变更 `nodeKey` / `direction` / `onlyBothTree`；冻结/只读源数据阻断回写。

抛错（时机与文案对齐）：`onlyBothTree` 缺 `leftData` → `[Tree] leftData is required in onlyBothTree`；`filter` 缺 `filterNodeMethod` → `[Tree] filterNodeMethod is required when filter`；`setCurrentNode` / `setCurrentKey` / `getCurrentKey` / `updateKeyChildren` 缺 `nodeKey` → `[Tree] nodeKey is required in <方法名>`（`updateKeyChildren` 保留源项目的 `updateKeyChild` 截断拼写）；`remove` 缺 `nodeKey` 时**静默无效**；`exportImage` 画布未挂载 / `html-to-image` 不可解析时抛带修复指引的错；`OkrTreeNode` 找不到树上下文时抛错。

---

## 4. 功能需求：对外 API 全量对齐

### 4.1 Attributes

kebab-case → camelCase 的机械转换（`node-key`→`nodeKey`、`show-collapsable`→`showCollapsable`、`current-lable-class-name`→`currentLableClassName`）。**`currentLableClassName` 保留原拼写错误**，`showCollapsable` 同理。新增 React 侧的 `className` / `style`（透传到 `.org-chart-container`）。

| prop                                    | 说明                                                                                                                                         | 类型             | 默认值               | 运行时变更                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------- | ---------------------------------------- |
| `data`                                  | 展示数据（数组，支持多根）                                                                                                                   | `TreeNodeData[]` | 必填                 | 引用变化重建；`deepWatch` 下同引用走增量 |
| `direction`                             | `vertical` / `horizontal`                                                                                                                    | string           | `vertical`           | ❌ 警告，需 `key` 重挂载                 |
| `onlyBothTree`                          | 飞书 OKR 双向展开，仅 `horizontal` 有效且必须给 `leftData`                                                                                   | boolean          | `false`              | ❌ 警告                                  |
| `leftData`                              | 左子树数据                                                                                                                                   | `TreeNodeData[]` | —                    | 同步（deep）                             |
| `labelWidth` / `labelHeight`            | number→px；string→原样作 style                                                                                                               | string/number    | `auto`               | ✅                                       |
| `labelClassName`                        | 节点 className，`string` 或 `(node) => …`，参数是内部 TreeNode                                                                               | Function/String  | —                    | ✅                                       |
| `currentLableClassName`                 | 选中节点 className，参数同上                                                                                                                 | Function/String  | —                    | ✅                                       |
| `showCollapsable`                       | 显示 `+/-`；`false` 时**强制全部展开**（原版行为，保留）                                                                                     | boolean          | `false`              | ✅                                       |
| `accordion`                             | 手风琴；只作用于**交互**展开（按钮 / 点击节点 / 键盘），`expandNode` 与受控 `expandedKeys` 不受互斥                                          | boolean          | `false`              | ✅                                       |
| `expandOnClickNode`                     | 点卡片切换展开；叶子只选中不切换；OKR 根节点只切右侧                                                                                         | boolean          | `false`              | ✅                                       |
| `showCheckbox`                          | 复选框；关→开保留既有勾选                                                                                                                    | boolean          | `false`              | ✅                                       |
| `checkStrictly`                         | 父子不联动、无半选；切换后新交互按新模式，既有勾选不变                                                                                       | boolean          | `false`              | ✅                                       |
| `defaultCheckedKeys`                    | 初始勾选（需 `nodeKey`）；变更=先清空再应用                                                                                                  | array            | —                    | ✅（`setDefaultCheckedKeys`）            |
| `draggable`                             | HTML5 DnD 换父级                                                                                                                             | boolean          | `false`              | ✅                                       |
| `allowDrag`                             | `(node) => boolean`，`false` 禁拖；disabled 恒不可拖                                                                                         | Function         | —                    | ✅                                       |
| `allowDrop`                             | `(draggingNode, dropNode, type) => boolean`；跨左右树默认禁止，显式返回 `true` 放开                                                          | Function         | —                    | ✅                                       |
| `connector`                             | `css`（伪元素）/ `svg`（覆盖层路径，布局零改动）                                                                                             | string           | `css`                | ✅                                       |
| `connectorShape`                        | svg 模式形状：`curve` / `orthogonal` / `straight`                                                                                            | string           | `curve`              | ✅                                       |
| `unstyled`                              | 去卡片外观（背景/边框/圆角/阴影含 hover），保留布局与连线；**刻意不动 padding/字号/颜色**                                                    | boolean          | `false`              | ✅                                       |
| `showNodeNum`                           | 折叠时在圆盘内显示子节点数，**只计未被 filter 隐藏的可见子节点**                                                                             | boolean          | `false`              | ✅                                       |
| `defaultExpandAll`                      | 默认全展开                                                                                                                                   | boolean          | `false`              | ✅（影响后续新建节点，不追溯）           |
| `renderContent`                         | **React 版签名 `(node) => ReactNode`**（D1）                                                                                                 | Function         | —                    | —                                        |
| `nodeBtnContent`                        | 展开按钮内容渲染，同上                                                                                                                       | Function         | —                    | —                                        |
| `nodeComponent`                         | 以 `{ node, data }` 为 props 的组件；优先级 `renderNode` > `nodeComponent` > `renderContent`                                                 | ComponentType    | —                    | ✅                                       |
| `props`                                 | 字段映射（见 4.2）；`children` 变更会按新映射增量重建                                                                                        | object           | 见 4.2               | ✅（deep）                               |
| `nodeKey`                               | 唯一标识字段名                                                                                                                               | string           | —                    | ❌ 警告                                  |
| `defaultExpandedKeys`                   | 默认展开 key 数组（需 `nodeKey`），OKR 下左右同时生效                                                                                        | array            | —                    | ✅（`setDefaultExpandedKeys`）           |
| `currentNodeKey`                        | 初始选中 key（单向）                                                                                                                         | string/number    | —                    | ✅                                       |
| `filterNodeMethod`                      | `(value, data, node) => boolean`，`false` 隐藏；`filter('')` 也要执行，需对空值返回 `true` 才能恢复全显                                      | Function         | —                    | ✅                                       |
| `animate`                               | 展开过渡动画；`prefers-reduced-motion: reduce` 时按关闭处理                                                                                  | boolean          | `false`              | ✅                                       |
| `animateName`                           | 6 个 `okr-*` 名之一（也允许自定义串）                                                                                                        | string           | `okr-zoom-in-center` | ✅                                       |
| `animateDuration`                       | 时长 ms                                                                                                                                      | number           | `200`                | ✅                                       |
| `alignRoot`                             | OKR 根节点纯 CSS 居中（容器 50%），`false` 回退原版行为                                                                                      | boolean          | `true`               | ✅                                       |
| `theme`                                 | `default`/`feishu`/`dark`/`auto`/`minimal`/`colorful` 或自定义名（自写 `.okr-theme-{name}`）                                                 | string           | `default`            | ✅                                       |
| `expandedKeys` + `onExpandedKeysChange` | 受控展开集合（需 `nodeKey`）；未传 = 非受控                                                                                                  | array / fn       | —                    | ✅                                       |
| `currentKey` + `onCurrentKeyChange`     | 受控选中（需 `nodeKey`），`null` = 无选中                                                                                                    | key/`null` / fn  | —                    | ✅                                       |
| `lazy`                                  | 初始无 `children`（或空数组）视为未加载，首次展开触发 `load`                                                                                 | boolean          | `false`              | —                                        |
| `load`                                  | `(node, resolve, reject?) => void`；`resolve(children)` 写入源数据 children 并展开；`reject`/抛错回折叠态可重试；`node.isLeftChild` 区分左树 | Function         | —                    | —                                        |
| `deepWatch`                             | 见 R2；创建期生效                                                                                                                            | boolean          | `true`               | ❌（创建期）                             |

源项目另有 `renderContent`/`nodeBtnContent` 传入 `h` 的行为、`selectedKey` / `orkstyle` 等死 prop —— 前者见 D1，后者不移植（Q7）。

### 4.2 `props` 字段映射

| 字段       | 说明                                                                          | 类型                                | 默认       |
| ---------- | ----------------------------------------------------------------------------- | ----------------------------------- | ---------- |
| `label`    | 节点文本                                                                      | `string \| (data, node) => string`  | `label`    |
| `children` | 子节点字段                                                                    | `string`                            | `children` |
| `disabled` | 禁用字段（**真实生效**：`is-disabled`、不选中、不触发 `onNodeClick`、不可拖） | `string \| (data, node) => boolean` | `disabled` |
| `isLeaf`   | 叶子字段（lazy 下未加载节点用它判定，标记则不显示按钮、不触发 load）          | `string \| (data, node) => boolean` | —          |

未配置某字段时按 `data[prop]` 兜底读取（`getPropertyFromData` 的第三分支），保持一致。

### 4.3 Methods（`OkrTreeHandle`，`useImperativeHandle` 暴露）

27 个方法 + `store` + `root`，全部与源项目同名同语义；参数一律接受 **TreeNode 实例 / key / data 对象** 三种形态。

`filter` `getNodeKey` `getNode` `getNodeEl` `setCurrentNode` `setCurrentKey` `getCurrentNode` `getCurrentKey` `remove` `append` `insertBefore` `insertAfter` `updateKeyChildren` `expandAll` `collapseAll` `expandNode` `collapseNode` `scrollToNode` `getCheckedNodes` `getCheckedKeys` `getHalfCheckedNodes` `getHalfCheckedKeys` `setCheckedKeys` `isChecked` `moveNode` `getVisibleNodes` `getNodePath`，新增 `refreshData()`（R2）。

行为边界（必须逐条实现并有测试）：

- `getNode`：TreeNode 实例直接返回；否则取 key 查 `nodesMap` → 回退 `leftNodesMap`。未设 `nodeKey` 时按 data 对象查依赖 `$treeNodeId`，**因此返回 `null`**。
- `setCurrentNode(node)` 按其所在树取规范实例（左/右 map）后设置。
- `setCurrentKey(null)` 取消高亮；按 key 设置时**左右两树同 key 同时选中**。
- `getCurrentKey()` 缺 `nodeKey` 抛错；`getCurrentNode()` 返回 data 或 `null`（右树优先，回退左树）。
- `append` / `insertBefore` / `insertAfter` / `remove` / `updateKeyChildren` **同步回写源数据**（Q3）；`append(data)` 省略 parent 时追加为根。
- `remove` 若删掉当前选中节点，需同步 `onCurrentKeyChange`。
- `expandNode(data, expandParent = true)` 返回 `TreeNode | null`；OKR 根节点同时展开左右两侧；lazy 下先加载后展开。`collapseNode` 同理（OKR 根两侧同时收起）。
- `expandAll` 含左右两树，lazy 未加载节点先触发加载再展开；`collapseAll` 全收。
- `scrollToNode(data, options?)` → `Promise<boolean>`：默认先展开全部祖先（含左树节点需要打开根的 `leftExpanded`）、等待路径上的懒加载完成、再 `scrollIntoView({ block:'center', inline:'center', behavior: 减弱动效?'auto':'smooth', ...options })`；`options.expand`（默认 true）。
- `getCheckedKeys(leafOnly=false)` / `getHalfCheckedKeys`：需 `nodeKey`，**左右两树合并去重**；未设 `nodeKey` 返回 `[]`。`setCheckedKeys(keys, leafOnly=false)` 先清空再按列表勾选，非 strictly 时带父子联动，左右同 key 同时生效。
- `moveNode(data, target, type)`：`type` 为 `'prev' | 'inner' | 'next'`；禁止放进自身或自己的子树（`contains`，`allowDrop` 不能越过）；`inner` 时目标自动展开并置 `loaded`；跨左右树时递归迁移整棵子树的 `isLeftChild` 与注册表；完成后修正 `level` 并重注册；返回 `boolean`。
- `getVisibleNodes()`：自身通过过滤且各级祖先展开覆盖到它（**折叠子树仍挂载在 DOM 中，所以不等于 DOM 里的节点数**），含 OKR 左树。
- `getNodePath(data)`：顶层→目标（含自身，不含虚拟根）；左树节点链路留在左树内，不跨接到右树根。
- `getExpandedKeys()` / `setExpandedKeys()` 作为 store 内部能力保留（源项目未列入文档表，但 handle 上的 `store` 可达）。

### 4.4 渲染定制

| React prop                         | 对应插槽/prop      | 参数                                                                                                 |
| ---------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `renderNode`（或 `children` 函数） | `#default`         | `{ node, data }`                                                                                     |
| `renderExpandBtn`                  | `#expand-btn`      | `{ node, data, expanded, side: 'left'\|'right', loading }`；`showNodeNum` 的折叠数字**优先于**该回调 |
| `empty`                            | `#empty`           | 无；`data` 为空数组时渲染在 `role=tree` 容器内                                                       |
| `renderContent`                    | `render-content`   | `(node)` → ReactNode                                                                                 |
| `nodeBtnContent`                   | `node-btn-content` | `(node)` → ReactNode                                                                                 |
| `nodeComponent`                    | `node-component`   | 组件，props `{ node, data }`                                                                         |

节点内容优先级：`renderNode` > `nodeComponent` > `renderContent` > 默认 `node.label`。

展开按钮内容优先级（**以 `OkrTreeNode.vue` 第 69–81 / 123–135 行的分支顺序为准，不得调整**）：
`showNodeNum` 的折叠数字 > `renderExpandBtn`（对应 `#expand-btn` 插槽）> `nodeBtnContent`。三者都缺省时渲染内置的 `+/-` 伪元素符号。

### 4.5 `OkrTreeGroup`

- props：`align`（boolean，默认 `true`，`false` 时各树独立排布并清除已写入的宽度）、`children`、`className` / `style`。
- handle：`refresh()`。
- 机制：给组容器加 `is-measuring` 类（左容器临时 `flex:0 0 auto; width:max-content`）→ 逐个 `Math.ceil(getBoundingClientRect().width)` 取最大 → 写内联 `--okr-group-left-width: Npx` + `is-measured` 类。
- 触发时机：成员挂载 / 更新 / 卸载、组上的 `ResizeObserver`、`document.fonts.ready`；请求需**按帧去重**（源项目用 `nextTick`，React 用微任务/rAF）。要求成员树开启 `alignRoot`（默认）。

### 4.6 `OkrTreeViewport`

- props：`minZoom`(0.2) / `maxZoom`(4) / `zoomStep`(1.2，乘除系数)、`zoom` + `onZoomChange`、`offset` + `onOffsetChange`（`{x,y}`）、`wheelBehavior`(`ctrl-zoom`|`zoom`|`scroll`)、`toolbar`(boolean，默认 false)、`renderToolbar`、`children`、`className` / `style`。
- handle：`zoomIn()` `zoomOut()` `reset()` `fitToScreen(padding = 20)` `centerNode(key|data|node)` `exportImage(options?)` `getZoom()` `getOffset()`。
- 交互契约（逐条对齐）：滚轮缩放**以指针为锚点**；拖拽平移阈值 3px（超过才算平移，且平移结束后**吞掉随后一次 click**，避免误触 `node-click`）；双击复位；双指捏合（Pointer Events 统一鼠标/触控，`pointers.size` 管理，第二指落下时切捏合、抬起回落单指时重锚 `panStart`）；`wheelBehavior='scroll'` 完全不 `preventDefault`。
- `toolbar` 未开启但提供了 `renderToolbar` 时仍显示；默认工具栏内容：`−` / `{percent}%` / `＋` / `重置` / `适应窗口`，缩放按钮带 `aria-label="缩小" / "放大"`，工具栏区域 `@dblclick.stop`。
- `centerNode`：先对所有登记的树调 `expandNode`，再按 `getNodeEl` + 当前 zoom 反算 offset 使节点居中。树通过 Context 登记 `{ getNodeEl, expandNode }`（支持一个画布内多棵树）。
- `exportImage(options)`：`{ type:'png'|'svg', scale=2, background, toPng?, toSvg? }` → html-to-image 的 `{ pixelRatio, backgroundColor? }`；默认动态 `import('html-to-image')`，**说明符必须经变量传递**（防止打包器把仓库内的 optional devDep 内联进产物 chunk）；失败抛带安装指引的错；渲染后建 `<a download="okr-tree-{ts}.{png|svg}">` 触发下载并 resolve dataURL。`renderToDataUrl` / `loadHtmlToImage` / `clampZoom` / `computeFit` 一并从包入口导出（源项目如此）。

### 4.7 导出面

对齐 `src/lib/index.ts`：`OkrTree`（默认导出）、`OkrTreeGroup`、`OkrTreeViewport`、`TreeNode`、`TreeStore`、`createNode`、`NODE_KEY`、`getNodeKey`、`markNodeData`、`clampZoom`、`computeFit`、`renderToDataUrl`、`loadHtmlToImage`，类型 `TreeNodeData` `TreeKey` `TreeDirection` `AnimateName` `TreeTheme` `TreeOptionProps` `TreeLoadFunction` `FilterNodeMethod` `RenderContentFunction` `NodeBtnContentFunction` `LabelClassName` `ExpandBtnScope` `ScrollToNodeOptions` `TreeCheckInfo` `DropType` `ConnectorMode` `ConnectorShape` `ExportImageOptions` `ViewportOffset` `ViewportWheelBehavior` `OkrTreeHandle` `OkrTreeGroupHandle` `OkrTreeViewportHandle` `BUILT_IN_THEMES`。

移除：`VueOkrTreePlugin` / `VueOkrTree` 别名 / `createTypedOkrTree`（D5/D6）。

---

## 5. 视觉与交互需求

### 5.1 布局与几何

| 量                                      | 值                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 层级间距 / 连接线长度 `--okr-gap-level` | 20px                                                                                                                                              |
| 兄弟间距（交叉轴）`--okr-gap-sibling`   | 5px                                                                                                                                               |
| 水平模式卡片行距 `--okr-gap-node-y`     | 10px                                                                                                                                              |
| 拐角圆角 `--okr-line-radius`            | 5px                                                                                                                                               |
| 卡片 padding / 字号 / 圆角 / 阴影       | 10px / 16px / 0 / `0 1px 10px rgba(31,35,41,.08)`（hover `.14/.12`）                                                                              |
| 展开圆盘                                | 20px，`border 1px`，`z-index:10`，hover `scale(1.15)`，`+/-` 由两条零尺寸伪元素边框构成（受 `--okr-line-width` 控制），居中 margin 含 `-1px` 修正 |
| 折叠指示短线                            | 水平 10px（**硬编码**，垂直方向 20px 走 `--okr-gap-level`）                                                                                       |
| 左子树根 stub 三元组                    | `width:12px` + `left:calc(100% - 11px)` + `height:10px`（**硬编码且相互耦合，源码注释禁止参数化**）                                               |
| 拖拽指示                                | 2px 实线条，卡片外 4px，`border-radius:1px`，`z-index:11`；`inner` = 2px 虚线 `outline`，`outline-offset:-2px`                                    |
| 复选框                                  | 14×14、圆角 2px、右距 6px、`vertical-align:-2px`；勾 = 3×7 边框旋转 45°；半选 = 8px 横线                                                          |
| 焦点环                                  | 移到卡片上：`.org-chart-node:focus{outline:none}` + `:focus-visible > label > label-inner` 上 `2px solid #409eff`，`outline-offset:2px`           |
| 画布                                    | 高 420px、`touch-action:none`、`cursor:grab/grabbing`、`user-select:none`；工具栏右上 12px                                                        |

必须复刻的实现事实（改了就漂移）：

1. **垂直模式是 float 布局且全局没有任何 clearfix**（无 `clear`、无 `overflow`、无 `flow-root`），依赖「后代 float 宽度折进 max-content」这一特性；`*-children` 盒的内容高度为 0，只有 `padding-top:20px`。**不得改成 flex/grid 重写**。
2. `text-align:center`（容器与 `.vertical .org-chart-node`）是卡片在其 float 盒内居中的承重属性。
3. `.is-leaf` 用 `padding-bottom:20px` + `::before` 占位块来与非叶节点行高对齐（非叶的高度来自子容器）。
4. 变量取值**只在消费点内联 fallback**，绝不在容器上声明默认值（这保证了 `okr-theme-*` 类可放在根容器/任意祖先/`:root`）；卡片外观与主题选中态用 `:where()`（特异度 0）声明，因此用户传单类的 `labelClassName` / `currentLableClassName` 始终能覆盖。
5. 各变量的**回退值按使用点不同**：`--okr-line-color` 连线 `#ccc`、复选框边框 `#c0c4cc`、工具栏边框 `#e0e0e0`；`--okr-node-bg` 卡片 `transparent`、复选框填充 `#fff`；`--okr-node-color` 卡片 `inherit`、工具栏按钮 `#333`。逐项照抄。
6. `.okr-unstyled` 需要 5 个类才能压过后续的 4 类方向专属规则（同特异度时后者胜）——照抄选择器，别"优化"。
7. 无全局 reset：只有 `.org-chart-container` 自身 + 5 个指定类的 `margin/padding:0` 与容器内 `box-sizing:border-box`，**不得恢复原版的 `* { margin:0; padding:0 }`**。

### 5.2 已知怪癖：原样复刻（源项目已测出并保留）

- `collapsed` 类在非 OKR 模式下会**永久存在**（`!leftExpanded || !expanded`，而 `leftExpanded` 只在 `!showCollapsable || defaultExpandAll` 时初始化为 `true`），其指示短线视觉上正好落在父→子连线上。源项目有单测断言这一点，照抄。
- `role="tree"` 容器同时带 `.org-chart-node-children`，因此它自己也有一条 `::before` 连接线（垂直模式在容器 50% 处出现一段 20px stub）。这是源项目行为，保留。
- OKR 左树是**独立的第二棵树**（伪根 `level 0`，其顶层节点也是 `level 1`），左树节点的展开态是 `leftExpanded`，其顶层节点的「父」在视觉上是 OKR 根节点（键盘 `←`/`→` 返回时如此处理）。

### 5.3 主题（6 套）

`default` 不加类、无内置选中样式（与 vue-okr-tree 逐像素一致，选中态交给 `currentLableClassName`）。其余按源项目变量包照抄：

| 主题       | 覆写要点                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feishu`   | `--okr-line-color:#dee0e3`、圆角 8px、双层阴影、选中 `#3370ff`/`#fff`                                                                                                                         |
| `dark`     | 线 `#4c4d4f`、卡片 `#1d1e1f` + `1px solid #414243`、文字 `#cfd3dc`、按钮与数字色 `#a3a6ad`、阴影加深                                                                                          |
| `auto`     | 选中态恒等于 dark；完整 dark 变量包在 `@media (prefers-color-scheme: dark)` 内，亮色模式等同 `default`                                                                                        |
| `minimal`  | 无阴影 + `1px solid #dcdfe6` + 圆角 4px，选中 `#ecf5ff` / `#409eff` + 同色边框                                                                                                                |
| `colorful` | 唯一含非变量规则的主题：按 `.org-chart-node[data-level='1'..'5']` 逐级着色（`#3370ff`→`#eef3ff`），≥6 级回退透明；选中规则须排在同级着色之后且特异度不低（`.org-chart-node` + `.is-current`） |

`data-level` 属性在**所有主题下**都输出（不只 colorful），左右两树的根同为 level 1 故着色一致。

### 5.4 动画

6 个 `animateName`：`okr-fade-in-linear` / `okr-fade-in` / `okr-zoom-in-center`（默认）/ `-top` / `-bottom` / `-left`。两套机制（R7）都要有；`transition.css` 里 6 组过渡**硬编码时长**（0.2s / 0.3s，不吃 `--okr-anim-duration`），同时保留 Vue 2 遗留的 `-enter` / `-leave` 与 Vue 3 的 `-enter-from` / `-leave-from` 两套类名，以及 `.collapse-transition` / `.horizontal-collapse-transition` / `.okr-list-*` / `.okr-opacity-transition` 全局工具类。左子树的 `transform-origin` 镜像（`center right` / `top right`）。`okr-fade-in` 无需额外规则（纯 opacity）。

### 5.5 可访问性与键盘

`role="tree" / treeitem / group`；`aria-level` / `aria-selected` / `aria-disabled` / `aria-checked`（`true|false|mixed`，仅 `showCheckbox` 时输出）/ `aria-expanded`（无子节点时**不输出**；OKR 根节点需左右**两侧都展开**才为 `true`）/ `aria-setsize` + `aria-posinset`（按**可见**兄弟计数，1-based）；展开圆盘 `aria-hidden="true"`；漫游 tabindex（无焦点节点时第一个根节点为 0）。

按键（焦点必须在 treeitem 自身，节点内输入控件不拦截）：`Enter` 选中；`Space` 勾选（`showCheckbox`）否则等同 Enter；`↑/↓` 可见节点间按文档顺序移动（跳过收起子树）；`→` 展开或进入第一个可见子节点（左树节点镜像为收起/返回）；`←` 收起或回父节点（OKR 根节点 `←` 展开/进入左子树，左树顶层的父视为 OKR 根）；`Home/End` 首/尾。全部 `preventDefault`。

### 5.6 减弱动效与打印

三处同时生效：`transition.css` 与 `style.css` 各自的 `@media (prefers-reduced-motion: reduce)` 块（**按类名逐个枚举**清零 duration/delay，不得用 `[class*="-enter-active"]` 这类属性选择器以免泄漏到宿主页面；另有把 enter-from 状态拍平为 `opacity:1; transform:none` 的块，避免零时长过渡闪一帧）；以及 JS 侧 `animateOn = animate && !prefersReducedMotion`，连带去掉 `is-animated`/`okr-anim-*`/内联时长、去掉延迟置 `height:0` 的保持、去掉 SVG 逐帧重绘、`scrollToNode` 用 `behavior:'auto'`。

打印：隐藏 `+/-` 圆盘与画布工具栏，去掉卡片与画布 `box-shadow`（均 `!important`）；折叠子树按屏幕原样输出。

---

## 6. Demo 演示页需求

源项目 Playground 是**单页平铺**：标题 → 31 个锚点导航 → 全局主题切换条（6 个按钮，`default` 不加类） → 24 张 Demo 卡片 → 6 张 API 表 → 回顶按钮。每张卡片 = `<h3>` 标题 + 一行描述 + 交互示例 + 语义说明 + 可复制源码块；事件类用例额外带 `EventLog`（`push(event, text)`，可限条数）。React 版逐一对齐（源码展示改用 fumadocs 内置 CodeBlock，见 6.3 第 2 点）。

| #   | 标题                   | 演示内容                                                                                                                                                                                                                                                                             | 交互控件                       |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| 1   | 基础用法               | 仅 `data`，默认 vertical                                                                                                                                                                                                                                                             | —                              |
| 2   | 水平方向               | `direction="horizontal"`                                                                                                                                                                                                                                                             | —                              |
| 3   | 节点是否可被展开       | `showCollapsable`；描述里写全键盘契约                                                                                                                                                                                                                                                | ± 按钮                         |
| 4   | 节点默认全部展开       | `defaultExpandAll`（需配合 showCollapsable）                                                                                                                                                                                                                                         | —                              |
| 5   | 某些节点默认展开       | `nodeKey` + `defaultExpandedKeys={[5]}`，祖先自动展开                                                                                                                                                                                                                                | —                              |
| 6   | 节点的样式             | `labelWidth` / `labelHeight`（数字=px、字符串=原样、0/undefined=auto）、`labelClassName`（串或函数）、`currentLableClassName`                                                                                                                                                        | 2 个 number input + 点选节点   |
| 7   | 节点自定义内容         | 三种等价写法并列对比：`renderContent` / `nodeComponent` / `renderNode`，优先级说明                                                                                                                                                                                                   | 3 个模式按钮                   |
| 8   | 展开按钮自定义内容     | `nodeBtnContent`，用内置 `org-chart-node-btn-text` 类填满圆盘                                                                                                                                                                                                                        | —                              |
| 9   | 节点动画               | `animate` + `animateName`(6) + `animateDuration`                                                                                                                                                                                                                                     | 6 个名字按钮 + 时长 input      |
| 10  | OKR 展示模式           | `onlyBothTree` + `leftData` + `alignRoot` + `OkrTreeGroup align` + `refresh()` 两树并排对比                                                                                                                                                                                          | align 开关                     |
| 11  | OKR 自定义节点内容     | `renderContent` 内按 `node.isLeftChild` 分支；`labelClassName="no-padding"`                                                                                                                                                                                                          | —                              |
| 12  | OKR 显示节点数         | `showNodeNum` + `nodeBtnContent` 用 `node.childNodes.length`                                                                                                                                                                                                                         | 折叠展开                       |
| 13  | 节点过滤（不可展开）   | `filterNodeMethod` + `filter(val)` + `currentLableClassName`；11 个按钮演示 `getNode`(按 key/按 data) / `setCurrentNode` / `setCurrentKey(null)` / `getCurrentNode` / `getCurrentKey` / `remove` / `append` / `insertBefore` / `insertAfter` / `updateKeyChildren`，体现源数据被回写 | 输入框 + 11 按钮 + EventLog(5) |
| 14  | OKR 模式过滤           | 同上，`filter` 同时命中左右两树；左右可共用 id、`getNode` 右树优先                                                                                                                                                                                                                   | 输入框 + 10 按钮 + EventLog    |
| 15  | 支持的事件（不可展开） | `onNodeClick` / `onNodeContextMenu`，说明「绑了才阻断默认菜单」                                                                                                                                                                                                                      | EventLog                       |
| 16  | 支持的事件（可展开）   | 加 `onNodeExpand` / `onNodeCollapse`，用 `node.isLeftChild` 区分侧                                                                                                                                                                                                                   | EventLog                       |
| 17  | 受控状态与方法         | `expandedKeys`+`onExpandedKeysChange`、`currentKey`+`onCurrentKeyChange`、`renderExpandBtn({node,data,expanded,side})`、`expandAll`/`collapseAll`/`expandNode(5)`/`collapseNode(2)`/`scrollToNode(8)`                                                                                | 实时读数 + 9 按钮 + 插槽开关   |
| 18  | 懒加载子节点           | `lazy` + `load(node,resolve,reject)`，800ms 模拟；说明回写、只加载一次、失败可重试、`is-loading` 旋转、`props.isLeaf`、`showNodeNum` 未加载时不显示                                                                                                                                  | ± 按钮 + 请求计数              |
| 19  | 画布组件 Viewport      | `toolbar`、`wheelBehavior`、`--okr-viewport-height:480px`、`renderToolbar({zoom,zoomIn,zoomOut,reset,fit})`、`centerNode`、`exportImage({type,scale,background,toPng,toSvg})`（Demo 直接注入函数以避开动态导入）                                                                     | 7 个按钮（含导出 PNG）         |
| 20  | 手风琴                 | `accordion`，强调只作用于交互展开                                                                                                                                                                                                                                                    | —                              |
| 21  | 点击节点展开           | `expandOnClickNode`，叶子只选中、OKR 根只切右侧                                                                                                                                                                                                                                      | —                              |
| 22  | 复选框                 | `showCheckbox` / `checkStrictly` / `defaultCheckedKeys={[3,4]}`、`onCheck` / `onCheckChange`、`setCheckedKeys([7,8])` / `getCheckedKeys` / `getHalfCheckedKeys` / `isChecked`                                                                                                        | 3 按钮 + EventLog              |
| 23  | 拖拽调整层级           | `draggable` / `allowDrag` / `allowDrop`、`DropType` 三分区、`moveNode(12,11,'inner')`、`--okr-drop-color`、自嵌套禁止、OKR 跨树默认禁止与放开                                                                                                                                        | EventLog                       |
| 24  | SVG 连接线             | `connector` 双模式 + `connectorShape` 三形状（非 svg 时形状按钮 `disabled`），强调布局不变                                                                                                                                                                                           | 2 + 3 按钮                     |

注意用例顺序的文件名编号本身是错位的（`Base041/061/062/081` 插入式编号，展示顺序上 demo-8 是 `Base062`、demo-9 是 `Base061`）——按展示顺序复刻即可。

Demo 数据集：移植 `playground/data.ts`（`baseData` / `keyedData` / `contentData` / `leftData` / `leftData2` / `okrContentData` / `okrContentLeftData` 全部为**工厂函数**，保证每个用例拿到独立副本，避免用例间互相污染源数据 —— 这是 Q3 回写行为下的必要设计）。

### 6.1 文档站技术栈

选型已定：**Next.js（App Router）+ fumadocs**，**版本严格锁定到参考站 `E:\personal-project\better-admin\apps\website`**（workspace 根 `.npmrc` 开 `save-exact=true`，下表一律精确写死、不用 `^` / `~`，由 `pnpm-lock.yaml` 固化）。目的是能直接搬参考站的组件与配置代码而不踩大版本差异。

运行时与框架依赖：

| 依赖                                   | 锁定版本 | 说明                                                                                                                                        |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `next`                                 | 16.2.6   | App Router；`(home)` 路由组放落地页、`docs/[[...slug]]` 放文档                                                                              |
| `react` / `react-dom`                  | 19.2.6   | 文档站锁 19.x，与库的 peer 下限 18.2 互不干涉（见 11.1）                                                                                    |
| `fumadocs-core` / `fumadocs-ui`        | 16.15.7  | `RootProvider`（i18n `zh-CN` + theme）、`DocsLayout` / `DocsPage` / `DocsBody` / `DocsTitle` / `DocsDescription`、内置 `CodeBlock`（shiki） |
| `fumadocs-mdx`                         | 15.4.0   | `source.config.ts` 的 `defineDocs({ dir: 'content' })`；`next.config.mjs` 用 `createMDX()` 包装                                             |
| `tailwindcss` / `@tailwindcss/postcss` | 4.3.3    | `globals.css` 里 `@import "tailwindcss"` + fumadocs `neutral.css` / `preset.css`                                                            |
| `next-themes`                          | 0.4.6    | 站级明暗切换（`attribute: "class"` + `enableSystem`）                                                                                       |
| `lucide-react`                         | 0.545.0  | 图标                                                                                                                                        |
| `ogl`                                  | 1.0.11   | 首屏 WebGL 光效（`components/background/light-ray.tsx`）                                                                                    |
| `theme-switch-animation`               | 0.1.0    | 主题切换动画（参考站 theme-toggle 用）                                                                                                      |

开发依赖同样锁定：`typescript` 5.9.3、`@types/react` 19.2.2、`@types/react-dom` 19.2.2、`@types/node` 24.7.2、`@types/mdx` 2.0.14、`prettier` 3.9.6。

**库侧工具链不在这张表里**（参考站没有 Vite/vitest），已定 **Vite 取最新**：`vite` 8.3.0 + `@vitejs/plugin-react` 6.1.1（其 peer 正是 `vite ^8`）、`vite-plugin-dts` 5.1.0（peer `vite >=3`）、`vitest` 5.0.1（peer 支持 `vite ^8`）、`@testing-library/react` 16.3.3 + `@testing-library/dom` 10.4.2、`@playwright/test` 1.63.0（与源项目同版，视觉基线口径一致）。`typescript` 统一 **5.9.3**——不是偏好而是硬约束：`typescript-eslint@8.70` 的 peer 是 `>=4.8.4 <6.1.0`，TS 7 用不了，且与参考站同版。完整清单见 `development-plan.md` 附录 A。CI 的 `peer-matrix` job 再用 override 分别装 React 18.2 与 19.2 各跑一遍。

工程基建照抄参考站：`lib/site.ts`（站点元信息单一来源）/ `lib/source.ts` / `lib/i18n.ts`（`UI_TRANSLATIONS`）、`app/sitemap.ts` / `robots.ts` / `not-found.tsx`、`scripts/with-memory-cap.mjs`（Windows 下 Next 构建内存兜底）、`public/fonts/maple-mono-cn-regular.woff2`（GB2312 子集自托管 + `unicode-range`，与参考站同款字体策略）。

### 6.2 视觉与信息架构

**视觉基线取参考站，不另立一套**：shadcn neutral + oklch 黑白体系（`--background: oklch(1 0 0)` / `--foreground: oklch(0.145 0 0)` 等），并在 `:root` / `.dark` 里把 `--color-fd-*` 覆盖为同一组值，保证落地页与文档区是同一套视觉而非两套并行变量；`@custom-variant dark (&:is(.dark *))`；`--radius: 0.625rem` 及 `--radius-*` 派生；Maple Mono CN 作为 `--font-sans-stack` 首选。落地页结构照参考站：`Navbar` → `Hero` →（dashed 分隔 `mx-auto max-w-5xl border-b border-dashed`）→ `Features` → `Stacks`（参考站此处陈列 5 个技术栈，本站改为「三套布局 + OKR 双向」展示位）→ `Cta` → `Faq` → `Footer`，背景 `LightRays`（`raysOrigin="top-center"`、`rayLength={1.5}`、`followMouse`、`opacity-65`，收着用以免白底起灰纱）。文档区 `DocsLayout`：`nav.title` 为 Logo + 站名（链回 `/`），`links` 放 GitHub 图标外链，侧栏底部只留操作条不放内容卡。

**内容分层沿用源项目 docs-site，但并入同一站**：

- 落地页 7 张特性卡（OKR 双向展开 / CSS 变量主题化 / 交互完备 / 大数据量 / 画布缩放与导出 / WAI-ARIA / 发布就绪）。
- `content/` 分组（每组一个 `meta.json` 控顺序与标题）：`start`（快速开始 / 仓库说明）、`guide`（Demo 总览 / 受控状态与方法 / 懒加载 / 画布 Viewport / 组对齐 Group / 键盘与可访问性 / 泛型与类型）、`theme`（外观与变量一览，对应源项目 `theme/index.md`）、`api`（6 张表）、`migration`（与 vue3-okr-tree 的差异，即本文档第 8 节）、`changelog`。
- 源项目 `guide/typed.md`（`createTypedOkrTree`）改为「泛型与类型推导」（D5）。
- 侧栏 / 顶部导航、URL 结构由本项目自定，但**Demo 总览页必须是可交互的 24 个用例本体**（源项目 docs-site 靠并站嵌 playground，这里直接用 MDX 引 client 组件）。

### 6.3 fumadocs 集成要解决的三件事（参考站没有的）

1. **交互 Demo 进 MDX**：参考站的 `mdx-components.tsx` 只注册了服务端内联 SVG 图集与 fumadocs 原生组件；本项目要在 MDX 里放实时示例，因此 `components/demo/*.tsx` 全部标 `'use client'`，并通过一个 `<DemoBlock>`（标题 + 描述 + 示例区 + 说明 + 可折叠源码 + 可选 `<EventLog>`）注册进 `getMDXComponents()` 白名单。白名单机制照抄参考站的注释约定：正文只允许注册过的组件。
2. **源码展示**：用 fumadocs 内置 `CodeBlock`（shiki），**去掉源项目的 `prismjs` 依赖**。源码字符串不经 loader——`content/` 页面本身是 RSC，用 `readFileSync` 读 `components/demo/*.tsx` 原文当 `code` prop 传给 `<DemoBlock>`，零插件、且永远与实际代码同步。（比参考站更进一步，但比 Vite 的 `?raw` 更省事。）
3. **两套「暗色」不要混为一谈**：站级明暗是 `.dark` 类（next-themes 驱动），而组件的 `theme="auto"` 走 `@media (prefers-color-scheme: dark)` 媒体查询——**站内切换按钮不会改变媒体查询**。因此：Demo 里的主题一律用容器级 `okr-theme-*` 类显式控制、不依赖站级 color-scheme；`auto` 主题的用例要额外给一个「跟随站点主题」的变体（在 `.dark` 作用域下覆盖 `--okr-*` 变量），顺带演示「变量可写在任意祖先」这一能力。这一点必须在文档里写明白，否则用户会以为 `auto` 失效。

另外：视觉回归（Playwright）从「截 playground 页面」改为「截文档站的 Demo 路由」，同时验证 fumadocs 排版下的样式；`OKR_VISUAL_PORT` 覆盖机制保留（Next dev/build 端口与参考站的 `with-memory-cap` 一起处理）。部署见 6.5。

### 6.4 API 表单一来源

与源项目同为 6 张（Attributes / Props / Events / Methods / 渲染定制 / Group 与键盘），数据落在 `packages/react-okr-tree` 与文档站共享的 `shared/api.ts`（列内容按本文档 4.1–4.5 的 React 命名改写）。**第一天就建这个文件**（React 版 API 面比 Vue 更长，多处手写必然漂移），但三个消费出口分两步：首版由 `<ApiTable>` 组件在文档站读它渲染 + README 手写；1.1.0 再补 `gen:readme` 脚本生成 README 的 API 段落（源项目用 `<!-- API-DOC-BEGIN/END -->` 标记包裹生成段，照抄该约定）。

### 6.5 部署：Cloudflare（纯静态资产）

已定走 Cloudflare，与源 okr-tree 站同一条链路。源项目的做法是 `wrangler.jsonc` 声明 `assets.directory` 指向 VitePress 产物 + `html_handling: "auto-trailing-slash"` + `not_found_handling: "404-page"`，由 Workers Builds 跑 `npx wrangler deploy`——**本质是纯静态，没有服务端运行时**。

这给 Next 站带来一个硬约束：**必须 `output: 'export'` 全静态导出**（默认产物目录 `out/`）。连带三处与参考站不同，实现时不要照抄过去：

| 参考站有                                     | 静态导出下         | 本站做法                                                                                                                                                                                                                                |
| -------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/api/search/route.ts`（Route Handler）   | 不可用             | 用 fumadocs 自带的**静态搜索客户端**：`fumadocs-core/search/client/orama-static` 的 `oramaStaticClient({ from })`，`from` 指向构建期导出到 `public/` 的索引 JSON（默认值是 `/api/search`，改为静态路径即可）。**不需要额外引 Pagefind** |
| `app/opengraph-image.tsx`（`ImageResponse`） | 不可用（需运行时） | 构建期预生成，或直接维护 `public/og.png` + `metadata.openGraph.images`                                                                                                                                                                  |
| Vercel 的 `trailingSlash` 默认行为           | —                  | `trailingSlash: true` 与 CF 的 `auto-trailing-slash` 对齐；无远程图片则 `images.unoptimized`                                                                                                                                            |

`generateStaticParams` 已覆盖全部 `content/` 路由，`next build` 在 export 模式下不应留下任何动态路由——写成 CI 断言（产物里不得残留 server chunk 目录）。

**反方案与取舍**：若坚持保留 fumadocs 原生的 `/api/search`，就要引入 `@opennextjs/cloudflare`（Workers 运行时 + `compatibility_flags` + 绑定），部署链路明显重于源项目的静态资产模式，而 okr-tree 文档站并不需要任何服务端能力。因此建议按静态导出落地，搜索质量交给 Pagefind（对 MDX 文档站足够）。

**spike 结论（阶段 0.2，2026-09-20）**：从 `fumadocs-ui@16.15.7` / `fumadocs-core@16.15.7` 的产物清单核实——搜索侧确实提供了面向无服务端场景的静态客户端 `search/client/orama-static`（`oramaStaticClient` + `StaticOptions`，`from` 默认 `/api/search`，可指向构建期导出的静态索引）与 `search/client/flexsearch-static`，因此**静态导出与站内搜索不冲突**，且不必额外引入 Pagefind。其余部分（`DocsLayout` / TOC / 侧栏树）是纯构建期能力。**注意这是包产物层面的核实，不是运行时验证**：真正的门禁在阶段 7 的 `website-build`（`next build` + `output:'export'` 跑通 + 浏览器里搜得到结果），届时把结果回写到这里。

配置产物：`apps/website/wrangler.jsonc`（`name: "react-okr-tree"`、`assets.directory: "./apps/website/out"`）、部署命令 `pnpm --filter <website> build && wrangler deploy`、域名 `react-okr-tree.baiwumm.com`（与 `vue3-okr-tree.baiwumm.com` 并存）。注意：参考站仓库内**不含**任何 Cloudflare 配置（其 `package.json` 描述写的是 Vercel），所以本节基线取的是**源 okr-tree 站的 wrangler 配置**，不是参考站。

---

## 7. 工程化需求

| 项        | 要求                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 包名      | `react-okr-tree`（npm 空闲，已核实）。仓库为 pnpm workspace：`packages/react-okr-tree`（库）+ `apps/website`（Next.js + fumadocs 文档站，见 6.1）                                                                                                                                                                                                                                                                                                                                                |
| peer      | `react >= 18.2.0`、`react-dom >= 18.2.0`（**建议下限 18.2 而非仅 19**，理由见 11.1）、`html-to-image ^1.11.0` **optional**（`peerDependenciesMeta`），且**绝不进 `dependencies`**                                                                                                                                                                                                                                                                                                                |
| 产物      | `dist/react-okr-tree.es.js` / `.cjs` / `.umd.js` + `dist/style.css` + `dist/index.d.ts` + `dist/index.d.cts`（`"type":"module"` 下 CJS 必须用 `.cjs` 才能 `require`）；`exports` 提供 `.` / `./style.css` / `./dist/style.css` / `./package.json`；`sideEffects` 标 `**/*.css`。**UMD 建议保留**（见 11.3），但需 external `react` / `react-dom` 并约定 globals，README 注明 CDN 场景无开发期警告                                                                                                |
| 构建      | Vite（lib 模式）+ `@vitejs/plugin-react` + `vite-plugin-dts`（配 `@microsoft/api-extractor` 打包为单文件 d.ts）+ 构建后脚本 `post-build.mjs`（生成 `index.d.cts`）+ `verify:dist.mjs`（jsdom 里挂载三种模式、断言产物清单与 `require()` 可用）；**不做源项目的「ESM 事后压缩」一步**——Vite 8 下 ESM 顶层导出名必须保留，用 Oxc 再跑一遍只省 0.5 kB gzip，却让 sourcemap 错位                                                                                                                     |
| 版本锁定  | **文档站严格锁到参考站版本号**（见 6.1），workspace 根 `.npmrc` 设 `save-exact=true`，禁止 `^` / `~`；库侧取当前最新（Vite 8.3.0 等）同样精确锁定，清单见 `development-plan.md` 附录 A；升级走独立 PR（Renovate 配置照抄源项目 `renovate.json`）                                                                                                                                                                                                                                                 |
| 部署      | Cloudflare 纯静态资产 + `output: 'export'`，详见 6.5                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 代码规范  | ESLint 9 + Prettier（配置沿用源项目取向：单引号、无分号、printWidth 100）；React hooks 规则必须开启（`react-hooks/exhaustive-deps` 不许关闭）                                                                                                                                                                                                                                                                                                                                                    |
| 单测      | Vitest + jsdom + `@testing-library/react`；**逐条移植源项目 226 条用例**（components 16 个 spec / model 4 个 / ssr 1 个），模型层测试几乎可原样搬；`resetWarnings()` 测试钩子保留；覆盖率阈值 statements 80 / branches 75 / functions 80 / lines 80                                                                                                                                                                                                                                              |
| 视觉回归  | Playwright + Chromium，基线需重新生成（源项目按平台各一套：`*-chromium-win32.png` 与 `*-chromium-linux.png`，覆盖 8 个布局/功能用例 + 6 套主题）；端口可用 `OKR_VISUAL_PORT` 覆盖（Windows 保留端口段会占用 4173）；含 `emulateMedia({media:'print'})` 计算样式断言、计算样式断言校验 `unstyled`（阴影被清掉且节点盒尺寸不变）、性能用例                                                                                                                                                         |
| CI        | `verify`（lint / typecheck / test / build / verify:dist / publint / attw / size-limit）、`peer-matrix`（React 18.2 / 19.2）、`visual`、`release`（tag → 门禁 → `npm publish --provenance` → GitHub Release）；文档站加 `website-build`（`next build` 通过 + export 静态性断言：产物无 server chunk 残留、搜索索引已生成）与 `website-deploy`（Cloudflare，仅 main）                                                                                                                              |
| 体积预算  | ESM gzip ≤ 20 kB、UMD ≤ 21 kB、`style.css` ≤ 4 kB（源项目为 19/19.5/4 kB，CSS 应完全一致）                                                                                                                                                                                                                                                                                                                                                                                                       |
| 性能基线  | 对齐源项目 `docs/perf.md` 的口径与脚本形态（2041 节点数据集；jsdom 首渲染 collapsed / expand-all、`expandAll`、`filter`+恢复、原地 push+pop、深层 label 改；真实 Chromium 首渲染 < 300 ms 门禁）。React 版预期在「局部更新」上更好，但**首渲染不得显著劣化**（建议门槛：与 Vue 版同数量级）                                                                                                                                                                                                      |
| 文档      | README 结构对齐源项目：安装 / 快速开始 / OKR 模式 / 自定义节点内容 / 通过 ref 调用方法 / 受控状态 / 懒加载 / 画布 / 组对齐 / 键盘与可访问性 / 泛型与类型 / 主题与样式定制（含变量一览、无样式模式、打印）/ API（生成段）/ 需要注意的行为（`nodeKey` 缺失时的 `$treeNodeId` 策略 + 冻结数据边界 + R2 的原地变更说明）/ 与 vue3-okr-tree 的差异 / 开发 / License。仅中文（双语 README 是源项目明确不做项）。文档站选型与结构见 6.1–6.5（24 个 Demo 直接作为站内可交互组件，不再有独立 playground） |
| CHANGELOG | 遵循 semver，1.0.0 = 首次发布（React 复刻版）                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## 8. 有意差异清单（验收以此为准）

| 编号 | 差异                                                                                                                                                                                                                                                 | 性质                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| D1   | `renderContent` / `nodeBtnContent` 不再接收 `h` 参数（React 无需框架注入创建函数），签名为 `(node) => ReactNode`                                                                                                                                     | 框架强制                       |
| D2   | 事件回调去掉第三参数 `nodeComponent`（Vue 组件实例在 React 无对应概念）；DOM 定位由 `handle.getNodeEl()` 承担                                                                                                                                        | 框架强制                       |
| D3   | `v-model:expanded-keys` / `v-model:current-key` / `v-model:zoom` / `v-model:offset` 改为「值 + `onXxxChange`」成对 props；`undefined` 判定为非受控，语义不变                                                                                         | 框架惯例                       |
| D4   | 插槽改为 render props（`renderNode` / `renderExpandBtn` / `empty` / `renderToolbar`），作用域参数形状保持一致；`children` 也可作为 `renderNode` 的函数形式                                                                                           | 框架惯例                       |
| D5   | 移除 `createTypedOkrTree<T>()`：`OkrTree<T>` 泛型组件原生提供同等类型收窄                                                                                                                                                                            | 能力等价、API 减少             |
| D6   | 移除 `VueOkrTreePlugin` / `app.use()` 式全局注册；默认导出改为 `OkrTree` 组件                                                                                                                                                                        | 框架强制                       |
| D7   | 同引用原地变更的自动感知降级为「渲染时脏检查 + 新增 `handle.refreshData()` 显式兜底」（R2）                                                                                                                                                          | 能力差异，需在 README 显著说明 |
| D8   | 子容器挂载/卸载过渡允许简化实现（不引入 `react-transition-group`），但 R7 列出的两个语义必须保留；展开/收起状态过渡不受影响                                                                                                                          | 降级（P2）                     |
| D9   | `nodeKey` / `direction` / `onlyBothTree` 运行时变更同样不生效，警告文案改为提示「绑定 `key` 以重挂载」                                                                                                                                               | 措辞                           |
| D10  | 类名前缀、包名、错误前缀由 `vue3-okr-tree` 改为 `react-okr-tree`；CSS 类名本身不变                                                                                                                                                                   | 措辞                           |
| D11  | `onNodeContextMenu` 与六个拖拽回调的 `event` 参数是 **React 合成事件**（`ReactMouseEvent` / `ReactDragEvent`），不是源项目的原生 DOM 事件；需要原生事件时取 `event.nativeEvent`。`preventDefault` / `stopPropagation` 语义一致（合成事件会转调原生） | 框架强制                       |
| D12  | `renderContent` 等回调的返回值为 `ReactNode`，不再要求由组件提供的创建函数                                                                                                                                                                           | 同 D1 的表现形式               |

除此之外，任何与源项目行为不一致的地方都视为缺陷。若实现中发现源项目行为自相矛盾（例：`renderExpandBtn` 与 `nodeBtnContent` 的优先顺序在 4.4 与源项目代码之间），以**源代码为准**并在本文档回写说明。

---

## 9. 验收标准

### 9.1 功能面

1. 4.1–4.7 全部 API 行为与源项目一致：默认值、类型、抛错文案与时机、边界行为（`nodeKey` 缺失时哪些方法静默、`showCollapsable=false` 强制全展开、`filter('')` 空值恢复、受控锁定态、OKR 左右分表与同 key 双侧生效）逐项核对。
2. 第 2.3 节继承结论（Q1–Q9 + 冻结数据 + 1.6.0 props 策略）无回退。
3. 文档站（Next.js + fumadocs）内 24 个 Demo 用例全部可交互、效果与原 Demo 对齐；落地页与文档区视觉与参考站同源（6.1–6.5），且 6.3 第 3 点的「站级 `.dark` ≠ 组件 `theme="auto"`」有对应用例与说明。
4. 三处渲染定制（`renderNode` / `nodeComponent` / `renderContent`）与两种按钮定制（`renderExpandBtn` / `nodeBtnContent`）优先级正确。
5. 第 8 节 D1–D10 之外的差异为零。

### 9.2 视觉与结构

6. 相同数据 + 相同 props 下，React 渲染出的 DOM（层级、标签、类名、`role` / `aria-*` / `data-level`）与源项目一致；建议实现方式：从源项目 Playground 抓一份 HTML 作为 fixture，加一条结构比对单测。
7. 6 套主题、`unstyled`、`connector` 双模式 × 3 形状、6 组动画、打印样式、焦点环在视觉回归下与源项目截图逐项对齐（同一份 CSS）。
8. 折叠子树保持挂载（`is-hidden` + `visibility/height` 内联），展开/收起不改变 OKR 根节点水平坐标。

### 9.3 架构与性能

9. R1 的局部更新成立：点击单个节点的 `+/-` 时，React 提交中受影响的组件数与树规模无关（用渲染计数断言，非全树）；拖拽悬停与键盘漫游时的跨节点状态更新同样只 bump 相关节点。
10. 模型层无框架 import（`grep` 断言 `model/` 下不出现 `react`）；`style.css` / `transition.css` 与源项目 diff 仅限包名注释。
11. 性能门槛达到 7 的基线；`refreshData()` 与 `deepWatch:false` 行为各有单测。
12. SSR：`react-dom/server` 的 `renderToString` 冒烟覆盖三套布局、OKR 左树、受控 props、`renderNode` / `empty`、Group / Viewport 包裹，服务端无 `window` 访问、无 hydration 警告。

### 9.4 交付物

13. `dist/react-okr-tree.es.js` / `.cjs` / `.umd.js` / `style.css` / `index.d.ts` / `index.d.cts` 齐备；`import 'react-okr-tree'` + `import 'react-okr-tree/dist/style.css'`、`require('react-okr-tree')`、`<script>` UMD 三条路径均可用；`publint` 与 `attw` 无错误；size-limit 达标。
14. 单测等价移植（≥ 226 条、阈值达标）、视觉回归与 CI 各 job 全绿。
15. 文档站 `next build` 在 `output: 'export'` 下通过（无动态路由残留、`out/` 全静态、Pagefind 索引生成、sitemap / robots / og 齐备），`wrangler deploy --dry-run` 通过；亮色与 `.dark` 两态下 Demo 无样式串味，fumadocs 排版（`--color-fd-*`）与 `--okr-*` 互不影响。

---

## 10. 明确不做（与源项目决策一致）

- 虚拟滚动（roadmap #15 未开工；React 下同样受「CSS 伪元素连接线依赖兄弟 DOM 相邻性」这一约束，需先做可行性 spike）。
- `direction: 'vertical-reverse' | 'horizontal-reverse'`、垂直模式的 OKR 双向（roadmap #12）。
- Tailwind / CSS-in-JS 进入组件库本体；双语 README；原版死代码。
- Devtools 集成、`selectedKey` / `orkstyle` 等从未生效的 API。

---

## 11. 建议采纳的决策（等你确认后即按此实现）

### 11.1 React peer 下限取 `>= 18.2.0`，不做「仅 19」

库的 peer 范围面向不特定消费者，与本仓库文档站用哪个 React 是两件事（文档站固定 19.2.x 无成本）。R1/R3 用到的全部能力（`useSyncExternalStore` / `forwardRef` / `useImperativeHandle` / Context / `'use client'` RSC 边界）18.2 起齐备，仅 19 能省的只有 `forwardRef` 一层包装；而 19-only 会把 okr-tree 的典型消费者——存量 18.x 中后台项目——挡在门外。代价是 CI 要跑 18 / 19 双 peer-matrix，这正是源项目对 vue 3.3/3.4/3.5 的做法。**建议：`>= 18.2.0`，内部继续用 `forwardRef`（19 下亦可用），README 注明 19 用户可省。**

### 11.2 API 命名全量保留原始标识符

`props` / `currentLableClassName` / `showCollapsable`（含两处原版拼写错误）一律保留。`props` 在 React 里只是普通属性名，不像 Vue 会撞 `this.props`，代价仅是可读性略差（内部变量另起清晰名字即可）；引入 `fieldNames` 之类别名会造出第二套真相，双份测试与文档，收益只是「更 React 一点」，与本期「功能全部对齐」的目标相悖。只有框架强制的部分按 D1–D10 转换。

### 11.3 保留 UMD 产物

多一个 format 是一行构建配置，体积预算照抄源项目，删掉它省不了维护成本；保留可让 `<script>` 标签试用这条路径继续可用（React 需 external + globals）。仅在 README 注明 CDN 下无开发期警告（`process` 不存在视为生产，与源项目一致）。若你更希望减产物，删 UMD 对体积与测试均无影响——这是唯一一条我判断「两个选项都可接受」的项。

### 11.4 `shared/api.ts` 首日建立，消费出口分两步

React 版 API 面（42 props + 14 回调 + 28 方法 + 渲染定制）比 Vue 版更长，三份手写必漂移。表数据落在 workspace 共享的 `shared/api.ts`；文档站 `<ApiTable>` 首版即读它，README 的 API 段落首版手写、1.1.0 再补 `gen:readme`（照抄 `<!-- API-DOC-BEGIN/END -->` 标记约定）。这样单一来源的收益当天就拿到，而不让渲染器工程挡住首版。

### 11.5 文档站按你的要求换栈，并兼任 playground

已写入 6.1–6.5：Next.js + fumadocs + Tailwind 4，视觉与工程基线取 `better-admin/apps/website`，部署取源 okr-tree 站的 Cloudflare 静态资产链路；仓库改 pnpm workspace 两包，取消独立 playground（源项目为绕开 VitePress/Vite 双栈才写的 `docs:build:full` 并站脚本随之消失），视觉回归改截文档站路由。**这一条已定，记录理由备查。**

### 已定（本轮）

- **版本严格锁到参考站** → 落为 6.1 的锁定清单 + workspace 根 `.npmrc` 的 `save-exact=true`。库侧工具链（Vite / Vitest / Playwright）参考站没有对应项，按你的决定**取 Vite 最新版（8.3.0）**，完整清单见 `development-plan.md` 附录 A；其中 `typescript` 锁 5.9.3 是硬约束（`typescript-eslint` peer 要求 `<6.1.0`），不是风格偏好。
- **部署 Cloudflare** → 落为 6.5。**这条比"选个平台"后果更重**：源站的 Cloudflare 链路是纯静态资产，所以 Next 侧必须 `output: 'export'`，而参考站的 `app/api/search/route.ts` 与 `app/opengraph-image.tsx` 在 export 模式下都不能用——搜索改 Pagefind 静态索引、og 改预生成。若你更希望保留 fumadocs 原生服务端搜索，就得改用 `@opennextjs/cloudflare`（Workers 运行时），链路比源项目重；我建议静态导出，并在开工首日先做一次 export 可行性 spike（6.5 已标为本文档唯一的技术不确定项）。

### 剩下的

无阻塞项。你确认 6.5 的取舍后，我按本文档出 `docs/development-plan.md`（阶段拆分 + 里程碑），仍然一轮只推进你批准的项。
