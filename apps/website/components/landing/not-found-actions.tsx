'use client'

import { Button } from '@heroui/react'
import { useRouter } from 'next/navigation'

/** 404 的交互部分单独拆成客户端组件：页面本身要留在服务端才能导出 metadata（noindex） */
export function NotFoundActions() {
  const router = useRouter()

  return (
    <Button className="mt-8" size="lg" variant="primary" onPress={() => router.push('/')}>
      返回首页
    </Button>
  )
}
