'use client'

import { Button, Chip, Tooltip, Typography } from '@heroui/react'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { GithubIcon } from '@/components/ui/brand-icons'
import { SITE } from '@/lib/site'
import { LIB_VERSION } from '@/lib/version'

/** 顶栏图标按钮共用的箭头提示（与参考站同款交互） */
function NavTooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Tooltip delay={0}>
      {children}
      <Tooltip.Content showArrow placement="bottom">
        <Tooltip.Arrow />
        <Typography type="body-xs">{label}</Typography>
      </Tooltip.Content>
    </Tooltip>
  )
}

/**
 * 顶部导航（对应参考站）：贴顶 hairline 条 + HeroUI 图标按钮。
 *
 * 左：Logo + 站名 + 版本徽章（`LIB_VERSION` 直接读库的 package.json，站上不出现第二份版本号）；
 * 右：文档 / GitHub 两个图标入口 + 主题切换。文档入口在 Hero 里也有一份，
 * 但读者滚到页面中段时仍要能一眼看到它。
 */
export function Navbar() {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-6">
        <Link className="flex min-w-0 items-center gap-2.5" href="/">
          <Logo className="shrink-0 rounded-lg" size={28} />
          <Typography className="truncate leading-tight" type="h6" weight="semibold">
            {SITE.name}
          </Typography>
          <Chip className="hidden font-mono sm:inline-flex" size="sm" variant="soft">
            v{LIB_VERSION}
          </Chip>
        </Link>

        <nav aria-label="主导航" className="ml-auto flex items-center gap-2">
          <NavTooltip label="文档">
            <Button
              isIconOnly
              aria-label="文档"
              size="sm"
              variant="outline"
              onPress={() => router.push('/docs/')}
            >
              <BookOpen className="size-4" />
            </Button>
          </NavTooltip>
          <NavTooltip label="GitHub">
            <Button
              isIconOnly
              aria-label="GitHub"
              size="sm"
              variant="outline"
              onPress={() => window.open(SITE.github, '_blank', 'noopener,noreferrer')}
            >
              <GithubIcon className="size-4" />
            </Button>
          </NavTooltip>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
