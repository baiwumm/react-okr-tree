import { expect, test, type Locator, type Page } from '@playwright/test'
import { demoBlock, open, setToggle } from './helpers'

/**
 * G8（docs/acceptance.md §9 第 3 条的备注，与源项目 vue3-okr-tree 的 G8 同源）：
 * 文档站 24 个 Demo 的**交互层**断言。
 *
 * 与源项目同批同形：全部只读 DOM 状态与计算样式，一张 png 都不截（像素比对归 visual.spec.ts），
 * 每个用例自带 console / pageerror 守卫，把「点下去真的改变了什么」和「不报错」一起钉住。
 * 此前这两件事只有 smoke.spec.ts 的 6 段交互 + 15 张像素基线间接兜着，其余 14 个用例只到
 * 「渲染/水合不报错」这一层。
 *
 * 定位约定与源项目一致：
 * - `<DemoBlock>` 的锚点 `#demo-<文件名>` 就是卡片本身，用 helpers 的 demoBlock 取。
 * - 读文本一律 `allTextContents()`：折叠子树靠 `visibility: hidden` 收起，
 *   `allInnerTexts()` 对它们返回空串，会把「折叠着的节点」读成「不存在的节点」。
 * - 定位单个节点只走直接子代链，后代文本会污染 `:has()`。
 */

const logRows = (block: Locator) => block.locator('ul.font-mono li')
const logRow = (block: Locator, event: string) => logRows(block).filter({ hasText: event })

/** 按 label 文本定位那一个节点；自定义内容把标题包进 `.text-sm.font-medium` 时传第二个参数 */
const nodeByLabel = (root: Locator, label: string, sel = '.org-chart-node-label-inner') =>
  root.locator(`.org-chart-node:has(> .org-chart-node-label > ${sel}:text-is("${label}"))`)
const btnOf = (node: Locator) => node.locator('> .org-chart-node-label > .org-chart-node-btn')
const leftBtnOf = (node: Locator) =>
  node.locator('> .org-chart-node-label > .org-chart-node-left-btn')
const kidsOf = (node: Locator) => node.locator('> .org-chart-node-children')
const leftKidsOf = (node: Locator) => node.locator('> .org-chart-node-left-children')
const innerOf = (node: Locator) =>
  node.locator('> .org-chart-node-label > .org-chart-node-label-inner')
const boxOf = (node: Locator) => innerOf(node).locator('.org-chart-node-checkbox')

async function childLabels(node: Locator, sel = '.org-chart-node-label-inner') {
  const texts = await node
    .locator(`> .org-chart-node-children > .org-chart-node > .org-chart-node-label > ${sel}`)
    .allTextContents()
  return texts.map(t => t.trim())
}

const labelsIn = async (root: Locator) =>
  (await root.locator('.org-chart-node-label-inner').allTextContents()).map(t => t.trim())

/**
 * 打开 Demo 总览页并装错误守卫。
 * `Failed to load resource` 与 `__next.*.txt` 的 404 是 Next 静态导出的已知预取形态差异
 * （口径与 smoke.spec.ts 完全一致），其余一律算失败。
 */
async function openDemos(page: Page): Promise<string[]> {
  const errors: string[] = []
  let resourceLoadErrors = 0
  let rscPrefetchMisses = 0
  page.on('console', msg => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (/Failed to load resource/.test(text)) {
      resourceLoadErrors += 1
      return
    }
    errors.push(`[console.error] ${text}`)
  })
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`))
  page.on('response', res => {
    if (res.status() < 400) return
    if (/__next\..+\.txt$/.test(new URL(res.url()).pathname)) {
      rscPrefetchMisses += 1
      return
    }
    errors.push(`[http ${res.status()}] ${res.url()}`)
  })
  await open(page, '/docs/guide/demos/')
  const guard = () => errors.length === 0 && resourceLoadErrors === rscPrefetchMisses
  await expect.poll(guard, { message: '页面加载阶段不该有报错或意外 404' }).toBe(true)
  return errors
}

const assertClean = async (errors: string[]) => {
  expect(errors, '浏览器控制台不应有报错：\n' + errors.join('\n')).toHaveLength(0)
}

test.describe('布局与展开', () => {
  test('basic / horizontal：两种 direction 全展开渲染，树根容器带上方向类', async ({ page }) => {
    const errors = await openDemos(page)
    const vertical = demoBlock(page, 'basic')
    await expect(vertical.locator('.org-chart-node-children.vertical')).toHaveCount(1)
    await expect(vertical.locator('.org-chart-node')).toHaveCount(9)
    await expect(vertical.locator('.org-chart-node-btn')).toHaveCount(0)
    await expect(nodeByLabel(vertical, 'UI 设计')).toBeVisible()

    const horizontal = demoBlock(page, 'horizontal')
    await expect(horizontal.locator('[role="tree"].horizontal')).toHaveCount(1)
    expect(await childLabels(nodeByLabel(horizontal, 'xxx科技有有限公司'))).toEqual([
      '产品研发部',
      '销售部',
      '财务部',
    ])

    await assertClean(errors)
  })

  test('expand-all / collapsable：默认展开与按开关切换折叠', async ({ page }) => {
    const errors = await openDemos(page)
    const all = demoBlock(page, 'expand-all')
    await expect(all.locator('.org-chart-node-children.is-hidden')).toHaveCount(0)
    await expect(all.locator('.org-chart-node-btn.expanded')).toHaveCount(3)
    const dev = nodeByLabel(all, '产品研发部')
    await btnOf(dev).click()
    await expect(btnOf(dev)).not.toHaveClass(/expanded/)
    await expect(kidsOf(dev)).toHaveClass(/is-hidden/)
    await expect(nodeByLabel(all, 'UI 设计')).toBeHidden()

    const coll = demoBlock(page, 'collapsable')
    await coll.scrollIntoViewIfNeeded()
    await expect(coll.locator('.org-chart-node-children.is-hidden')).toHaveCount(3)
    await setToggle(coll, 'defaultExpandAll', true)
    await expect(coll.locator('.org-chart-node-children.is-hidden')).toHaveCount(0)
    await setToggle(coll, 'showNodeNum', true)
    await setToggle(coll, 'defaultExpandAll', false)
    await expect(coll.locator('.org-chart-node-btn-text').first()).toHaveText(/\d/)

    await assertClean(errors)
  })

  test('default-expanded-keys：展开目标键会连带拉起父链，追加一批不收起上一批', async ({
    page,
  }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'default-expanded-keys')
    await block.scrollIntoViewIfNeeded()

    // 初始 [5]，而 5（UI 设计）是叶子——可观察结果是父链被展开、销售部仍折叠
    await expect(block.locator('.org-chart-node-children.is-hidden')).toHaveCount(1)
    await expect(nodeByLabel(block, 'UI 设计')).toBeVisible()
    await expect(nodeByLabel(block, '销售一部')).toBeHidden()

    await block.getByRole('button', { name: '[7, 8] 销售部两支' }).click()
    await expect(nodeByLabel(block, '销售一部')).toBeVisible()
    await expect(nodeByLabel(block, 'UI 设计')).toBeVisible()

    await assertClean(errors)
  })
})

test.describe('节点外观与自定义内容', () => {
  test('node-style：尺寸按钮改内联盒尺寸，点击后套上 currentLableClassName', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'node-style')
    await block.scrollIntoViewIfNeeded()
    const root = nodeByLabel(block, 'xxx科技有有限公司')

    await expect(innerOf(root)).toHaveClass(/font-semibold/)
    await expect(innerOf(root)).not.toHaveClass(/bg-fd-primary/)
    await block.getByRole('button', { name: '140 × 40' }).click()
    await expect(innerOf(root)).toHaveCSS('width', '140px')
    await expect(innerOf(root)).toHaveCSS('height', '40px')
    await innerOf(root).click()
    await expect(root).toHaveClass(/is-current/)
    await expect(innerOf(root)).toHaveClass(/bg-fd-primary/)

    await block.getByRole('button', { name: "'8rem' × auto" }).click()
    await expect(innerOf(nodeByLabel(block, 'xxx科技有有限公司'))).toHaveCSS('width', '128px')

    await assertClean(errors)
  })

  test('content-modes：四种写法各自渲染，同传时 renderNode 优先级最高', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'content-modes')
    await block.scrollIntoViewIfNeeded()
    const via = block.locator('.org-chart-node-label-inner .text-\\[10px\\]')

    for (const route of ['renderContent', 'nodeComponent', 'renderNode']) {
      await block.getByRole('button', { name: route, exact: true }).click()
      await expect(via.first()).toHaveText(route)
      expect(await block.locator('.org-chart-node-label-inner .text-sm').count()).toBeGreaterThan(3)
    }

    await block.getByRole('button', { name: '三种同传' }).click()
    await expect(via.first()).toHaveText('renderNode')

    await block.getByRole('button', { name: 'label', exact: true }).click()
    await expect(via).toHaveCount(0)
    expect(await labelsIn(block)).toContain('销售一部')

    await assertClean(errors)
  })

  test('expand-btn：两种自定义按钮口各出各的内容，showNodeNum 把两者都压掉', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'expand-btn')
    await block.scrollIntoViewIfNeeded()
    const texts = block.locator('.org-chart-node-btn-text')

    await block.getByRole('button', { name: 'renderExpandBtn' }).click()
    // 本例 defaultExpandAll，所以圆盘上先是收起符；点一下才变开放符
    const root = nodeByLabel(block, 'xxx科技有有限公司')
    await expect(texts.first()).toHaveText('−')
    await expect(texts.first()).toHaveAttribute('title', /right|left/)
    await btnOf(root).click()
    await expect(btnOf(root)).toHaveText('+')
    await btnOf(root).click()

    await block.getByRole('button', { name: 'nodeBtnContent' }).click()
    await expect(texts.first()).toHaveText('智')

    await block.getByRole('button', { name: 'default' }).click()
    await expect(texts).toHaveCount(0)

    // showNodeNum 优先：本例 defaultExpandAll，所以先把根收起，数字才出现在圆盘上；
    // 此时两个自定义口都不会被调用（数字而不是「智」/「+」）
    await block.getByRole('button', { name: 'showNodeNum' }).click()
    await btnOf(root).click()
    await expect(btnOf(root).locator('.org-chart-node-btn-text')).toHaveText('3')
    await expect(texts.filter({ hasText: '智' })).toHaveCount(0)
    await expect(texts.filter({ hasText: '+' })).toHaveCount(0)

    await assertClean(errors)
  })

  test('animation：动画类与时长变量随 prop 走，prefers-reduced-motion 实时掐掉', async ({
    page,
  }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'animation')
    await block.scrollIntoViewIfNeeded()
    const container = block.locator('.org-chart-node > .org-chart-node-children').first()
    const readDuration = () =>
      container.evaluate(el => getComputedStyle(el).getPropertyValue('--okr-anim-duration'))

    // 本套件的浏览器全局 reducedMotion: reduce（视觉基线也是这个姿态生成的），动画这一档整个关掉
    await expect(container).not.toHaveClass(/is-animated/)

    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect(container).toHaveClass(/is-animated/)
    await expect(container).toHaveClass(/okr-anim-okr-zoom-in-center/)
    await expect.poll(readDuration).toBe('200ms')

    await block.getByRole('button', { name: 'okr-zoom-in-top' }).click()
    await expect(container).toHaveClass(/okr-zoom-in-top/)

    await block.locator('input[type="number"]').fill('500')
    await expect.poll(readDuration).toBe('500ms')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(container).not.toHaveClass(/is-animated/)
    await expect.poll(readDuration).toBe('')

    await assertClean(errors)
  })
})

test.describe('OKR 双向树', () => {
  test('okr-group：组测量在位，alignRoot 开关落到两棵树根节点的状态类', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'okr-group')
    await block.scrollIntoViewIfNeeded()

    await expect(block.locator('.okr-tree-group')).toHaveCount(1)
    await expect(block.locator('.org-chart-node.only-both-tree-node.align-root')).toHaveCount(2)

    await block.getByRole('button', { name: /^alignRoot：/ }).click()
    await expect(block.locator('.org-chart-node.align-root')).toHaveCount(0)
    await block.getByRole('button', { name: /^alignRoot：/ }).click()
    await expect(block.locator('.org-chart-node.align-root')).toHaveCount(2)

    await assertClean(errors)
  })

  test('okr-content：左子树的自定义内容不越界到右子树', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'okr-content')
    await block.scrollIntoViewIfNeeded()

    await expect(
      block
        .locator('.org-chart-node.is-left-child-node .org-chart-node-label-inner')
        .filter({ hasText: '历史进展' })
        .first()
    ).toBeVisible()
    await expect(
      block
        .locator(
          '.org-chart-node:not(.is-left-child-node) > .org-chart-node-label > .org-chart-node-label-inner'
        )
        .filter({ hasText: '历史进展' })
    ).toHaveCount(0)

    await assertClean(errors)
  })

  test('okr-node-num：根两侧圆盘各给出自己那一侧的直接子节点数', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'okr-node-num')
    await block.scrollIntoViewIfNeeded()
    const root = nodeByLabel(block, 'xxx科技有有限公司')

    const rightCount = await kidsOf(root).locator('> .org-chart-node').count()
    const leftCount = await leftKidsOf(root).locator('> .org-chart-node').count()
    expect(rightCount).toBeGreaterThan(1)
    expect(leftCount).toBeGreaterThan(1)
    await expect(btnOf(root).locator('.org-chart-node-btn-text')).toHaveText(String(rightCount))
    await expect(leftBtnOf(root).locator('.org-chart-node-btn-text')).toHaveText(String(leftCount))

    await btnOf(root).click()
    await expect(btnOf(root).locator('.org-chart-node-btn-text')).toHaveCount(0)
    await expect(kidsOf(root)).not.toHaveClass(/is-hidden/)
    await expect(nodeByLabel(block, '销售部').locator('.org-chart-node-btn-text')).toHaveText('2')

    await assertClean(errors)
  })
})

test.describe('过滤与实例方法', () => {
  test('filter：只留匹配项与父链、清空恢复，方法按钮的读结果与 DOM 一致', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'filter')
    await block.scrollIntoViewIfNeeded()
    const readout = block.locator('p.text-sm').first()

    expect(await labelsIn(block)).toHaveLength(9)
    await block.locator('input[type="text"]').fill('销售')
    const filtered = await labelsIn(block)
    expect(filtered).toContain('销售部')
    expect(filtered).toContain('销售一部')
    expect(filtered).toContain('xxx科技有有限公司')
    expect(filtered).not.toContain('产品研发部')

    await block.locator('input[type="text"]').fill('')
    expect(await labelsIn(block)).toContain('产品研发部')

    await block.getByRole('button', { name: '删除产品研发部' }).click()
    await expect(nodeByLabel(block, '产品研发部')).toHaveCount(0)
    await expect(readout).toContainText('remove')

    await block.getByRole('button', { name: '为销售部追加销售三部' }).click()
    expect(await childLabels(nodeByLabel(block, '销售部'))).toEqual([
      '销售一部',
      '销售二部',
      '销售三部',
    ])

    await block.getByRole('button', { name: 'setCurrentNode 选中销售一部' }).click()
    await expect(nodeByLabel(block, '销售一部')).toHaveClass(/is-current/)
    await expect(readout).toContainText('getCurrentKey() = 7')
    await block.getByRole('button', { name: 'setCurrentKey(null)' }).click()
    await expect(block.locator('.org-chart-node.is-current')).toHaveCount(0)

    await assertClean(errors)
  })

  test('filter-okr：关键字同时筛左右两棵树，再点一次同词等于清空', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'filter-okr')
    await block.scrollIntoViewIfNeeded()
    const status = block.locator('p.text-sm').first()
    const before = await labelsIn(block)
    expect(before.length).toBeGreaterThan(4)

    await block.getByRole('button', { name: '销售', exact: true }).click()
    const after = await labelsIn(block)
    expect(after).toContain('销售部')
    expect(after).toContain('(左)销售一部')
    expect(after).not.toContain('产品研发部')
    expect(after.length).toBeLessThan(before.length)
    // 读数是 getVisibleNodes() 现算的，左右各自命中多少只有走一遍过滤才知道
    await expect(status).toContainText('左右合计 7 个可见节点，其中左树 3 个')

    // 再点同一个词 = 清空：空值放行的那条契约（Q1 的另一半）在 OKR 双树上同样成立
    await block.getByRole('button', { name: '销售', exact: true }).click()
    expect(await labelsIn(block)).toHaveLength(before.length)
    await expect(status).toContainText('空值已放行')

    // 只命中左子树的关键字：共用的根节点必须留在页面上。旧行为是根被判不可见，
    // 于是连刚命中的左子树一起从 DOM 卸载，整棵树凭空消失（getVisibleNodes 也读 0）
    await block.getByRole('button', { name: '左', exact: true }).click()
    const leftOnly = await labelsIn(block)
    expect(leftOnly).toContain('(左)销售部')
    expect(leftOnly).toContain('xxx科技有有限公司')
    expect(leftOnly).not.toContain('销售部')
    // 左右合计 9 = 左树命中的 8 个 + 共用的那一个根（右树侧零命中）
    await expect(status).toContainText('左右合计 9 个可见节点，其中左树 8 个')

    await block.getByRole('button', { name: '左', exact: true }).click()
    expect(await labelsIn(block)).toHaveLength(before.length)

    await assertClean(errors)
  })

  test('controlled：受控展开/选中回写读得到，filter 与 remove 走同一份 DOM', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'controlled')
    await block.scrollIntoViewIfNeeded()
    const readout = block.locator('code').first()

    await expect(readout).toHaveText('[1]')
    await block.getByRole('button', { name: 'expandAll()' }).click()
    await expect(readout).not.toHaveText('[1]')
    await expect(block.locator('.org-chart-node-children.is-hidden')).toHaveCount(0)
    await block.getByRole('button', { name: 'collapseAll()' }).click()
    await expect(block.locator('.org-chart-node-btn.expanded')).toHaveCount(0)

    await block.getByRole('button', { name: 'setCurrentKey(8)' }).click()
    await expect(nodeByLabel(block, '销售二部')).toHaveClass(/is-current/)
    await block.getByRole('button', { name: 'getCurrentKey()' }).click()
    await expect(
      block.locator('p, span').filter({ hasText: 'getCurrentKey() →' }).first()
    ).toContainText('8')
    await block.getByRole('button', { name: 'currentKey = null' }).click()
    await expect(block.locator('.org-chart-node.is-current')).toHaveCount(0)

    await block.getByRole('button', { name: 'expandedKeys = [1, 6]' }).click()
    await expect(nodeByLabel(block, '销售一部')).toBeVisible()

    await block.getByRole('button', { name: "filter('研发')" }).click()
    expect(await labelsIn(block)).not.toContain('销售部')
    await block.getByRole('button', { name: "filter('')" }).click()
    expect(await labelsIn(block)).toContain('销售部')

    await block.getByRole('button', { name: 'remove(3)' }).click()
    await expect(nodeByLabel(block, '研发-前端')).toHaveCount(0)

    await assertClean(errors)
  })
})

test.describe('事件', () => {
  test('events：点击 / 右键 / 勾选 / 展开各自进日志，一行一件事', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'events')
    await block.scrollIntoViewIfNeeded()
    const finance = nodeByLabel(block, '财务部')

    await innerOf(finance).click()
    await expect(logRow(block, 'onNodeClick →').first()).toContainText('财务部')
    await expect(logRow(block, 'onCurrentKeyChange →').first()).toBeVisible()

    await innerOf(finance).click({ button: 'right' })
    await expect(logRow(block, 'onNodeContextMenu →').first()).toContainText('财务部')

    await boxOf(finance).click()
    await expect(logRow(block, 'onCheck →').first()).toContainText('财务部')

    await btnOf(nodeByLabel(block, 'xxx科技有有限公司')).click()
    await expect(logRow(block, 'onNodeCollapse →').first()).toContainText('xxx科技')
    await assertClean(errors)
  })

  test('events-okr：左右两棵树的展开收起都触发事件', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'events-okr')
    await block.scrollIntoViewIfNeeded()
    const root = nodeByLabel(block, 'xxx科技有有限公司')

    // 本例默认全展开：第一次点圆盘是收起，第二次才是展开
    await expect(btnOf(root)).toHaveClass(/expanded/)
    await btnOf(root).click()
    await expect(logRows(block).first()).toContainText('onNodeCollapse')
    await expect(logRows(block).first()).toContainText('[右树]')
    await btnOf(root).click()
    await expect(logRows(block).first()).toContainText('onNodeExpand')

    // 左子树节点的圆盘在它的左侧（镜像布局），事件行的 side 标记走 [左树]
    const leftDev = nodeByLabel(block, '(左)产品研发部')
    await expect(leftBtnOf(leftDev)).toHaveClass(/expanded/)
    await leftBtnOf(leftDev).click()
    await expect(logRows(block).first()).toContainText('[左树] 「(左)产品研发部」')
    await expect(logRows(block).first()).toContainText('onNodeCollapse')

    await assertClean(errors)
  })
})

test.describe('懒加载与画布', () => {
  test('lazy：请求数只算一次，首次 reject 后停在折叠态并可重试', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'lazy')
    await block.scrollIntoViewIfNeeded()
    const requests = block.locator('span').filter({ hasText: '已发起' }).locator('strong')
    const root = nodeByLabel(block, 'xxx科技有有限公司')

    // isLeaf 的那一支（外部顾问）压根不给圆盘
    await expect(
      nodeByLabel(block, '外部顾问（isLeaf，不请求）').locator('.org-chart-node-btn')
    ).toHaveCount(0)

    await expect(requests).toHaveText('0')
    await btnOf(root).click()
    await expect(btnOf(root)).toHaveClass(/is-loading/)
    await expect
      .poll(async () => await childLabels(root))
      .toEqual(['产品研发部', '销售部', '财务部（叶子）'])
    await expect(btnOf(root)).not.toHaveClass(/is-loading/)
    await expect(requests).toHaveText('1')

    // 展开到 UI 设计（id 5），首次请求故意 reject：节点保持折叠、加载指示消失、出现重试按钮
    await btnOf(nodeByLabel(block, '产品研发部')).click()
    await expect
      .poll(async () => await childLabels(nodeByLabel(block, '产品研发部')))
      .toContain('UI 设计（首次请求必失败）')
    await expect(requests).toHaveText('2')
    const ui = nodeByLabel(block, 'UI 设计（首次请求必失败）')
    await btnOf(ui).click()
    await expect(btnOf(ui)).toHaveClass(/is-loading/)
    await expect(btnOf(ui)).not.toHaveClass(/expanded|is-loading/, { timeout: 3000 })
    await expect(ui.locator('> .org-chart-node-children')).toHaveCount(0)
    await expect(block.getByRole('button', { name: '重试 id=5' })).toBeVisible()
    await expect(requests).toHaveText('3')

    await block.getByRole('button', { name: '重试 id=5' }).click()
    await expect
      .poll(async () => await childLabels(nodeByLabel(block, 'UI 设计（首次请求必失败）')))
      .toEqual(['视觉组', '交互组'])
    // 失败那一次也算一次请求：1 根 + 1 产品研发部 + 1 失败 + 1 重试
    await expect(requests).toHaveText('4')

    await assertClean(errors)
  })

  test('viewport：滚轮行为三档切换，fitToScreen / centerNode 改写缩放与状态文案，平移只吞一次点击', async ({
    page,
  }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'viewport')
    const viewport = block.locator('.okr-viewport')
    await viewport.scrollIntoViewIfNeeded()
    const zoom = viewport.locator('.okr-viewport-toolbar-zoom')
    const status = block.locator('p').filter({ hasText: '当前缩放' })
    const canvas = viewport.locator('.okr-viewport-canvas')

    await expect(zoom).toHaveText('100%')
    const wheelDirect = block.getByRole('button', { name: '滚轮直接缩放' })
    await expect(wheelDirect).not.toHaveClass(/bg-fd-accent/)
    await wheelDirect.click()
    await expect(wheelDirect).toHaveClass(/bg-fd-accent/)
    await block.getByRole('button', { name: '滚轮滚动页面' }).click()
    await expect(block.getByRole('button', { name: '滚轮滚动页面' })).toHaveClass(/bg-fd-accent/)
    await block.getByRole('button', { name: 'Ctrl / Cmd + 滚轮缩放' }).click()

    await block.getByRole('button', { name: 'fitToScreen()' }).click()
    await expect(zoom).not.toHaveText('100%')
    await viewport.getByRole('button', { name: '重置' }).click()
    await expect(zoom).toHaveText('100%')

    // 平移：在画布空白处按下、横拖、仍在画布内松手；松手补出的那次 click 被标志位吞掉，
    // 紧接着点节点必须正常选中（两仓同一套 swallow-once 语义）
    const root = nodeByLabel(block, 'xxx科技有有限公司')
    await btnOf(root).click()
    const box = (await viewport.boundingBox())!
    const y = box.y + box.height - 12
    await page.mouse.move(box.x + 30, y)
    await page.mouse.down()
    await page.mouse.move(box.x + 140, y, { steps: 8 })
    await page.mouse.up()
    await expect(viewport).not.toHaveClass(/is-panning/)
    await expect(canvas).toHaveAttribute('style', /translate\(1\d\dpx/)

    const child = innerOf(nodeByLabel(block, 'xxx科技有有限公司-A'))
    await child.click()
    await expect(nodeByLabel(block, 'xxx科技有有限公司-A')).toHaveClass(/is-current/)

    // 居中到深处节点：祖先被展开、状态文案跟着走
    await block.getByRole('button', { name: 'centerNode(121)' }).click()
    await expect(status).toContainText('已居中到 id=121')

    /**
     * 松手落在画布外（2026-09-25 修的那条，与源项目同形）：元素侧收不到 pointerup，
     * 手势必须照样收尾——之后不按键的悬停不能再拖动画布，这一次也不该武装「吞一次点击」。
     */
    await viewport.getByRole('button', { name: '重置' }).click()
    const box2 = (await viewport.boundingBox())!
    const y2 = box2.y + box2.height - 14
    await page.mouse.move(box2.x + 30, y2)
    await page.mouse.down()
    await page.mouse.move(box2.x + 130, y2, { steps: 6 })
    await page.mouse.move(box2.x + 170, box2.y - 40, { steps: 4 })
    await page.mouse.up()
    await expect(viewport).not.toHaveClass(/is-panning/)
    const styleAfterRelease = await canvas.getAttribute('style')
    expect(styleAfterRelease).toMatch(/translate\(1\d\dpx/)
    await page.mouse.move(box2.x + 300, y2, { steps: 6 })
    await page.mouse.move(box2.x + 420, y2, { steps: 6 })
    await expect(canvas).toHaveAttribute('style', styleAfterRelease!)
    // 画布外松手不该武装「吞一次点击」：回到画布里的第一次点击就得管用，
    // 工具栏的复位点击正是那一次（被吞掉的话偏移会停在原处）
    await viewport.getByRole('button', { name: '重置' }).click()
    await expect(canvas).toHaveAttribute('style', /translate\(0px, 0px/)
    await child.click()
    await expect(nodeByLabel(block, 'xxx科技有有限公司-A')).toHaveClass(/is-current/)

    await assertClean(errors)
  })
})

test.describe('交互档（accordion / expand-on-click-node / checkbox / draggable / connector）', () => {
  test('accordion：程序化 expandAll 不受互斥限制，下一次手动展开才收起同级', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'accordion')
    await block.scrollIntoViewIfNeeded()
    const root = nodeByLabel(block, 'xxx科技有有限公司')
    const dev = nodeByLabel(block, '产品研发部')
    const sales = nodeByLabel(block, '销售部')

    await btnOf(root).click()
    await block.getByRole('button', { name: 'expandAll() —— 手风琴不管它' }).click()
    await expect(block.locator('.org-chart-node-children.is-hidden')).toHaveCount(0)

    await block.getByRole('button', { name: 'collapseAll()' }).click()
    await btnOf(root).click()
    await btnOf(dev).click()
    await expect(kidsOf(dev)).not.toHaveClass(/is-hidden/)
    await btnOf(sales).click()
    await expect(kidsOf(sales)).not.toHaveClass(/is-hidden/)
    await expect(kidsOf(dev)).toHaveClass(/is-hidden/)

    await assertClean(errors)
  })

  test('expandOnClickNode：开着点卡片就切换展开，关掉只选中；读跟手显示最近点击', async ({
    page,
  }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'node-click')
    await block.scrollIntoViewIfNeeded()
    const root = nodeByLabel(block, 'xxx科技有有限公司')
    const dev = nodeByLabel(block, '产品研发部')
    const toggle = block.getByRole('button', { name: /^expandOnClickNode：/ })

    await expect(toggle).toContainText('开')
    // 开着时：点根卡片本身就把它展开
    await innerOf(root).click()
    await expect(btnOf(root)).toHaveClass(/expanded/)
    await expect(dev).toBeVisible()
    await expect(block.locator('p').filter({ hasText: '最近点击' })).toContainText('xxx科技')

    // 关掉后点卡片只选中、不切换展开（产品研发部此时仍是折叠的）
    await toggle.click()
    await expect(toggle).toContainText('关')
    await innerOf(dev).click()
    await expect(btnOf(dev)).not.toHaveClass(/expanded/)
    await expect(dev).toHaveClass(/is-current/)

    await assertClean(errors)
  })

  test('checkbox：联动半选、checkStrictly 关闭联动、工具条方法按真实数据生效', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'checkbox')
    await block.scrollIntoViewIfNeeded()
    const root = nodeByLabel(block, 'xxx科技有有限公司')
    const dev = nodeByLabel(block, '产品研发部')
    const sales = nodeByLabel(block, '销售部')

    // defaultCheckedKeys=[3,4]：两个叶子已选，父节点与根都是半选
    await expect(boxOf(nodeByLabel(block, '研发-前端'))).toHaveClass(/is-checked/)
    await expect(boxOf(dev)).toHaveClass(/is-indeterminate/)
    await expect(boxOf(root)).toHaveClass(/is-indeterminate/)

    await btnOf(root).click()
    await btnOf(dev).click()
    await btnOf(sales).click()
    await expect(nodeByLabel(block, '销售一部')).toBeVisible()

    await boxOf(dev).click()
    await expect(logRow(block, 'onCheck').first()).toContainText('产品研发部')
    for (const label of ['研发-前端', '研发-后端', 'UI 设计']) {
      await expect(boxOf(nodeByLabel(block, label))).toHaveClass(/is-checked/)
    }

    await block.getByRole('button', { name: /^checkStrictly（父子不联动）：/ }).click()
    await boxOf(sales).click()
    await expect(boxOf(sales)).toHaveClass(/is-checked/)
    await expect(boxOf(nodeByLabel(block, '销售一部'))).not.toHaveClass(/is-checked/)

    await block.getByRole('button', { name: /^checkStrictly（父子不联动）：/ }).click()
    await block.getByRole('button', { name: 'setCheckedKeys([7, 8])' }).click()
    await expect(boxOf(nodeByLabel(block, '销售一部'))).toHaveClass(/is-checked/)
    await expect(boxOf(sales)).toHaveClass(/is-checked/)
    await expect(boxOf(root)).toHaveClass(/is-indeterminate/)
    await expect(boxOf(dev)).not.toHaveClass(/is-checked|is-indeterminate/)

    await block.getByRole('button', { name: 'getCheckedKeys / getHalfCheckedKeys' }).click()
    await expect(logRow(block, 'getCheckedKeys').first()).toHaveText(
      /getCheckedKeys → checked=\[6, 7, 8\] half=\[1\]/
    )

    await assertClean(errors)
  })

  test('draggable：inner 放置改写层级，allow-drag / allow-drop 各拦一边', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'draggable')
    await block.scrollIntoViewIfNeeded()
    const root = nodeByLabel(block, 'xxx科技有有限公司')
    const dev = nodeByLabel(block, '产品研发部')
    const sales = nodeByLabel(block, '销售部')

    await btnOf(root).click()
    await btnOf(dev).click()
    const frontend = nodeByLabel(block, '研发-前端')
    await expect(frontend).toBeVisible()
    expect(await childLabels(dev)).toEqual(['研发-前端', '研发-后端', 'UI 设计'])

    // 1) 成功放置：改写两边的直接子代顺序，日志出 onNodeDrop
    await innerOf(frontend).dragTo(innerOf(sales), { targetPosition: { x: 12, y: 12 } })
    await expect(logRow(block, 'onNodeDrop →').first()).toContainText('研发-前端')
    expect(await childLabels(dev)).toEqual(['研发-后端', 'UI 设计'])
    expect(await childLabels(sales)).toEqual(['销售一部', '销售二部', '研发-前端'])
    // 2026-09-25 修载荷后：drag-end 由 handleDrop 在 node-drop 之后立刻补发（跨父级移动会把
    // 源元素卸载重建，浏览器真到的那一次送不到宿主手上），所以成功放置这里报的是「放置完成」。
    await expect(logRow(block, 'onNodeDragEnd').first()).toContainText('放置完成')

    // 2) allowDrop 拦住以财务部（id 9）为目标的放置：不该多出 onNodeDrop，但拖得起、drag-end 有记录
    const finance = nodeByLabel(block, '财务部')
    const backend = nodeByLabel(block, '研发-后端')
    // 上一步移走节点后布局会重排，源与目标都可能跑出窗口（boundingBox 越界时 dragTo
    // 静默什么都不做），两个端点都先滚进视口
    await innerOf(backend).scrollIntoViewIfNeeded()
    await innerOf(finance).scrollIntoViewIfNeeded()
    const dropsBefore = await logRow(block, 'onNodeDrop →').count()
    await innerOf(backend).dragTo(innerOf(finance), { targetPosition: { x: 12, y: 12 } })
    await expect(logRow(block, 'onNodeDrop →')).toHaveCount(dropsBefore)
    await expect(logRow(block, 'onNodeDragEnd').first()).toContainText('未完成放置')
    expect(await childLabels(dev)).toEqual(['研发-后端', 'UI 设计'])

    // 3) allowDrag 拦住财务部：这一拖一个事件都不产生
    const rowsBefore = await logRows(block).count()
    await innerOf(finance).dragTo(innerOf(sales), { targetPosition: { x: 12, y: 12 } })
    await expect(logRows(block)).toHaveCount(rowsBefore)
    expect(await childLabels(root)).toEqual(['产品研发部', '销售部', '财务部'])

    await assertClean(errors)
  })

  test('connector：svg 覆盖层随形状改写 path，切回 css 后覆盖层与形状按钮一起退场', async ({
    page,
  }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'connector')
    await block.scrollIntoViewIfNeeded()
    const paths = block.locator('.okr-connector-svg path')
    const root = nodeByLabel(block, 'xxx科技有有限公司')

    await expect(block.locator('.org-chart-container.connector-svg')).toHaveCount(1)
    const curveD = await paths.first().getAttribute('d')
    expect(curveD).toBeTruthy()

    await btnOf(root).click()
    await expect.poll(async () => await paths.first().getAttribute('d')).not.toBe(curveD)
    await btnOf(root).click()

    await block.getByRole('button', { name: 'orthogonal', exact: true }).click()
    const orthogonalD = await paths.first().getAttribute('d')
    expect(orthogonalD).toBeTruthy()
    expect(orthogonalD).not.toBe(curveD)
    await block.getByRole('button', { name: 'straight', exact: true }).click()
    expect(await paths.first().getAttribute('d')).not.toBe(orthogonalD)

    await block.getByRole('button', { name: 'connector="css"' }).click()
    await expect(block.locator('.okr-connector-svg')).toHaveCount(0)
    await expect(block.getByRole('button', { name: 'curve', exact: true })).toBeDisabled()

    await assertClean(errors)
  })
})

test.describe('virtual（1.16.0）', () => {
  test('virtual：窗口化有界渲染，滚动揭示与 key 重挂载切换都不破几何', async ({ page }) => {
    const errors = await openDemos(page)
    const block = demoBlock(page, 'virtual')
    await block.scrollIntoViewIfNeeded()
    const stat = block.locator('[data-test="stat"]')
    const toggle = block.locator('[data-test="virtual-toggle"]')

    // 开启 virtual：DOM 有界（远小于总数 3001）
    await expect(toggle).toBeChecked()
    await expect(stat).toContainText('总数 3001')
    const domOn = await block.locator('.org-chart-node').count()
    expect(domOn).toBeGreaterThan(1)
    expect(domOn).toBeLessThan(60)
    await expect(block.locator('.okr-v-spacer').first()).toBeVisible()

    // 滚动到随机节点：揭示后 DOM 仍有界
    await block.locator('[data-test="scroll-btn"]').click()
    await page.waitForTimeout(200)
    expect(await block.locator('.org-chart-node').count()).toBeLessThan(60)

    // 关闭 virtual（key 重挂载）：全量渲染 3001 个节点；重新开启回到有界
    await toggle.uncheck()
    await expect.poll(async () => await block.locator('.org-chart-node').count()).toBe(3001)
    await toggle.check()
    await expect.poll(async () => await block.locator('.org-chart-node').count()).toBeLessThan(60)

    await assertClean(errors)
  })
})
