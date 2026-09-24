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

  /**
   * `align-root` 说的是「根节点不被子树推着走」，此前只有那条 CSS 与一张像素基线，
   * 而展开 / 收起这个动作序列本身没有任何几何断言守着。
   *
   * 两件实测过的事记在这里，免得后人误判这条的射程：
   * ① 量的是**相对树容器**的水平坐标，不是绝对 `left`：demo 卡在 `overflow-x-auto` 里，
   *    Playwright 点击前会把目标滚进视口，第一次与第二次读取之间绝对 `left` 就从 962 跳到
   *    591——那是横向滚动位置，不是布局。拿绝对坐标断言只会得到一条与几何无关的红。
   * ② 它抓住的是「收起把子树整个从布局里拿走」这一类（给 `.is-hidden` 补一条
   *    `display:none`，本条与像素基线一起红；现存实现收起走 JS 内联 `visibility:hidden`，
   *    盒子留在原地，所以坐标才不动）。`align-root` 的**静态形状**不在本条射程内：把两侧
   *    `flex:1 1 0` 改成 `0 0 auto`、或把根节点的 `width:100%` 改成 `auto`，本条与
   *    `okr-group-aligned` 那张基线都照样绿——那是 `group-align.spec.ts` 的活，两条变异
   *    实测都把它打红。
   */
  test('展开 / 收起不改变 OKR 根卡片的水平坐标', async ({ page }) => {
    const wrap = demoBlock(page, 'okr-group')
    await wrap.scrollIntoViewIfNeeded()
    const tree = wrap.locator('.org-chart-container').first()
    const root = tree.locator('.org-chart-node.only-both-tree-node.align-root').first()
    const card = root.locator('> .org-chart-node-label > .org-chart-node-label-inner')
    const measure = async () => {
      const [box, containerLeft] = await Promise.all([
        card.evaluate(el => {
          const r = el.getBoundingClientRect()
          return { left: r.left, width: r.width }
        }),
        tree.evaluate(el => el.getBoundingClientRect().left),
      ])
      return { x: box.left - containerLeft, width: box.width }
    }

    const before = await measure()
    expect(before.width).toBeGreaterThan(50)

    // 每一步都先确认真的收起 / 展开了：否则「坐标没变」可能只是因为按钮没生效
    const rightBtn = root.locator('> .org-chart-node-label > .org-chart-node-btn')
    const leftBtn = root.locator('> .org-chart-node-label > .org-chart-node-left-btn')

    await rightBtn.click()
    await expect(root.locator('> .org-chart-node-children')).toHaveClass(/is-hidden/)
    const collapsedRight = await measure()
    expect(collapsedRight.x).toBeCloseTo(before.x, 0)
    expect(collapsedRight.width).toBeCloseTo(before.width, 0)

    await rightBtn.click()
    await expect(root.locator('> .org-chart-node-children')).not.toHaveClass(/is-hidden/)
    expect((await measure()).x).toBeCloseTo(before.x, 0)

    // 左子树那一侧是 align-root 的承重边（flex: 1 1 0 + 组内统一宽度），单独走一遍
    await leftBtn.click()
    await expect(root.locator('> .org-chart-node-left-children')).toHaveClass(/is-hidden/)
    const collapsedLeft = await measure()
    expect(collapsedLeft.x).toBeCloseTo(before.x, 0)
    expect(collapsedLeft.width).toBeCloseTo(before.width, 0)

    await leftBtn.click()
    await expect(root.locator('> .org-chart-node-left-children')).not.toHaveClass(/is-hidden/)
    const after = await measure()
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.width).toBeCloseTo(before.width, 0)
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
  /**
   * G13 里不依赖像素的那一半：焦点环此前只有「类名 + 人眼看图」，一条断言都没有。
   *
   * **环不在焦点元素自己身上**：`style.css` 把 `.org-chart-node:focus` 清成
   * `outline: none`，真正的环挂在
   * `.org-chart-node:focus-visible > .org-chart-node-label > .org-chart-node-label-inner`
   * 上（探针实测：读焦点元素本身得到的是 `outlineStyle: 'none'`，照「聚焦元素有 outline」
   * 写会当场得到一条假红）。所以这里量的是**被聚焦那个节点的卡片本体**。
   */
  test('键盘 Tab 走到节点时，卡片上有可见焦点环；焦点离开后收掉', async ({ page }) => {
    await open(page, '/docs/guide/demos/')
    await demoTree(page, 'basic')

    /** 只有焦点确实落在树节点上时才返回读数，否则 null —— 让「走到节点」与「有环」两件事分开判 */
    const readRing = () =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el?.classList?.contains('org-chart-node')) return null
        const inner = el.querySelector<HTMLElement>(
          ':scope > .org-chart-node-label > .org-chart-node-label-inner'
        )!
        const s = getComputedStyle(inner)
        return {
          focusVisible: el.matches(':focus-visible'),
          cardOutline: s.outlineStyle,
          cardOutlineWidth: s.outlineWidth,
          cardOutlineColor: s.outlineColor,
          /** 焦点元素自己被那条 `:focus { outline: none }` 清掉——现状记录，别当笔误改回去 */
          nodeOutline: getComputedStyle(el).outlineStyle,
        }
      })

    let ring: Awaited<ReturnType<typeof readRing>> = null
    for (let i = 0; i < 80 && !ring; i++) {
      await page.keyboard.press('Tab')
      ring = await readRing()
    }
    // 可达性本身先断住：Tab 走不到节点时上面那条循环会安静地跑完，环的判据就成了空断
    expect(ring, 'Tab 80 次仍未走到任何 .org-chart-node，说明键盘可达性变了').not.toBeNull()
    expect(ring!.focusVisible).toBe(true)
    expect(ring!.cardOutline).toBe('solid')
    expect(ring!.cardOutlineWidth).toBe('2px')
    expect(ring!.cardOutlineColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(ring!.nodeOutline).toBe('none')

    // 环只在 :focus-visible 期间存在：拿住这张卡片的句柄，Tab 走焦点后它必须是 none，
    // 否则「有环」根本不是判据（常驻环同样能通过上面四条）。
    const card = await page.evaluateHandle(() => {
      const el = document.activeElement as HTMLElement
      return el.querySelector(':scope > .org-chart-node-label > .org-chart-node-label-inner')
    })
    await page.keyboard.press('Tab')
    await expect
      .poll(() => card.evaluate(node => getComputedStyle(node as HTMLElement).outlineStyle))
      .toBe('none')
  })

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
