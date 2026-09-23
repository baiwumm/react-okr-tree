import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { Logo } from '@/components/logo'
import { GithubIcon, VueIcon } from '@/components/ui/brand-icons'
import { source } from '@/lib/source'
import { SITE } from '@/lib/site'

/**
 * 文档区布局
 *
 * 侧边栏顶部：nav.title 提供项目 Logo + 站名（不传 nav 时只剩一个折叠按钮）。
 * 侧边栏底部：links 里的 icon 型链接会被渲染进底部操作条（与主题切换同排）。
 *             这里刻意不再挂 sidebar.footer——底部只留操作，不放内容卡片。
 *             第二个图标指向姊妹包 vue3-okr-tree 的文档站（两边锁步发布，同号即同一功能面）。
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: (
          <>
            <Logo size={24} className="rounded-md" />
            <span className="font-semibold">{SITE.name}</span>
          </>
        ),
        url: '/',
      }}
      links={[
        {
          type: 'icon',
          url: SITE.github,
          icon: <GithubIcon className="size-4" />,
          text: 'GitHub',
          label: 'GitHub 仓库',
          external: true,
        },
        {
          type: 'icon',
          url: 'https://vue3-okr-tree.baiwumm.com',
          icon: <VueIcon className="size-4" />,
          text: 'vue3-okr-tree 文档',
          label: '姊妹包 vue3-okr-tree（Vue 3 版）的文档站',
          external: true,
        },
      ]}
    >
      {children}
    </DocsLayout>
  )
}
