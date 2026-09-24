import { expect, test } from '@playwright/test'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 跨实现 DOM 比对：react-okr-tree 与 vue3-okr-tree 渲出的 DOM 必须同形（react 侧 G15）。
 * 第 1 轮报告 §3.2 把这条门禁说成「react G15 与 vue3 G9 的公共解」，那半句不成立：
 * vue3 侧 G9 指的是「UMD 在真实浏览器 `<script>` 里挂载一次」，与本用例无关，仍然开着。
 *
 * 本包是上游的复刻，DOM 形状与状态类名是 style.css / OkrTreeGroup 测量 / 键盘导航 / SVG 锚点
 * 共同依赖的契约——任何一侧单独漂移，另一侧的文档与像素基线就都成了假事实。第 1 轮审计用这套
 * 办法人工跑通过（三套布局 30/30、38/38 行逐字一致），这里把它钉成常驻门禁。
 *
 * 数据来源：fixtures/cross-impl-vue3.json 存 vue3 侧**真实浏览器渲染后的 outerHTML**（由
 * `node scripts/gen-cross-impl-fixture.mjs` 在姊妹仓库 pnpm build 之后捕获，需同机有
 * vue3-okr-tree 仓或设 OKR_VUE3_DIR），react 侧在测试里用 dist 的 CJS 产物 +
 * renderToStaticMarkup 现算，props 直接取 fixture 里那份。fixture 靠人工刷新（`pnpm gen:cross-impl`，
 * 两仓 CI 互相看不到对方的产物，没有更自动的路子），所以这条门禁的守法是**单向**的，必须说清：
 * - 它锁的是「react 相对上一次捕获的 vue3 形状」，比只锁自己的快照强，但它不会主动发现 vue3 漂移；
 * - vue3 改了 DOM 契约：只有刷新夹具的那一次运行会红——那时先判断哪边是对的，再决定改哪侧；
 * - vue3 改了 DOM 契约却没人刷新夹具：两侧 CI 都全绿，漂移靠人工在 vue3 侧改动收尾时补刷。
 *   所以 vue3 侧动 DOM 形状/状态类名，收尾步骤里要包含「回 react 仓跑一次 pnpm gen:cross-impl」。
 *
 * 比对分两条断言（第 1 轮报告写的「含内联样式逐字一致」并不成立：仓里的归一化器把整条 style
 * 属性 filter 掉了，快照里 style= 出现 0 次）：
 * - structure：剔除 style 与 draggable，比类名 / 层级 / role / aria-* / data-level / 文本；
 * - geometry：把 style 纳入，但两侧都过一遍 DOM 往返、按 CSSOM 逐条声明取规范值——于是
 *   height:0 与 height: 0px、声明顺序、浏览器补的分号这些写法差异都不算差异。
 * 两条各自验过强度：把 hiddenStyle 的 height 从 '0' 改成 '2px'，只有 geometry 红（4 个含折叠
 * 容器的模式）；把 CLS.labelInner 改一个字母，structure 与 geometry 一起红（9 个模式）。
 *
 * 覆盖范围之外（不在本门禁里）：插槽与渲染函数（两边 API 本就不同形）、懒加载 is-loading
 * 与过渡中间态（SSR 拿不到）。`connector="svg"` 的 d 值同样不在这里——那些 path 是挂载后
 * 量布局算出来的，SSR 只有空覆盖层；由 cross-impl-svg.spec.ts 在真实浏览器里比。
 */
const require = createRequire(resolve('package.json'))
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { OkrTree } = require('./dist/react-okr-tree.cjs')

type CrossImplFixture = {
  source: {
    package: string
    version: string
    capturedAt: string
    chromium: string
    generator: string
  }
  modes: Array<{ name: string; props: Record<string, unknown>; html: string }>
}

const fixture = JSON.parse(
  readFileSync(resolve('tests/visual/fixtures/cross-impl-vue3.json'), 'utf8')
) as CrossImplFixture

type ModeResult = {
  structureVue3: string
  structureReact: string
  geometryVue3: string
  geometryReact: string
}

const reactHtmlOf = (props: Record<string, unknown>): string =>
  renderToStaticMarkup(React.createElement(OkrTree, props)) as string

/**
 * connector="svg" 的模式不在本用例里比：那些 path 的 d 是挂载后量布局算出来的，
 * SSR 拿不到（react 侧渲出一条空覆盖层，vue3 侧有 3–4 条 path，结构必然不一致，
 * 而这不是缺陷）。它们由 tests/visual/cross-impl-svg.spec.ts 在真实浏览器里比对。
 */
const ssrModes = fixture.modes.filter(m => m.props.connector !== 'svg')

test.describe('跨实现 DOM 比对（vue3 真实浏览器 ↔ react SSR）', () => {
  test('夹具本身可用（模式数与非空 HTML）', () => {
    expect(fixture.source.package).toBe('vue3-okr-tree')
    expect(fixture.modes.length).toBeGreaterThanOrEqual(10)
    expect(ssrModes.length, 'svg 模式被误分流会让这条门禁悄悄退化').toBeGreaterThanOrEqual(10)
    for (const mode of ssrModes) {
      expect(mode.html.length, `${mode.name} 的 vue3 侧 HTML 为空`).toBeGreaterThan(100)
    }
  })

  for (const mode of ssrModes) {
    test(mode.name, async ({ page }) => {
      await page.goto('about:blank')
      /**
       * 归一化器写在回调体内，不在外面定义函数再传进去：Playwright 把回调序列化进页面，
       * 回调引用的任何外部绑定都会炸（函数当参数传同样报序列化错误）。
       *
       * 口径与 tests/components/dom-structure.spec.tsx 的 structureHtml 同源（属性按名排序、
       * 无子元素时取文本），差别是 style 走 CSSOM 而不是属性串原值——两侧写法本就不同
       * （react SSR 写 height:0，浏览器序列化成 height: 0px），只有 CSSOM 视图才是共同口径。
       */
      const result = await page.evaluate(
        ({ vue3Html, reactHtml }): ModeResult => {
          const canonicalize = (html: string, includeStyle: boolean): string => {
            const doc = document.implementation.createHTMLDocument('cross-impl')
            const host = doc.createElement('div')
            host.innerHTML = html
            const walk = (el: Element, depth: number): string => {
              const parts: Array<[string, string]> = []
              for (const attr of Array.from(el.attributes)) {
                // draggable 两侧都写但值随实现不同，与仓内快照同口径剔除
                if (attr.name === 'draggable') continue
                if (attr.name === 'style') {
                  if (!includeStyle) continue
                  const style = (el as HTMLElement).style
                  const decls: string[] = []
                  for (let i = 0; i < style.length; i += 1) {
                    const prop = style.item(i)
                    decls.push(`${prop}: ${style.getPropertyValue(prop)}`)
                  }
                  decls.sort()
                  parts.push(['style', `style="${decls.join('; ')}"`])
                  continue
                }
                parts.push([attr.name, `${attr.name}="${attr.value}"`])
              }
              parts.sort((a, b) => a[0].localeCompare(b[0]))
              const pad = '  '.repeat(depth)
              const tag = el.tagName.toLowerCase()
              const open = `<${tag}${parts.length ? ' ' + parts.map(p => p[1]).join(' ') : ''}>`
              if (el.children.length === 0) {
                // vue3 的 v-if 占位注释 <!----> 既不在 children 里也读不进 textContent
                return `${pad}${open}${(el.textContent ?? '').trim()}</${tag}>`
              }
              const kids = Array.from(el.children)
                .map(c => walk(c, depth + 1))
                .join('\n')
              return `${pad}${open}\n${kids}\n${pad}</${tag}>`
            }
            return Array.from(host.children)
              .map(c => walk(c, 0))
              .join('\n')
          }
          return {
            structureVue3: canonicalize(vue3Html, false),
            structureReact: canonicalize(reactHtml, false),
            geometryVue3: canonicalize(vue3Html, true),
            geometryReact: canonicalize(reactHtml, true),
          }
        },
        { vue3Html: mode.html, reactHtml: reactHtmlOf(mode.props) }
      )

      /**
       * 两侧都真的渲出了东西（react 侧若整体抛错，renderToStaticMarkup 会直接炸；
       * 若 props 对不上，这里会拿到一个空容器）。第 1 轮那条 jsdom 基线差点交出一个
       * 「两边都空所以相等」的结论，所以非空判定与下面的 treeitem 计数都留着。
       */
      expect(result.structureReact).toContain('role="tree"')
      expect(result.structureVue3).toContain('role="tree"')

      expect(
        result.structureReact,
        `${mode.name}：结构不一致（类名 / 层级 / role / aria / 文本）`
      ).toBe(result.structureVue3)
      expect(result.geometryReact, `${mode.name}：内联样式不一致（按 CSSOM 逐条声明比对）`).toBe(
        result.geometryVue3
      )
    })
  }

  test('九个以上模式真的渲出了 treeitem（比对不是空跑）', () => {
    let withTreeitem = 0
    for (const mode of fixture.modes) {
      if (mode.html.includes('role="treeitem"')) withTreeitem += 1
    }
    // 空数据模式按定义没有 treeitem，其余九种都得有
    expect(withTreeitem).toBeGreaterThanOrEqual(9)
  })
})
