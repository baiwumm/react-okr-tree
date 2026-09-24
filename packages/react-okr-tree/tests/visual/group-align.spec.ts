import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 组对齐宽度的行为判据（浏览器级；jsdom 没有布局量不出宽度，那边只能守「测量态有没有落到
 * DOM 上」这一半，见 tests/components/a11y-group.spec.tsx）。
 *
 * 缺陷形状：`.is-measured` 把左容器宽度钉成 var(--okr-group-left-width)，而 measure 读的
 * 就是这些左容器自己的宽度——临时测量态（max-content）若没生效，读回来的永远是「上一轮那个
 * 被钉住的值」，宽度只会越用越死。所以判据是行为：**组里后加入一棵左子树宽得多的成员，
 * 对齐宽度必须涨上去**。旧实现下 var 会停在首量值，这条当场红（上游 vue3-okr-tree 同形用例
 * 已实测：把 classList 操作摘掉 → 宽度不涨）。
 *
 * 夹具由 global-setup.ts 打成自包含 IIFE（React 19 无 UMD 全局构建），运行前提是先 pnpm build。
 */
const fixturePath = resolve('test-results/group-align-fixture/group-align-fixture.js')
const cssPath = resolve('dist/style.css')

test('组内后加入更宽成员时，对齐宽度要跟着涨（不被首量钉死）', async ({ page }) => {
  const source = readFileSync(fixturePath, 'utf8')
  await page.goto('about:blank')
  await page.setContent(
    '<!doctype html><html><head><meta charset="utf-8"></head>' +
      '<body><div id="host" style="width:1200px"></div></body></html>'
  )
  await page.addStyleTag({ content: readFileSync(cssPath, 'utf8') })
  await page.addScriptTag({ content: source })
  await page.waitForFunction('typeof window.__ga === "object"')

  await page.evaluate(() => {
    const api = (window as unknown as { __ga: { mount: (el: HTMLElement) => void } }).__ga
    api.mount(document.getElementById('host') as HTMLElement)
  })
  const settle = () =>
    page.evaluate(() =>
      (window as unknown as { __ga: { settle: () => Promise<void> } }).__ga.settle()
    )
  const read = () =>
    page.evaluate(() => (window as unknown as { __ga: { read: () => number } }).__ga.read())

  await settle()
  const one = await read()
  expect(one, '首量就要拿到宽度').toBeGreaterThan(0)

  await page.evaluate(() => {
    const api = (window as unknown as { __ga: { setTwo: (v: boolean) => void } }).__ga
    api.setTwo(true)
  })
  await settle()
  const two = await read()
  expect(two, '加入更宽的第二棵树的左子树后，对齐宽度必须涨上去').toBeGreaterThan(one)
})
