import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'
import { source } from '@/lib/source'

// output: 'export' 下元数据路由必须显式 force-static，否则 next build 直接报错
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, SITE.url).toString()

  return [
    { url: url('/'), changeFrequency: 'weekly', priority: 1 },
    ...source.getPages().map(page => ({
      url: url(page.url),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
