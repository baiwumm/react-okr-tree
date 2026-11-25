import { expect, type Locator, type Page } from '@playwright/test'

/**
 * 视觉与冒烟用例的公共动作。
 *
 * 锚点规则来自 `<DemoBlock>`：它按 `file` 推导出 `id="demo-<文件名>"`，
 * 而文件名是 development-plan 阶段 8 契约表里定死的，所以这里不依赖 DOM 顺序。
 */

/**
 * Demo 名 → 所在文档页（2026-11-25 demos 拆页后）
 *
 * `/docs/guide/demos` 原来是一页装 25 个用例（2MB HTML），现在按功能拆成 1 个索引 + 7 组。
 * 锚点 `#demo-<文件名>` 仍由 `<DemoBlock>` 从 `file` 推导，所以用例定位规则没变，
 * 变的只是「先打开哪一页」——全部收敛到这个表里，不要在用例里散写路径。
 */
const DEMO_PAGES = {
  // 布局与展开
  basic: '/docs/guide/demos/layout/',
  horizontal: '/docs/guide/demos/layout/',
  collapsable: '/docs/guide/demos/layout/',
  'expand-all': '/docs/guide/demos/layout/',
  'default-expanded-keys': '/docs/guide/demos/layout/',
  'node-style': '/docs/guide/demos/layout/',
  // 节点内容定制
  'content-modes': '/docs/guide/demos/content/',
  'expand-btn': '/docs/guide/demos/content/',
  animation: '/docs/guide/demos/content/',
  // OKR 模式
  'okr-group': '/docs/guide/demos/okr/',
  'okr-content': '/docs/guide/demos/okr/',
  'okr-node-num': '/docs/guide/demos/okr/',
  // 状态、数据与画布
  controlled: '/docs/guide/demos/state/',
  lazy: '/docs/guide/demos/state/',
  viewport: '/docs/guide/demos/state/',
  // 过滤
  filter: '/docs/guide/demos/filter/',
  'filter-okr': '/docs/guide/demos/filter/',
  // 事件
  events: '/docs/guide/demos/events/',
  'events-okr': '/docs/guide/demos/events/',
  // 交互
  accordion: '/docs/guide/demos/interaction/',
  'node-click': '/docs/guide/demos/interaction/',
  checkbox: '/docs/guide/demos/interaction/',
  draggable: '/docs/guide/demos/interaction/',
  connector: '/docs/guide/demos/interaction/',
  virtual: '/docs/guide/demos/interaction/',
} as const

export type DemoName = keyof typeof DEMO_PAGES

/** 索引页：七组卡片 + 全局导航，用于不针对单个用例的断言（水合、搜索、亮色基线） */
export const DEMOS_INDEX = '/docs/guide/demos/'

export async function open(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(150)
}

/** 打开某个 demo 所在的页；未知名字直接抛错，避免「打开错的页 → 用例空转」 */
export async function openDemo(page: Page, name: DemoName) {
  const path = DEMO_PAGES[name]
  if (!path) throw new Error(`未知的 demo 名：${name}（检查 helpers 的 DEMO_PAGES）`)
  await open(page, path)
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
