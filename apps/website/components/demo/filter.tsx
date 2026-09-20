'use client'

import { useRef, useState } from 'react'
import { OkrTree, type OkrTreeHandle, type TreeNodeData } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData } from './data'

/**
 * 节点过滤 + 通过 ref 调用的方法（对应源项目 playground/components/demos/BaseFilter.vue）
 *
 * **空值恢复**是这里唯一容易写错的语义：`filter('')` 不会走「跳过过滤」的捷径，它会以空值
 * 再执行一次 `filterNodeMethod`，所以方法里 `!value` 必须返回 `true`，否则清空关键字后节点
 * 再也回不来（源项目修过的 Q1 行为）。父节点自身不匹配但后代命中时它会保持可见。
 * 下面的按钮就是源用例那批方法：`getNode` / `setCurrentNode` / `getCurrentKey` / `remove` /
 * `append` / `insertBefore` / `insertAfter` / `updateKeyChildren` 都依赖 `nodeKey`，
 * 增删类还会同步改你传进来的那份源数据（Q3）。
 *
 * 与源用例的差别：Vue 用 `watch(filterText)` 触发过滤，React 在 `onChange` 里直接调
 * `handle.filter(value)`；默认主题不给选中态内置外观（与原版一致），所以照源用例传
 * `currentLableClassName`（保留原版拼写），值写站里现成的 Tailwind 令牌而不是全局样式表。
 */
const BTN =
  'rounded-lg border border-fd-border px-2 py-1 text-sm transition-colors hover:bg-fd-accent'

/** 空值直接放行：清空输入 = 显示全部 */
function filterNode(value: string, data: TreeNodeData) {
  if (!value) return true
  return String(data.label).includes(value)
}

export function FilterDemo() {
  const tree = useRef<OkrTreeHandle>(null)
  const [filterText, setFilterText] = useState('')
  // data 用 state 持有而不是每次渲染现造：换引用 = store 全量重建，展开/选中态都会冲掉（R2）
  const [data, setData] = useState(keyedData)
  const [log, setLog] = useState('输入关键字试试，清空即恢复全部节点')

  function onFilter(value: string) {
    setFilterText(value)
    tree.current?.filter(value)
  }

  function getNodeByData() {
    const node = tree.current?.getNode({ id: 7, label: '销售一部' })
    say(node ? `getNode({ id: 7 }) → ${node.data.label}` : 'getNode({ id: 7 }) → null（已被删除）')
  }

  function getNodeById() {
    const node = tree.current?.getNode(7)
    say(node ? `getNode(7) → ${node.data.label}` : 'getNode(7) → null（已被删除）')
  }

  function setCurrentNode() {
    const node = tree.current?.getNode(7)
    if (!node) return say('销售一部不存在')
    tree.current?.setCurrentNode(node)
    say(`setCurrentNode(node) → getCurrentKey() = ${tree.current?.getCurrentKey()}`)
  }

  function getCurrentNode() {
    const node = tree.current?.getCurrentNode()
    say(node ? `当前选中的节点是「${node.label}」` : '当前没有选中节点')
  }

  function clearCurrent() {
    tree.current?.setCurrentKey(null)
    say(`setCurrentKey(null) → getCurrentKey() = ${tree.current?.getCurrentKey()}`)
  }

  function remove() {
    const node = tree.current?.getNode(2)
    if (!node) return say('产品研发部已删除')
    tree.current?.remove(node)
    say('remove(产品研发部)：源数据里那一项也一起没了')
  }

  function append() {
    if (tree.current?.getNode(10)) return say('销售三部已经存在了，不可再增加')
    tree.current?.append({ id: 10, label: '销售三部' }, tree.current?.getNode(6))
    say('append(销售三部, 销售部) 完成')
  }

  function insertBefore() {
    const ref = tree.current?.getNode(6)
    if (!ref) return say('销售部不存在')
    if (tree.current?.getNode(11)) return say('销售总部已经存在了，不可再增加')
    tree.current?.insertBefore({ id: 11, label: '销售总部' }, ref)
    say('insertBefore(销售总部, 销售部) 完成')
  }

  function insertAfter() {
    const ref = tree.current?.getNode(6)
    if (!ref) return say('销售部不存在')
    if (tree.current?.getNode(11)) return say('销售总部已经存在了，不可再增加')
    tree.current?.insertAfter({ id: 11, label: '销售总部' }, ref)
    say('insertAfter(销售总部, 销售部) 完成')
  }

  function updateKeyChildren() {
    tree.current?.updateKeyChildren(6, [
      {
        id: 7,
        label: '销售一部',
        children: [
          { id: 1117, label: '销售一部--子一' },
          { id: 1118, label: '销售一部--子二' },
        ],
      },
      { id: 8, label: '销售二部' },
      { id: 77, label: '销售三部' },
    ])
    say('updateKeyChildren(6, [...]) 完成')
  }

  function reset() {
    setData(keyedData())
    setFilterText('')
    say('已重置：换 data 引用 = store 全量重建（过滤与展开态回到初始）')
  }

  function say(text: string) {
    setLog(text)
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={filterText}
        onChange={event => onFilter(event.target.value)}
        placeholder="输入关键字进行过滤（清空即恢复全部节点）"
        className="w-full max-w-sm rounded-lg border border-fd-border px-2 py-1 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN} onClick={getNodeByData}>
          通过 data 获取销售一部
        </button>
        <button type="button" className={BTN} onClick={getNodeById}>
          通过 id 获取销售一部
        </button>
        <button type="button" className={BTN} onClick={setCurrentNode}>
          setCurrentNode 选中销售一部
        </button>
        <button type="button" className={BTN} onClick={getCurrentNode}>
          getCurrentNode
        </button>
        <button type="button" className={BTN} onClick={clearCurrent}>
          setCurrentKey(null)
        </button>
        <button type="button" className={BTN} onClick={remove}>
          删除产品研发部
        </button>
        <button type="button" className={BTN} onClick={append}>
          为销售部追加销售三部
        </button>
        <button type="button" className={BTN} onClick={insertBefore}>
          在销售部之前插入销售总部
        </button>
        <button type="button" className={BTN} onClick={insertAfter}>
          在销售部之后插入销售总部
        </button>
        <button type="button" className={BTN} onClick={updateKeyChildren}>
          updateKeyChildren(6, ...)
        </button>
        <button type="button" className={BTN} onClick={reset}>
          重置数据
        </button>
      </div>
      <p className="text-sm text-fd-muted-foreground">{log}</p>
      <div className="overflow-x-auto">
        <OkrTree
          ref={tree}
          data={data}
          direction="horizontal"
          nodeKey="id"
          filterNodeMethod={filterNode}
          currentLableClassName="bg-fd-primary text-fd-primary-foreground"
        />
      </div>
    </div>
  )
}
