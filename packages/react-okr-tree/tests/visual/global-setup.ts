import { build } from 'vite'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Playwright globalSetup：把性能夹具打成一个自包含 IIFE。
 *
 * 放在这里而不是 CI 步骤里，是为了让 `pnpm test:visual` 单命令可跑——夹具忘了生成时
 * perf.spec.ts 只会报「读不到文件」，看不出与自己的操作有什么关系。
 * 产物比夹具源码（或库的 dist）新就跳过，本地反复跑视觉套件时不必每次重打。
 */
const out = resolve('test-results/perf-fixture/perf-fixture.js')
const sources = [
  resolve('tests/visual/fixtures/perf-entry.tsx'),
  resolve('dist/react-okr-tree.es.js'),
]

function newestMtime(paths: string[]) {
  return Math.max(...paths.map(p => (existsSync(p) ? statSync(p).mtimeMs : 0)))
}

export default async function globalSetup() {
  if (existsSync(out) && statSync(out).mtimeMs >= newestMtime(sources)) return
  await build({ configFile: resolve('tests/visual/fixtures/vite.perf.config.mjs') })
}
