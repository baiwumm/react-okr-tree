import { fileURLToPath } from 'node:url'
import { createMDX } from 'fumadocs-mdx/next'

/**
 * 静态导出（requirements 6.5）：源 okr-tree 站的 Cloudflare 链路是纯静态资产，没有服务端运行时，
 * 所以这里必须 `output: 'export'`。代价是 fumadocs 原生的 `/api/search` Route Handler 与
 * `opengraph-image.tsx` 动态生成都不再可用——搜索改静态 Orama 索引（见 lib/search.ts），
 * og 改 `public/og.png` 预生成，图片优化没有服务端故 `unoptimized`。
 */
/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  turbopack: {
    // 文档站要 import 仓库根的 shared/api.ts（API 表单一来源），root 必须覆盖到仓库根。
    root: fileURLToPath(new URL('../..', import.meta.url)),
  },
}

export default createMDX()(config)
