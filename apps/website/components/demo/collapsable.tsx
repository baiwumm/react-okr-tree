'use client'

import { useMemo, useState } from 'react'
import { OkrTree } from 'react-okr-tree'
import 'react-okr-tree/style.css'
import { baseData } from './data'

/**
 * 节点是否可展开（对应源项目 playground/components/demos/Base03.vue）
 *
 * 三个开关对比着看：
 * - `showCollapsable` 关掉时根本不给收起的动作，组件**强制全部展开**（原版既有行为），
 *   所以它是另外两个前提：圆盘不出现，`defaultExpandAll` 与 `showNodeNum` 都无从谈起。
 * - `defaultExpandAll` 只是「默认」而不是「受控」：一进来全展开，用户照样能逐个收起。
 * - `showNodeNum` 在折叠的圆盘里显示子节点数（只算通过过滤的可见子节点）。
 *
 * 圆盘打开后键盘操作与源项目一致：Tab 进入树，→ 展开 / 进入子节点，← 收起 / 回到父节点。
 *
 * React 与 Vue 的一处差别：`showCollapsable` 与 `showNodeNum` 运行时换值会立刻重绘（组件对
 * 这两类 prop 做了全树通知），但 `defaultExpandAll` 是**初始态**语义——它只在节点创建时决定
 * 展开状态，运行时换值不会把已经手动收起的节点再摊开。所以本例只把它拼进 `key` 触发重挂载，
 * 让「默认全展开」这一档可以反复重放。Vue 版同样不会重放初始值，只是那边一般直接重挂组件。
 */
export function CollapsableDemo() {
  const data = useMemo(baseData, [])
  const [showCollapsable, setShowCollapsable] = useState(true)
  const [defaultExpandAll, setDefaultExpandAll] = useState(false)
  const [showNodeNum, setShowNodeNum] = useState(false)

  const toggles = [
    ['showCollapsable', showCollapsable, setShowCollapsable],
    ['defaultExpandAll', defaultExpandAll, setDefaultExpandAll],
    ['showNodeNum', showNodeNum, setShowNodeNum],
  ] as const

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {toggles.map(([name, on, set]) => (
          <button
            key={name}
            type="button"
            aria-pressed={on}
            onClick={() => set(!on)}
            className={`rounded-lg border border-fd-border px-3 py-1 ${
              on ? 'bg-fd-accent text-fd-accent-foreground' : 'text-fd-muted-foreground'
            }`}
          >
            {`${name}=${on}`}
          </button>
        ))}
      </div>
      <OkrTree
        key={`expand-all-${defaultExpandAll}`}
        data={data}
        direction="horizontal"
        showCollapsable={showCollapsable}
        defaultExpandAll={defaultExpandAll}
        showNodeNum={showNodeNum}
      />
    </div>
  )
}
