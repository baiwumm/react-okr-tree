import { Typography } from '@heroui/react'

import { FACTS } from '@/lib/facts'

/**
 * Hero 右侧「规格表」：用真实的 props 面当主视觉，替代装饰性插画。
 * 每一行都是组件真实接受的取值（取值定义在 packages/react-okr-tree/src/types.ts），
 * 数字一律来自 lib/facts.ts，不在 JSX 里散写。
 */
const SPECS: { label: string; value: string }[] = [
  { label: 'direction', value: 'vertical · horizontal · okr' },
  { label: 'theme', value: `default / feishu / dark / auto / minimal / colorful` },
  { label: 'animate', value: `${FACTS.animations} 种展开动画，可传自定义名` },
  { label: 'connector', value: 'css · svg（curve / orthogonal / straight）' },
  { label: 'a11y', value: 'role=tree / treeitem / group' },
]

export function SpecSheet() {
  return (
    <section aria-label="组件规格一览" className="frame">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <Typography className="font-mono tracking-[0.18em] uppercase" color="muted" type="body-xs">
          okr-tree/
        </Typography>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          <Typography className="font-mono" color="muted" type="body-xs">
            零运行时依赖
          </Typography>
        </span>
      </div>

      <ul>
        {SPECS.map(spec => (
          <li key={spec.label} className="spec-row">
            <span className="w-24 shrink-0 font-mono text-xs text-accent">{spec.label}</span>
            <Typography className="min-w-0" color="muted" type="body-xs">
              {spec.value}
            </Typography>
          </li>
        ))}
      </ul>

      <div className="border-t border-border px-4 py-2.5">
        <Typography className="font-mono" color="muted" type="body-xs">
          {FACTS.layouts} 布局 · {FACTS.themes} 主题 · 1 条样式表 · MIT
        </Typography>
      </div>
    </section>
  )
}
