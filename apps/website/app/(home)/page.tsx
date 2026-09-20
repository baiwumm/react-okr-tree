import { Cta } from '@/components/landing/cta'
import { Faq } from '@/components/landing/faq'
import { Features } from '@/components/landing/features'
import { Footer } from '@/components/landing/footer'
import { Hero } from '@/components/landing/hero'
import { Navbar } from '@/components/landing/navbar'
import { Showcase } from '@/components/landing/showcase'

/**
 * 落地页（参考站的段次：Navbar / Hero / Features / 展示位 / Cta / Faq / Footer）
 *
 * 静态导出下整页首屏是 SSR 出来的 HTML——包括 Hero 与展示位里那些真实的 `<OkrTree>`，
 * 交互所需的客户端 JS 才增量 hydrate。
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <Features />
      <Showcase />
      <Cta />
      <Faq />
      <Footer />
    </main>
  )
}
