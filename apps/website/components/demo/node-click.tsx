'use client'

import { useMemo, useState } from 'react'
import { OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData } from './data'

/**
 * 点击卡片切换展开（对应源项目 playground/components/demos/BaseNodeClick.vue）
 *
 * `expandOnClickNode` 默认关闭（保持原版行为：只有 +/− 圆盘能收起）。打开后点卡片内容即切展开，
 * 选中态与 `onNodeClick` 照常触发；两个例外按源项目语义保留：
 * - **叶子节点**只选中，不切换（没有可切的东西）；
 * - **OKR 根节点**只切右侧子树，左树仍由左侧圆盘控制。
 *
 * 与 `showCheckbox` 同时开启时各管各的：勾勾选框不会切换展开，点卡片也不会改勾选。
 * 两个开关都是运行时可切换的 prop（组件内有同步 effect），不需要重建。
 */
export function NodeClickDemo() {
  const data = useMemo(keyedData, [])
  const [expandOnClickNode, setExpandOnClickNode] = useState(true)
  const [showCheckbox, setShowCheckbox] = useState(false)
  const [current, setCurrent] = useState<string | null>(null)

  const btn = 'rounded-lg border border-fd-border px-3 py-1 text-sm'
  const active = 'bg-fd-accent font-medium'

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setExpandOnClickNode(v => !v)}
          className={`${btn} ${expandOnClickNode ? active : ''}`}
        >
          expandOnClickNode：{expandOnClickNode ? '开' : '关'}
        </button>
        <button
          type="button"
          onClick={() => setShowCheckbox(v => !v)}
          className={`${btn} ${showCheckbox ? active : ''}`}
        >
          showCheckbox：{showCheckbox ? '开' : '关'}
        </button>
      </div>
      <p className="mb-3 text-sm text-fd-muted-foreground">最近点击：{current ?? '无'}</p>
      <OkrTree
        data={data}
        nodeKey="id"
        direction="horizontal"
        showCollapsable
        expandOnClickNode={expandOnClickNode}
        showCheckbox={showCheckbox}
        onNodeClick={(data, node) => setCurrent(`「${data.label}」（key ${node.key}）`)}
      />
    </>
  )
}
