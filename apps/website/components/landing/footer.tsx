import { Typography } from '@heroui/react'
import Link from 'next/link'

import { Logo } from '@/components/logo'
import { GithubIcon } from '@/components/ui/brand-icons'
import { SITE } from '@/lib/site'

/**
 * 页脚（对应参考站的三列 + 底栏）
 *
 * 只放「站内导航 + 站外出口」，不再挂版权乱码动画之类的装饰：
 * 终端风格的收尾是 hairline，不是动效。版本号不在这里出现第二次（真源是 navbar）。
 */
const DOC_LINKS = [
  { label: '概览', href: '/docs' },
  { label: '快速开始', href: '/docs/start' },
  { label: 'Demo 总览', href: '/docs/guide/demos' },
  { label: '主题与变量', href: '/docs/theme' },
  { label: 'API', href: '/docs/api' },
]

const MORE_LINKS = [
  { label: '与 vue3-okr-tree 的差异', href: '/docs/migration' },
  { label: '更新日志', href: '/docs/changelog' },
  { label: 'npm 包页面', href: SITE.npm, external: true },
  { label: 'vue3-okr-tree 文档', href: 'https://vue3-okr-tree.baiwumm.com', external: true },
]

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <Logo size={28} className="rounded-lg" />
              <Typography type="body" weight="semibold">
                {SITE.name}
              </Typography>
            </div>
            <Typography className="max-w-sm leading-relaxed" color="muted" type="body-xs">
              垂直、水平与 OKR 双树三种布局的组织架构图 React 组件。与 vue3-okr-tree
              同一份数据模型与样式表，版本号自 1.13.0 起锁步。
            </Typography>
            <a
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
              href={SITE.github}
              rel="noopener noreferrer"
              target="_blank"
            >
              <GithubIcon className="size-3.5" />
              baiwumm/react-okr-tree
            </a>
          </div>

          <nav aria-label="文档" className="flex flex-col gap-3">
            <Typography className="eyebrow" type="body-xs" weight="semibold">
              文档
            </Typography>
            {DOC_LINKS.map(link => (
              <Link
                key={link.href}
                className="w-fit text-xs text-muted transition-colors hover:text-foreground"
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="更多" className="flex flex-col gap-3">
            <Typography className="eyebrow" type="body-xs" weight="semibold">
              更多
            </Typography>
            {MORE_LINKS.map(link => (
              <Link
                key={link.href}
                className="w-fit text-xs text-muted transition-colors hover:text-foreground"
                href={link.href}
                {...('external' in link && link.external
                  ? { rel: 'noopener noreferrer', target: '_blank' }
                  : {})}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <Typography className="font-mono" color="muted" type="body-xs">
            © {new Date().getFullYear()} {SITE.name}. MIT License.
          </Typography>
          <Typography color="muted" type="body-xs">
            Built by{' '}
            <a
              className="text-foreground underline underline-offset-4"
              href={SITE.ownerUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {SITE.owner}
            </a>
          </Typography>
        </div>
      </div>
    </footer>
  )
}
