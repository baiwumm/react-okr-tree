import { expect, type Locator, type Page } from '@playwright/test'

/**
 * 视觉与冒烟用例的公共动作。
 *
 * 锚点规则来自 `<DemoBlock>`：它按 `file` 推导出 `id="demo-<文件名>"`，
 * 而文件名是 development-plan 阶段 8 契约表里定死的，所以这里不依赖 DOM 顺序。
 */

export async function open(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(150)
}

export function demoBlock(page: Page, name: string) {
  return page.locator(`#demo-${name}`)
}

/** 某个 demo 里的树容器（多个时取第一个） */
export async function demoTree(page: Page, name: string) {
  const el = demoBlock(page, name).locator('.org-chart-container').first()
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(120)
  return el
}

/**
 * 把 demo 上的开关按目标状态设好。
 *
 * 一律走 `aria-pressed` 而不是点文字：按钮文案是 `name=true/false`，
 * 按当前状态匹配的用例在初始值改动后会静默反向（这条踩过一次）。
 */
export async function setToggle(
  scope: Locator,
  name: 'showCollapsable' | 'defaultExpandAll' | 'showNodeNum',
  want: boolean
) {
  const btn = scope.getByRole('button', { name: new RegExp(`^${name}=`) })
  await expect(btn).toBeAttached()
  if ((await btn.getAttribute('aria-pressed')) !== String(want)) await btn.click()
}

/**
 * 截图目标：整个 demo 卡片，而不是 `.org-chart-container`。
 *
 * 后者在垂直布局下**高度天然为 0**（库的几何靠子容器出排布，见 style.css 的
 * `.org-chart-node-children` 绝对定位那条），Playwright 会把「空包围盒」判成
 * element is not visible，元素截图直接超时。截卡片既有稳定尺寸，也更接近读者看到的画面。
 */
export async function demoShot(page: Page, name: string) {
  const el = demoBlock(page, name)
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  return el
}
