import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, type RenderResult } from '@testing-library/react'
import { createRef } from 'react'
import { OkrTree, type OkrTreeHandle } from '../../src/index'
import type { OkrTreeProps } from '../../src/OkrTree'
import { resetWarnings } from '../../src/model/util'

const makeData = () => [
  {
    id: 1,
    label: 'A',
    children: [
      { id: 2, label: 'B' },
      { id: 4, label: 'D' },
    ],
  },
]

const labels = (container: ParentNode) =>
  Array.from(container.querySelectorAll('.org-chart-node-label-inner')).map(el =>
    el.textContent?.trim()
  )

const rerenderWith = (
  utils: RenderResult,
  ref: React.RefObject<OkrTreeHandle | null>,
  props: OkrTreeProps
) => utils.rerender(<OkrTree {...props} ref={ref} />)

describe('运行时 props 同步', () => {
  beforeEach(() => resetWarnings())

  it('showCollapsable 运行时切换：展开按钮即时显隐', () => {
    const ref = createRef<OkrTreeHandle>()
    const utils = render(<OkrTree data={makeData()} ref={ref} />)
    const { container } = utils
    expect(container.querySelector('.org-chart-node-btn')).toBeNull()
    rerenderWith(utils, ref, { data: makeData(), showCollapsable: true })
    expect(container.querySelector('.org-chart-node-btn')).toBeTruthy()
    rerenderWith(utils, ref, { data: makeData(), showCollapsable: false })
    expect(container.querySelector('.org-chart-node-btn')).toBeNull()
  })

  it('props 字段映射运行时变更：label 字段即时生效，children 字段变更触发重建', () => {
    const data = [
      {
        id: 1,
        title: 'A-标题',
        name: 'A-名称',
        subs: [{ id: 2, title: 'B-标题' }],
      },
    ]
    const ref = createRef<OkrTreeHandle>()
    const utils = render(<OkrTree data={data} nodeKey="id" props={{ label: 'title' }} ref={ref} />)
    const { container } = utils
    expect(labels(container)).toEqual(['A-标题'])
    // label 字段映射变更（title → name），动态读取即时生效
    rerenderWith(utils, ref, { data, nodeKey: 'id', props: { label: 'name' } })
    expect(labels(container)).toEqual(['A-名称'])
    // children 字段映射变更（children → subs），触发重建
    rerenderWith(utils, ref, { data, nodeKey: 'id', props: { label: 'title', children: 'subs' } })
    expect(labels(container)).toEqual(['A-标题', 'B-标题'])
  })

  it('leftData 运行时变更：重建左树后按 expandedKeys / currentKey 恢复左树状态', () => {
    const leftV1 = [
      {
        id: 1,
        label: 'A',
        children: [{ id: 12, label: 'L1', children: [{ id: 13, label: 'L1C' }] }],
      },
    ]
    const leftV2 = [
      {
        id: 1,
        label: 'A',
        children: [{ id: 12, label: 'L1', children: [{ id: 13, label: 'L1C' }] }],
      },
    ]
    const base: OkrTreeProps = {
      data: makeData(),
      onlyBothTree: true,
      direction: 'horizontal',
      nodeKey: 'id',
      expandedKeys: [1, 12],
      currentKey: 13,
    }
    const ref = createRef<OkrTreeHandle>()
    const utils = render(<OkrTree {...base} leftData={leftV1} ref={ref} />)
    const handle = ref.current!
    // 初始：左树 L1 展开（受控 expandedKeys 含 12）、L1C 选中
    expect(handle.store.leftNodesMap[12].leftExpanded).toBe(true)
    expect(handle.store.leftNodesMap[13].isCurrent).toBe(true)

    // 替换 leftData → 左树重建 → 受控态恢复
    rerenderWith(utils, ref, { ...base, leftData: leftV2 })
    expect(handle.store.leftNodesMap[12].leftExpanded).toBe(true)
    expect(handle.store.leftNodesMap[13].isCurrent).toBe(true)
  })
})

describe('创建期快照 prop 的运行时变更警告', () => {
  beforeEach(() => resetWarnings())

  it('nodeKey / direction / onlyBothTree 运行时变更加警告，配置不变时不警告', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ref = createRef<OkrTreeHandle>()
    const utils = render(
      <OkrTree data={makeData()} nodeKey="id" direction="vertical" onlyBothTree={false} ref={ref} />
    )
    expect(warnSpy).not.toHaveBeenCalled()
    const base: OkrTreeProps = { data: makeData(), direction: 'vertical', onlyBothTree: false }
    rerenderWith(utils, ref, { ...base, nodeKey: 'uid' })
    rerenderWith(utils, ref, { ...base, nodeKey: 'uid', direction: 'horizontal' })
    rerenderWith(utils, ref, {
      ...base,
      nodeKey: 'uid',
      direction: 'horizontal',
      onlyBothTree: true,
      leftData: [{ id: 1, label: 'L' }],
    })
    const messages = warnSpy.mock.calls.map(c => String(c[0]))
    expect(messages.filter(m => m.includes('nodeKey')).length).toBe(1)
    expect(messages.filter(m => m.includes('direction')).length).toBe(1)
    expect(messages.filter(m => m.includes('onlyBothTree')).length).toBe(1)
    expect(messages.every(m => m.includes('key 以重挂载'))).toBe(true)
    warnSpy.mockRestore()
  })
})
