'use client'

import { useMemo, useState } from 'react'
import {
  OkrTree,
  type ExpandBtnScope,
  type NodeBtnContentFunction,
  type TreeNode,
} from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { baseData } from './data'

/**
 * 展开圆盘内容定制（对应源项目 playground/components/demos/Base062.vue）
 *
 * 两个口 + 一条优先级：`showNodeNum` 的折叠数字 > `renderExpandBtn`（对应 #expand-btn 插槽）
 * > `nodeBtnContent`（旧名，仍在 API 表里）> 内置 CSS 画的 +/−。「两个同传」与
 * 「showNodeNum」两档就是给这条优先级用的。
 *
 * 与 Vue 用例的差别：
 * 1. 插槽 → render prop：`renderExpandBtn(scope)` 的作用域形状与 `#expand-btn` 一致
 *    （`{ node, data, expanded, side, loading }`），`side` 在 OKR 左子树才会是 'left'；
 * 2. `nodeBtnContent(node)` 去掉了 Vue 的第一个参数 `h`（D1），只给 node；
 * 3. 自定义内容要包一层内置类 `org-chart-node-btn-text`：它用不透明底铺满整个圆盘，
 *    把 CSS 伪元素画的 +/− 盖掉——这属于 DOM 契约，不是可选美化；
 * 4. 圆盘是 20px 的绝对定位元素，按钮里放长文案会溢出，本例只放单字符；
 * 5. 换按钮口不需要重挂载：渲染定制这一组 prop 变更会被组件广播成一次全树重绘，
 *    已挂载节点立刻跟上，用户的展开态不受影响。
 */

const MODES = ['default', 'nodeBtnContent', 'renderExpandBtn', 'both', 'showNodeNum'] as const
type Mode = (typeof MODES)[number]

/** 旧名：与 renderContent 同一套约定，只有 node */
const nodeBtnContent: NodeBtnContentFunction = (node: TreeNode) => (
  <span className="org-chart-node-btn-text" title={node.label}>
    智
  </span>
)

/** 新名（等价 #expand-btn 插槽）：拿得到该侧的展开态与懒加载态 */
const renderExpandBtn = ({ expanded, side, loading }: ExpandBtnScope) => (
  <span className="org-chart-node-btn-text" title={side}>
    {loading ? '…' : expanded ? '−' : '+'}
  </span>
)

export function ExpandBtnDemo() {
  const data = useMemo(baseData, [])
  const [mode, setMode] = useState<Mode>('renderExpandBtn')
  const useNum = mode === 'showNodeNum'
  const useBtnContent = mode === 'nodeBtnContent' || mode === 'both' || useNum
  const useScope = mode === 'renderExpandBtn' || mode === 'both' || useNum

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fd-muted-foreground">按钮内容：</span>
        {MODES.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`rounded-lg border border-fd-border px-2 py-1 text-sm ${
              mode === key ? 'bg-fd-accent font-medium' : 'text-fd-muted-foreground'
            }`}
          >
            {key === 'both' ? '两个同传' : key}
          </button>
        ))}
      </div>
      <p className="text-sm text-fd-muted-foreground">
        {useNum
          ? '树是展开的，随便收起一层就能看到圆盘里的数字：showNodeNum 优先，两个自定义口完全不会被调用。'
          : '点圆盘收起 / 展开即可看到自定义内容替掉了内置的 +/−；renderExpandBtn 拿到的 expanded 就是该侧当前状态。'}
      </p>
      <OkrTree
        data={data}
        direction="horizontal"
        showCollapsable
        defaultExpandAll
        showNodeNum={useNum}
        nodeBtnContent={useBtnContent ? nodeBtnContent : undefined}
        renderExpandBtn={useScope ? renderExpandBtn : undefined}
      />
    </div>
  )
}
