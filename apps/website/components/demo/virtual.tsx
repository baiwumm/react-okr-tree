'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { OkrTree, type OkrTreeHandle } from 'react-okr-tree'
import 'react-okr-tree/style.css'

/**
 * 虚拟滚动（对应上游 vue3-okr-tree playground/components/demos/BaseVirtual.vue）
 *
 * `virtual`：同层可见兄弟数 ≥ 50 的行只渲染视口内窗口，占位块保持布局与连接线
 * 逐像素等价。要求数字型 labelWidth。与上游一致：virtual 是创建期快照，
 * 运行时切换走 `key` 重挂载，不能直接改 prop。
 */
const TOTAL = 3000

export function VirtualDemo() {
  const handleRef = useRef<OkrTreeHandle>(null)
  const [virtualOn, setVirtualOn] = useState(true)
  const [domCount, setDomCount] = useState(0)
  const stageRef = useRef<HTMLDivElement>(null)

  const data = useMemo(
    () => [
      {
        id: 0,
        label: 'Root',
        children: Array.from({ length: TOTAL }, (_, i) => ({ id: i + 1, label: `N${i + 1}` })),
      },
    ],
    []
  )

  useEffect(() => {
    const count = () => {
      if (stageRef.current) {
        setDomCount(stageRef.current.querySelectorAll('.org-chart-node').length)
      }
    }
    count()
    const observer = new MutationObserver(count)
    if (stageRef.current) observer.observe(stageRef.current, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [virtualOn])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <label>
          <input
            type="checkbox"
            data-test="virtual-toggle"
            checked={virtualOn}
            onChange={e => setVirtualOn(e.target.checked)}
          />{' '}
          virtual（{virtualOn ? '开' : '关'}）
        </label>
        <button
          data-test="scroll-btn"
          onClick={() => handleRef.current?.scrollToNode(1 + Math.floor(Math.random() * TOTAL))}
        >
          滚动到随机节点
        </button>
        <span data-test="stat" style={{ color: '#909090', fontSize: 13 }}>
          DOM 节点 {domCount} / 总数 {TOTAL + 1}
        </span>
      </div>
      <div
        ref={stageRef}
        style={{
          width: 800,
          height: 220,
          overflow: 'auto',
          border: '1px solid #eee',
          borderRadius: 6,
          padding: 8,
        }}
      >
        {/* virtual 是创建期快照：切换用 key 重挂载（与上游 demo 同一手法） */}
        <OkrTree
          key={virtualOn ? 'virtual' : 'plain'}
          ref={handleRef}
          data={data}
          nodeKey="id"
          labelWidth={120}
          defaultExpandAll
          virtual={virtualOn}
        />
      </div>
    </div>
  )
}
