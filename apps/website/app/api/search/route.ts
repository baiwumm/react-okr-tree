import { createFromSource } from 'fumadocs-core/search/server'
import { source } from '@/lib/source'

/**
 * 站内搜索索引（requirements 6.5 / 计划 7.5）
 *
 * 静态导出没有服务端运行时，但 fumadocs 的 `staticGET` 是「把索引当静态文件导出」的入口：
 * 配合 `force-static`，`next build` 会把结果原样写到 `out/api/search`，
 * 前端用 `staticClient({ from: '/api/search' })` 取回后在浏览器里搜（见 app/layout.tsx）。
 * 所以这里既不是 Route Handler 的真服务端搜索，也不需要额外引 Pagefind。
 */
export const dynamic = 'force-static'

export const { staticGET: GET } = createFromSource(source)
