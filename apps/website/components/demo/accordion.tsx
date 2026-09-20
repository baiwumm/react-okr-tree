'use client'

import { useMemo, useRef } from 'react'
import { OkrTree, type OkrTreeHandle } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData } from './data'

/**
 * 手风琴模式（对应源项目 playground/components/demos/BaseAccordion.vue）
 *
 * `accordion`：用户展开某个节点时自动收起同级已展开的兄弟（内部走 `collapseSiblings`）。
 * 边界与 el-tree 一致——**只约束交互展开**：点 +/− 圆盘、点卡片内容、键盘 ←/→。
 * 下面两个按钮是反例：`expandAll()` 与 `expandNode()` 这类程序化方法、以及受控
 * `expandedKeys` 都不受互斥限制，全展开后手风琴依然生效于用户的下一次点击。
 */
export function AccordionDemo() {
  const data = useMemo(keyedData, [])
  const handle = useRef<OkrTreeHandle>(null)

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handle.current?.expandAll()}
          className="rounded-lg border border-fd-border bg-fd-accent px-3 py-1 text-sm hover:bg-fd-muted"
        >
          expandAll() —— 手风琴不管它
        </button>
        <button
          type="button"
          onClick={() => handle.current?.collapseAll()}
          className="rounded-lg border border-fd-border px-3 py-1 text-sm hover:bg-fd-accent"
        >
          collapseAll()
        </button>
      </div>
      <OkrTree
        ref={handle}
        data={data}
        nodeKey="id"
        direction="horizontal"
        showCollapsable
        accordion
      />
    </>
  )
}
