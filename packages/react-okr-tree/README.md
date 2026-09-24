# react-okr-tree

[![npm version](https://img.shields.io/npm/v/react-okr-tree.svg)](https://www.npmjs.com/package/react-okr-tree)
[![npm downloads](https://img.shields.io/npm/dm/react-okr-tree.svg)](https://www.npmjs.com/package/react-okr-tree)
[![CI](https://github.com/baiwumm/react-okr-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/baiwumm/react-okr-tree/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/react-okr-tree.svg)](./LICENSE)

📚 **[在线文档站](https://react-okr-tree.baiwumm.com)** · [Demo 用例（可交互）](https://react-okr-tree.baiwumm.com/docs/guide/demos) · [更新日志](./CHANGELOG.md)

基于 React 的组织架构树 / OKR 树组件，是 [vue3-okr-tree](https://github.com/baiwumm/vue3-okr-tree)（Vue 3 版）的 React 完整复刻版，特性逐项对齐。特色是支持类似飞书 OKR 的**根节点左右双向展开**布局，全部连接线由纯 CSS 绘制。

姊妹包 `vue3-okr-tree` 为 Vue 3 版；版本号自 1.13.0 起两边**锁步发布**（同号即同一功能面），升级时直接对照上游 CHANGELOG。

## 特性

- 对外 API 与 `vue3-okr-tree` 逐项对齐（含 `showCollapsable` / `currentLableClassName` 两处原版拼写），命名按 React 惯例机械转换：`kebab-case` → `camelCase`、事件 → `onXxx` 回调、插槽 → render props、`v-model:x` → `x` + `onXxxChange`
- 有意差异集中在 [迁移说明](https://react-okr-tree.baiwumm.com/docs/migration)（D1–D12），其中只有 **D7 数据变更检测**是能力差异，见下文
- TypeScript 编写，单文件 `.d.ts`；`OkrTree<T>` 是泛型组件，`data` 与渲染作用域直接带上你的数据类型；React 之外**零运行时依赖**
- 产物 ESM / CJS / UMD + `dist/style.css`；`<OkrTree>` / `<OkrTreeGroup>` / `<OkrTreeViewport>` 三个组件 + `TreeStore` / `TreeNode` 等模型层导出
- `alignRoot` 根对齐：OKR 模式下展开/收起不位移，无需手动测量 DOM；`OkrTreeGroup` 支持多棵树跨实例对齐
- 受控 `expandedKeys` / `currentKey`，`expandAll` / `collapseAll` / `scrollToNode` 等方法，`renderNode` / `renderExpandBtn` / `empty` 渲染定制
- `lazy` + `load` 懒加载子节点（大数据量只加载展开路径），画布缩放平移与 PNG/SVG 导出
- 复选框（父子联动 / 半选）、拖拽调整层级、手风琴、点击节点展开、`filter` 过滤、CSS / SVG 双连接线模式
- 外观全部通过 `--okr-*` CSS 变量暴露，内置 `default / feishu / dark / auto / minimal / colorful` 六套主题（与 Vue 版共用同一份 CSS），`unstyled` 可交给 Tailwind 接管
- 完整 WAI-ARIA 键盘导航（漫游 tabindex、方向键展开收起），自动响应系统的减弱动效设置

## 安装

```bash
pnpm add react-okr-tree
# 或
npm i react-okr-tree
```

Peer 依赖 `react >= 18.2.0` / `react-dom >= 18.2.0`（CI 在 React 18.2 / 18.3 双档矩阵下跑全量单测，19 由默认安装档覆盖）。`html-to-image`（`^1.11.0`）是**可选 peer**，只用到画布 `exportImage` 时才需要装，也可以不装、改用 `exportImage({ toPng / toSvg })` 传入渲染函数。

样式必须显式引入，否则只有结构没有外观（组件不自动注入 CSS）：

```jsx
import 'react-okr-tree/style.css' // 等价于 'react-okr-tree/dist/style.css'
```

## 快速开始

```jsx
import { OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'

const data = [
  {
    label: 'xxx科技有限公司',
    children: [
      { label: '产品研发部', children: [{ label: '研发-前端' }, { label: '研发-后端' }] },
      { label: '销售部', children: [{ label: '销售一部' }] },
    ],
  },
]

export default function App() {
  return <OkrTree data={data} direction="horizontal" showCollapsable defaultExpandAll />
}
```

具名导入三个组件（`OkrTree` / `OkrTreeGroup` / `OkrTreeViewport`）；默认导出是组件本身。没有全局注册这一步（D6）。CDN / UMD 与 Next.js / SSR 的用法见 [安装与快速开始](https://react-okr-tree.baiwumm.com/docs/start)。

## OKR 模式（根节点左右双向展开）

```jsx
<OkrTree
  data={data}
  leftData={leftData}
  onlyBothTree
  direction="horizontal"
  showCollapsable
  nodeKey="id"
  defaultExpandAll
/>
```

- `onlyBothTree` 仅在 `direction="horizontal"` 时有效，且必须提供 `leftData`。
- `leftData[0].children` 挂到右树第一个根节点的左侧；左右两棵树允许存在相同的 `id`（内部左右分表，`getNode` 右树优先、未命中回退左树）。
- `alignRoot`（默认 `true`）让根节点在容器内居中，展开/收起任意一侧都不位移；设为 `false` 恢复按内容宽度排布。

## 完整文档

在线文档站：<https://react-okr-tree.baiwumm.com>（[Demo 总览](https://react-okr-tree.baiwumm.com/docs/guide/demos) 的 24 个用例站内可直接交互，文档站同时承担 playground 职责）。

| 场景                                                             | 文档站页面                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 不知道从哪找：按能力速查                                         | [指南总览](https://react-okr-tree.baiwumm.com/docs/guide)                    |
| 安装、样式引入、CDN / UMD、Next.js / SSR                         | [安装与快速开始](https://react-okr-tree.baiwumm.com/docs/start)              |
| 定制节点内容（`renderNode` / `nodeComponent` / `renderContent`） | [自定义节点内容](https://react-okr-tree.baiwumm.com/docs/guide/node-content) |
| 受控 `expandedKeys` / `currentKey`、ref 方法、事件回调           | [受控与非受控](https://react-okr-tree.baiwumm.com/docs/guide/controlled)     |
| 复选框（父子联动 / 半选）与拖拽调整层级                          | [复选框与拖拽](https://react-okr-tree.baiwumm.com/docs/guide/interaction)    |
| 数据变更检测、源数据回写、`nodeKey` 缺失与只读数据               | [数据变更与源数据回写](https://react-okr-tree.baiwumm.com/docs/guide/data)   |
| 懒加载子节点                                                     | [懒加载](https://react-okr-tree.baiwumm.com/docs/guide/lazy)                 |
| 画布缩放平移与图片导出 `OkrTreeViewport`                         | [画布缩放](https://react-okr-tree.baiwumm.com/docs/guide/viewport)           |
| 多棵树根对齐 `OkrTreeGroup`                                      | [多树根对齐](https://react-okr-tree.baiwumm.com/docs/guide/group)            |
| 键盘导航与 ARIA                                                  | [键盘导航](https://react-okr-tree.baiwumm.com/docs/guide/keyboard)           |
| 泛型 `OkrTree<T>` 与导出的类型                                   | [泛型与类型推导](https://react-okr-tree.baiwumm.com/docs/guide/typed)        |
| 主题、`--okr-*` 变量、无样式模式、打印                           | [主题与样式定制](https://react-okr-tree.baiwumm.com/docs/theme)              |
| 从 `vue3-okr-tree` 迁移（D1–D12 有意差异）                       | [从 vue3-okr-tree 迁移](https://react-okr-tree.baiwumm.com/docs/migration)   |
| 目录结构、三份真源、命令与发布                                   | [仓库与本地开发](https://react-okr-tree.baiwumm.com/docs/start/repo)         |

## API

完整表格（每个 prop 的说明、类型与默认值）见 **[文档站 API 页](https://react-okr-tree.baiwumm.com/docs/api)**，数据来自包内 `shared/api.ts` 单一来源，`tests/api-surface.spec.tsx` 断言它与 `OkrTreeHandle` 不漂移。本节只给分组与条数，不逐条重复：

- **Attributes**（42 条）：布局与模式（`data` / `leftData` / `direction` / `onlyBothTree`）· 外观与定制（`labelWidth` / `labelClassName` / `renderContent` / `nodeComponent` / `theme` / `unstyled`）· 交互（`accordion` / `expandOnClickNode` / `showCheckbox` / `draggable` / `connector`）· 状态（`expandedKeys` + `onExpandedKeysChange` 等）· 懒加载（`lazy` / `load`）· React 独有的 `className` / `style` / `children`
- **props（字段映射配置）**（4 条）：`label` / `children` / `disabled` / `isLeaf`
- **Events（回调 props）**（14 条）：`onNodeClick` / `onNodeExpand` / `onNodeCollapse` / `onNodeContextMenu`、两个受控回调、`onCheck` / `onCheckChange`、六个拖拽回调
- **Methods（通过 ref 调用）**（29 条）：查询定位（`getNode` / `getNodeEl` / `getVisibleNodes` / `getNodePath`）· 增删改与 `moveNode` · 展开收起与 `scrollToNode` · 勾选 · `refreshData()` · `store` / `root`
- **渲染定制（对应源项目插槽）**（4 条）：`renderNode` / `renderExpandBtn` / `empty` / `renderToolbar`
- **组合组件与键盘导航**（7 条）：`OkrTreeGroup` 与 `OkrTreeViewport` 的 props / methods、`exportImage`、键盘契约

两条贯穿全表的约定：回调与 `labelClassName` 系列的 `node` 参数一律是内部 `TreeNode` 实例（源数据在 `node.data`），**不是**源数据对象；回调的 `event` 是 React 合成事件，需要原生事件时取 `event.nativeEvent`（D11）。

## 数据变更检测（React 侧必读）

Vue 版靠 deep watch 同时覆盖「引用变化」与「同引用原地变更」，React 没有深侦听（D7），`data` 的变更按三种情形处理：

- **换了数组 / 节点对象的引用** → 全量重建（`setData(makeData())`）。
- **数组换了外壳、元素还是同一批对象** → **刻意不重建**（`data={[...rows]}` 与 `data={rows}` 视为同一份数据）。这条最容易让人意外：宿主每次渲染都新建数组字面量在 React 里比 Vue 常见得多，把「换外壳」当变化会让展开态被反复冲掉。
- **同一批对象被原地改动**（push / splice / 改字段）→ 靠渲染期结构脏检查接住，**前提是宿主重渲染了**；外部 store 直接 mutate 不触发渲染时，显式调 `ref.current.refreshData()`。

要触发重建，节点对象本身也必须是新引用。超大数据量且确定不依赖原地变更时传 `deepWatch={false}` 跳过每次渲染的结构扫描（创建期生效）。

## 需要注意的行为

- `append` / `insertBefore` / `insertAfter` / `remove` / `updateKeyChildren` / `moveNode` 与懒加载 `resolve` 会**同步修改你传入的源数据**（Q3）；需要「撤销」请自己先深拷贝，同一份数据喂给多棵树会互相污染。
- 冻结 / 只读源数据：只读操作全部正常；上述回写类方法的写入被跳过并给出开发期警告，视图仍完成增删（下次 `data` 引用变化重建时该节点会消失）。
- 不配 `nodeKey` 也能渲染与交互，但节点注册表是空的：按 key / data 定位节点的能力全部失效（`getNode` 返回 `null`、`remove` 静默无效、`setCurrentKey` 等抛错），传 `TreeNode` 实例的仍然可用。
- `nodeKey` / `direction` / `onlyBothTree` 是创建期快照，运行时改不会生效，需绑 `key` 重挂载；`deepWatch` 与其余 props 一样运行时正常同步（下一次渲染即生效）。
- CDN / UMD 这条路径下**没有任何开发期警告**（`process` 不存在即视为生产环境），排查问题请用打包器环境 + StrictMode。

完整清单与机制说明见 [数据变更与源数据回写](https://react-okr-tree.baiwumm.com/docs/guide/data)。

## 开发

pnpm workspace 两包：`packages/react-okr-tree`（库，本文件所在处）+ `apps/website`（Next.js + fumadocs 文档站，同时承担 playground 职责）。

```bash
pnpm install
pnpm dev              # 库的开发 harness（引用源码，端口 5199）
pnpm test             # Vitest：模型层单测 + 组件冒烟（含 SSR 冒烟）
pnpm typecheck        # tsc --noEmit
pnpm lint             # ESLint（react-hooks 规则不许关闭）
pnpm build            # 库构建 → dist/（三格式 + style.css + d.ts）
pnpm build:check      # build + verify:dist（产物层断言）
pnpm verify:package   # publint + attw 包发布体检
pnpm size             # size-limit 体积预算
pnpm dev:website      # 文档站（先 build 库，Next 消费 dist 产物）
```

更多命令见 [仓库与本地开发](https://react-okr-tree.baiwumm.com/docs/start/repo)。需求与决策见 [docs/requirements.md](../../docs/requirements.md)（§3 移植决策、§8 有意差异清单）。

发布：更新 `version` 与 `CHANGELOG.md` → 提交 → `git tag v1.x.x && git push origin v1.x.x`，`release.yml` 跑完门禁后发包并创建 GitHub Release；版本号与 `vue3-okr-tree` 锁步。

## License

MIT
