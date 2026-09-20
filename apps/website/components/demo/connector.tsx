'use client'

import { useMemo, useState } from 'react'
import { OkrTree, type ConnectorMode, type ConnectorShape } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { keyedData } from './data'

/**
 * SVG 连接线（对应源项目 playground/components/demos/BaseConnector.vue）
 *
 * `connector="css"`（默认，伪元素像素几何）与 `connector="svg"`（覆盖层路径）可运行时切换，
 * 两者**布局完全一致**，svg 只替换线条渲染，随展开收起、`animate` 过渡、尺寸变化自动重绘。
 * `connectorShape` 三种形状只在 svg 模式下有意义，所以非 svg 时把形状按钮 `disabled` 掉——
 * 传了也不会生效，按钮状态比一句提示诚实。
 * 线色线宽继续走 `--okr-line-color` / `--okr-line-width`，主题变量与 `--okr-drop-color` 通用。
 */
export function ConnectorDemo() {
  const data = useMemo(keyedData, [])
  const [connector, setConnector] = useState<ConnectorMode>('svg')
  const [connectorShape, setConnectorShape] = useState<ConnectorShape>('curve')

  const btn =
    'rounded-lg border border-fd-border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['css', 'svg'] as const).map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setConnector(mode)}
            className={`${btn} ${connector === mode ? 'bg-fd-accent font-medium' : ''}`}
          >
            connector="{mode}"
          </button>
        ))}
        <span className="text-sm text-fd-muted-foreground">形状（仅 svg 生效）</span>
        {(['curve', 'orthogonal', 'straight'] as const).map(shape => (
          <button
            key={shape}
            type="button"
            disabled={connector !== 'svg'}
            onClick={() => setConnectorShape(shape)}
            className={`${btn} ${connectorShape === shape ? 'bg-fd-accent font-medium' : ''}`}
          >
            {shape}
          </button>
        ))}
      </div>
      <OkrTree
        data={data}
        nodeKey="id"
        direction="horizontal"
        showCollapsable
        defaultExpandedKeys={[1]}
        animate
        connector={connector}
        connectorShape={connectorShape}
      />
    </>
  )
}
