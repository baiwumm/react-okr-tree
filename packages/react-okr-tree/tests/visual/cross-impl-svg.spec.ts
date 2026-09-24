import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * `connector="svg"` 的 d 值跨实现比对（G15 明确没覆盖的那一半几何面）。
 *
 * 已有的 cross-impl.spec.ts 比的是 SSR 出来的 DOM 结构 / 内联样式；SVG 连线的 path `d`
 * 是挂载后量完布局算的，SSR 与 jsdom 都拿不到（jsdom 无布局，rect 恒为 0），所以这里必须
 * 用真实浏览器：react 侧由 fixtures/cross-impl-svg-entry.tsx 打成自包含 IIFE 现渲现读，
 * vue3 侧取 fixtures/cross-impl-vue3.json 里同法捕获的 d 列表。
 *
 * 两个前提，缺一个这条门禁就是自证式的假绿：
 * 1. **环境必须与捕获时一致**（视口 / dpr）——下面的自检会把漂移变成明确失败而不是像素巧合；
 * 2. **几何不能吃字体度量**：夹具里 svg 模式一律显式给 labelWidth / labelHeight，
 *    盒子尺寸固定后 d 只由 style.css 的 gap / 线宽常量决定，Windows 与 Linux CI 才可比。
 *
 * 比对用「逐个数字容差」而不是字符串全等：两侧同版本 Chromium 下理论上一字不差，但浮点
 * 序列化（`0.30000000000000004`）与 1e-6 级别的布局抖动不该让门禁红；容差 0.01px。
 */
type Fixture = {
  source: {
    package: string
    viewport: { width: number; height: number }
    deviceScaleFactor: number
  }
  modes: Array<{ name: string; props: Record<string, unknown>; paths: string[] }>
}

const fixturePath = resolve('tests/visual/fixtures/cross-impl-vue3.json')
const harnessPath = resolve('test-results/cross-impl-svg-fixture/cross-impl-svg-fixture.js')
const cssPath = resolve('dist/style.css')

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as Fixture
const svgModes = fixture.modes.filter(m => m.props.connector === 'svg' && m.paths.length)

interface HarnessApi {
  mount: (el: HTMLElement, props: Record<string, unknown>) => void
  readPaths: () => (string | null)[]
  env: () => { innerWidth: number; innerHeight: number; dpr: number }
  settle: () => Promise<void>
}

type HarnessWindow = Window & { __svgFixture: HarnessApi }

const EPS = 0.01

/** 把 "M 220 60 C 220 80, 115 80, 115 100" 拆成指令字母 + 数字序列 */
const parsePath = (d: string): { cmds: string[]; nums: number[] } => ({
  cmds: d.match(/[A-Za-z]/g) ?? [],
  nums: (d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number),
})

test.describe('connector="svg" 的 d 值跨实现比对（vue3 夹具 ↔ react 真浏览器）', () => {
  test('夹具里有 svg 模式（否则这条门禁是空跑）', () => {
    expect(svgModes.length, '一个 svg 模式都没有').toBeGreaterThanOrEqual(3)
  })

  for (const mode of svgModes) {
    test(mode.name, async ({ page }) => {
      await page.goto('about:blank')
      await page.setContent(
        '<!doctype html><html><head><meta charset="utf-8"></head>' +
          '<body><div id="host"></div></body></html>'
      )
      await page.addStyleTag({ content: readFileSync(cssPath, 'utf8') })
      await page.addScriptTag({ content: readFileSync(harnessPath, 'utf8') })
      const env = await page.evaluate(() => {
        const f = (window as unknown as HarnessWindow).__svgFixture
        return f ? f.env() : null
      })
      expect(env, 'harness 没挂上（先 pnpm build 再跑视觉套件）').toBeTruthy()
      // 环境自检：d 值只在同样的视口与 dpr 下可比
      expect(env!.innerWidth, '视口宽与夹具捕获时不一致').toBe(fixture.source.viewport.width)
      expect(env!.innerHeight, '视口高与夹具捕获时不一致').toBe(fixture.source.viewport.height)
      expect(env!.dpr, 'deviceScaleFactor 与夹具捕获时不一致').toBe(
        fixture.source.deviceScaleFactor
      )

      await page.evaluate(props => {
        const f = (window as unknown as HarnessWindow).__svgFixture
        f.mount(document.getElementById('host') as HTMLElement, props)
      }, mode.props)
      await page.evaluate(() => (window as unknown as HarnessWindow).__svgFixture.settle())
      const reactPaths = (await page.evaluate(() =>
        (window as unknown as HarnessWindow).__svgFixture.readPaths()
      )) as (string | null)[]

      const vue3Paths = mode.paths
      expect(reactPaths.length, 'path 条数不一致').toBe(vue3Paths.length)
      expect(
        reactPaths.every(p => !!p),
        'react 侧有 path 没有 d'
      ).toBe(true)

      for (let i = 0; i < vue3Paths.length; i++) {
        const a = parsePath(vue3Paths[i])
        const b = parsePath(reactPaths[i] as string)
        expect(b.cmds, `第 ${i} 条 path 的指令序列不一致`).toEqual(a.cmds)
        expect(b.nums.length, `第 ${i} 条 path 的数字个数不一致`).toBe(a.nums.length)
        const off = b.nums
          .map((n, k) => Math.abs(n - a.nums[k]))
          .reduce((m, n) => Math.max(m, n), 0)
        expect(
          off,
          `第 ${i} 条 path 最大偏差 ${off}px 应 < ${EPS}px\nvue3 : ${vue3Paths[i]}\nreact: ${reactPaths[i]}`
        ).toBeLessThan(EPS)
      }
    })
  }
})
