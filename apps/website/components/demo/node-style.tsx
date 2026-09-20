'use client'

import { useMemo, useState } from 'react'
import { OkrTree, type TreeNode } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { baseData } from './data'

/**
 * 节点的样式（对应源项目 playground/components/demos/Base05.vue）
 *
 * - `labelWidth` / `labelHeight`：number 按 px，string 原样进 style，`undefined` 即 auto。
 *   上面三个按钮同时改这两个值——它们属于渲染配置，而节点组件是 memo 的，
 *   运行时换 prop 不会让已渲染的卡片重绘（Vue 的模板会自动跟上），所以按钮把值拼进
 *   `key` 重挂载。日常用法是定好尺寸后就不改了。
 * - `labelClassName` / `currentLableClassName`（后者是原版拼写，刻意保留）：类名加在卡片
 *   `.org-chart-node-label-inner` 上，接受固定字符串或 `Function(node)`；入参是内部 TreeNode，
 *   源数据在 `node.data`。这两个 prop 组件内部会逐节点通知，所以可以运行时改。
 * - **默认主题下选中态本身没有任何外观**（卡片外观用 `:where()` 声明成零优先级，
 *   就是为了让你经 `currentLableClassName` 传的类直接盖上去），点一个节点才看得出差别。
 *
 * 类名这里用文档站现成的 Tailwind utility，带 `!` 是因为本站的 utilities 在 `@layer` 里、
 * 而库样式是无层的（同属性时未层声明优先）。自己的项目里写普通 class 就不用这个 `!`。
 */
function labelClassName(node: TreeNode) {
  if (node.level === 1) return 'font-semibold underline'
  return node.isLeaf ? 'opacity-60' : undefined
}

function currentLableClassName() {
  return 'rounded-md! bg-fd-primary! text-fd-primary-foreground!'
}

const SIZES: { label: string; width?: string | number; height?: string | number }[] = [
  { label: 'auto（默认）' },
  { label: '140 × 40', width: 140, height: 40 },
  { label: "'8rem' × auto", width: '8rem' },
]

export function NodeStyleDemo() {
  const data = useMemo(baseData, [])
  const [size, setSize] = useState(SIZES[0])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-fd-muted-foreground">labelWidth × labelHeight</span>
        {SIZES.map(item => (
          <button
            key={item.label}
            type="button"
            aria-pressed={item === size}
            onClick={() => setSize(item)}
            className={`rounded-lg border border-fd-border px-3 py-1 ${
              item === size ? 'bg-fd-accent text-fd-accent-foreground' : 'text-fd-muted-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <OkrTree
        key={size.label}
        data={data}
        direction="horizontal"
        showCollapsable
        defaultExpandAll
        labelWidth={size.width}
        labelHeight={size.height}
        labelClassName={labelClassName}
        currentLableClassName={currentLableClassName}
      />
    </div>
  )
}
