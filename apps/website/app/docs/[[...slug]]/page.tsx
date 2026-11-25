import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import { notFound } from 'next/navigation'

import { DocsBreadcrumb } from '@/components/docs/breadcrumb'
import { JsonLd } from '@/components/seo/json-ld'
import { docGraph, type BreadcrumbItem } from '@/lib/schema'
import { getMDXComponents } from '@/mdx-components'
import { source } from '@/lib/source'
import { SITE } from '@/lib/site'

/** next.config 开了 trailingSlash，canonical 必须与线上实际地址同形（带尾斜杠） */
function canonicalOf(url: string) {
  const path = url.endsWith('/') ? url : `${url}/`
  return new URL(path, SITE.url).toString()
}

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) notFound()

  const MDX = page.data.body
  const url = canonicalOf(page.url)
  const updated = page.data.lastModified

  /** 面包屑：可见的一行小字与 BreadcrumbList 共用这一份（首页 / 文档 / 当前页） */
  const breadcrumbs: BreadcrumbItem[] =
    page.url === '/docs'
      ? [{ name: '首页', url: '/' }, { name: '文档' }]
      : [{ name: '首页', url: '/' }, { name: '文档', url: '/docs/' }, { name: page.data.title }]

  const updatedLabel = updated
    ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(updated)
    : null

  return (
    <DocsPage toc={page.data.toc}>
      <JsonLd
        data={docGraph({
          url,
          title: page.data.title,
          description: page.data.description,
          lastModified: updated,
          breadcrumbs,
        })}
      />
      <DocsBreadcrumb items={breadcrumbs} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {/* 新鲜度信号：搜索与 AI 引擎都看「最后更新」，同时也是 AI 判断内容时效的依据 */}
      {updatedLabel ? <p className="text-sm text-muted">最后更新：{updatedLabel}</p> : null}
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) return {}

  const url = canonicalOf(page.url)
  const updated = page.data.lastModified
  const socialTitle = `${page.data.title} — ${SITE.name}`

  return {
    title: page.data.title,
    description: page.data.description,
    // 逐页自指 canonical（尾斜杠形态），与 sitemap、og:url 三处必须同形
    alternates: { canonical: url },
    openGraph: {
      // 文档页是文章不是站点首页：类型/地址/更新时间都逐页给，否则分享卡片会指回首页
      type: 'article',
      url,
      title: socialTitle,
      description: page.data.description,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: socialTitle }],
      ...(updated ? { modifiedTime: updated.toISOString() } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description: page.data.description,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: socialTitle }],
    },
  }
}
