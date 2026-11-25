import type { Metadata } from 'next'
import { Typography } from '@heroui/react'

import { NotFoundActions } from '@/components/landing/not-found-actions'

/**
 * 404
 *
 * 这里之前是客户端组件，于是整个 404 继承了根布局的 title/description（变成"首页"的），
 * 三份导出的 404（`/404.html`、`/404/`、`/_not-found/`）在搜索结果里会像首页的副本。
 * 现在拆成「服务端页面 + 客户端按钮」：页面能导出自己的 metadata，并显式 noindex。
 */
export const metadata: Metadata = {
  title: '页面不存在',
  description: '请求的页面不存在或已被移动，请返回首页或从文档目录继续。',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="rounded-full border border-dashed border-border px-4 py-1 font-mono text-xs text-accent">
        404
      </span>
      <Typography className="mt-6 tracking-tight" type="h1" weight="semibold">
        页面不存在
      </Typography>
      <Typography className="mt-3" color="muted" type="body-sm">
        你访问的页面可能已被移动或删除。
      </Typography>
      <NotFoundActions />
    </div>
  )
}
