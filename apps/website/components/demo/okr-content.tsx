'use client'

import { useMemo } from 'react'
import { OkrTree, type TreeNode } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { okrContentData, okrContentLeftData } from './data'

/**
 * OKR 模式下的自定义节点内容（对应源项目 playground/components/demos/Base08.vue）
 *
 * 左右两棵树是**同一个组件、同一份 `renderContent`**，靠 `node.isLeftChild` 分侧：
 * 右树渲染「标题 + 描述」卡片，左树渲染成信息层级反过来的一张卡，一眼看出两侧不是两套 API。
 *
 * 与源用例的差别：
 * 1. Vue 的 `render-content` 签名是 `(h, node)`，React 侧去掉了框架注入的 `h`（requirements D1），
 *    直接返回 JSX。
 * 2. 源用例用 `label-class-name="no-padding"` 加一张全局样式表抵消卡片内边距；文档站的 demo
 *    是单文件、没有自己的样式表，所以这里保留库默认内边距，内容不再自带 padding。
 *    要自定义外观取值，用 `--okr-*` 变量或 `labelClassName`（库的外观规则是 `:where()`，
 *    单个工具类就能覆盖）。
 * 3. 自定义字段一律从 `node.data` 取（`node.label` 是按 `props.label` 解析后的文本）。
 */
export function OkrContentDemo() {
  const [data, leftData] = useMemo(() => [okrContentData(), okrContentLeftData()], [])

  function renderContent(node: TreeNode) {
    const { content } = node.data
    if (node.isLeftChild) {
      return (
        <div className="min-w-40 text-left">
          <p className="text-xs text-fd-muted-foreground">历史进展 · {node.label}</p>
          <p className="mt-1 text-sm">{content}</p>
        </div>
      )
    }
    return (
      <div className="min-w-40 text-left">
        <p className="text-sm font-medium">{node.label}</p>
        <p className="mt-1 text-xs text-fd-muted-foreground">{content}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <OkrTree
        data={data}
        leftData={leftData}
        onlyBothTree
        direction="horizontal"
        nodeKey="id"
        showCollapsable
        defaultExpandAll
        renderContent={renderContent}
      />
    </div>
  )
}
