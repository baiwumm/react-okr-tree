'use client'

import { useMemo, useState } from 'react'
import { OkrTree, type TreeKey } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData } from './data'
import { EventLog, LOG_LIMIT, type LogLine } from './event-log'

/**
 * 事件回调总览（对应源项目 playground/components/demos/BaseEvents.vue）
 *
 * api 表里的 14 个事件在 React 侧全是 `onXxx` 回调 prop，与 Vue 的三点差异：
 * 1. 回调参数去掉了源项目的第三参 `nodeComponent`（D2），只有 `(data, node)`；
 *    要拿 DOM 用 `handle.getNodeEl(key)`。
 * 2. `node-contextmenu` → `onNodeContextMenu`，**只有传了这个 prop 组件才 preventDefault**
 *    掉浏览器原生菜单；不传就照常弹原生菜单（要恢复原生菜单，把这条 prop 删掉即可）。
 * 3. `event` 参数是 React 合成事件（D11），原生事件在 `event.nativeEvent` 上。
 *
 * `onExpandedKeysChange` / `onCurrentKeyChange` 只在受控模式下触发（等价 Vue 的
 * `v-model:expanded-keys`，React 拆成「值 prop + 回调 prop」一对），所以本例把两个值也传了。
 */
export function EventsDemo() {
  // 变量名不叫 data：下面每个回调的首参都是源数据对象，叫 data 会把它遮住
  const treeData = useMemo(keyedData, [])
  const [lines, setLines] = useState<LogLine[]>([])
  const [expandedKeys, setExpandedKeys] = useState<TreeKey[]>([1])
  const [currentKey, setCurrentKey] = useState<TreeKey | null>(null)

  /** 最新一条插到最前，超出 LOG_LIMIT 直接丢——不截断的话点一分钟就把页面撑爆了 */
  function push(event: string, text: string) {
    setLines(prev => [{ event, text }, ...prev].slice(0, LOG_LIMIT))
  }

  return (
    <>
      <EventLog lines={lines} onClear={() => setLines([])} />
      <p className="mb-3 text-sm text-fd-muted-foreground">
        试试：左键 / 右键卡片、点 +/− 圆盘、勾复选框、拖动卡片。复选框与拖拽为了触发对应事件才开着，
        用法见各自的用例。
      </p>
      <OkrTree
        data={treeData}
        nodeKey="id"
        direction="horizontal"
        showCollapsable
        showCheckbox
        draggable
        expandedKeys={expandedKeys}
        currentKey={currentKey}
        onNodeClick={(data, node) =>
          push('onNodeClick', `「${data.label}」被点击（level ${node.level}）`)
        }
        onNodeExpand={data => push('onNodeExpand', `「${data.label}」展开`)}
        onNodeCollapse={data => push('onNodeCollapse', `「${data.label}」收起`)}
        // 传了本 prop，组件才会 preventDefault 掉浏览器原生右键菜单
        onNodeContextMenu={(event, data) =>
          push(
            'onNodeContextMenu',
            `「${data.label}」右键，原生事件取 event.nativeEvent（此刻坐标 ${Math.round(
              event.clientX
            )}, ${Math.round(event.clientY)}）`
          )
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
        onExpandedKeysChange={keys => {
          setExpandedKeys(keys)
          push('onExpandedKeysChange', `[${keys.join(', ')}]`)
        }}
        onCurrentKeyChange={key => {
          setCurrentKey(key)
          push('onCurrentKeyChange', key === null ? 'null（无选中）' : String(key))
        }}
        onNodeDragStart={node => push('onNodeDragStart', `开始拖动「${node.label}」`)}
        onNodeDragEnter={(dragging, dropNode) =>
          push('onNodeDragEnter', `「${dragging.label}」进入「${dropNode.label}」`)
        }
        onNodeDragLeave={(dragging, dropNode) =>
          push('onNodeDragLeave', `「${dragging.label}」离开「${dropNode.label}」`)
        }
        // dragover 随鼠标移动连续触发，日志会被它刷满——真要分区变化看 onNodeDrop
        onNodeDragOver={(dragging, dropNode) =>
          push('onNodeDragOver', `悬停在「${dropNode.label}」的放置区内`)
        }
        onNodeDragEnd={(dragging, dropNode, dropType) =>
          push(
            'onNodeDragEnd',
            dropNode && dropType
              ? `「${dragging.label}」结束，落点是 ${dropType}`
              : `「${dragging.label}」结束，未完成放置`
          )
        }
        onNodeDrop={(dragging, dropNode, dropType) =>
          push('onNodeDrop', `「${dragging.label}」→「${dropNode.label}」的 ${dropType}`)
        }
      />
    </>
  )
}
