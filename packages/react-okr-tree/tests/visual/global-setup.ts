import { build } from 'vite'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Playwright globalSetup：把两个浏览器夹具各打成一个自包含 IIFE。
 *
 * 放在这里而不是 CI 步骤里，是为了让 `pnpm test:visual` 单命令可跑——夹具忘了生成时
 * 对应用例只会报「读不到文件」，看不出与自己的操作有什么关系。
 * 产物比夹具源码（或库的 dist）新就跳过，本地反复跑视觉套件时不必每次重打。
 */
const jobs = [
  {
    out: resolve('test-results/perf-fixture/perf-fixture.js'),
    config: resolve('tests/visual/fixtures/vite.perf.config.mjs'),
    sources: [
      resolve('tests/visual/fixtures/perf-entry.tsx'),
      resolve('dist/react-okr-tree.es.js'),
    ],
  },
  {
    out: resolve('test-results/group-align-fixture/group-align-fixture.js'),
    config: resolve('tests/visual/fixtures/vite.group-align.config.mjs'),
    sources: [
      resolve('tests/visual/fixtures/group-align-entry.tsx'),
      resolve('tests/visual/fixtures/vite.group-align.config.mjs'),
      // 组对齐的测量逻辑改了行为（is-measuring 直接写 DOM），夹具必须跟着 dist 走
      resolve('src/OkrTreeGroup.tsx'),
      resolve('dist/react-okr-tree.es.js'),
    ],
  },
]

function newestMtime(paths: string[]) {
  return Math.max(...paths.map(p => (existsSync(p) ? statSync(p).mtimeMs : 0)))
}

export default async function globalSetup() {
  for (const job of jobs) {
    if (existsSync(job.out) && statSync(job.out).mtimeMs >= newestMtime(job.sources)) continue
    await build({ configFile: job.config })
  }
}
