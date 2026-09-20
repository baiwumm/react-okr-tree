'use client'

import { Github, Menu } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { LIB_VERSION } from '@/lib/version'
import { SITE } from '@/lib/site'

/**
 * 顶部导航（参考站的 `.navbar-premium` 悬浮玻璃条）
 *
 * 与参考站的差别只有两处：这里放版本胶囊（`LIB_VERSION` 从库的 package.json 读，
 * 不在站上出现第二个版本号副本），GitHub 走图标而不是文字。
 */
export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav className="navbar-premium w-full max-w-3xl rounded-2xl px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Logo size={24} className="rounded-md" />
            <span className="truncate">{SITE.name}</span>
          </Link>

          {/* 版本号是库真源的一部分，窄屏优先让它活着，链接文字后撤 */}
          <span className="pill-badge hidden shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
            v{LIB_VERSION}
          </span>

          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/docs"
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              文档
            </Link>
            <Link
              href="/docs/start"
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              快速开始
            </Link>
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              aria-label="react-okr-tree on GitHub"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <Github size={16} />
            </a>
            <ThemeToggle />
            <Link href="/docs/start" className="btn-solid ms-1 px-4 py-1.5 text-xs font-bold">
              开始使用
            </Link>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              aria-label="react-okr-tree on GitHub"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <Github size={16} />
            </a>
            <ThemeToggle />
            <button
              type="button"
              aria-label="展开导航"
              onClick={() => setOpen(!open)}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <Menu size={16} />
            </button>
          </div>
        </div>

        {open ? (
          <div className="mt-2 flex flex-col gap-1 border-t border-dashed pt-2 md:hidden">
            <Link
              href="/docs"
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              文档
            </Link>
            <Link
              href="/docs/start"
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              快速开始
            </Link>
          </div>
        ) : null}
      </nav>
    </header>
  )
}
