'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  OkrTree,
  type OkrTreeHandle,
  type TreeLoadFunction,
  type TreeNodeData,
} from 'react-okr-tree'
import 'react-okr-tree/style.css'

/**
 * 懒加载子节点（对应源项目 playground/components/demos/Base10.vue）
 *
 * `lazy` + `load(node, resolve, reject)`：初始只给顶层，首次展开时才取数（本例固定 300ms 假延迟）。
 * `SERVER` 是假的服务端表，`leaf: true` 配合 `props.isLeaf` 把圆盘收掉；
 * id=5 这一支首次必 reject，配一个「重试」按钮走 `expandNode()` 再请求一次。
 *
 * 与 Vue 用例的差别（这一条 React 专属，必须留意）：
 * 1. **`load` 是创建期快照**（store 建好就不再换），所以它是个稳定身份：闭包里的 state
 *    会永远停在首次渲染那一刻。计数只能用函数式 `setRequests(n => n + 1)`、
 *    跨次状态用 `useRef`，别直接读 state；
 * 2. **`props`（字段映射）同样有代价**：它的身份一变，组件就把 `data` 重新塞给 store 走全量重建，
 *    刚点开的展开态会被冲掉——所以 `TREE_PROPS` 必须在模块作用域定义，不能写内联字面量；
 * 3. `resolve(children)` 会原地写进源数据的 `children`（Q3 回写），因此不需要换 `data` 引用、
 *    也不需要 `refreshData()`（R2 那两条兜底路径在懒加载这里用不上）；
 * 4. 加载中的圆盘自带 `is-loading` 旋转；要在按钮上自己显示进度，用 `renderExpandBtn` 的
 *    `loading` 作用域（见 expand-btn 用例）。
 */

/** 首次必失败的那一支 */
const FAIL_ID = 5

/** 假的服务端：父 id → 子节点，缺项表示没有子节点 */
const SERVER: Record<number, TreeNodeData[]> = {
  1: [
    { id: 2, label: '产品研发部' },
    { id: 6, label: '销售部' },
    { id: 9, label: '财务部（叶子）', leaf: true },
  ],
  2: [
    { id: 3, label: '研发-前端', leaf: true },
    { id: 4, label: '研发-后端', leaf: true },
    { id: FAIL_ID, label: 'UI 设计（首次请求必失败）' },
  ],
  [FAIL_ID]: [
    { id: 51, label: '视觉组' },
    { id: 52, label: '交互组' },
  ],
  6: [
    { id: 7, label: '销售一部' },
    { id: 8, label: '销售二部' },
  ],
}

/** 初始只有顶层；带 leaf 的那条永远不会触发 load */
const lazyData = (): TreeNodeData[] => [
  { id: 1, label: 'xxx科技有有限公司' },
  { id: 90, label: '外部顾问（isLeaf，不请求）', leaf: true },
]

/** 字段映射必须引用稳定，见上面第 2 条 */
const TREE_PROPS = { isLeaf: 'leaf' }

export function LazyDemo() {
  const data = useMemo(lazyData, [])
  const tree = useRef<OkrTreeHandle>(null)
  const [requests, setRequests] = useState(0)
  const [failedId, setFailedId] = useState<number | null>(null)
  const failedOnce = useRef(new Set<number>())

  const load = useCallback<TreeLoadFunction>((node, resolve, reject) => {
    setRequests(count => count + 1)
    const id = node.data.id as number
    window.setTimeout(() => {
      if (id === FAIL_ID && !failedOnce.current.has(id)) {
        failedOnce.current.add(id)
        // reject：节点回到折叠态、清掉加载中标记，下次展开重新请求
        setFailedId(id)
        reject?.()
        return
      }
      setFailedId(null)
      resolve(SERVER[id] ?? [])
    }, 300)
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-fd-muted-foreground">
          已发起 <strong>{requests}</strong> 次请求（每个节点至多一次，失败后重试会再多一次）
        </span>
        {failedId === null ? null : (
          <button
            type="button"
            className="rounded-lg border border-fd-border bg-fd-accent px-2 py-1 text-sm"
            onClick={() => tree.current?.expandNode(failedId)}
          >
            重试 id={failedId}
          </button>
        )}
      </div>
      {failedId === null ? null : (
        <p className="text-sm text-fd-muted-foreground">
          id={failedId} 首次 reject：节点保持折叠、圆盘不再有加载指示，点上面的重试即可。
        </p>
      )}
      <OkrTree
        ref={tree}
        data={data}
        nodeKey="id"
        direction="horizontal"
        showCollapsable
        lazy
        load={load}
        props={TREE_PROPS}
      />
    </div>
  )
}
