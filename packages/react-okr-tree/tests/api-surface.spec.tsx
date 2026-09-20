import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, type OkrTreeHandle } from '../src/index'
import { methodsSection } from '../shared/api'

/**
 * API 表与实现之间的防漂移测试（计划 1.6 / 6.4：`shared/api.ts` 是文档站与 README 的单一来源）。
 *
 * 只比对 ref 方法面：props / 事件在运行时不是可枚举的（TS 接口编译后会消失），
 * 那两节的口径靠 `<ApiTable>` 渲染同一份数据 + 人工对照 `OkrTreeProps` 保证。
 */
describe('shared/api.ts 与 OkrTreeHandle 一致', () => {
  const documented = new Set<string>()
  for (const row of methodsSection.rows) {
    // 最后一行是「store / root」这种合并单元格，按分隔符拆开
    for (const name of row[0].split(' / ')) documented.add(name.trim())
  }

  it('文档里的每个方法都能在 ref 上拿到', () => {
    const ref = createRef<OkrTreeHandle>()
    render(<OkrTree data={[{ id: 1, label: 'R' }]} ref={ref} />)
    const actual = ref.current!

    const missing = [...documented].filter(
      name => actual[name as keyof OkrTreeHandle] === undefined
    )
    expect(missing).toEqual([])
  })

  it('ref 上的每个成员都写进了文档表（不允许出现未记录的公开方法）', () => {
    const ref = createRef<OkrTreeHandle>()
    render(<OkrTree data={[{ id: 1, label: 'R' }]} ref={ref} />)

    const undocumented = Object.keys(ref.current!).filter(name => !documented.has(name))
    expect(undocumented).toEqual([])
  })

  it('方法面数量与表格行数一致', () => {
    const ref = createRef<OkrTreeHandle>()
    render(<OkrTree data={[{ id: 1, label: 'R' }]} ref={ref} />)
    // 表格 29 行，其中「store / root」占 2 个成员
    expect(methodsSection.rows.length).toBe(29)
    expect(Object.keys(ref.current!).length).toBe(documented.size)
  })
})
