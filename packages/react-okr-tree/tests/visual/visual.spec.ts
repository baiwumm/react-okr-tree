import { expect, test } from '@playwright/test'
import { demoBlock, demoShot, demoTree, open, setToggle } from './helpers'
import { snap } from './snap'

/**
 * 视觉基线（计划 9.2）：截文档站 /docs/guide/demos 里的真实 Demo。
 *
 * 定位一律走 `<DemoBlock>` 推导出的 `#demo-<文件名>`（文件名是阶段 8 契约表里定死的），
 * 所以新增一个 demo 不会让既有基线集体错位——源项目早期用 nth-child 时就吃过这个亏。
 */
test.describe('布局与几何', () => {
  test.beforeEach(async ({ page }) => {
    await open(page, '/docs/guide/demos/')
  })

  test('垂直布局', async ({ page }) => {
    await snap(await demoShot(page, 'basic'), 'layout-vertical.png')
  })

  test('水平布局', async ({ page }) => {
    await snap(await demoShot(page, 'horizontal'), 'layout-horizontal.png')
  })

  test('折叠圆盘上的子节点数', async ({ page }) => {
    const wrap = demoBlock(page, 'collapsable')
    await wrap.scrollIntoViewIfNeeded()
    await setToggle(wrap, 'showNodeNum', true)
    await setToggle(wrap, 'defaultExpandAll', false)
    await page.waitForTimeout(220)
    await snap(wrap, 'collapsable-badge-count.png')
  })

  test('OKR 双树与 Group 对齐', async ({ page }) => {
    const wrap = demoBlock(page, 'okr-group')
    await wrap.scrollIntoViewIfNeeded()
    await page.waitForTimeout(220)
    await snap(wrap, 'okr-group-aligned.png')
  })

  test('节点尺寸与自定义类名', async ({ page }) => {
    await snap(await demoShot(page, 'node-style'), 'node-style.png')
  })

  test('复选框：父子联动与半选', async ({ page }) => {
    await demoTree(page, 'checkbox')
    await demoBlock(page, 'checkbox').locator('.org-chart-node-checkbox').first().click()
    await page.waitForTimeout(250)
    await snap(demoBlock(page, 'checkbox'), 'checkbox-half-selected.png')
  })

  test('SVG 连接线', async ({ page }) => {
    const wrap = demoBlock(page, 'connector')
    await wrap.scrollIntoViewIfNeeded()
    await wrap.getByRole('button', { name: /connector="svg"/ }).click()
    const tree = await demoTree(page, 'connector')
    await expect(wrap.locator('.okr-connector-svg path').first()).toBeVisible()
    await snap(tree, 'connector-svg-curve.png')
  })

  test('展开按钮自定义内容', async ({ page }) => {
    const wrap = demoBlock(page, 'expand-btn')
    await wrap.scrollIntoViewIfNeeded()
    await wrap.getByRole('button', { name: 'renderExpandBtn', exact: true }).click()
    await page.waitForTimeout(250)
    await snap(wrap, 'expand-btn-custom.png')
  })

  test('过滤后的形态', async ({ page }) => {
    const wrap = demoBlock(page, 'filter')
    await wrap.scrollIntoViewIfNeeded()
    await wrap.locator('input').first().fill('前端')
    await page.waitForTimeout(300)
    await snap(wrap, 'filter-matches.png')
  })
})

test.describe('内置主题', () => {
  test('逐个切换并截图', async ({ page }) => {
    await open(page, '/docs/theme/')
    for (const theme of ['default', 'feishu', 'dark', 'minimal', 'colorful', 'auto']) {
      await page.getByRole('button', { name: theme, exact: true }).click()
      await page.waitForTimeout(240)
      await snap(page.locator('#theme-switcher'), `theme-${theme}.png`)
    }
  })
})

test.describe('计算样式契约（不靠像素）', () => {
  test('unstyled 只清外观，不改节点盒尺寸', async ({ page }) => {
    await open(page, '/docs/guide/demos/')
    const container = page.locator('#demo-basic .org-chart-container').first()
    const inner = container.locator('.org-chart-node-label-inner').first()
    await inner.scrollIntoViewIfNeeded()

    const read = () =>
      inner.evaluate(el => {
        const s = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        return {
          background: s.backgroundColor,
          border: s.borderStyle,
          shadow: s.boxShadow,
          radius: s.borderRadius,
          padding: s.padding,
          width: r.width,
          height: r.height,
        }
      })

    const styled = await read()
    expect(styled.shadow).not.toBe('none')
    /**
     * default 主题下卡片只有一层阴影：`:where(.org-chart-container .org-chart-node-label-inner)`
     * 写的是 `background: var(--okr-node-bg, transparent)` 且没有 border，default 又不预设这些变量
     * （`#fff` 那个兜底在复选框上，不在卡片上）。所以 before/after 的唯一判据是阴影，
     * 拿 background / border 当判据会假失败——这里踩过两次，别改回去。
     */

    // 同一个节点、同一份布局，只加 okr-unstyled 类：外观必须被中和，盒子必须一动不动。
    // 这样比「两棵不同的树」干净——不用去对齐两份 labelWidth / 数据。
    await container.evaluate(el => el.classList.add('okr-unstyled'))
    await page.waitForTimeout(120)
    const bare = await read()
    expect(bare.shadow).toBe('none')
    expect(bare.border).toBe('none')
    expect(bare.radius).toBe('0px')
    expect(bare.background).toBe('rgba(0, 0, 0, 0)')
    expect(bare.padding).toBe(styled.padding)
    expect(bare.width).toBeCloseTo(styled.width, 0)
    expect(bare.height).toBeCloseTo(styled.height, 0)
  })

  test('打印媒体：圆盘与工具栏隐藏、阴影去掉', async ({ page }) => {
    await open(page, '/docs/guide/demos/')
    const wrap = demoBlock(page, 'collapsable')
    await wrap.scrollIntoViewIfNeeded()
    const btn = wrap.locator('.org-chart-node-btn').first()
    await expect(btn).toBeVisible()
    const inner = (await demoTree(page, 'basic')).locator('.org-chart-node-label-inner').first()
    expect(await inner.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe('none')

    await page.emulateMedia({ media: 'print' })
    await expect(btn).toBeHidden()
    expect(await inner.evaluate(el => getComputedStyle(el).boxShadow)).toBe('none')
  })
})
