import { expect, test } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 浏览器真实性能门禁（计划 9.3）：2041 节点首渲染 < 300 ms（开发机），CI 放宽到 1500 ms。
 *
 * 夹具由 global-setup.ts 用 Vite 打成自包含 IIFE（React 19 取消了 UMD，没有可以直接
 * `<script>` 用的浏览器版），这里注入 about:blank 后读取 `window.__perf`。
 * 结果写进 test-results/perf-browser.json，docs/perf.md 引用它。
 */
const fixturePath = resolve('test-results/perf-fixture/perf-fixture.js')

type Perf = { rounds: number[]; best: number; nodes: number }

test('2041 节点 Chromium 首渲染 < 300ms（CI 1500ms）', async ({ page }) => {
  const source = readFileSync(fixturePath, 'utf8')
  await page.goto('about:blank')
  await page.addScriptTag({ content: source })
  await page.waitForFunction('window.__perf', null, { timeout: 60_000 })
  const perf = (await page.evaluate('window.__perf')) as Perf

  /**
   * 先证明这五轮真的渲染了 2041 个节点。
   * jsdom 那份基线差点交出一个 0.01 ms 的漂亮数字（测量本身跑空了），
   * 所以浏览器版从第一天就带上这条断言。
   */
  expect(perf.nodes, '夹具没有渲染出预期的节点数').toBeGreaterThan(2000)

  const limit = process.env.CI ? 1500 : 300
  expect(
    perf.best,
    `2041 节点首渲染 ${perf.best.toFixed(1)}ms 应低于 ${limit}ms（5 轮：${perf.rounds
      .map(r => r.toFixed(0))
      .join(' / ')}）`
  ).toBeLessThan(limit)

  mkdirSync('test-results', { recursive: true })
  writeFileSync(
    'test-results/perf-browser.json',
    JSON.stringify(
      {
        date: new Date().toISOString().slice(0, 10),
        scenario: '2041 节点首渲染（挂载，默认折叠）',
        rounds: perf.rounds.map(r => Number(r.toFixed(1))),
        bestMs: Number(perf.best.toFixed(1)),
        renderedNodes: perf.nodes,
        limitMs: limit,
        browser: 'chromium',
      },
      null,
      2
    )
  )
  console.log(
    `[perf] 2041 节点 Chromium 首渲染（5 轮取最优）: ${perf.best.toFixed(1)} ms / ${perf.nodes} 个节点`
  )
})
