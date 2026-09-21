# react-okr-tree

[![npm version](https://img.shields.io/npm/v/react-okr-tree.svg)](https://www.npmjs.com/package/react-okr-tree)
[![npm downloads](https://img.shields.io/npm/dm/react-okr-tree.svg)](https://www.npmjs.com/package/react-okr-tree)
[![CI](https://github.com/baiwumm/react-okr-tree/actions/workflows/ci.yml/badge.svg)](https://github.com/baiwumm/react-okr-tree/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/react-okr-tree.svg)](./LICENSE)

在线文档站：<https://react-okr-tree.baiwumm.com>（Demo 用例与本文逐条对应，站内可直接交互）

基于 React 的组织架构树 / OKR 树组件，是 [vue3-okr-tree](https://github.com/baiwumm/vue3-okr-tree)（Vue 3 版，v1.13.0）的 React 完整复刻版，特性逐项对齐。核心是支持类似飞书 OKR 的**根节点左右双向展开**布局，全部连接线由纯 CSS 绘制。

版本号自 1.13.0 起与 `vue3-okr-tree` **锁步发布**：两边同号即同一功能面，升级时直接对照上游 CHANGELOG 即可。

- 对外 API 与 `vue3-okr-tree` 逐项对齐（含 `showCollapsable` / `currentLableClassName` 两处原版拼写），命名按 React 惯例做机械转换：`kebab-case` → `camelCase`、事件 → `onXxx` 回调、插槽 → render props、`v-model:x` → `x` + `onXxxChange`
- 有意差异集中在本文末节「与 vue3-okr-tree 的差异」（D1–D12），其中只有 **D7 数据变更检测**是能力差异，需要读一遍
- TypeScript 编写，提供单文件 `.d.ts`；`OkrTree<T>` 是泛型组件，`data` 与渲染作用域直接带上你的数据类型
- 产物：ESM / CJS / UMD + `dist/style.css`；`<OkrTree>` / `<OkrTreeGroup>` / `<OkrTreeViewport>` 三个组件 + `TreeStore` / `TreeNode` 等模型层导出
- 内建 `alignRoot` 根对齐，OKR 模式下展开/收起不位移，无需手动测量 DOM
- 全部外观取值通过 `--okr-*` CSS 变量暴露，内置 `default / feishu / dark / auto / minimal / colorful` 六套主题（`theme` prop），也可自定义
- 受控 `expandedKeys` / `currentKey`、`expandAll` / `collapseAll` / `expandNode` / `collapseNode` / `scrollToNode`、`renderExpandBtn` / `empty` 渲染定制
- `lazy` + `load` 懒加载子节点、画布缩放平移与 PNG/SVG 导出、跨实例根对齐、完整 WAI-ARIA 键盘导航、复选框、拖拽换父级、CSS/SVG 双连接线模式
- 无运行时依赖（React 之外零依赖），不引入 `react-transition-group` / `@dnd-kit` / Tailwind

## 安装

```bash
pnpm add react-okr-tree
# 或
npm i react-okr-tree
```

Peer 依赖：`react >= 18.2.0`、`react-dom >= 18.2.0`（下限取 18.2 而非仅 19：CI 在 React 18.2 / 19.2 双档矩阵下跑全量单测，组件用到的 `useSyncExternalStore` / `forwardRef` / Context 在 18.2 起齐备）。

`html-to-image`（`^1.11.0`）是**可选 peer**，只有用到画布组件的 `exportImage` 时才需要安装；也可以不装、改用 `exportImage({ toPng / toSvg })` 直接传入渲染函数（见下文）。

样式必须显式引入，否则只有结构没有外观（组件不自动注入 CSS）：

```jsx
import 'react-okr-tree/style.css'
// 等价于 'react-okr-tree/dist/style.css'
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
      { label: '财务部' },
    ],
  },
]

export default function App() {
  return <OkrTree data={data} direction="horizontal" showCollapsable defaultExpandAll />
}
```

React 没有全局注册这一步（源项目的 `app.use()` 插件在 React 侧已移除，D6），具名导入即用：

```jsx
import { OkrTree, OkrTreeGroup, OkrTreeViewport } from 'react-okr-tree'
```

组件另有默认导出（`import OkrTree from 'react-okr-tree'`，与具名 `OkrTree` 是同一引用）。源项目的默认导出是 `VueOkrTreePlugin`（`app.use()` 的插件对象），React 没有全局注册这回事，所以默认导出改为组件本身；UMD 下对应 `window.ReactOkrTree.default`。

CDN（UMD，全局变量 `ReactOkrTree`）：

```html
<link rel="stylesheet" href="https://unpkg.com/react-okr-tree/dist/style.css" />
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/react-okr-tree"></script>
<script>
  const { OkrTree } = window.ReactOkrTree
</script>
```

UMD 产物外部化 `react`（全局名 `React`）与 `react/jsx-runtime`（全局名 `ReactJSXRuntime`）。后者在浏览器里通常没有现成全局，因此 script 标签这条路径更适合快速试用；正经集成请用 ESM CDN（如 esm.sh）或打包器。另外：**这条路径下没有任何开发期警告**，见「需要注意的行为」。

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

- `onlyBothTree` 仅在 `direction="horizontal"` 时有效，且必须提供 `leftData`，否则抛出 `[Tree] leftData is required in onlyBothTree`。
- `leftData[0].children` 会挂到右树第一个根节点的左侧；左右两棵树允许存在相同的 `id`（内部左右分表，`getNode` 右树优先、未命中回退左树）。
- `alignRoot`（默认 `true`）让根节点在容器内居中（纯 CSS），展开/收起任意一侧根节点都不位移。设为 `false` 恢复按内容宽度排布的原版行为。
- `nodeKey` / `direction` / `onlyBothTree` / `deepWatch` 是**创建期快照**，运行时改不会生效；需要切换请给组件绑 `key` 强制重挂载（开发期会输出对应提示）。`data` / `leftData` 与其余 prop 运行时正常同步。

## 自定义节点内容

`renderContent` 与 `nodeBtnContent` 的签名都是 `(node) => ReactNode`。React 不需要框架注入创建函数，因此**没有 Vue 版的 `h` 参数**（D1）。`node` 是内部 `TreeNode` 实例（源数据在 `node.data`，文本在 `node.label`，另有 `isCurrent` / `expanded` / `leftExpanded` / `isLeftChild` / `level` / `childNodes` / `checked` 等）。

```jsx
function renderContent(node) {
  const cls = ['diy', node.isCurrent ? 'is-current' : '', node.isLeftChild ? 'left' : '']
  return (
    <div className={cls.join(' ')}>
      <div>{node.data.label}</div>
      <small>{node.data.content}</small>
    </div>
  )
}

export default function App({ data }) {
  return <OkrTree data={data} renderContent={renderContent} />
}
```

也可以传一个组件（`nodeComponent`），以 `{ node, data }` 为 props 渲染：

```jsx
function DeptCard({ node, data }) {
  return (
    <b>
      {data.label}
      {node.isCurrent ? '（已选中）' : ''}
    </b>
  )
}

export default function App({ data }) {
  return <OkrTree data={data} nodeComponent={DeptCard} />
}
```

或使用 render props（对应源项目的 `#default` 插槽；`children` 传函数与 `renderNode` 等价）。三者优先级：`renderNode` > `nodeComponent` > `renderContent` > 默认的 `node.label`。

```jsx
export default function App({ data }) {
  return (
    <OkrTree
      data={data}
      renderNode={({ node, data }) => (
        <>
          <b>{data.label}</b>
          {node.isCurrent ? <small>（已选中）</small> : null}
        </>
      )}
    />
  )
}
```

展开按钮内容同理，优先级为：`showNodeNum` 的折叠数字 > `renderExpandBtn`（对应 `#expand-btn`）> `nodeBtnContent`；三者都缺省时渲染内置的 `+/-` 符号。

## 通过 ref 调用方法

```jsx
import { useEffect, useRef, useState } from 'react'
import { OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'

export default function Demo({ rows, keyword }) {
  const treeRef = useRef(null)

  useEffect(() => {
    treeRef.current?.filter(keyword)
  }, [keyword])

  // 空值也会被调用：需返回 true 才能恢复全部节点
  const filterNode = (value, data) => (!value ? true : data.label.includes(value))

  return (
    <OkrTree
      ref={treeRef}
      data={rows}
      nodeKey="id"
      filterNodeMethod={filterNode}
      showCollapsable
    />
  )
}
```

命令式调用会同步改写你传入的源数据（见「需要注意的行为 · 回写类方法」）：

```jsx
treeRef.current.append({ id: 10, label: '销售三部' }, 6)
treeRef.current.setCurrentKey(7)
treeRef.current.scrollToNode(8) // Promise<boolean>
```

`ref` 拿到的是 `OkrTreeHandle`（28 个方法 + `store` / `root`），入参普遍接受 **key / data 对象 / TreeNode 实例**三种形态。TypeScript 下写 `useRef<OkrTreeHandle>(null)`。

## 受控状态

`expandedKeys` / `currentKey` 传入后即为受控模式（需 `nodeKey`）：列表内节点展开、其余收起；用户点击 +/- 或调用展开/收起方法都会触发 `onExpandedKeysChange` / `onCurrentKeyChange` 回写。不传时保持非受控行为（`defaultExpandedKeys` 运行时变更只追加展开、不收回，`defaultCheckedKeys` 是先清空再应用；两者在 `data` 重建后都不恢复）。

只传值不传回调 = 锁定态：用户点不动，但外部改值仍会生效。

```jsx
import { useRef, useState } from 'react'
import { OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'

export default function Demo({ rows }) {
  const treeRef = useRef(null)
  const [expandedKeys, setExpandedKeys] = useState([1]) // 只展开 id 为 1 的节点
  const [currentKey, setCurrentKey] = useState(null) // null 表示无选中

  return (
    <>
      <button onClick={() => treeRef.current?.expandAll()}>全部展开</button>
      <button onClick={() => treeRef.current?.collapseAll()}>全部收起</button>
      <button onClick={() => treeRef.current?.scrollToNode(8)}>滚动到 id=8</button>

      <OkrTree
        ref={treeRef}
        data={rows}
        nodeKey="id"
        showCollapsable
        expandedKeys={expandedKeys}
        onExpandedKeysChange={setExpandedKeys}
        currentKey={currentKey}
        onCurrentKeyChange={setCurrentKey}
        renderExpandBtn={({ expanded }) => (
          <span className="org-chart-node-btn-text">{expanded ? '−' : '＋'}</span>
        )}
        empty={<span>暂无数据</span>}
      />
    </>
  )
}
```

## 数据变更检测（React 专属，务必读一遍）

Vue 版靠 `watch(props.data, ..., { deep })` 同时覆盖「引用变化」与「同引用原地变更」。React 没有深侦听，`data` 的变更按下面三种情形分别处理（requirements R2 / D7）：

**a. 换了数组 / 节点对象的引用 → 全量重建。**

```jsx
const [data, setData] = useState(() => makeData())
setData(makeData()) // 一整批新对象：重建，受控值按 expandedKeys / currentKey 恢复
```

**b. 数组换了外壳、元素还是同一批对象 → 刻意不重建。**

```jsx
<OkrTree data={[...rows]} /> // 与 data={rows} 视为同一份数据，不重建
```

这条最容易让人意外，但是有意为之：宿主每次渲染都新建数组字面量（`data={[...]}`、`data={rows.map(...)}` 未 memo 时）在 React 里比 Vue 常见得多，若把「外壳换了」当变化，每次渲染都会整树重建，展开态 / 勾选态被反复冲掉。**代价**是：只换外壳不算换数据——要触发重建，节点对象本身也必须是新引用（`<OkrTree data={[...rows]} />` 不重建，`setData(makeData())` 才重建）。

**c. 同一批对象被原地改动（push / splice / 改字段）→ 靠渲染期结构脏检查接住，但前提是宿主重渲染了。**

宿主没重渲染时组件根本拿不到这次比较，需要显式调 `ref.current.refreshData()`：

```jsx
import { useRef, useState } from 'react'
import { OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'

export default function Demo() {
  const treeRef = useRef(null)
  // 引用恒定：只原地改，不换外壳 —— 交给渲染期脏检查 / refreshData()
  const [data] = useState(() => [{ id: 1, label: '总部', children: [] }])
  const [, forceRender] = useState(0)

  const pushDept = () => {
    data[0].children.push({ id: Date.now(), label: '新部门' })
    forceRender(n => n + 1) // 宿主渲染 → 组件这次渲染里做结构脏检查 → 增量更新（保留展开态）
  }

  const pushWithoutRender = () => {
    data[0].children.push({ id: Date.now(), label: '来自 zustand / jotai 的直接 mutate' })
    treeRef.current.refreshData() // 宿主不会重渲染时，这是唯一的入口
  }

  return (
    <>
      <button onClick={pushDept}>原地新增 + 宿主重渲染</button>
      <button onClick={pushWithoutRender}>原地新增 + refreshData()</button>
      <OkrTree ref={treeRef} data={data} nodeKey="id" showCollapsable defaultExpandAll />
    </>
  )
}
```

增量更新复用已有节点的 `expanded` / `leftExpanded` / `isCurrent` / `checked`，不是整棵重建。超大数据量且确定不依赖原地变更时，传 `deepWatch={false}` 跳过每次渲染的结构扫描（创建期生效）——此时只有「一整批新对象」才会触发重建，`refreshData()` 仍然可用。

## 懒加载子节点

数据量大时（如几千节点的组织架构），初始只给顶层节点，子级在首次展开时通过 `load` 异步获取：

```jsx
import { useState } from 'react'
import { OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'

export default function Demo() {
  const [data] = useState(() => [{ id: 1, label: '总部' }])

  function loadNode(node, resolve, reject) {
    // node 是内部 TreeNode：node.data 为源数据，node.isLeftChild 区分 OKR 左树节点
    fetch(`/api/children?id=${node.data.id}`)
      .then(r => r.json())
      .then(resolve)
      .catch(() => reject?.())
  }

  return <OkrTree data={data} nodeKey="id" showCollapsable lazy load={loadNode} />
}
```

行为约定：

- **未加载节点**：初始 `data` 中没有 `children` 字段（或为空数组）的节点视为未加载；`load` resolve 后子节点会同步写入源数据的 `children`（与 `append` 语义一致），并标记为已加载，之后不再重复请求。
- **展开驱动**：点击 +/- 按钮、`expandAll` / `expandNode` / `scrollToNode`、`defaultExpandedKeys`、`expandedKeys` 触发未加载节点时，都会先调用 `load`，完成后再展开。
- **失败与重试**：`reject()` 或 `load` 抛错时节点回到折叠态（按钮上的 `is-loading` 状态清除），下次展开会重新请求。
- **叶子节点**：用 `props: { isLeaf: 'leaf' }` 指定叶子字段（支持函数），标记为叶子的未加载节点不显示展开按钮、不触发请求；未指定时未加载节点默认视为有子节点。
- **加载中状态**：按钮带 `is-loading` 类（内置旋转指示），`renderExpandBtn` 作用域含 `loading: boolean`；`showNodeNum` 在未加载时不显示数字。
- **过滤**：`filter` 不会触发未加载节点的 `load`（未加载子树内容未知）。

## 画布组件：OkrTreeViewport

大树（几十个部门、数百节点的组织架构图）在固定视口里放不下时，用 `<OkrTreeViewport>` 包裹树即可获得缩放与平移能力——它只做外层变换，不侵入树本体，也不改变树的任何 API：

```jsx
import { useRef, useState } from 'react'
import { OkrTree, OkrTreeViewport } from 'react-okr-tree'
import 'react-okr-tree/style.css'

export default function Demo({ orgData }) {
  const vpRef = useRef(null)
  const [zoom, setZoom] = useState(1)

  return (
    <OkrTreeViewport
      ref={vpRef}
      style={{ '--okr-viewport-height': '480px' }}
      minZoom={0.2}
      maxZoom={4}
      zoom={zoom}
      onZoomChange={setZoom}
      renderToolbar={({ zoom, zoomIn, zoomOut, reset, fit }) => (
        <>
          <button onClick={zoomOut}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn}>＋</button>
          <button onClick={reset}>重置</button>
          <button onClick={() => fit()}>适应窗口</button>
        </>
      )}
    >
      <OkrTree data={orgData} nodeKey="id" direction="horizontal" showCollapsable />
    </OkrTreeViewport>
  )
}
```

props 速记：`minZoom` / `maxZoom`（`0.2` / `4`）、`zoomStep`（每次缩放一格的乘除系数，默认 `1.2`）、`zoom` + `onZoomChange`、`offset` + `onOffsetChange`（不传即内部维护）、`wheelBehavior`（`ctrl-zoom` 默认，按住 Ctrl/⌘ 才缩放，不劫持页面滚动 / `zoom` 始终缩放 / `scroll` 从不缩放）、`toolbar`（显示内置工具栏；给了 `renderToolbar` 时无需开启）。

交互：滚轮缩放以指针为中心；按住拖拽平移（位移超过 3px 才算平移，且平移后吞掉随后一次 click，不误触 `onNodeClick`）；双击复位；触控双指捏合缩放。

ref 方法：`zoomIn()` / `zoomOut()` / `reset()` / `fitToScreen(padding = 20)` / `centerNode(key | data | node)`（先展开祖先再对准视口中心，返回 `Promise<boolean>`）/ `exportImage(options?)` / `getZoom()` / `getOffset()`。

`exportImage` 基于 [html-to-image](https://github.com/bubkoo/html-to-image)：以可选 peerDependency 声明（不进 `dependencies`），用到导出能力时自行 `npm i html-to-image`；默认按需动态导入，未安装时抛出带安装指引的错误。在打包器下动态导入裸包名不可靠时（例如浏览器端裸 specifier 无法解析），通过 `options.toPng / toSvg` 直接传入渲染函数即可绕开安装。选项：`type`（`'png' | 'svg'`，默认 png）、`scale`（像素密度，默认 2）、`background`（背景色，如 `'#ffffff'`）、`toPng` / `toSvg`。

```jsx
await vpRef.current.exportImage({ type: 'png', scale: 2, background: '#ffffff' })
```

`OkrTreeGroup` 可以放在 Viewport 内组合使用；配合树的方法 `getNodeEl(key)` 可获取节点 DOM 元素。

## 多棵树根对齐：OkrTreeGroup

`alignRoot` 让每棵树的根节点在自身容器内居中。多棵 OKR 树并排对比、且宽度不足以容纳最深的一侧时，各树「各自居中」的位置会不同——这正是原版需要「结合业务层手动测量 DOM」的场景。用 `<OkrTreeGroup>` 包裹即可：它测量组内所有左子树容器的最大自然宽度并统一设置（写入 `--okr-group-left-width`），使各树根节点水平坐标完全一致，并自动响应成员的挂载 / 更新 / 尺寸变化与字体加载完成。

```jsx
<OkrTreeGroup>
  <OkrTree data={a} leftData={leftA} onlyBothTree direction="horizontal" nodeKey="id" />
  <OkrTree data={b} leftData={leftB} onlyBothTree direction="horizontal" nodeKey="id" />
</OkrTreeGroup>
```

- `align`：boolean，默认 `true`；`false` 时各树独立排布并清除已写入的宽度。
- `ref.current.refresh()`：手动重新测量（字体加载完成、外部样式变化等特殊场景）。
- 成员树需开启 `alignRoot`（默认已开）。

## 键盘导航与可访问性

树容器为 `role="tree"`，节点为 `role="treeitem"`，带 `aria-level` / `aria-expanded` / `aria-selected` / `aria-checked`（仅 `showCheckbox` 时输出，含 `mixed`）/ `aria-disabled` / `aria-setsize` / `aria-posinset`（后两者按可见兄弟节点计数，被 `filter` 隐藏的节点不计入），子容器为 `role="group"`；采用漫游 tabindex（同一时刻只有一个节点可 Tab 进入）。

系统开启「减弱动态效果」（`prefers-reduced-motion: reduce`）时，展开/收起过渡与 `scrollToNode` 的平滑滚动自动关闭，状态直切。

| 按键              | 行为                                           |
| ----------------- | ---------------------------------------------- |
| `Tab`             | 进入 / 离开树                                  |
| `↑` / `↓`         | 在可见节点间移动焦点（文档顺序，跳过收起子树） |
| `→`               | 展开当前节点；已展开则进入第一个子节点         |
| `←`               | 收起当前节点；已收起则回到父节点               |
| `Enter` / `Space` | 选中节点（`showCheckbox` 下 `Space` 切换勾选） |
| `Home` / `End`    | 移到第一个 / 最后一个可见节点                  |

OKR 模式下：根节点 `←` 作用于左子树（展开或进入），左树节点的 `←` / `→` 镜像（`←` 展开/进入、`→` 收起/返回根节点）。焦点在节点内部的输入控件时不拦截按键。焦点环通过 `--okr-focus-color`（默认 `#409eff`）/ `--okr-focus-width`（默认 `2px`）定制。

## 泛型与类型

源项目的 `createTypedOkrTree<T>()` 在 React 侧不需要——`OkrTree` 本身就是泛型组件，`data` / `leftData` 与渲染作用域里的 `data` 直接带上你的数据类型：

```tsx
import { useRef } from 'react'
import { OkrTree, type OkrTreeHandle } from 'react-okr-tree'

interface Dept {
  id: number
  label: string
  leader?: string
}

function DeptTree({ depts }: { depts: Dept[] }) {
  const treeRef = useRef<OkrTreeHandle>(null)
  return (
    <OkrTree<Dept>
      ref={treeRef}
      data={depts}
      nodeKey="id"
      renderNode={({ data }) => (
        <>
          {data.label} — {data.leader}
        </>
      )}
    />
  )
}
```

主要公共类型：`OkrTreeProps` / `OkrTreeHandle` / `OkrTreeGroupProps` / `OkrTreeGroupHandle` / `OkrTreeViewportProps` / `OkrTreeViewportHandle` / `TreeNodeData` / `TreeKey` / `TreeDirection` / `TreeTheme` / `AnimateName` / `TreeOptionProps` / `TreeLoadFunction` / `FilterNodeMethod` / `RenderContentFunction` / `NodeBtnContentFunction` / `LabelClassName` / `ExpandBtnScope` / `ScrollToNodeOptions` / `TreeCheckInfo` / `DropType` / `ConnectorMode` / `ConnectorShape` / `ExportImageOptions` / `ViewportOffset` / `ViewportWheelBehavior` / `BUILT_IN_THEMES`，以及模型层 `TreeNode` / `TreeStore` / `createNode` / `NODE_KEY` / `getNodeKey` / `markNodeData` 与画布纯函数 `clampZoom` / `computeFit` / `renderToDataUrl` / `loadHtmlToImage`。

## 主题与样式定制

组件所有可定制的外观取值都通过 CSS 变量暴露，并在使用点写成 `var(--okr-*, 默认值)`，因此：

- 不传 `theme` 时外观与 vue3-okr-tree / vue-okr-tree 完全一致（三者共用同一份 CSS）；
- 变量可以写在组件根容器（`theme` prop 会加 `okr-theme-{name}` 类）、任意祖先元素、`:root`，甚至内联 `style={{ '--okr-line-color': 'red' }}`；
- 选中态只在主题中提供内置样式，且优先级刻意放低（`:where()`，特异度 0），你通过 `currentLableClassName` 传入的类始终可以覆盖它。

### 内置主题

```jsx
<OkrTree data={data} theme="feishu" />
```

| 主题       | 定位                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| `default`  | 与 vue-okr-tree 一致：灰线、白卡、直角、轻阴影（不加任何类）           |
| `feishu`   | 飞书 OKR 观感：圆角 8px、浅灰线、主色 `#3370ff` 选中态                 |
| `dark`     | 暗色页面：深底、浅灰线、亮色选中态                                     |
| `auto`     | 跟随系统：浅色下同 `default`，`prefers-color-scheme: dark` 时同 `dark` |
| `minimal`  | 演示 / 打印：无阴影、细边框、小圆角，选中态细蓝边                      |
| `colorful` | 按层级着色（节点带 `data-level` 属性，所有主题下都输出），适合组织架构 |

传不在这六套里的名字是允许的（用于挂你自己的 `.okr-theme-{name}` 类），只是开发期会输出一条提示，避免拼错主题名时毫无视觉变化却找不到原因。

注意 `theme="auto"` 走的是**媒体查询**，不是宿主框架的主题 class：站点级 `.dark` 切换不会改变 `prefers-color-scheme`，需要跟随站点的请用「在 `.dark` 作用域下覆盖 `--okr-*` 变量」的写法。

### 自定义主题 / 覆盖变量

```css
/* 方式一：自定义主题名，配合 theme="brand" */
.okr-theme-brand {
  --okr-line-color: #409eff;
  --okr-node-radius: 8px;
  --okr-current-bg: #409eff;
  --okr-current-color: #fff;
}
.okr-theme-brand :where(.org-chart-node-label-inner.is-current) {
  --okr-node-bg: var(--okr-current-bg);
  --okr-node-color: var(--okr-current-color);
}

/* 方式二：在任意祖先上直接覆盖若干变量（可叠加在内置主题之上） */
.my-page {
  --okr-gap-level: 32px;
  --okr-node-font-size: 14px;
}
```

### 变量一览

| 变量                      | 说明                              | 默认值                          |
| ------------------------- | --------------------------------- | ------------------------------- |
| `--okr-line-color`        | 连接线颜色                        | `#ccc`                          |
| `--okr-line-width`        | 连接线宽度                        | `1px`                           |
| `--okr-line-radius`       | 兄弟连线拐角圆角                  | `5px`                           |
| `--okr-gap-level`         | 层级间距 / 连接线长度             | `20px`                          |
| `--okr-gap-sibling`       | 兄弟节点水平间距                  | `5px`                           |
| `--okr-gap-node-y`        | 水平模式下节点纵向间距            | `10px`                          |
| `--okr-node-bg`           | 节点背景                          | `transparent`                   |
| `--okr-node-color`        | 节点文字颜色                      | `inherit`                       |
| `--okr-node-border`       | 节点边框                          | `none`                          |
| `--okr-node-radius`       | 节点圆角                          | `0`                             |
| `--okr-node-padding`      | 节点内边距                        | `10px`                          |
| `--okr-node-font-size`    | 节点字号                          | `16px`                          |
| `--okr-node-shadow`       | 节点阴影                          | `0 1px 10px rgba(31,35,41,.08)` |
| `--okr-node-shadow-hover` | 节点 hover 阴影                   | `0 1px 14px rgba(31,35,41,.12)` |
| `--okr-btn-size`          | 展开按钮直径                      | `20px`                          |
| `--okr-btn-bg`            | 展开按钮背景                      | `#fff`                          |
| `--okr-btn-shadow`        | 展开按钮阴影                      | `0 0 2px rgba(0,0,0,.15)`       |
| `--okr-btn-sign-color`    | 按钮内 +/- 颜色                   | 取 `--okr-line-color`           |
| `--okr-btn-text-color`    | 按钮内子节点数字颜色              | `#909090`                       |
| `--okr-current-bg`        | 选中背景（主题内生效）            | `#3370ff`                       |
| `--okr-current-color`     | 选中文字（主题内生效）            | `#fff`                          |
| `--okr-disabled-opacity`  | 禁用节点透明度                    | `0.6`                           |
| `--okr-drop-color`        | 拖拽放置指示线 / inner 描边颜色   | 取 `--okr-current-bg`           |
| `--okr-focus-color`       | 键盘焦点环颜色                    | `#409eff`                       |
| `--okr-focus-width`       | 键盘焦点环宽度                    | `2px`                           |
| `--okr-anim-duration`     | 展开/收起过渡时长（由 prop 写入） | `200ms`                         |
| `--okr-anim-easing`       | 过渡缓动（按动画名可覆盖）        | `cubic-bezier(.55,0,.1,1)`      |

画布组件 `OkrTreeViewport` 另有一组变量：`--okr-viewport-height`（默认 `420px`）、`--okr-viewport-bg`、
`--okr-viewport-border`、`--okr-viewport-radius`、`--okr-viewport-toolbar-bg`、`--okr-viewport-toolbar-shadow`。
另有 `--okr-group-left-width` 由 `OkrTreeGroup` 运行时测量写入，不是给用户改的。

同一份变量在不同使用点的回退值并不相同（例如 `--okr-line-color` 连线取 `#ccc`、复选框边框取 `#c0c4cc`、工具栏边框取 `#e0e0e0`；`--okr-node-bg` 卡片取 `transparent`、复选框填充取 `#fff`），逐项覆盖时以实际生效点为准。

### 无样式模式

`unstyled` 只去掉卡片外观（背景 / 边框 / 圆角 / 阴影，含 hover 态），布局与连接线原样保留，供 Tailwind 或自有设计系统接管。它**刻意不动** `padding`、`font-size`、`color`：改 `padding` 会移动节点盒、牵动连接线的伪元素几何，这三项请继续用 `--okr-node-padding` / `--okr-node-font-size` / `--okr-node-color` 或 `labelClassName` 调。

顺带说明为什么样式是手写而不是接 Tailwind：连接线是伪元素上的像素级几何（`::before/::after` 的边框与偏移量彼此咬合），工具类表达不了；而 Preflight 会重新引入全局样式污染——那正是最早那版 `* { margin:0; padding:0 }` 被诟病的地方。所以组件本体只留 CSS 变量，文档站才随意用 Tailwind。

### 打印

`@media print` 下自动隐藏展开按钮与画布工具栏（纸上点不动的交互件），并去掉卡片与画布的 `box-shadow`（部分打印引擎会把阴影渲染成灰块、也费墨）。折叠的子树按屏幕原样输出——想让整棵树都印出来，先调 `expandAll()`。需要图片版请用画布组件的 `exportImage()`。

## API

完整表格的唯一来源是包内的 `shared/api.ts`（文档站的 `<ApiTable>` 已经读它渲染；README 的完整表格段落将在 1.1.0 由 `gen:readme` 从同一份数据生成）。本节只给形状与归属，避免同一份内容两处手写漂移：

| 分组                       | 内容                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Attributes                 | 42 行：`data` / `leftData` / 方向与模式 / 外观与定制 / 交互 / 状态 / 懒加载 / `deepWatch` / `className` / `style` / `children`          |
| props（字段映射）          | 4 项：`label` / `children` / `disabled` / `isLeaf`，未配置某字段时按 `data[prop]` 兜底读取                                              |
| Events（回调 props）       | 14 个：`onNodeClick` / `onNodeExpand` / `onNodeCollapse` / `onNodeContextMenu`、两个受控回调、`onCheck` / `onCheckChange`、六个拖拽回调 |
| Methods（通过 ref 调用）   | 28 个方法 + `store` / `root`，分属查询定位、增删改、展开收起、勾选、移动、`refreshData`                                                 |
| 渲染定制（对应源项目插槽） | `renderNode` / `renderExpandBtn` / `empty` / `renderToolbar`，作用域参数形状与插槽一致                                                  |
| 组合组件与键盘导航         | `OkrTreeGroup` 与 `OkrTreeViewport` 的 props / methods、键盘契约                                                                        |

几条贯穿全表的一致约定：

- 回调与 `labelClassName` 系列的 `node` 参数一律是内部 `TreeNode` 实例，**不是**源数据对象（源数据在 `node.data`）。
- `onNodeContextMenu` 与各拖拽回调的 `event` 是 **React 合成事件**，需要原生事件时取 `event.nativeEvent`（D11）。`onNodeContextMenu` 只有传入该回调时才 `preventDefault` 默认菜单。
- `OkrTreeGroup` 包裹多棵 OKR 模式的树使组内根节点水平坐标一致；键盘导航为所有树内置。

## 需要注意的行为

### 回写类方法会改你的源数据（Q3）

以下方法会**同步修改你传进来的 `data` 对象**（写 `children` 数组、把新节点对象塞进去），与 Vue 版一致：

- `append` / `insertBefore` / `insertAfter` / `remove` / `updateKeyChildren`
- `moveNode`（以及拖拽引发的移动）
- 懒加载的 `resolve(children)`

这不是 bug 而是刻意保留的语义：命令式改完之后视图与源数据始终一致，不需要你自己同步状态。但它意味着：

- 别把 `data` 当成不可变输入——`props` 字段映射、Redux/zustand store 里的对象会被就地改写；
- 需要「撤销」请自己先深拷贝；
- 同一份数据同时喂给多棵树会互相污染（文档站的 24 个 Demo 因此一律用工厂函数取数）。

想在不动源数据的前提下换内容，正确做法是给自己维护的状态做一次更新，让 `data` 的引用变化后由组件重建（见「数据变更检测」）。

### 未设置 nodeKey 时的默认 key 策略

不配 `nodeKey` 也能正常渲染与交互：组件会在每个节点的源数据对象上写入一个**不可枚举**的 `$treeNodeId` 内部 id，作为列表 `key`。源数据被冻结或只读、写不进去时，降级到内部 WeakMap 记录同样的 id，行为不变（不抛错）。`nodeKey` 配了但数据里缺该字段时，再回退到 TreeNode 的自增 id，避免同层 key 全为 `undefined` 导致 React 误复用子树。

代价是：**未配 `nodeKey` 时节点注册表是空的**，凡是按 key 或按 data 对象定位节点的入参都查不到节点——

- `getNode(data 对象)` 返回 `null`；
- `getCheckedKeys` / `getHalfCheckedKeys` 返回空数组，`isChecked` 为 `false`；
- `expandedKeys` / `defaultExpandedKeys` / `currentKey` / `currentNodeKey` / `defaultCheckedKeys` 均不生效（这五种配置在开发期会给出警告），`setCheckedKeys` 同样只会出现「一个都勾不上」的结果，没有警告；
- `remove` **静默无效**（原版行为）；
- `setCurrentKey` / `getCurrentKey` / `setCurrentNode` / `updateKeyChildren` 抛错，文案与源项目一致：`[Tree] nodeKey is required in setCurrentKey` / `... in getCurrentKey` / `... in setCurrentNode` / `... in updateKeyChild`（最后一条保留源项目的截断拼写）。
- `filter` 与 `nodeKey` 无关，只依赖 `filterNodeMethod`：缺它时抛 `[Tree] filterNodeMethod is required when filter`。

仍然可用的是**传 Node 实例**：`renderNode` 作用域里的 `node`、各回调的节点参数，以及不依赖注册表的 `getVisibleNodes()`、`expandAll` / `collapseAll` / `filter` / `refreshData()`。

另外，深拷贝源数据（`JSON.parse(JSON.stringify(data))`、部分状态库的快照恢复）会丢掉这个不可枚举标记，克隆出的对象会被分配新的内部 id、被当作不同节点，展开态随之丢失。需要持久化、跨拷贝定位节点或使用上述按 key 的能力，请配置 `nodeKey`。

### 冻结 / 只读源数据

渲染、展开收起、过滤、勾选、键盘导航等只读操作在 `Object.freeze` 或外部 store 的 readonly 数据上完全正常。
但上一节列出的**回写类方法**要改源数据的 `children`，冻结数据下这些操作会跳过回写并输出一条开发期警告（不抛错、也不静默），视图本身仍会相应增删。需要在这类数据上做增删，请改为更新上层状态、让 `data` 引用变化后由组件重建。

### SSR / Next.js

`renderToStaticMarkup` 冒烟覆盖了三种布局、OKR 左树、受控 props、`renderNode` / `empty` 与 Group / Viewport 包裹：模块顶层不访问 `window` / `document` / `matchMedia` / `ResizeObserver`，`useSyncExternalStore` 带 `getServerSnapshot`，服务端可直接静态导出。`exportImage`、`html-to-image` 的动态导入、`scrollToNode` 均为客户端专属。App Router 下可直接 import：三种产物（es / cjs / umd）的首行都带 `'use client'`，所以你不必再包一层客户端组件——不过要传回调（`onNodeClick` 等）的话，那个文件本身仍然得是客户端组件。

### CDN / UMD 下没有开发期警告

警告靠 `process.env.NODE_ENV !== 'production'` 判定，而 `<script>` 标签环境里 `process` 不存在，因此一律视为生产环境、**所有开发期提示都不会输出**（配置错误只会表现为一幅不对的画）。排查问题请用打包器环境 + StrictMode，或直接对照本文的配置约束。

## 与 vue3-okr-tree 的差异（迁移说明）

API 名称与语义逐项对齐，把 `import { VueOkrTree } from 'vue3-okr-tree'` 换成 `import { OkrTree } from 'react-okr-tree'` 并引入 `style.css` 即可。以下为有意差异（编号对应 `docs/requirements.md` 第 8 节 D1–D12）：

| 编号 | vue3-okr-tree（Vue 3）                                      | react-okr-tree                                                                                                |
| ---- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| D1   | `renderContent(h, node)` / `nodeBtnContent(h, node)`        | 去掉 `h`：`renderContent(node) => ReactNode`                                                                  |
| D2   | 事件回调第三参 `nodeComponent`（组件实例）                  | 移除；DOM 定位用 `handle.getNodeEl(data)`                                                                     |
| D3   | `v-model:expanded-keys` / `current-key` / `zoom` / `offset` | 成对的 `xxx` + `onXxxChange`；`undefined` 即非受控，语义不变                                                  |
| D4   | 具名插槽 `#default` / `#expand-btn` / `#empty` / `#toolbar` | render props `renderNode` / `renderExpandBtn` / `empty` / `renderToolbar`；`children` 传函数等价 `renderNode` |
| D5   | `createTypedOkrTree<T>()`                                   | 移除：`OkrTree<T>` 泛型组件原生提供同等类型收窄                                                               |
| D6   | `VueOkrTreePlugin` / `app.use()` 全局注册                   | 移除；`OkrTree` 为具名导出                                                                                    |
| D7   | `deep watch` 自动感知原地变更                               | 渲染期结构脏检查（需宿主重渲染）+ 新增 `handle.refreshData()` 显式兜底                                        |
| D8   | Vue `<transition>` 承担子容器挂载/卸载过渡                  | 同构的「延迟卸载」实现，不引入 `react-transition-group`；两个关键语义保留                                     |
| D9   | `nodeKey` / `direction` / `onlyBothTree` 运行时变更不生效   | 同样不生效，警告文案改为提示「绑定 `key` 以重挂载实例」                                                       |
| D10  | 错误前缀 `[vue3-okr-tree]`                                  | `[react-okr-tree]`；CSS 类名与 DOM 结构完全不变                                                               |
| D11  | 事件参数是原生 DOM 事件                                     | React 合成事件，原生事件取 `event.nativeEvent`                                                                |
| D12  | `renderContent` 必须返回 `h()` 产物                         | 返回任意 `ReactNode`                                                                                          |

此外源项目对 `vue-okr-tree`（Vue 2）的修复结果全部继承，没有回退：全树过滤（父节点有可见后代时保持可见）、OKR 左右分表与同 key 双侧生效、`animate` / `animateName` / `animateDuration` 真实生效、内建 `alignRoot`、可用的节点内容定制口、`props.disabled` 真实禁用、样式全部限定在 `.org-chart-container` 内（无全局 `*` reset）。

## 开发

pnpm workspace 两包：`packages/react-okr-tree`（库）+ `apps/website`（Next.js + fumadocs 文档站）。文档站内嵌 24 个可交互 Demo，**同时承担 playground 的职责**，没有独立的 Demo 站（源项目的 `docs:build:full` 并站脚本随之消失）。在线文档站源码在 [apps/website/](../../apps/website/)，部署为 Cloudflare 纯静态资产（`output: 'export'`）。

```bash
pnpm install
pnpm dev              # 库的 Vite 开发 harness（引用源码，HMR）
pnpm test             # Vitest：模型层单测 + 组件冒烟测试（含 SSR 冒烟）
pnpm test:coverage    # 覆盖率（阈值 80 / 75 / 80 / 80）
pnpm typecheck        # tsc --noEmit
pnpm lint             # ESLint（react-hooks 规则不许关闭）
pnpm format           # Prettier（单引号、无分号、printWidth 100）
pnpm build            # 库构建 → dist/（ESM / CJS / UMD + style.css + d.ts / d.cts）
pnpm build:check      # build + verify:dist：用产物在 jsdom 里挂载三种模式并断言导出面
pnpm verify:package   # publint + attw 包发布体检
pnpm size             # size-limit 体积预算（ESM ≤20 kB / UMD ≤21 kB / CSS ≤4 kB gzip）
pnpm dev:website      # 文档站（先 build 库，Next 消费 dist 产物）
pnpm build:website    # 文档站构建 + 静态导出完整性校验
```

`pnpm bench`（2041 节点性能基准）与 `pnpm test:visual`（Playwright 视觉回归，端口可用 `OKR_VISUAL_PORT` 覆盖）脚本已在 `package.json` 里，配套脚本与基线属计划 9.2 / 9.3，尚未落地。

需求与决策见 [docs/requirements.md](../../docs/requirements.md)（§3 移植决策、§8 有意差异清单），阶段拆分见 [docs/development-plan.md](../../docs/development-plan.md)。

## License

MIT
