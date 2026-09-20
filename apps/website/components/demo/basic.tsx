'use client'

import { useMemo } from 'react'
import { OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { baseData } from './data'

/**
 * 基础用法（对应源项目 playground/components/demos/Base01.vue）
 *
 * 每个 demo 文件都是「只放活组件」的客户端组件：标题、说明与源码由 MDX 页面交给
 * `<DemoBlock>`（源码由它按 `file` 读本文件，不在这份代码里再抄一遍）。
 *
 * `useMemo` 是必需的而不是习惯问题：data 换引用会触发 store 全量重建（requirements R2），
 * 用户刚点开的展开态会被冲掉。
 */
export function BasicDemo() {
  const data = useMemo(baseData, [])

  return <OkrTree data={data} />
}
