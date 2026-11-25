import { LIB_VERSION } from './version'
import { SITE } from './site'

/**
 * JSON-LD 的唯一来源（首页与文档页都从这里取，页面组件只负责渲染）
 *
 * 选型依据（schema skill）：Google 在 2023-09 停用 HowTo 富结果、2024-11 停用站内搜索框、
 * 2026-05 停用 FAQ 富结果，所以这里**不承诺任何富结果**——它服务的是实体理解与 AI 抽取：
 * - Organization / WebSite：品牌与站点实体，`sameAs` 把 GitHub / npm 串起来；
 * - SoftwareSourceCode：这个库是什么、代码在哪、什么许可（对"这个包能干什么"的机器理解最有用）；
 * - TechArticle + BreadcrumbList：文档页的页面级语义与层级；
 * - FAQPage：保留（内容真实可见），但不指望 Google 富结果。
 *
 * 所有字段都对应页面上真实存在的信息，不 invent 作者、评分、下载量。
 */

const ORG_ID = `${SITE.url}/#organization`
const WEBSITE_ID = `${SITE.url}/#website`
const SOFTWARE_ID = `${SITE.url}/#software`

const organization = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: SITE.name,
  url: SITE.url,
  logo: {
    '@type': 'ImageObject',
    url: new URL('/logo.svg', SITE.url).toString(),
  },
  sameAs: [
    SITE.github,
    SITE.npm,
    'https://github.com/baiwumm',
    'https://vue3-okr-tree.baiwumm.com',
  ],
}

const website = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  inLanguage: 'zh-CN',
  publisher: { '@id': ORG_ID },
}

const software = {
  '@type': 'SoftwareSourceCode',
  '@id': SOFTWARE_ID,
  name: SITE.name,
  description: SITE.description,
  url: SITE.url,
  codeRepository: SITE.github,
  programmingLanguage: 'TypeScript',
  runtimePlatform: 'React 18.2+',
  license: 'https://opensource.org/licenses/MIT',
  softwareVersion: LIB_VERSION,
  keywords: ['React', 'OKR', 'org chart', 'tree', '组织架构图', '树形组件'],
  author: { '@id': ORG_ID },
  isPartOf: { '@id': WEBSITE_ID },
}

/** 首页：品牌 + 站点 + 软件本体 + FAQ（FAQ 文本来自 lib/faq.ts，与可见内容同源） */
export function homeGraph(faqItems: readonly { title: string; content: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      website,
      software,
      {
        '@type': 'FAQPage',
        '@id': `${SITE.url}/#faq`,
        inLanguage: 'zh-CN',
        isPartOf: { '@id': WEBSITE_ID },
        mainEntity: faqItems.map(item => ({
          '@type': 'Question',
          name: item.title,
          acceptedAnswer: { '@type': 'Answer', text: item.content.replace(/`/g, '') },
        })),
      },
    ],
  }
}

export type BreadcrumbItem = { name: string; url?: string }

/**
 * 文档页：TechArticle + BreadcrumbList
 *
 * `breadcrumbs` 与页面上可见的面包屑是同一份数组（components/docs/breadcrumb.tsx 渲染它），
 * 这样标记与可见内容不会各写一遍再漂移。
 */
export function docGraph({
  url,
  title,
  description,
  lastModified,
  breadcrumbs,
}: {
  url: string
  title: string
  description?: string
  lastModified?: Date
  breadcrumbs: BreadcrumbItem[]
}) {
  const pageUrl = new URL(url, SITE.url).toString()

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        '@id': `${pageUrl}#article`,
        headline: title,
        ...(description ? { description } : {}),
        url: pageUrl,
        mainEntityOfPage: pageUrl,
        inLanguage: 'zh-CN',
        ...(lastModified ? { dateModified: lastModified.toISOString() } : {}),
        author: { '@id': ORG_ID },
        publisher: { '@id': ORG_ID },
        isPartOf: { '@id': WEBSITE_ID },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          ...(item.url ? { item: new URL(item.url, SITE.url).toString() } : {}),
        })),
      },
    ],
  }
}
