'use client'

import { Button, Typography } from '@heroui/react'
import { useRouter } from 'next/navigation'

/** 404：与全站同一套 token（暗底 + hairline + 朱红），动词只有一个「返回首页」 */
export default function NotFound() {
  const router = useRouter()

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
      <Button className="mt-8" size="lg" variant="primary" onPress={() => router.push('/')}>
        返回首页
      </Button>
    </div>
  )
}
