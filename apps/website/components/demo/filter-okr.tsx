'use client'

import { useMemo, useRef, useState } from 'react'
import { OkrTree, type OkrTreeHandle, type TreeNodeData } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData, leftData } from './data'

/**
 * OKR 模式下的节点过滤（对应源项目 playground/components/demos/BaseFilterOkr.vue）
 *
 * 调的还是同一个 `handle.filter(value)`：`onlyBothTree` 下它内部跑两遍遍历，右树走
 * `childNodes`、左树走 `leftChildNodes`，所以「销售」这种两侧都命中的词会一起留下，
 * 空值恢复也一样（`filterNodeMethod` 里 `!value` 直接 true）。
 * 这里刻意不开 `defaultExpandAll`：关键字非空时命中分支会自动展开，收起的树一输入关键字
 * 就直接跳到命中处。
 *
 * 与源用例的差别：左右两棵树可以存在相同 id（本例根都是 1），`getNode` / `setCurrentKey`
 * 这类按 key 查找的方法**右树优先、未命中才回退左树**——这是源项目的正式语义。
 * 源用例旁边那批方法按钮（getNode / append / updateKeyChildren 等）在普通过滤那一例里
 * 已经演示过，这里只留过滤本身。
 */
const KEYWORDS = ['销售', '左', '前端']

/** 空值直接放行：清空输入 = 显示全部 */
function filterNode(value: string, data: TreeNodeData) {
  if (!value) return true
  return String(data.label).includes(value)
}

export function FilterOkrDemo() {
  const tree = useRef<OkrTreeHandle>(null)
  const [filterText, setFilterText] = useState('')
  const [status, setStatus] = useState('两侧都命中的词会一起留下')
  // 两份数据都要稳定：换引用等于 store 全量重建（requirements R2）
  const data = useMemo(keyedData, [])
  const left = useMemo(leftData, [])

  function apply(value: string) {
    setFilterText(value)
    tree.current?.filter(value)
    // getVisibleNodes 含 OKR 左树：一次 filter 之后两侧各命中了多少，这里直接读得出来
    const visible = tree.current?.getVisibleNodes() ?? []
    const onLeft = visible.filter(node => node.isLeftChild).length
    setStatus(
      value
        ? `「${value}」左右合计 ${visible.length} 个可见节点，其中左树 ${onLeft} 个`
        : `空值已放行：全部节点恢复可见，当前沿展开路径能看到 ${visible.length} 个`
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={filterText}
          onChange={event => apply(event.target.value)}
          placeholder="输入关键字进行过滤（如：销售 / 左 / 前端）"
          className="w-full max-w-sm rounded-lg border border-fd-border px-2 py-1 text-sm"
        />
        {KEYWORDS.map(word => (
          <button
            key={word}
            type="button"
            onClick={() => apply(filterText === word ? '' : word)}
            className={`rounded-lg border border-fd-border px-2 py-1 text-sm transition-colors ${
              filterText === word
                ? 'bg-fd-accent text-fd-accent-foreground'
                : 'text-fd-muted-foreground'
            }`}
          >
            {word}
          </button>
        ))}
      </div>
      <p className="text-sm text-fd-muted-foreground">{status}</p>
      <div className="overflow-x-auto">
        <OkrTree
          ref={tree}
          data={data}
          leftData={left}
          onlyBothTree
          direction="horizontal"
          nodeKey="id"
          showCollapsable
          filterNodeMethod={filterNode}
          currentLableClassName="bg-fd-primary text-fd-primary-foreground"
        />
      </div>
    </div>
  )
}
