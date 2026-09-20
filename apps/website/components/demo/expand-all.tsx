'use client'

import { useMemo } from 'react'
import { OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { baseData } from './data'

/**
 * 默认全部展开（对应源项目 playground/components/demos/Base04.vue）
 *
 * `defaultExpandAll` 需要和 `showCollapsable` 一起用：不开圆盘时组件本身就是全展开的
 * （没有收起的入口），开了圆盘又不开这个 prop，进来的默认态是「只见根节点」。
 *
 * 它是「默认态」而不是「锁死全展开」：挂载后用户照样能逐个收起。
 * 也正因为只在节点创建时生效，想要一进来就全展开请直接用这个 prop，
 * 别等挂载后再调 `handle.expandAll()`——那会多走一次整树通知。
 * 运行时改这个 prop 不会重放（React 侧换 `key` 重挂载才会重来，见「是否可展开」用例）。
 */
export function ExpandAllDemo() {
  const data = useMemo(baseData, [])

  return <OkrTree data={data} direction="horizontal" showCollapsable defaultExpandAll />
}
