import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import type { BreadcrumbItem } from '@/lib/schema'

/**
 * 文档页面包屑
 *
 * 视觉上是 fumadocs 标题上方的一行小字；语义上同时是 `<nav aria-label="面包屑">`，
 * 站点地图与结构化数据用的都是调用方传进来的同一份 `items`（见 lib/schema.ts 的
 * `docGraph`）——可见内容与标记不会各写一遍再漂移。
 */
export function DocsBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="面包屑" className="mb-2 flex items-center gap-1.5 text-sm text-muted">
      {items.map((item, index) => (
        <span key={`${item.name}-${index}`} className="flex min-w-0 items-center gap-1.5">
          {index > 0 ? <ChevronRight aria-hidden className="size-3.5 shrink-0" /> : null}
          {item.url ? (
            <Link className="truncate transition-opacity hover:opacity-80" href={item.url}>
              {item.name}
            </Link>
          ) : (
            <span
              aria-current={index === items.length - 1 ? 'page' : undefined}
              className="truncate text-foreground"
            >
              {item.name}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
