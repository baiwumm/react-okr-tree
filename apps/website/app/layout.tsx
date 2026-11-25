import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { ScrollTop } from '@/components/motion/scroll-top'
import { UI_TRANSLATIONS } from '@/lib/i18n'
import { SITE } from '@/lib/site'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
  },
  keywords: [
    'react-okr-tree',
    'OKR',
    '组织架构图',
    '树形组件',
    'React',
    'org chart',
    'tree',
    '脑图',
    '组件库',
    '文档',
  ],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE.url,
    siteName: SITE.name,
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  // 双主题保留，但默认渲染暗色（暗黑终端底 + 朱红），亮色仍可手动切换
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfb' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0b' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // className="dark" 写进 SSR 产物：首帧即暗色，避免主题脚本接管前闪白。
    // next-themes 仍是唯一主题真源，用户点切换后改成 light 并写入 localStorage。
    <html suppressHydrationWarning className="dark" lang="zh-CN">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <RootProvider
          i18n={{ locale: 'zh-CN', translations: UI_TRANSLATIONS }}
          // type: 'static' → fumadocs 用 staticClient 拉取 app/api/search 导出的静态索引，
          // 在浏览器里搜；索引内容见该 route 与 out/api/search。
          search={{ options: { type: 'static', api: '/api/search' } }}
          theme={{
            attribute: 'class',
            defaultTheme: 'dark',
            // 关掉 system：默认暗色是站点的视觉主张，不该被系统偏好改写
            enableSystem: false,
            disableTransitionOnChange: true,
          }}
        >
          {children}
          {/* 全站浮钮：滚动超过阈值后浮出，点击平滑回顶（首页与文档页都有） */}
          <ScrollTop />
        </RootProvider>
      </body>
    </html>
  )
}
