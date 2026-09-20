'use client'

import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock'
import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'

/**
 * Demo 容器（requirements 6.3 第 1 点）：上半是活组件，下半是可折叠的源码。
 *
 * 必须是客户端组件——MDX 正文默认在服务端渲染，树组件的展开 / 拖拽 / 滚轮缩放都要挂 DOM
 * 事件与 ResizeObserver。源码由 RSC 侧 `readFileSync` 读 demo 组件原文后作为字符串传进来
 * （8.8），所以这里用 DynamicCodeBlock 在客户端高亮，而不是 MDX 里那种构建期已高亮的
 * `<CodeBlock>`。
 *
 * 库样式由各 demo 自己 `import 'react-okr-tree/style.css'`：demo 是可选引用的内容单元，
 * 不该让整站为它背上样式。
 */
export function DemoBlock({
  title,
  description,
  code,
  lang = 'tsx',
  children,
}: {
  title?: string
  description?: string
  code?: string
  lang?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-fd-border">
      <div className="overflow-x-auto p-4">{children}</div>
      <div className="flex items-start justify-between gap-4 border-t border-fd-border px-4 py-3">
        <div>
          {title ? <p className="text-sm font-medium">{title}</p> : null}
          {description ? (
            <p className="mt-1 text-sm text-fd-muted-foreground">{description}</p>
          ) : null}
        </div>
        {code ? (
          <button
            type="button"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-fd-border px-2.5 py-1 text-xs text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            {open ? '收起代码' : '查看代码'}
            <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        ) : null}
      </div>
      {code && open ? (
        <div className="border-t border-fd-border">
          <DynamicCodeBlock lang={lang} code={code} />
        </div>
      ) : null}
    </div>
  )
}
