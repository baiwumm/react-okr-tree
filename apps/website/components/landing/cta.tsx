'use client'

import { Button, Typography } from '@heroui/react'
import { useRouter } from 'next/navigation'

/**
 * 收尾段（对应参考站的 Cta）：一句问句 + 两个出口。
 * 装包命令只在「快速开始」的终端窗口里出现一次，这里不重复第二份（版本号同理）。
 */
export function Cta() {
  const router = useRouter()

  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <Typography className="eyebrow" type="body-xs" weight="semibold">
          04 / 继续
        </Typography>
        <Typography
          className="mt-4 max-w-3xl text-balance leading-snug tracking-tight"
          type="h2"
          weight="semibold"
        >
          想先看清它的边界，再决定要不要装？
        </Typography>
        <Typography className="mt-4 max-w-2xl leading-relaxed" color="muted" type="body-sm">
          24 个可交互 Demo 覆盖布局、主题、连接线、拖拽、懒加载与画布缩放；迁移说明逐条列出与
          vue3-okr-tree 的差异。
        </Typography>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" variant="primary" onPress={() => router.push('/docs/guide/demos/')}>
            看 Demo 总览
          </Button>
          <Button size="lg" variant="outline" onPress={() => router.push('/docs/migration/')}>
            对比 vue3-okr-tree
          </Button>
        </div>
      </div>
    </section>
  )
}
