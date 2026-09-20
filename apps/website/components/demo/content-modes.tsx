'use client'

import { useMemo, useState } from 'react'
import {
  OkrTree,
  type NodeComponent,
  type NodeComponentProps,
  type RenderContentFunction,
  type TreeNode,
} from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { contentData } from './data'

/**
 * 节点内容定制的三种写法对比（对应源项目 playground/components/demos/Base06.vue）
 *
 * 三种写法渲染同一张卡片，卡片左上角标出「这一张是从哪个口渲染出来的」；
 * 「三种同传」这一档用来验优先级：renderNode > nodeComponent > renderContent > node.label。
 *
 * 与 Vue 用例的四处差别：
 * 1. `renderContent(node)` 只收 node，没有 Vue 传进来的 `h`（D1），直接返回 JSX；
 * 2. `#default` 作用域插槽 → `renderNode` prop（`children` 传函数等价），
 *    `node-component` → `nodeComponent`，入参形状仍是 `{ node, data }`；
 * 3. Vue 用 `markRaw(defineComponent(...))` 防 reactive 代理，React 没这个问题，
 *    但组件身份同样要稳定：`DiyCard` 必须定义在模块作用域——写在渲染函数里，
 *    每次渲染都是一个「新的组件类型」，卡片会整棵重挂载；
 * 4. 切换写法**不需要**重挂载：渲染定制虽然走 `configRef`（换回调身份不该让整树重渲染，R1），
 *    但组件对这一组 prop 做了一次全树通知，所以换了口已挂载的节点会立刻重绘，展开态保住。
 *    （这一条是文档 demo 反过来发现的库缺口：早期版本换 renderContent 视觉上毫无反应，
 *    当时只能靠 `key` 重挂载绕过。）
 */

const ROUTES = ['label', 'renderContent', 'nodeComponent', 'renderNode', 'all'] as const
type Route = (typeof ROUTES)[number]

function Card({ node, via }: { node: TreeNode; via: string }) {
  return (
    <div
      className={`flex flex-col items-start text-left ${
        node.isCurrent ? 'text-fd-primary' : 'text-fd-foreground'
      }`}
    >
      <span className="text-[10px] text-fd-muted-foreground">{via}</span>
      <span className="text-sm font-medium">{node.label}</span>
      <span className="text-xs text-fd-muted-foreground">{node.data.content}</span>
    </div>
  )
}

/** 写法一：内容区渲染函数，只有 node（源数据在 node.data，文本在 node.label） */
const renderContent: RenderContentFunction = node => <Card node={node} via="renderContent" />

/** 写法二：内容组件，props 为 { node, data } */
const DiyCard: NodeComponent = ({ node }) => <Card node={node} via="nodeComponent" />

/** 写法三：整节点渲染（对应源项目 #default 插槽），优先级最高 */
const renderNode = ({ node }: NodeComponentProps) => <Card node={node} via="renderNode" />

export function ContentModesDemo() {
  const data = useMemo(contentData, [])
  const [route, setRoute] = useState<Route>('renderContent')
  const on = (key: Route) => route === key || route === 'all'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fd-muted-foreground">写法：</span>
        {ROUTES.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => setRoute(key)}
            className={`rounded-lg border border-fd-border px-2 py-1 text-sm ${
              route === key ? 'bg-fd-accent font-medium' : 'text-fd-muted-foreground'
            }`}
          >
            {key === 'all' ? '三种同传' : key}
          </button>
        ))}
      </div>
      <p className="text-sm text-fd-muted-foreground">
        优先级 <code>renderNode</code> &gt; <code>nodeComponent</code> &gt;{' '}
        <code>renderContent</code> &gt; <code>node.label</code>。点卡片选中节点，三种写法里都读得到
        <code>node.isCurrent</code>。
      </p>
      <OkrTree
        data={data}
        direction="horizontal"
        showCollapsable
        defaultExpandAll
        renderContent={on('renderContent') ? renderContent : undefined}
        nodeComponent={on('nodeComponent') ? DiyCard : undefined}
        renderNode={on('renderNode') ? renderNode : undefined}
      />
    </div>
  )
}
