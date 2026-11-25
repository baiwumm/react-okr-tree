import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { ScrollTop } from '@/components/motion/scroll-top'
import { UI_TRANSLATIONS } from '@/lib/i18n'
import { SITE } from '@/lib/site'
import './globals.css'

/** OG 卡片是真图（public/og.png，1200×630），尺寸写进 meta 让抓取端首帧就知道比例 */
const OG_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: 'react-okr-tree — React 组织架构图 / OKR 树组件',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  // 搜索控制台验证（GSC / Bing）：值由站长从控制台取得，改站点时别丢
  verification: {
    google: '4YBtBTmg5H9MGoyvCmvEeJx8viyBPjLnK4INCHT9SQs',
    other: {
      'msvalidate.01': '6DEA985B20CA4A215DAC4EA659011A8A',
    },
  },
  icons: {
    // svg 是主图标（矢量、任意尺寸清晰）；/favicon.ico 是老浏览器与部分爬虫的默认请求，
    // 少了它线上会持续 404（SEO 审计里的一条 P3）。两者都留着，浏览器按 type/sizes 自选。
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico' }],
    apple: '/apple-touch-icon.png',
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
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG_IMAGE],
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
        {/*
          字体预加载（React 19 会把这条 link 提升到 <head>）。
          全站正文就是 Maple Mono CN（1.7MB 子集），它是首访最大的单个资源；
          不预加载的话要等 HTML 解析到 <link rel=stylesheet> 才被发现，晚一个 RTT。
          crossOrigin 必须写：字体请求即使同源也走 CORS 模式，缺了它会被下载两次。

          React 19 会把这条 link 提升到 <head>，**但不会删掉原件**——最终 HTML 里会出现两条
          同 URL 的 preload（实测删掉这条就等于没有预加载）。浏览器按 URL 去重、只发一次请求，
          不要为了“去重”而把它删掉。
        */}
        <link
          as="font"
          crossOrigin="anonymous"
          href="/fonts/maple-mono-cn-regular.woff2"
          rel="preload"
          type="font/woff2"
        />
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
