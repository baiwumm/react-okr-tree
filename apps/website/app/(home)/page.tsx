import type { Metadata } from 'next'

import { Cta } from '@/components/landing/cta'
import { Faq } from '@/components/landing/faq'
import { Features } from '@/components/landing/features'
import { Footer } from '@/components/landing/footer'
import { Hero } from '@/components/landing/hero'
import { Navbar } from '@/components/landing/navbar'
import { QuickStart } from '@/components/landing/quick-start'
import { Showcase } from '@/components/landing/showcase'
import { JsonLd } from '@/components/seo/json-ld'
import { FAQ_ITEMS } from '@/lib/faq'
import { homeGraph } from '@/lib/schema'

/**
 * 首页 canonical 必须写在这一页，不能写在根布局：根 layout 的 alternates 会被 404 继承，
 * 结果是三个 404 产物也声称自己是首页（noindex 但仍然是错的信号）。
 */
export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

/**
 * 首页结构化数据：Organization + WebSite + SoftwareSourceCode + FAQPage 一张 @graph
 * （选型与「不承诺富结果」的理由见 lib/schema.ts；FAQ 文本与可见内容同源 lib/faq.ts）
 */
const HOME_JSON_LD = homeGraph(FAQ_ITEMS)

/**
 * 落地页（2026-11-20 暗黑终端改版）
 *
 * 编辑器式单页叙事，全部段落以 hairline 分隔：
 * 导航 → Hero（规格表 + 数据行 + 真实树）→ 快速开始 → 布局与外观 → 特性 → 继续 → FAQ → 页脚。
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={HOME_JSON_LD} />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <QuickStart />
        <Showcase />
        <Features />
        <Cta />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
