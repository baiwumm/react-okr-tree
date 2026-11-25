import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'
import { source } from '@/lib/source'

// output: 'export' 下元数据路由必须显式 force-static，否则 next build 直接报错
export const dynamic = 'force-static'

/**
 * 站点地图
 *
 * 两条口径必须与产物一致（`verify:export` 会真的断言，别只靠注释）：
 * 1. **URL 带尾斜杠**：next.config 开了 `trailingSlash: true`，导出产物是
 *    `docs/api/index.html`，内链也是 `/docs/api/`。`source.getPages()` 给的 `page.url`
 *    不带斜杠，直接用会提交一批「非规范变体」。
 * 2. **有 `<lastmod>`**：`source.config.ts` 开了 `lastModified`，构建期从 git 取时间；
 *    搜索与 AI 引擎都看新鲜度。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const withSlash = (path: string) => (path.endsWith('/') ? path : `${path}/`)
  const url = (path: string) => new URL(withSlash(path), SITE.url).toString()

  return [
    { url: url('/'), changeFrequency: 'weekly', priority: 1, lastModified: new Date() },
    ...source.getPages().map(page => ({
      url: url(page.url),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      ...(page.data.lastModified ? { lastModified: page.data.lastModified } : {}),
    })),
  ]
}
