'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { Logo } from '@/components/logo'
import { TextScramble } from '@/components/text-scramble'
import { GithubIcon } from '@/components/ui/brand-icons'
import { SITE } from '@/lib/site'

const GROUPS = [
  {
    title: '文档',
    links: [
      { text: '快速开始', href: '/docs' },
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

/** 底行版权：左「© + 站名」、右「Built by + 乱码渐显署名」，体例与参考站页脚一致 */
function CopyrightBar() {
  const [isTrigger, setIsTrigger] = useState(false)

  useEffect(() => {
    const start = () => setIsTrigger(true)

    const initial = setTimeout(start, 300)
    const interval = setInterval(start, 3500)

    return () => {
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-dashed border-black/20 pt-6 text-xs text-muted-foreground sm:flex-row dark:border-white/10">
      <div>
        <span>
          © {new Date().getFullYear()}{' '}
          <Link
            href="/"
            className="text-foreground underline underline-offset-4 transition-colors hover:opacity-80"
          >
            {SITE.name}
          </Link>
          . All rights reserved.
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span>Built by</span>
        <a
          href={SITE.ownerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${SITE.owner} 的 GitHub`}
          className="flex items-center font-medium text-foreground underline underline-offset-4 transition-colors hover:opacity-80"
        >
          <TextScramble
            className="inline-block w-[7ch] whitespace-nowrap"
            speed={0.02}
            trigger={isTrigger}
            onScrambleComplete={() => setIsTrigger(false)}
          >
            {SITE.owner}
          </TextScramble>
        </a>
      </div>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="border-t px-6 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <Logo size={24} className="rounded-md" />
            <span className="font-semibold">{SITE.name}</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            垂直、水平与 OKR 双树三种布局的组织架构图
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub 仓库"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <GithubIcon className="size-[18px]" />
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

      <CopyrightBar />
    </footer>
  )
}
