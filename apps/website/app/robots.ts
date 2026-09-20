import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

// output: 'export' 下元数据路由必须显式 force-static，否则 next build 直接报错
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: new URL('/sitemap.xml', SITE.url).toString(),
  }
}
