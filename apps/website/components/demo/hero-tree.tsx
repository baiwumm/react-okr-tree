'use client'

import { OkrTree, type ConnectorMode, type ConnectorShape } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { useMemo } from 'react'

/**
 * 落地页用的最小活体示例（requirements 6：24 个正式 Demo 在文档区，这里只是首屏与布局展示位）
 *
 * 库样式由本组件自己 import：demo 是可选引用的内容单元，不该让整站为它背上样式。
 *
 * 两条硬性约束：
 * 1. 数据必须在 `useMemo` 里造一次。每次渲染换新引用会走 `store.setData()` 全量重建
 *    （requirements R2），用户刚点开的展开态会被冲掉。
 * 2. 数据集是工厂函数而非模块级常量——OKR 模式与多个实例共用同一批源对象时，
 *    回写类操作会互相污染（与源项目 playground/data.ts 同一设计理由）。
 */

export type HeroTreeLayout = 'vertical' | 'horizontal' | 'okr'

const makeData = () => [
  {
    id: 1,
    label: '星环科技',
    children: [
      {
        id: 2,
        label: '产品研发部',
        children: [{ id: 5, label: '前端组' }],
      },
      { id: 3, label: '市场部' },
      { id: 4, label: '财务部' },
    ],
  },
]

/** OKR 左子树：根与右树同 id（左右分表，getNode 右树优先），这是源项目的正式语义 */
const makeLeftData = () => [
  {
    id: 1,
    label: '星环科技',
    children: [
      { id: 6, label: '战略投资部' },
      { id: 7, label: '法务合规部' },
    ],
  },
]

export function HeroTree({
  layout = 'vertical',
  theme,
  connector = 'css',
  connectorShape = 'curve',
  showCollapsable = false,
  defaultExpandAll = false,
  animate = false,
  unstyled = false,
  labelWidth,
  labelHeight,
}: {
  layout?: HeroTreeLayout
  theme?: string
  connector?: ConnectorMode
  connectorShape?: ConnectorShape
  showCollapsable?: boolean
  defaultExpandAll?: boolean
  animate?: boolean
  unstyled?: boolean
  /** 落地页要多块并排，卡片尺寸需要能压小；不传则用库默认（auto 宽高） */
  labelWidth?: number | string
  labelHeight?: number | string
}) {
  const [data, leftData] = useMemo(() => [makeData(), makeLeftData()], [])
  const isOkr = layout === 'okr'

  return (
    <OkrTree
      data={data}
      nodeKey="id"
      leftData={isOkr ? leftData : undefined}
      direction={layout === 'vertical' ? 'vertical' : 'horizontal'}
      onlyBothTree={isOkr}
      alignRoot={isOkr}
      theme={theme}
      connector={connector}
      connectorShape={connectorShape}
      showCollapsable={showCollapsable}
      defaultExpandAll={defaultExpandAll}
      animate={animate}
      unstyled={unstyled}
      labelWidth={labelWidth}
      labelHeight={labelHeight}
    />
  )
}
