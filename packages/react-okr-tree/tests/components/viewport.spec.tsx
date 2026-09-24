import { describe, it, expect, vi } from 'vitest'
import { act, render, fireEvent, type RenderResult } from '@testing-library/react'
import { createRef, useState, type ReactNode } from 'react'
import {
  OkrTree,
  OkrTreeViewport,
  type OkrTreeViewportHandle,
  type OkrTreeViewportProps,
} from '../../src/index'
import { clampZoom, computeFit, type ViewportOffset } from '../../src/viewport'
import type { TreeNodeData } from '../../src/types'

/**
 * 移植自源项目 tests/components/viewport.spec.ts（19 例，逐例对应）。
 * 两处的落地方式不同，先说明免得读用例时以为是另一种行为：
 * - `wrapper.vm.$refs.vp` → `createRef<OkrTreeViewportHandle>()`（视口的 imperative handle
 *   是 OkrTreeViewportHandle，不是 OkrTreeHandle）；
 * - `emitted('update:zoom' / 'update:offset')` → 受控 prop + onZoomChange / onOffsetChange，
 *   并断言回调**实参序列**（源项目的 v-model:zoom / v-model:offset）。
 * jsdom 不套样式表、几何恒为 0，所以凡依赖尺寸的分支都显式注入尺寸，再断言落到
 * getZoom() / getOffset() 与画布内联 transform 上的具体数值——这三样才是对外契约。
 */

// 模拟 html-to-image 不可安装的环境，验证 exportImage 的错误信息
vi.mock('html-to-image', () => {
  throw new Error('simulated: html-to-image is not installed')
})

const makeData = (): TreeNodeData[] => [
  {
    id: 1,
    label: 'A',
    children: [
      { id: 2, label: 'B' },
      { id: 3, label: 'C' },
    ],
  },
]

/** 源项目 `mount(VueOkrTree, { props })` → React 用 ref 承载 imperative handle */
function mountViewport(
  props: OkrTreeViewportProps = {},
  children?: ReactNode
): RenderResult & { vp: OkrTreeViewportHandle } {
  const ref = createRef<OkrTreeViewportHandle>()
  const utils = render(
    <OkrTreeViewport {...props} ref={ref}>
      {children ?? <OkrTree data={makeData()} nodeKey="id" />}
    </OkrTreeViewport>
  )
  return { ...utils, vp: ref.current! }
}

/**
 * 同步执行并回传返回值：编程式调用 handle 方法会写 React state（离散更新），必须包在 act 内。
 */
const inAct = <T,>(fn: () => T): T => {
  let value: T = undefined as unknown as T
  act(() => {
    value = fn()
  })
  return value
}

/** centerNode / exportImage 是异步的（内部等一帧 rAF / 等渲染函数 resolve），用异步 act 包齐 */
const inActAsync = async <T,>(fn: () => Promise<T>): Promise<T> => {
  let value: T = undefined as unknown as T
  await act(async () => {
    value = await fn()
  })
  return value
}

const viewportElOf = (container: ParentNode) =>
  container.querySelector<HTMLElement>('.okr-viewport') as HTMLElement
const canvasElOf = (container: ParentNode) =>
  container.querySelector<HTMLElement>('.okr-viewport-canvas') as HTMLElement
const contentElOf = (container: ParentNode) =>
  container.querySelector<HTMLElement>('.okr-viewport-content') as HTMLElement

const q = (c: ParentNode, sel: string) => c.querySelector(sel) as HTMLElement
const qa = (c: ParentNode, sel: string) => Array.from(c.querySelectorAll(sel)) as HTMLElement[]
/** 节点自己的标签（不含后代）：与 dom-contract 的 CARD_SELECTOR 同一口径 */
const nodeByLabel = (c: ParentNode, label: string) =>
  qa(c, '.org-chart-node').find(
    n =>
      n
        .querySelector(':scope > .org-chart-node-label > .org-chart-node-label-inner')
        ?.textContent?.trim() === label
  )!

/** jsdom 无布局：clientWidth / offsetWidth 全为 0，尺寸依赖的用例按源项目手法注入 */
const setDims = (container: ParentNode, width: number, height: number) => {
  const vpEl = viewportElOf(container)
  const contentEl = contentElOf(container)
  Object.defineProperty(vpEl, 'clientWidth', { value: width, configurable: true })
  Object.defineProperty(vpEl, 'clientHeight', { value: height, configurable: true })
  Object.defineProperty(contentEl, 'offsetWidth', { value: width, configurable: true })
  Object.defineProperty(contentEl, 'offsetHeight', { value: height, configurable: true })
}

/** jsdom 不产几何：centerNode 读的是两个 rect 的相对位置，逐个塞 */
const rectOf = (left: number, top: number, width: number, height: number): DOMRect =>
  ({
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect

/**
 * 视口的滚轮处理挂在原生 `addEventListener('wheel', …, { passive: false })` 上
 * （React 的 onWheel 会被注册成 passive，preventDefault 无效），
 * 所以这里派发真实 WheelEvent，并把 defaultPrevented 作为「是否劫持滚动」的判据回传。
 */
const fireWheel = (
  el: Element,
  props: { deltaY: number; ctrlKey?: boolean; clientX?: number; clientY?: number }
): boolean => {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    clientX: 0,
    clientY: 0,
    ctrlKey: false,
    ...props,
  })
  act(() => {
    el.dispatchEvent(event)
  })
  return event.defaultPrevented
}

/**
 * 平移走 Pointer Events。jsdom 30 已实现 PointerEvent（不像 DragEvent 缺失，
 * 见 draggable.spec.tsx），故用 testing-library 的 fireEvent.pointerXxx 派发真事件，
 * pointerId / clientX / clientY 会透传到 React 合成事件。事件名沿用源项目的小写写法。
 */
const pointerFireers = {
  pointerdown: fireEvent.pointerDown,
  pointermove: fireEvent.pointerMove,
  pointerup: fireEvent.pointerUp,
} as const

const firePointer = (
  el: Element,
  type: keyof typeof pointerFireers,
  props: Record<string, any> = {}
) => {
  act(() => {
    // pointerType / button 一并给全：组件里 `pointerType==='mouse' && button!==0` 的守卫
    // 才是真的被走到，而不是靠事件缺字段绕过
    pointerFireers[type](el, { pointerId: 1, pointerType: 'mouse', button: 0, ...props })
  })
}

describe('纯函数：clampZoom / computeFit', () => {
  it('clampZoom 钳制到 [min, max]', () => {
    expect(clampZoom(0.5, 0.2, 4)).toBe(0.5)
    expect(clampZoom(0.01, 0.2, 4)).toBe(0.2)
    expect(clampZoom(99, 0.2, 4)).toBe(4)
  })

  it('computeFit 等比缩小并居中', () => {
    const fit = computeFit(2000, 1000, 1280, 800, 20, 0.2, 4)
    expect(fit.zoom).toBeCloseTo(Math.min(1240 / 2000, 760 / 1000))
    expect(fit.offset.x).toBeCloseTo((1280 - 2000 * fit.zoom) / 2)
    expect(fit.offset.y).toBeCloseTo((800 - 1000 * fit.zoom) / 2)
  })

  it('computeFit 内容小于窗口时放大到 min(限制内) 居中', () => {
    const fit = computeFit(100, 100, 1280, 800, 20, 0.2, 4)
    expect(fit.zoom).toBe(4) // min(1240/100, 760/100)=7.6 → 钳制到 max 4
    expect(fit.offset.x).toBeCloseTo((1280 - 400) / 2)
  })

  it('computeFit 超大内容钳制到 minZoom', () => {
    const fit = computeFit(50000, 50000, 1280, 800, 20, 0.2, 4)
    expect(fit.zoom).toBe(0.2)
  })
})

describe('OkrTreeViewport：缩放与复位', () => {
  it('zoomIn / zoomOut 受 min-zoom / max-zoom 钳制', () => {
    const { container, vp } = mountViewport({ minZoom: 0.5, maxZoom: 2, zoomStep: 2 })
    inAct(() => vp.zoomIn())
    expect(vp.getZoom()).toBe(2) // 1 * 2 → 钳制到 max
    inAct(() => vp.zoomIn())
    expect(vp.getZoom()).toBe(2) // 已到上界
    inAct(() => vp.zoomOut())
    inAct(() => vp.zoomOut())
    expect(vp.getZoom()).toBe(0.5) // 2 / 2 → 1，再 / 2 → 0.5，继续除钳制到 min
    inAct(() => vp.zoomOut())
    expect(vp.getZoom()).toBe(0.5)
    // 缩放值确实落到了画布的内联变换上（视口尺寸未注入 → 锚点是原点）
    expect(canvasElOf(container).style.transform).toBe('translate(0px, 0px) scale(0.5)')
  })

  it('受控 zoom（对应 v-model:zoom）：方法触发 onZoomChange（钳制后）', () => {
    const onZoomChange = vi.fn()
    const { vp } = mountViewport({ zoom: 1, zoomStep: 1.2, maxZoom: 1.5, onZoomChange })
    inAct(() => vp.zoomIn()) // 1.2
    inAct(() => vp.zoomIn()) // 1.44
    inAct(() => vp.zoomIn()) // 1.728 → 钳制到 1.5
    expect(onZoomChange).toHaveBeenCalledTimes(3)
    expect(onZoomChange.mock.calls.map(c => c[0])).toEqual([1.2, 1.44, 1.5])
  })

  it('dblclick 复位缩放与偏移', () => {
    const { container, vp } = mountViewport()
    inAct(() => vp.zoomIn())
    expect(vp.getZoom()).toBeCloseTo(1.2)
    act(() => {
      fireEvent.dblClick(viewportElOf(container))
    })
    expect(vp.getZoom()).toBe(1)
    expect(vp.getOffset()).toEqual({ x: 0, y: 0 })
    expect(canvasElOf(container).style.transform).toBe('translate(0px, 0px) scale(1)')
  })

  it('fitToScreen 用内容尺寸计算并应用', () => {
    const { container, vp } = mountViewport()
    setDims(container, 1280, 800)
    inAct(() => vp.fitToScreen(20))
    const zoom = vp.getZoom()
    const offset = vp.getOffset()
    // 内容 1280×800 放进 1280×800 视口、四周留 20 → 以高为准 min(1240/1280, 760/800)
    expect(zoom).toBeGreaterThan(0)
    expect(zoom).toBeCloseTo(0.95)
    expect(offset).toEqual({ x: 32, y: 20 })
    expect(offset.x).toBeCloseTo((1280 - 1280 * zoom) / 2)
    expect(offset.y).toBeCloseTo((800 - 800 * zoom) / 2)
    expect(canvasElOf(container).style.transform).toBe('translate(32px, 20px) scale(0.95)')
  })
})

describe('OkrTreeViewport：滚轮行为', () => {
  it('wheelBehavior: scroll 不劫持滚轮（不缩放、不 preventDefault）', () => {
    const { container, vp } = mountViewport({ wheelBehavior: 'scroll' })
    const prevented = fireWheel(viewportElOf(container), { deltaY: -120 })
    expect(vp.getZoom()).toBe(1)
    expect(prevented).toBe(false)
  })

  it('wheelBehavior: ctrl-zoom（默认）未按 Ctrl 不缩放，按住 Ctrl 缩放', () => {
    const { container, vp } = mountViewport()
    const el = viewportElOf(container)
    expect(fireWheel(el, { deltaY: -120 })).toBe(false)
    expect(vp.getZoom()).toBe(1)
    expect(fireWheel(el, { deltaY: -120, ctrlKey: true })).toBe(true)
    expect(vp.getZoom()).toBeCloseTo(1.2)
  })

  it('wheelBehavior: zoom 不需要 Ctrl 即缩放，且不超过 max-zoom', () => {
    const { container, vp } = mountViewport({ wheelBehavior: 'zoom', maxZoom: 1.44 })
    const el = viewportElOf(container)
    fireWheel(el, { deltaY: -120 })
    fireWheel(el, { deltaY: -120 })
    const last = fireWheel(el, { deltaY: -120 })
    expect(vp.getZoom()).toBe(1.44)
    expect(last).toBe(true)
  })
})

describe('OkrTreeViewport：拖拽平移', () => {
  it('pointer 拖拽超过阈值后更新偏移；未超阈值不影响', () => {
    const { container, vp } = mountViewport()
    const el = viewportElOf(container)
    firePointer(el, 'pointerdown', { pointerId: 1, clientX: 100, clientY: 100 })
    firePointer(el, 'pointermove', { pointerId: 1, clientX: 102, clientY: 101 })
    expect(vp.getOffset()).toEqual({ x: 0, y: 0 }) // 未过 3px 阈值不平移
    expect(canvasElOf(container).style.transform).toBe('translate(0px, 0px) scale(1)')
    firePointer(el, 'pointermove', { pointerId: 1, clientX: 160, clientY: 140 })
    expect(vp.getOffset()).toEqual({ x: 60, y: 40 })
    expect(canvasElOf(container).style.transform).toBe('translate(60px, 40px) scale(1)')
    expect(el.classList.contains('is-panning')).toBe(true) // 过了阈值才挂平移态
    firePointer(el, 'pointerup', { pointerId: 1, clientX: 160, clientY: 140 })
    expect(vp.getOffset()).toEqual({ x: 60, y: 40 }) // 抬手不再挪偏移
    expect(el.classList.contains('is-panning')).toBe(false) // 平移态也收掉了
  })

  it('受控 offset（对应 v-model:offset）：拖拽触发 onOffsetChange', () => {
    const onOffsetChange = vi.fn()
    const { container } = mountViewport({ offset: { x: 0, y: 0 }, onOffsetChange })
    const el = viewportElOf(container)
    firePointer(el, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    firePointer(el, 'pointermove', { pointerId: 1, clientX: 50, clientY: 30 })
    firePointer(el, 'pointerup', { pointerId: 1 })
    expect(onOffsetChange.mock.calls.length).toBeGreaterThan(0)
    expect(onOffsetChange.mock.calls[onOffsetChange.mock.calls.length - 1][0]).toEqual({
      x: 50,
      y: 30,
    })
  })
})

/**
 * 平移后那次 click 由「标志 + 常驻的捕获阶段处理」吞掉，而不是每次平移都挂一个
 * addEventListener('click', …, { once: true })——触摸平移根本不派发 click，那种写法
 * 会按平移次数往元素上累积监听、卸载时仍挂在那里。与上游 vue3-okr-tree 同形。
 */
describe('OkrTreeViewport：平移后吞掉一次 click', () => {
  const mountWithNodeClick = (onNodeClick: () => void) =>
    mountViewport({}, <OkrTree data={makeData()} nodeKey="id" onNodeClick={onNodeClick} />)

  /** 一次完整的触摸平移：按下 → 过阈值 → 抬手，其后不派发任何 click */
  const panOnce = (el: Element) => {
    firePointer(el, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    firePointer(el, 'pointermove', { pointerId: 1, clientX: 60, clientY: 40 })
    firePointer(el, 'pointerup', { pointerId: 1, clientX: 60, clientY: 40 })
  }

  it('只吞掉平移后的那一次点击，第二次照常送到节点', () => {
    const onNodeClick = vi.fn()
    const { container } = mountWithNodeClick(onNodeClick)
    const label = q(container, '.org-chart-node-label-inner')
    panOnce(viewportElOf(container))
    act(() => {
      fireEvent.click(label)
    })
    expect(onNodeClick).not.toHaveBeenCalled()
    act(() => {
      fireEvent.click(label)
    })
    expect(onNodeClick).toHaveBeenCalledTimes(1)
  })

  it('平移后没有 click 时不在视口元素上留监听', () => {
    const onNodeClick = vi.fn()
    const { container } = mountWithNodeClick(onNodeClick)
    const el = viewportElOf(container)
    // 捕获阶段的点击处理在挂载时就挂好了，这里只统计平移过程中新增的注册
    const addSpy = vi.spyOn(el, 'addEventListener')
    for (let i = 0; i < 3; i++) panOnce(el)
    expect(addSpy.mock.calls.filter(([type]) => type === 'click')).toHaveLength(0)
  })
})

describe('OkrTreeViewport：centerNode 与 exportImage', () => {
  it('centerNode 展开祖先并居中目标节点', async () => {
    // min=max=1：把缩放钉死，偏移就只剩「把节点中心搬到视口中心」这一件事
    const { container, vp } = mountViewport({ minZoom: 1, maxZoom: 1 })
    setDims(container, 1280, 800)
    const target = nodeByLabel(container, 'B')
    // 内容原点被平移到屏幕 (1000,1000)，目标节点落在 (1380,1230,160,60)
    // → 节点中心的内容坐标 (460, 260) → 对准视口中心 (640,400) 需要 offset (180, 140)
    vi.spyOn(contentElOf(container), 'getBoundingClientRect').mockReturnValue(
      rectOf(1000, 1000, 0, 0)
    )
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rectOf(1380, 1230, 160, 60))
    expect(await inActAsync(() => vp.centerNode(2))).toBe(true)
    expect(vp.getOffset()).toEqual({ x: 180, y: 140 })
    expect(canvasElOf(container).style.transform).toBe('translate(180px, 140px) scale(1)')
    expect(await inActAsync(() => vp.centerNode(999))).toBe(false)
    expect(vp.getOffset()).toEqual({ x: 180, y: 140 }) // 找不到的节点不动画布
  })

  it('exportImage 未安装 html-to-image 时给出明确错误', async () => {
    const { vp } = mountViewport()
    // 断的是 loadHtmlToImage 那条带修复指引的说明符解析失败路径（不是任意一次抛错）
    await expect(inActAsync(() => vp.exportImage())).rejects.toThrow(
      /\[react-okr-tree\] exportImage 需要依赖 html-to-image[\s\S]*toPng/
    )
  })

  it('exportImage 使用传入的 toPng 渲染并触发下载', async () => {
    const clickSpy = vi.fn()
    const created: HTMLAnchorElement[] = []
    const originalCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest: any[]): any => {
      const el = (originalCreate as any)(tag, ...rest)
      if (tag === 'a') {
        created.push(el as HTMLAnchorElement)
        ;(el as HTMLAnchorElement).click = clickSpy
      }
      return el
    })
    const toPng = vi.fn(
      async (_el: HTMLElement, _opts?: Record<string, any>) => 'data:image/png;base64,xyz'
    )
    const { container, vp } = mountViewport()
    const dataUrl = await inActAsync(() =>
      vp.exportImage({ toPng, scale: 3, background: '#ffffff' })
    )
    expect(dataUrl).toBe('data:image/png;base64,xyz')
    expect(toPng).toHaveBeenCalledTimes(1)
    // 渲染的是内容容器，scale / background 映射成 html-to-image 的 pixelRatio / backgroundColor
    expect(toPng.mock.calls[0][0]).toBe(contentElOf(container))
    expect(toPng.mock.calls[0][1]).toMatchObject({ pixelRatio: 3, backgroundColor: '#ffffff' })
    expect(created).toHaveLength(1)
    expect(created[0].download).toMatch(/^okr-tree-\d+\.png$/)
    expect(created[0].href).toBe('data:image/png;base64,xyz')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    vi.restoreAllMocks()
  })

  it('exportImage 支持 svg 类型（toSvg）', async () => {
    const toSvg = vi.fn(
      async (_el: HTMLElement, _opts?: Record<string, any>) => 'data:image/svg+xml;base64,abc'
    )
    // 自己接管 click：否则 jsdom 会因为 dataURL 导航打一条 Not implemented
    const clicked: { download: string; href: string }[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicked.push({ download: this.download, href: this.href })
    })
    const { vp } = mountViewport()
    const dataUrl = await inActAsync(() => vp.exportImage({ type: 'svg', toSvg }))
    expect(dataUrl).toBe('data:image/svg+xml;base64,abc')
    expect(toSvg).toHaveBeenCalledTimes(1)
    // scale 缺省 2；未传 background 就不该塞 backgroundColor
    expect(toSvg.mock.calls[0][1]).toEqual({ pixelRatio: 2 })
    expect(clicked).toHaveLength(1)
    expect(clicked[0].download).toMatch(/^okr-tree-\d+\.svg$/)
  })
})

describe('OkrTreeViewport：与 OkrTree 组合', () => {
  it('children（对应源项目默认插槽）内的树正常渲染，折叠按钮照常工作', () => {
    // 源用例名里的「OkrTreeGroup 可包裹」不在本例断言范围内：分组测量由 a11y-group 用例移植负责
    const { container, vp } = mountViewport(
      {},
      <OkrTree data={makeData()} nodeKey="id" showCollapsable />
    )
    const labels = () =>
      qa(container, '.okr-viewport .org-chart-node-label-inner').map(
        x => x.textContent?.trim() ?? ''
      )
    // 折叠元素会被重建，所以每次都重新查（与 controlled.spec.tsx 同一手法）
    // 注意得用「节点直接子代」：role="tree" 的顶层容器同样带 .org-chart-node-children，
    // 但它不是收起子树，永远不会有 is-hidden
    const childrenEl = () =>
      q(container, '.okr-viewport .org-chart-node > .org-chart-node-children')
    expect(childrenEl().classList).toContain('is-hidden') // showCollapsable 下默认收起
    // 收起态仍留在 DOM 里（is-hidden + 内联样式）——这正是视口不该干预树本体的意义
    expect(labels()).toEqual(expect.arrayContaining(['A', 'B', 'C']))
    act(() => {
      fireEvent.click(q(container, '.okr-viewport .org-chart-node-btn'))
    })
    expect(childrenEl().classList).not.toContain('is-hidden')
    expect(labels()).toContain('B')
    expect(vp.getZoom()).toBe(1) // 点树不该惊动画布
  })

  it('受控 zoom/offset 组合属性双向同步', () => {
    // 宿主用 useState 承接回调并回填 props（对应源项目的 v-model），镜像只为方便测试侧读值
    const model: { zoom: number; offset: ViewportOffset } = { zoom: 1, offset: { x: 0, y: 0 } }
    function Parent() {
      const [zoom, setZoom] = useState(1)
      const [offset, setOffset] = useState<ViewportOffset>({ x: 0, y: 0 })
      return (
        <OkrTreeViewport
          zoom={zoom}
          offset={offset}
          onZoomChange={z => {
            model.zoom = z
            setZoom(z)
          }}
          onOffsetChange={o => {
            model.offset = o
            setOffset(o)
          }}
        >
          <OkrTree data={makeData()} />
        </OkrTreeViewport>
      )
    }
    const { container } = render(<Parent />)
    const el = viewportElOf(container)
    expect(fireWheel(el, { deltaY: -120, ctrlKey: true })).toBe(true)
    expect(model.zoom).toBeCloseTo(1.2)
    firePointer(el, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    firePointer(el, 'pointermove', { pointerId: 1, clientX: 30, clientY: 20 })
    firePointer(el, 'pointerup', { pointerId: 1 })
    expect(model.offset).toEqual({ x: 30, y: 20 })
    // 宿主回填的受控值确实驱动了画布变换（而不是只有内部 state 动了）
    expect(canvasElOf(container).style.transform).toContain('scale(1.2)')
    expect(canvasElOf(container).style.transform).toContain('translate(30px, 20px)')
  })
})
