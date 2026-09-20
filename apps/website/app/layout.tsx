import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { RootProvider } from 'fumadocs-ui/provider/next'
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#252525' },
  ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <RootProvider
          i18n={{ locale: 'zh-CN', translations: UI_TRANSLATIONS }}
          // type: 'static' → fumadocs 用 staticClient 拉取 app/api/search 导出的静态索引，
          // 在浏览器里搜；索引内容见该 route 与 out/api/search。
          search={{ options: { type: 'static', api: '/api/search' } }}
          theme={{
            attribute: 'class',
            defaultTheme: 'system',
            enableSystem: true,
            disableTransitionOnChange: true,
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
