'use client'

import { useMemo } from 'react'
import { OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { baseData } from './data'

/**
 * 水平方向（对应源项目 playground/components/demos/Base02.vue）
 *
 * `direction="horizontal"` 下同层节点竖排成一列、整棵树向右生长，是组织架构图的常用形态；
 * 不传则为 `vertical`（向下生长）。
 *
 * 两个与方向相关的约束：
 * - OKR 模式的 `onlyBothTree`（子树在根节点左右两侧展开）只在 horizontal 下有效，
 *   垂直方向配它会在开发期给一次警告。
 * - `direction` 是创建期快照的 prop，运行时换值不会重排已有的树（React 侧要换方向
 *   请给组件绑 `key` 重挂载）；Vue 版同样是创建期生效，只是宿主改 `:data` 时会顺带重建。
 */
export function HorizontalDemo() {
  const data = useMemo(baseData, [])

  return <OkrTree data={data} direction="horizontal" />
}
