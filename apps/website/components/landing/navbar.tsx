'use client'

import Link from 'next/link'
import { Tag } from 'lucide-react'
import { Logo } from '@/components/logo'
import { AnimatedBadge } from '@/components/motion/animated-badge'
import { GithubIcon } from '@/components/ui/brand-icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { LIB_VERSION } from '@/lib/version'
import { SITE } from '@/lib/site'

/**
 * 顶部导航（参考站的 `.navbar-premium` 悬浮玻璃条）
 *
 * 只留三个非文档入口：版本徽章（beUI 的 success AnimatedBadge，`LIB_VERSION` 从库的
 * package.json 读，不在站上出现第二个版本号副本）、GitHub 图标与主题切换。
 * 文档入口收进首屏按钮与页脚，导航条不再重复。
 */
export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav className="navbar-premium w-full max-w-3xl rounded-full px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Logo size={24} className="rounded-md" />
            <span className="truncate">{SITE.name}</span>
          </Link>

          <div className="flex items-center gap-1.5">
            {/* 版本号是库真源的一部分，窄屏优先让它活着 */}
            <span className="hidden shrink-0 sm:inline">
              <AnimatedBadge status="success" size="sm" icon={<Tag className="h-3 w-3" />}>
                v{LIB_VERSION}
              </AnimatedBadge>
            </span>
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              aria-label="react-okr-tree on GitHub"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <GithubIcon className="size-4" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  )
}
