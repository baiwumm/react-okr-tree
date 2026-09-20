import { Github, Package } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { LIB_VERSION } from '@/lib/version'
import { SITE } from '@/lib/site'

const GROUPS = [
  {
    title: '文档',
    links: [
      { text: '快速开始', href: '/docs/start' },
      { text: 'Demo 总览', href: '/docs/guide' },
      { text: '主题与变量', href: '/docs/theme' },
      { text: 'API', href: '/docs/api' },
    ],
  },
  {
    title: '迁移',
    links: [
      { text: '与 vue3-okr-tree 的差异', href: '/docs/migration' },
      { text: '需要注意的行为', href: '/docs/guide/data' },
      { text: '更新日志', href: '/docs/changelog' },
    ],
  },
] as const

export function Footer() {
  return (
    <footer className="border-t px-6 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <Logo size={24} className="rounded-md" />
            <span className="font-semibold">{SITE.name}</span>
            <span className="pill-badge rounded-full px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              v{LIB_VERSION}
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {SITE.description}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub 仓库"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github size={18} />
            </a>
            <a
              href={SITE.npm}
              target="_blank"
              rel="noreferrer"
              aria-label="npm 包页面"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Package size={18} />
            </a>
          </div>
        </div>

        {GROUPS.map(group => (
          <div key={group.title}>
            <p className="text-sm font-semibold">{group.title}</p>
            <ul className="mt-4 space-y-2.5">
              {group.links.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground">
        <p>MIT Licensed · © {new Date().getFullYear()} baiwumm</p>
        <p className="font-mono">
          本站为 Next.js 静态导出，部署在 Cloudflare Pages；站内搜索跑在浏览器里。
        </p>
      </div>
    </footer>
  )
}
