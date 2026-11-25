import { defineDocs, defineConfig } from 'fumadocs-mdx/config'

export const docs = defineDocs({
  dir: 'content',
  docs: {
    /**
     * 页脚「最后更新」与 sitemap 的 `<lastmod>`、文档页 JSON-LD 的 `dateModified`
     * 都读这一份（构建期从 git 取每个文件的最后提交时间）。
     * 新鲜度是 AI 引擎与搜索都看的信号，别关掉。
     */
    lastModified: true,
  },
})

export default defineConfig()
