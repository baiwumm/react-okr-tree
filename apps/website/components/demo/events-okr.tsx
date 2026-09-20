'use client'

import { useMemo, useState } from 'react'
import { OkrTree, type TreeNode } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData, leftData } from './data'
import { EventLog, LOG_LIMIT, type LogLine } from './event-log'

/**
 * OKR 模式下的事件（对应源项目 playground/components/demos/BaseEventsOkr.vue）
 *
 * 左右两棵子树由**同一个** `<OkrTree>` 渲染，所以触发的也是同一批 `onXxx` 回调——
 * 区分左右只有一个字段：`node.isLeftChild`。Vue 用例里那句「点击根节点左右两侧的 +/−
 * 分别触发 node-expand / node-collapse」在 React 下形状不变，只是从 `$emit` 换成回调。
 *
 * 勾选两棵树各自维护状态（左树 id 12–19、右树 id 1–9，根同为 id 1），
 * 所以 onCheck / onCheckChange 必须带 side 才看得清是谁变了。
 * 拖拽与受控那两类回调与本目录 events.tsx 用例完全同一批，这里不再重复挂。
 */
export function EventsOkrDemo() {
  const [data, left] = useMemo(() => [keyedData(), leftData()], [])
  const [lines, setLines] = useState<LogLine[]>([])

  const side = (node: TreeNode) => (node.isLeftChild ? '左树' : '右树')

  function push(event: string, text: string) {
    setLines(prev => [{ event, text }, ...prev].slice(0, LOG_LIMIT))
  }

  return (
    <>
      <EventLog lines={lines} onClear={() => setLines([])} />
      <OkrTree
        data={data}
        leftData={left}
        nodeKey="id"
        direction="horizontal"
        onlyBothTree
        showCollapsable
        showCheckbox
        defaultExpandAll
        onNodeClick={(data, node) => push('onNodeClick', `[${side(node)}] 「${data.label}」被点击`)}
        onNodeExpand={(data, node) => push('onNodeExpand', `[${side(node)}] 「${data.label}」展开`)}
        onNodeCollapse={(data, node) =>
          push('onNodeCollapse', `[${side(node)}] 「${data.label}」收起`)
        }
        // 只有传了这个 prop，组件才 preventDefault 掉浏览器原生右键菜单
        onNodeContextMenu={(_event, data, node) =>
          push('onNodeContextMenu', `[${side(node)}] 「${data.label}」右键`)
        }
        onCheck={(data, info) =>
          push(
            'onCheck',
            `「${data.label}」勾选变化：已选 ${info.checkedKeys.length} 个，半选 ${info.halfCheckedKeys.length} 个`
          )
        }
        onCheckChange={(data, checked, indeterminate) =>
          push(
            'onCheckChange',
            `「${data.label}」→ ${checked ? '已选' : indeterminate ? '半选' : '未选'}`
          )
        }
      />
    </>
  )
}
