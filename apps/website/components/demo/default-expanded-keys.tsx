'use client'

import { useMemo, useState } from 'react'
import { OkrTree, type TreeKey } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData } from './data'

/**
 * 指定默认展开的节点（对应源项目 playground/components/demos/Base041.vue）
 *
 * `defaultExpandedKeys` 命中节点的**整条祖先链**会一并展开，所以本例展开 `[5]`（UI 设计，
 * 一个叶子）看到的是「根 → 产品研发部 → UI 设计」这条路径亮了。前提是给 `nodeKey`：
 * 它是注册表的主键，缺了这些 key 找不到节点（开发期会警告并且完全不起作用）。
 *
 * 语义上有两点容易踩：
 * 1. 换一批 key 只「叠加展开」，不会把上一批收起——它是默认值，不是受控值；
 *    要能收要放得用 `expandedKeys` + `onExpandedKeysChange`（受控用法见对应用例）。
 * 2. 数组必须是稳定引用。这里用模块级常量而不是在 JSX 里写 `[5]`：组件按引用变化
 *    来重新应用这批 key，每次渲染新建字面量会把用户手动收起的节点又弹开（requirements R2）。
 */
const EXPANSIONS: { label: string; keys: TreeKey[] }[] = [
  { label: '[5] UI 设计', keys: [5] },
  { label: '[2] 产品研发部', keys: [2] },
  { label: '[7, 8] 销售部两支', keys: [7, 8] },
]

export function DefaultExpandedKeysDemo() {
  const data = useMemo(keyedData, [])
  const [expansion, setExpansion] = useState(EXPANSIONS[0])

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <span className="text-fd-muted-foreground">defaultExpandedKeys</span>
        {EXPANSIONS.map(item => (
          <button
            key={item.label}
            type="button"
            aria-pressed={item === expansion}
            onClick={() => setExpansion(item)}
            className={`rounded-lg border border-fd-border px-3 py-1 ${
              item === expansion
                ? 'bg-fd-accent text-fd-accent-foreground'
                : 'text-fd-muted-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <OkrTree
        data={data}
        direction="horizontal"
        showCollapsable
        nodeKey="id"
        defaultExpandedKeys={expansion.keys}
      />
    </div>
  )
}
