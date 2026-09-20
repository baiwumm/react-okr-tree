import { defineConfig, devices } from '@playwright/test'

/**
 * 视觉回归（计划 9.2）：真实浏览器对文档站的 Demo 路由截图比对。
 *
 * 运行：`pnpm build:website`（先出库 dist，再静态导出 out/）→ `pnpm test:visual`
 *      生成/更新基线：`pnpm test:visual:update`
 *
 * 截的是**静态导出产物**而不是 `next dev`：部署形态就是 `out/` 那批文件，
 * dev 服务器带未压缩的 React 与不同的水合时机，拿它做基线等于给线上不存在的形态拍照
 * （服务器见 apps/website/scripts/serve-out.mjs）。
 *
 * 端口默认 4520。源项目用 4173，但那台 Windows 机器的 TCP 排除区间是 4229–4328，
 * listen 直接 EACCES（`netsh int ipv4 show excludedportrange protocol=tcp`），
 * 所以这里换了个不碰区间的默认值，仍可用 OKR_VISUAL_PORT 覆盖。
 *
 * 快照按平台存放（-win32 / -linux 后缀），基线必须先存在才算门禁：
 * 缺失基线时写入实际截图并判失败（updateSnapshots: 'missing'），
 * Linux 基线由 CI 的 snapshot-bootstrap 作业生成后提交。
 */
const port = Number(process.env.OKR_VISUAL_PORT) || 4520
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: 'tests/visual',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  updateSnapshots: 'missing',
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      // 跨环境渲染允许 2% 像素差异（亚像素抗锯齿抖动）
      maxDiffPixelRatio: 0.02,
    },
  },
  webServer: {
    // cwd 是本配置文件所在目录（packages/react-okr-tree），所以要退两级到仓库根再进 apps
    command: `node ../../apps/website/scripts/serve-out.mjs --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
