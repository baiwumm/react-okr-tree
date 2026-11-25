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

/** FAQPage 结构化数据：文本取自 lib/faq.ts，喂给机器前剥掉行内代码的反引号标记 */
const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map(item => ({
    '@type': 'Question',
    name: item.title,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.content.replace(/`/g, ''),
    },
  })),
}

/**
 * 落地页（2026-11-20 暗黑终端改版）
 *
 * 编辑器式单页叙事，全部段落以 hairline 分隔：
 * 导航 → Hero（规格表 + 数据行 + 真实树）→ 快速开始 → 布局与外观 → 特性 → 继续 → FAQ → 页脚。
 */
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={FAQ_JSON_LD} />
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
