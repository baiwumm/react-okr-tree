'use client'

import { useMemo, useRef, useState } from 'react'
import { OkrTree, type OkrTreeHandle, type TreeCheckInfo, type TreeNodeData } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData } from './data'
import { EventLog, LOG_LIMIT, type LogLine } from './event-log'

/**
 * 复选框模式（对应源项目 playground/components/demos/BaseCheckbox.vue）
 *
 * `showCheckbox` 开勾选框，父子联动带半选态；`checkStrictly` 关掉联动后勾谁只影响谁（也就没有半选）。
 * `onCheck(data, info)` 只在**用户点击**勾选框时触发（`setCheckedKeys()` 不触发），
 * `onCheckChange(data, checked, indeterminate)` 则每个状态变化的节点各触发一次，含联动与批量设置。
 *
 * React 与 Vue 的差别只在读结果：`getCheckedKeys()` / `getHalfCheckedKeys()` 是命令式方法，
 * 读的是内部 store 而不是 React state，所以只能在事件回调里取——渲染期取不到，
 * 也就没法「派生出勾选态」。本例把结果写进日志面板。
 * OKR 模式下左右两树勾选独立维护，方法按 key 对两树同时生效。
 */
export function CheckboxDemo() {
  const data = useMemo(keyedData, [])
  const handle = useRef<OkrTreeHandle>(null)
  const [checkStrictly, setCheckStrictly] = useState(false)
  const [lines, setLines] = useState<LogLine[]>([])

  function push(event: string, text: string) {
    setLines(prev => [{ event, text }, ...prev].slice(0, LOG_LIMIT))
  }

  function handleCheck(data: TreeNodeData, info: TreeCheckInfo) {
    push(
      'onCheck',
      `「${data.label}」→ 已选 ${info.checkedKeys.length} 个，半选 ${info.halfCheckedKeys.length} 个`
    )
  }

  function handleCheckChange(data: TreeNodeData, checked: boolean, indeterminate: boolean) {
    push(
      'onCheckChange',
      `「${data.label}」→ ${checked ? '已选' : indeterminate ? '半选' : '未选'}`
    )
  }

  function setChecked() {
    handle.current?.setCheckedKeys([7, 8])
    push(
      'setCheckedKeys',
      checkStrictly
        ? '勾选 [7, 8]（独立模式：父节点 6 不受影响）'
        : '勾选 [7, 8]（联动模式：父节点 6 自动变半选）'
    )
  }

  function readKeys() {
    const h = handle.current
    if (!h) return
    push(
      'getCheckedKeys',
      `checked=[${h.getCheckedKeys().join(', ')}] half=[${h.getHalfCheckedKeys().join(', ')}]`
    )
  }

  const btn = 'rounded-lg border border-fd-border px-3 py-1 text-sm'

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCheckStrictly(v => !v)}
          className={`${btn} ${checkStrictly ? 'bg-fd-accent font-medium' : ''}`}
        >
          checkStrictly（父子不联动）：{checkStrictly ? '开' : '关'}
        </button>
        <button type="button" onClick={setChecked} className={`${btn} hover:bg-fd-accent`}>
          setCheckedKeys([7, 8])
        </button>
        <button type="button" onClick={readKeys} className={`${btn} hover:bg-fd-accent`}>
          getCheckedKeys / getHalfCheckedKeys
        </button>
      </div>
      <EventLog lines={lines} onClear={() => setLines([])} />
      <OkrTree
        ref={handle}
        data={data}
        nodeKey="id"
        direction="horizontal"
        showCollapsable
        showCheckbox
        checkStrictly={checkStrictly}
        defaultCheckedKeys={[3, 4]}
        onCheck={handleCheck}
        onCheckChange={handleCheckChange}
      />
    </>
  )
}
