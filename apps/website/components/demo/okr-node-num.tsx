'use client'

import { useMemo } from 'react'
import { OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData, leftData } from './data'

/**
 * OKR 模式显示节点数（对应源项目 playground/components/demos/Base081.vue）
 *
 * `showCollapsable` 打开圆盘、`showNodeNum` 让圆盘里显示子节点数。OKR 根节点左右各一个圆盘，
 * 所以同一份配置会在两侧分别报出自己那侧的可见子节点数；点圆盘收起/展开即可看到数字变化，
 * 深层节点展开后再收起也会有数字。
 *
 * 与源用例的差别：源用例同时给了 `show-node-num` 和 `node-btn-content`（自己 return
 * `node.childNodes.length`），React 侧不需要那半边——`showNodeNum` 优先于
 * `nodeBtnContent` / `renderExpandBtn`，而且数字按「未被 filter 隐藏的可见子节点」计，
 * 手写 `childNodes.length` 反而会在过滤后对不上视觉。
 */
export function OkrNodeNumDemo() {
  const [data, left] = useMemo(() => [keyedData(), leftData()], [])

  return (
    <div className="overflow-x-auto">
      <OkrTree
        data={data}
        leftData={left}
        onlyBothTree
        direction="horizontal"
        nodeKey="id"
        showCollapsable
        showNodeNum
      />
    </div>
  )
}
