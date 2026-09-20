'use client'

import { useMemo, useState } from 'react'
import { OkrTree, type DropType, type TreeNode } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData } from './data'
import { EventLog, LOG_LIMIT, type LogLine } from './event-log'

/**
 * 拖拽调整层级（对应源项目 playground/components/demos/BaseDraggable.vue）
 *
 * `draggable` 开 HTML5 拖拽，落点按目标卡片的 25% / 50% / 25% 分三区：
 * prev（排在目标前）/ inner（成为目标的子节点，目标自动展开）/ next（排在目标后）。
 * **分区轴随方向换**：`direction="horizontal"` 时同层是上下排列，按 Y 轴分；
 * 默认 vertical 时同层左右排列，按 X 轴分。指示线颜色走 `--okr-drop-color`。
 *
 * 两条硬性规则不是 `allowDrop` 能改的：不可放进自身或自己的子树；OKR 下跨左右树默认禁止
 * （`allowDrop` 明确返回 true 才放开）。移动会同步回写源数据的 children。
 *
 * 回调参数与 Vue 同形，只是没有第三参 `nodeComponent`（D2）：
 * `onNodeDrop(draggingNode, dropNode, dropType)` 三个都是内部 TreeNode。
 * 程序化入口是 `handle.moveNode(7, 2, 'inner')`，规则一致（本例未挂按钮）。
 */
export function DraggableDemo() {
  const data = useMemo(keyedData, [])
  const [lines, setLines] = useState<LogLine[]>([])

  function push(event: string, text: string) {
    setLines(prev => [{ event, text }, ...prev].slice(0, LOG_LIMIT))
  }

  /** 示例规则：财务部（id 9）不许被拖走 */
  function allowDrag(node: TreeNode) {
    return node.key !== 9
  }

  /** 示例规则：财务部也不能当落点；叶子不接受 inner（放成子节点后它就成了父级） */
  function allowDrop(_dragging: TreeNode, target: TreeNode, type: DropType) {
    if (target.key === 9) return false
    return type !== 'inner' || !target.isLeaf
  }

  return (
    <>
      <EventLog lines={lines} onClear={() => setLines([])} />
      <OkrTree
        data={data}
        nodeKey="id"
        direction="horizontal"
        showCollapsable
        draggable
        allowDrag={allowDrag}
        allowDrop={allowDrop}
        onNodeDragStart={node => push('onNodeDragStart', `开始拖动「${node.label}」`)}
        onNodeDrop={(dragging, target, type) =>
          push('onNodeDrop', `「${dragging.label}」→「${target.label}」的 ${type}`)
        }
        onNodeDragEnd={(dragging, target, type) =>
          push(
            'onNodeDragEnd',
            target && type ? `「${dragging.label}」放置完成` : `「${dragging.label}」未完成放置`
          )
        }
      />
    </>
  )
}
