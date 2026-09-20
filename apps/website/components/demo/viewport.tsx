'use client'

import { useMemo, useRef, useState } from 'react'
import {
  OkrTree,
  OkrTreeViewport,
  type OkrTreeViewportHandle,
  type TreeNodeData,
  type ViewportWheelBehavior,
} from 'react-okr-tree'
import 'react-okr-tree/style.css'

/**
 * 画布组件 OkrTreeViewport（对应源项目 playground/components/demos/Base11.vue）
 *
 * 它只做外层 `transform: translate() scale()`，不侵入树本体：滚轮以指针为锚缩放、拖拽平移
 * （3px 阈值，平移结束时吞掉随后那次 click）、双击复位、双指捏合。这里用 `toolbar` 的默认
 * 工具栏，另外排一排按钮走 ref 方法：`fitToScreen()` / `centerNode(key)` / `exportImage()`。
 * `wheelBehavior` 三个值都点一遍：默认 `ctrl-zoom` 不劫持页面滚动，`zoom` 直接缩放，
 * `scroll` 完全不拦滚轮。`zoom` / `onZoomChange` 是受控写法（等价源项目 `v-model:zoom`），
 * 范围由 `minZoom` / `maxZoom` 钳制。
 *
 * 与源用例的差别：`html-to-image` 在 React 版里是**可选 peer**，站里没装，所以导出走
 * `exportImage({ toPng })` 的注入形式（下面那份 `toPng` 是本文件自带的最小实现）而不是
 * 库内部的动态 import。装过 `html-to-image` 的项目把它的 `toPng` 传进来就行，不传则库按需
 * 动态导入、没装时抛带安装指引的错。
 */

const WHEEL_MODES: Array<{ value: ViewportWheelBehavior; label: string }> = [
  { value: 'ctrl-zoom', label: 'Ctrl / Cmd + 滚轮缩放' },
  { value: 'zoom', label: '滚轮直接缩放' },
  { value: 'scroll', label: '滚轮滚动页面' },
]

/** 三层部门树：够宽才看得出缩放与平移的价值 */
function dept(id: number, label: string, depth: number): TreeNodeData {
  if (depth <= 0) return { id, label }
  return {
    id,
    label,
    children: [
      dept(id * 10 + 1, `${label}-A`, depth - 1),
      dept(id * 10 + 2, `${label}-B`, depth - 1),
    ],
  }
}

/**
 * 注入给 `exportImage` 的渲染函数，签名与 html-to-image 的 toPng 一致（el, { pixelRatio, backgroundColor }）。
 * 把画布节点连同页面样式表一起塞进 `<foreignObject>`，再用 canvas 位图化。
 * 少了「内联样式表」这一步，隔离文档里渲染出来的就是无样式的纯文本。
 * 这份最小实现不做字体与外链图片的内联（隔离文档不加载外部资源），真需要就装 `html-to-image`。
 */
async function toPng(el: HTMLElement, options?: Record<string, any>): Promise<string> {
  const ratio = options?.pixelRatio ?? 2
  const css = Array.from(document.styleSheets)
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules)
          .map(rule => rule.cssText)
          .join('')
      } catch {
        return '' // 跨域样式表读不到规则，跳过
      }
    })
    .join('')
  const box = document.createElementNS('http://www.w3.org/1999/xhtml', 'div')
  const style = document.createElement('style')
  style.textContent = css
  box.append(style, el.cloneNode(true))
  // 交给 XMLSerializer 转义：CSS 文本里的 & 与 > 手工拼串会破坏 XML 解析
  const markup = new XMLSerializer().serializeToString(box)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${el.offsetWidth}" height="${el.offsetHeight}">` +
    `<foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(el.offsetWidth * ratio)
  canvas.height = Math.round(el.offsetHeight * ratio)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前环境拿不到 canvas 2d 上下文')
  if (options?.backgroundColor) {
    ctx.fillStyle = options.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.scale(ratio, ratio)
  ctx.drawImage(img, 0, 0)
  return canvas.toDataURL('image/png')
}

export function ViewportDemo() {
  const vp = useRef<OkrTreeViewportHandle>(null)
  const [zoom, setZoom] = useState(1)
  const [wheelBehavior, setWheelBehavior] = useState<ViewportWheelBehavior>('ctrl-zoom')
  const [status, setStatus] = useState('拖动画布平移；按住 Ctrl / Cmd 滚动缩放。')
  const data = useMemo(() => [dept(1, 'xxx科技有有限公司', 3)], [])

  async function centerOn(id: number) {
    // centerNode 会先展开目标祖先，再把视口中心对准它，返回是否命中
    const done = await vp.current?.centerNode(id)
    setStatus(done ? `已居中到 id=${id}（祖先已展开）` : `centerNode(${id}) 未命中节点`)
  }

  async function exportPng() {
    setStatus('导出中…')
    try {
      await vp.current?.exportImage({ type: 'png', scale: 2, background: '#ffffff', toPng })
      setStatus('已导出 PNG，浏览器应已触发下载（Promise 以 dataURL 结束）')
    } catch (error) {
      setStatus(`导出失败：${(error as Error).message}`)
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {WHEEL_MODES.map(mode => (
          <button
            key={mode.value}
            type="button"
            onClick={() => setWheelBehavior(mode.value)}
            className={`rounded-lg border border-fd-border px-3 py-1.5 text-sm transition-colors ${
              wheelBehavior === mode.value
                ? 'bg-fd-accent text-fd-accent-foreground'
                : 'text-fd-muted-foreground'
            }`}
          >
            {mode.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => vp.current?.fitToScreen()}
          className="rounded-lg border border-fd-border px-3 py-1.5 text-sm transition-colors hover:bg-fd-accent"
        >
          fitToScreen()
        </button>
        <button
          type="button"
          onClick={() => void centerOn(121)}
          className="rounded-lg border border-fd-border px-3 py-1.5 text-sm transition-colors hover:bg-fd-accent"
        >
          centerNode(121)
        </button>
        <button
          type="button"
          onClick={() => void exportPng()}
          className="rounded-lg border border-fd-border px-3 py-1.5 text-sm transition-colors hover:bg-fd-accent"
        >
          导出 PNG（注入 toPng）
        </button>
      </div>
      <OkrTreeViewport
        ref={vp}
        toolbar
        zoom={zoom}
        onZoomChange={setZoom}
        minZoom={0.3}
        maxZoom={3}
        wheelBehavior={wheelBehavior}
        style={{ height: 420 }}
      >
        <OkrTree data={data} nodeKey="id" direction="horizontal" showCollapsable />
      </OkrTreeViewport>
      <p className="mt-2 text-sm text-fd-muted-foreground">
        当前缩放 {Math.round(zoom * 100)}% · {status}
      </p>
    </div>
  )
}
