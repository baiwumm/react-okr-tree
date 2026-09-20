'use client'

import { useMemo, useState } from 'react'
import { OkrTree, OkrTreeGroup } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData, leftData, leftData2 } from './data'

/**
 * OKR 双树与跨实例根对齐（对应源项目 playground/components/demos/Base07.vue）
 *
 * 两棵 `onlyBothTree` 的树上下排开做对比，第二棵的左子树多一层（`leftData2`）。
 * `alignRoot`（React 里默认 true）只负责「每棵树自己的根节点在自身容器内水平居中」：
 * 纯 CSS，展开收起都不会让根节点跳位。但两棵树的左子树深度不同时，深的那一行会被
 * `min-width: max-content` 撑得更宽，居中坐标就跟着偏——这正是 `<OkrTreeGroup>` 要解决的：
 * 它量出组内所有左子树容器的最大自然宽度并统一写入，两棵树的根节点才落在同一条竖线上。
 * 关掉 `align` 就能看到差别（等价于不套 Group，组会清掉已写入的宽度）。
 *
 * 与源用例的差别：Vue 侧把 group 开关和 `align-root` 绑在同一个变量上，这里拆成两个按钮，
 * 免得读者把「各自居中」和「组内统一宽度」当成一件事。成员树传 `alignRoot={false}` 时，
 * 组内对齐没有意义（Group 建在 alignRoot 的居中机制之上）。
 */
export function OkrGroupDemo() {
  const [groupAlign, setGroupAlign] = useState(true)
  const [alignRoot, setAlignRoot] = useState(true)
  // 三份数据都必须稳定：换引用 = store 全量重建，展开态会被冲掉（requirements R2）
  const [data, left, deeperLeft] = useMemo(() => [keyedData(), leftData(), leftData2()], [])

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setGroupAlign(value => !value)}
          className={`rounded-lg border border-fd-border px-3 py-1.5 text-sm transition-colors ${
            groupAlign ? 'bg-fd-accent text-fd-accent-foreground' : 'text-fd-muted-foreground'
          }`}
        >
          OkrTreeGroup align：{groupAlign ? '开启' : '关闭'}
        </button>
        <button
          type="button"
          onClick={() => setAlignRoot(value => !value)}
          className={`rounded-lg border border-fd-border px-3 py-1.5 text-sm transition-colors ${
            alignRoot ? 'bg-fd-accent text-fd-accent-foreground' : 'text-fd-muted-foreground'
          }`}
        >
          alignRoot：{alignRoot ? '开启' : '关闭'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <OkrTreeGroup align={groupAlign}>
          <OkrTree
            data={data}
            leftData={left}
            onlyBothTree
            direction="horizontal"
            nodeKey="id"
            showCollapsable
            defaultExpandAll
            alignRoot={alignRoot}
          />
          <OkrTree
            data={data}
            leftData={deeperLeft}
            onlyBothTree
            direction="horizontal"
            nodeKey="id"
            showCollapsable
            defaultExpandAll
            alignRoot={alignRoot}
          />
        </OkrTreeGroup>
      </div>
    </div>
  )
}
