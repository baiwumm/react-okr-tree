import { useState, type ReactNode } from 'react'
import { OkrTree, OkrTreeGroup, OkrTreeViewport } from '../src/index'
import { baseData, keyedData, leftData, leftData2 } from './data'

/**
 * 开发 harness：不是发布物，只给阶段 3–6 的视觉核对与 Playwright 基线用。
 * 24 个正式 Demo 在 dev/demos/ 下，阶段 7 由文档站通过 workspace 源码引用同一批组件。
 */
function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="harness-card">
      <h3>{title}</h3>
      <div className="harness-card-body">{children}</div>
    </section>
  )
}

const themes = ['default', 'feishu', 'dark', 'auto', 'minimal', 'colorful'] as const

export default function App() {
  const [theme, setTheme] = useState<string>('default')
  return (
    <main className="harness">
      <header className="harness-header">
        <h1>react-okr-tree</h1>
        <div className="harness-themes">
          {themes.map(t => (
            <button
              key={t}
              type="button"
              className={t === theme ? 'is-active' : ''}
              onClick={() => setTheme(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <Card title="基础用法（vertical）">
        <OkrTree data={baseData()} theme={theme as never} />
      </Card>

      <Card title="水平方向 + 展开">
        <OkrTree
          data={keyedData()}
          nodeKey="id"
          direction="horizontal"
          showCollapsable
          defaultExpandedKeys={[2]}
          theme={theme as never}
        />
      </Card>

      <Card title="OKR 双向 + 组对齐">
        <OkrTreeGroup>
          <OkrTree
            data={keyedData()}
            leftData={leftData()}
            nodeKey="id"
            onlyBothTree
            direction="horizontal"
            showCollapsable
            defaultExpandAll
            theme={theme as never}
          />
          <OkrTree
            data={keyedData()}
            leftData={leftData2()}
            nodeKey="id"
            onlyBothTree
            direction="horizontal"
            showCollapsable
            defaultExpandAll
            theme={theme as never}
          />
        </OkrTreeGroup>
      </Card>

      <Card title="画布 + SVG 连接线 + 动画">
        <OkrTreeViewport toolbar style={{ ['--okr-viewport-height' as string]: '360px' }}>
          <OkrTree
            data={keyedData()}
            leftData={leftData()}
            nodeKey="id"
            onlyBothTree
            direction="horizontal"
            showCollapsable
            animate
            connector="svg"
            connectorShape="curve"
            theme={theme as never}
          />
        </OkrTreeViewport>
      </Card>
    </main>
  )
}
