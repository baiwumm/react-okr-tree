import { readFileSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { highlight } from 'fumadocs-core/highlight'
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock'
import type { ReactNode } from 'react'

/**
 * Demo 容器（requirements 6.3 第 1、2 点）：上半是活组件，下半是可折叠的源码。
 *
 * 这是个 **Server Component**，刻意不做成客户端组件：
 * - 源码用 `readFileSync` 在构建期读 demo 组件原文，所以「文档里的代码」与「跑着的代码」
 *   是同一份文件，不会各写一遍再漂移（源项目靠 prismjs + `?raw`，这里零额外依赖）；
 * - 高亮也走构建期 shiki（`fumadocs-core/highlight`），客户端因此不背 shiki——
 *   24 个 Demo 若每个都在浏览器里现拼高亮，首屏 JS 完全不是同一个量级；
 * - 折叠用原生 `<details>`，不需要 useState，也不影响浏览器 find 命中源码。
 *
 * 里面的**活示例**才是客户端组件（由各 demo 文件自己的 `'use client'` 负责），
 * 从服务端渲染下来就是 children，React 会正确插入客户端边界。
 *
 * 库样式由各 demo 自己 `import 'react-okr-tree/style.css'`：demo 是可选引用的内容单元，
 * 不该让整站为它背上样式。
 */
const DEMO_ROOT = 'components/demo'

/** 只允许读文档站内这一棵目录下的 .tsx，避免把 `file` 变成任意路径读取 */
function readDemoSource(file: string): string {
  const rel = normalize(file)
  if (rel.startsWith('..') || !rel.startsWith(join(DEMO_ROOT, '')) || !rel.endsWith('.tsx')) {
    throw new Error(`DemoBlock 的 file 必须是 ${DEMO_ROOT}/ 下的 .tsx，收到：${file}`)
  }
  return readFileSync(join(process.cwd(), rel), 'utf8')
}

export async function DemoBlock({
  title,
  description,
  file,
  lang = 'tsx',
  children,
}: {
  title?: string
  description?: string
  /** 相对文档站根目录的 demo 源文件路径，例如 components/demo/basic.tsx */
  file?: string
  lang?: string
  children: ReactNode
}) {
  const source = file ? readDemoSource(file) : undefined
  const highlighted = source
    ? await highlight(source, {
        lang,
        defaultColor: false,
        themes: { light: 'github-light', dark: 'github-dark' },
        components: {
          pre: ({ children: preChildren }) => (
            <CodeBlock className="my-0 rounded-none border-0">
              <Pre>{preChildren}</Pre>
            </CodeBlock>
          ),
        },
      })
    : undefined

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-fd-border">
      <div className="overflow-x-auto p-4">{children}</div>
      {title || description || file ? (
        <div className="border-t border-fd-border px-4 py-3">
          {title ? <p className="text-sm font-medium">{title}</p> : null}
          {description ? (
            <p
              className="mt-1 text-sm text-fd-muted-foreground [&_code]:text-[0.9em]"
              dangerouslySetInnerHTML={{ __html: description ?? '' }}
            />
          ) : null}
        </div>
      ) : null}
      {highlighted ? (
        <details className="group border-t border-fd-border">
          <summary className="cursor-pointer list-none px-4 py-2 text-xs text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground marker:hidden">
            查看源码
          </summary>
          <div className="not-prose text-[0.8rem]">{highlighted}</div>
        </details>
      ) : null}
    </div>
  )
}
