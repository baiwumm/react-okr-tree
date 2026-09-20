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

describe('渲染定制类 props 的运行时同步', () => {
  /**
   * 这组 props 只写在 configRef 里（context 引用要稳定），节点组件又是 memo + 只订阅自己那份
   * 版本，所以库必须自己把变更广播出去——否则换 renderContent 毫无反应，
   * 而源项目里它们是普通 props，换一个就整树重渲染。
   * 文档站的 demo 一度用 key 重挂载绕过这件事，那就是没修之前的症状。
   */
  it('换 renderContent / renderNode 立即重绘，且不重挂载（展开态保住）', () => {
    const data = makeData()
    const ref = createRef<OkrTreeHandle>()
    const utils = render(<OkrTree data={data} nodeKey="id" showCollapsable ref={ref} />)
    const inner = () => utils.container.querySelector('.org-chart-node-label-inner') as HTMLElement
    expect(inner().textContent).toBe('A')
    expect(inner().querySelector('b')).toBeNull()
    // 先展开，再换渲染方式：重挂载会让展开态回到 defaultExpandedKeys，那就测不出区别了
    ref.current!.expandNode(1)
    rerenderWith(utils, ref, {
      data,
      nodeKey: 'id',
      showCollapsable: true,
      renderContent: node => <b>{`c-${node.label}`}</b>,
    })
    expect(inner().querySelector('b')?.textContent).toBe('c-A')
    expect(ref.current!.getNode(1)!.expanded).toBe(true)

    rerenderWith(utils, ref, {
      data,
      nodeKey: 'id',
      showCollapsable: true,
      renderNode: ({ node }) => <i>{`n-${node.level}`}</i>,
    })
    expect(inner().querySelector('i')?.textContent).toBe('n-1')
  })

  it('换 labelWidth 与 showNodeNum 立即重绘', () => {
    const data = makeData()
    const utils = render(<OkrTree data={data} nodeKey="id" labelWidth={120} />)
    const inner = () => utils.container.querySelector('.org-chart-node-label-inner') as HTMLElement
    expect(inner().style.width).toBe('120px')
    rerenderWith(utils, createRef<OkrTreeHandle>(), { data, nodeKey: 'id', labelWidth: 200 })
    expect(inner().style.width).toBe('200px')

    const withNum = render(
      <OkrTree data={data} nodeKey="id" showCollapsable defaultExpandedKeys={[]} />
    )
    expect(withNum.container.querySelector('.org-chart-node-btn-text')).toBeNull()
    withNum.rerender(
      <OkrTree
        data={data}
        nodeKey="id"
        showCollapsable
        showNodeNum
        defaultExpandedKeys={[]}
        labelWidth={200}
      />
    )
    // 折叠圆盘里的子节点数：showNodeNum 是运行时才打开的，必须立刻出现
    expect(withNum.container.querySelector('.org-chart-node-btn-text')?.textContent).toBe('2')
  })
})
