import { expect, test } from '@playwright/test'
import { demoBlock, demoTree, open, setToggle } from './helpers'

/**
 * 冒烟守卫（对应源项目 tests/visual/smoke.spec.ts）：真实浏览器打开文档站，对关键 Demo
 * 逐一交互，断言全程 console 无报错。
 *
 * 这里刻意不截图——像素比对全部归 visual.spec.ts。与源项目同样的理由：本文件关心的是
 * 「交互有没有真的改变 DOM」，顺手截图只会产出半像素偏移类假警报，还要每平台一份基线。
 */
test('关键 Demo 交互与零控制台报错', async ({ page }) => {
  const errors: string[] = []
  /**
   * Next 对 `[[...slug]]` 这种动态段的 RSC 预取，请求的是 `__next.docs.$oc$slug.txt`
   * 而产物里落的是 `__next.docs/$oc$slug.txt`（点号 vs 目录），静态服务器上必 404。
   * 路由器把预取失败当非致命（退化成整页导航），不是应用报错，所以单独放行并计数，
   * 其余任何 4xx/5xx 一律算失败。部署形态下的实际行为留到 9.x 在真机上核（见计划）。
   */
  let rscPrefetchMisses = 0
  let resourceLoadErrors = 0
  page.on('console', msg => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    // 浏览器的 404 一律报这条不带 URL 的文案；单独计数，最后与 rscPrefetchMisses 对齐，
    // 这样新的真 404 没法躲在计数器后面
    if (/Failed to load resource/.test(text)) {
      resourceLoadErrors += 1
      return
    }
    errors.push(`[console.error] ${text}`)
  })
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`))
  page.on('response', res => {
    if (res.status() < 400) return
    // 比对路径而不是整条 URL：预取带 ?_rsc=… 查询串
    if (/__next\..+\.txt$/.test(new URL(res.url()).pathname)) {
      rscPrefetchMisses += 1
      return
    }
    errors.push(`[http ${res.status()}] ${res.url()}`)
  })

  await open(page, '/docs/guide/demos/')

  // 1. 三种布局都渲染出完整树
  for (const name of ['basic', 'horizontal', 'okr-group']) {
    const count = await demoBlock(page, name).locator('.org-chart-node').count()
    expect(count, `${name} 未渲染节点`).toBeGreaterThan(3)
  }

  // 2. 收起：先确认全展开态有子节点，点根节点圆盘后子容器进 is-hidden，
  //    但节点仍然挂在 DOM 里（折叠不卸载是既定语义），且 showNodeNum 的数字出现在圆盘上
  const collapsable = demoBlock(page, 'collapsable')
  await collapsable.scrollIntoViewIfNeeded()
  await setToggle(collapsable, 'defaultExpandAll', true)
  await setToggle(collapsable, 'showNodeNum', true)
  const tree = collapsable.locator('.org-chart-container').first()
  const children = tree.locator('.org-chart-node > .org-chart-node-children').first()
  expect(await children.locator('.org-chart-node').count()).toBeGreaterThan(0)
  await tree.locator('.org-chart-node-btn').first().click()
  await page.waitForTimeout(450)
  await expect(children).toHaveClass(/is-hidden/)
  expect(await children.locator('.org-chart-node').count()).toBeGreaterThan(0)
  expect(await tree.locator('.org-chart-node-btn-text').first().textContent()).toMatch(/\d/)

  // 3. 懒加载：首次展开发请求（demo 里 300ms 假延迟），子节点随后出现
  const lazy = await demoTree(page, 'lazy')
  const before = await lazy.locator('.org-chart-node').count()
  await lazy.locator('.org-chart-node-btn').first().click()
  await expect
    .poll(() => lazy.locator('.org-chart-node').count(), { timeout: 5000 })
    .toBeGreaterThan(before)

  // 4. 画布：默认工具栏在，点放大让百分比变化
  const viewport = demoBlock(page, 'viewport')
  await viewport.scrollIntoViewIfNeeded()
  await expect(viewport.locator('.okr-viewport-toolbar')).toBeVisible()
  const zoomLabel = viewport.locator('.okr-viewport-toolbar').getByText(/\d+%/).first()
  const zoomBefore = await zoomLabel.textContent()
  await viewport.locator('.okr-viewport-toolbar button').last().click()
  await page.waitForTimeout(300)
  expect(await zoomLabel.textContent()).not.toBe(zoomBefore)

  // 5. 拖拽：先展开根（未展开时第二个卡片不可见，dragTo 会卡在稳定性检查上）。
  //    拖的是「销售部 → 产品研发部 的 inner 区」，不是根节点——根拖到自己孩子上会被
  //    「禁止放进自身子树」挡掉，那是正确行为，只是验不出这次交互。
  const dragWrap = demoBlock(page, 'draggable')
  await dragWrap.locator('.org-chart-node-btn').first().click()
  await page.waitForTimeout(450)
  const dragCards = (await demoTree(page, 'draggable')).locator(
    '.org-chart-node-label-inner:visible[draggable="true"]'
  )
  const labels = () => dragCards.allTextContents()
  const orderBefore = await labels()
  expect(orderBefore.length, '展开后应有可拖拽卡片').toBeGreaterThan(2)
  await dragCards.nth(2).dragTo(dragCards.nth(1))
  await page.waitForTimeout(500)
  expect(await labels()).not.toEqual(orderBefore)
  await expect(dragWrap.getByText('onNodeDrop').first()).toBeVisible()

  // 6. 主题切换条：点 dark 后组件根容器带上 okr-theme-dark（站级明暗与此无关）
  await open(page, '/docs/theme/')
  await page.getByRole('button', { name: 'dark', exact: true }).click()
  await expect(page.locator('#theme-switcher .org-chart-container')).toHaveClass(/okr-theme-dark/)

  expect(errors, '浏览器控制台不应有报错：\n' + errors.join('\n')).toHaveLength(0)
  // 资源加载失败的数量必须全部是上面那类 RSC 预取缺失，一条都不能多
  expect(
    resourceLoadErrors,
    `资源加载失败 ${resourceLoadErrors} 条，但只解释了 ${rscPrefetchMisses} 条预取缺失`
  ).toBe(rscPrefetchMisses)
  console.log(`[smoke] RSC 预取缺失（静态服务器的已知形态差异）：${rscPrefetchMisses} 条`)
})
