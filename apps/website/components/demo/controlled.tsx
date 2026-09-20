'use client'

import { useRef, useState } from 'react'
import {
  OkrTree,
  type FilterNodeMethod,
  type OkrTreeHandle,
  type TreeKey,
  type TreeNodeData,
} from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData } from './data'

/**
 * 受控展开/选中 + 走 ref 的方法（对应源项目 playground/components/demos/Base09.vue）
 *
 * `v-model:expanded-keys` / `v-model:current-key` 在 React 里拆成「值 + 回调」一对（D3）：
 * 传了值就是受控，`undefined` 才是非受控。下面这些方法按钮只「请求」，最终显示什么由
 * 宿主回写的 state 决定——所以本文件里没有任何一处绕过 state 直接改 store。
 *
 * 与 Vue 用例的差别：
 * 1. 模板 ref → `useRef<OkrTreeHandle>(null)`，28 个方法全在 handle 上；
 * 2. 事件回调不再有第三个参数 `nodeComponent`（D2），要在 DOM 上做事用 `getNodeEl()`；
 * 3. **`data` 放在 `useState` 里而不是每次渲染新建字面量**：这里要演示换引用；顺带一条边界——
 *    「换外壳数组、元素逐个还是同引用」会被判为未变（那是给宿主每帧新建字面量兜的，R2），
 *    既不全量重建也不跑脏检查；
 * 4. 原地 `push` 一个节点后组件不会自己发现（引用没变，Vue 的 deep watch 在 React 没有对应物，
 *    即 D7）。被看见只有两条路：**宿主用同一引用重渲染**（渲染期结构脏检查 → 增量更新，
 *    保留各节点状态），或显式调 **`handle.refreshData()`**（不依赖宿主是否重渲染）。
 *    换成一批新的元素引用则是全量重建，重建后按受控值恢复展开与选中。
 */

const BTN = 'rounded-lg border border-fd-border px-2 py-1 text-sm'

/** 空值必须返回 true，否则「清空输入 = 恢复全显」不成立 */
const filterNodeMethod: FilterNodeMethod = (value, data) =>
  !value || String(data.label).includes(String(value))

export function ControlledDemo() {
  const [data, setData] = useState<TreeNodeData[]>(keyedData)
  const [expandedKeys, setExpandedKeys] = useState<TreeKey[]>([1])
  const [currentKey, setCurrentKey] = useState<TreeKey | null>(null)
  const [note, setNote] = useState('')
  const tree = useRef<OkrTreeHandle>(null)
  const idSeed = useRef(100)

  /** 原地改源数据：引用不变，组件收不到任何通知 */
  function pushChild(): number {
    const id = ++idSeed.current
    const children = (data[0].children ??= []) as TreeNodeData[]
    children.push({ id, label: `原地新增 ${id}` })
    return id
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-fd-muted-foreground">expandedKeys:</span>
        <code>{JSON.stringify(expandedKeys)}</code>
        <span className="text-fd-muted-foreground">currentKey:</span>
        <code>{currentKey ?? 'null'}</code>
        {note ? <span className="text-fd-muted-foreground">— {note}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fd-muted-foreground">展开：</span>
        <button className={BTN} type="button" onClick={() => tree.current?.expandAll()}>
          expandAll()
        </button>
        <button className={BTN} type="button" onClick={() => tree.current?.collapseAll()}>
          collapseAll()
        </button>
        <button className={BTN} type="button" onClick={() => tree.current?.expandNode(5)}>
          expandNode(5)
        </button>
        <button className={BTN} type="button" onClick={() => setExpandedKeys([1, 6])}>
          expandedKeys = [1, 6]
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fd-muted-foreground">选中：</span>
        <button className={BTN} type="button" onClick={() => tree.current?.setCurrentKey(8)}>
          setCurrentKey(8)
        </button>
        <button
          className={BTN}
          type="button"
          onClick={() => setNote(`getCurrentKey() → ${tree.current?.getCurrentKey() ?? 'null'}`)}
        >
          getCurrentKey()
        </button>
        <button className={BTN} type="button" onClick={() => setCurrentKey(null)}>
          currentKey = null
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fd-muted-foreground">数据与查询：</span>
        <button
          className={BTN}
          type="button"
          onClick={() => tree.current?.append({ id: ++idSeed.current, label: 'append 进来的' }, 1)}
        >
          append 到 id=1
        </button>
        <button className={BTN} type="button" onClick={() => tree.current?.remove(3)}>
          remove(3)
        </button>
        <button className={BTN} type="button" onClick={() => tree.current?.filter('研发')}>
          filter('研发')
        </button>
        <button
          className={BTN}
          type="button"
          onClick={() => {
            tree.current?.filter('')
            setNote('filter("") 恢复全显')
          }}
        >
          filter('')
        </button>
        <button className={BTN} type="button" onClick={() => void tree.current?.scrollToNode(8)}>
          scrollToNode(8)
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fd-muted-foreground">原地变更（R2 / D7）：</span>
        <button
          className={BTN}
          type="button"
          onClick={() => setNote(`已 push id=${pushChild()}，这次重渲染让组件的脏检查接住了它`)}
        >
          push + 靠宿主重渲染
        </button>
        <button
          className={BTN}
          type="button"
          onClick={() => {
            pushChild()
            tree.current?.refreshData()
          }}
        >
          push + refreshData()
        </button>
        <button
          className={BTN}
          type="button"
          onClick={() => setData(data.map(item => ({ ...item })))}
        >
          换新引用（整树重建）
        </button>
      </div>
      <OkrTree
        ref={tree}
        data={data}
        nodeKey="id"
        direction="horizontal"
        showCollapsable
        expandedKeys={expandedKeys}
        onExpandedKeysChange={setExpandedKeys}
        currentKey={currentKey}
        onCurrentKeyChange={setCurrentKey}
        filterNodeMethod={filterNodeMethod}
      />
    </div>
  )
}
