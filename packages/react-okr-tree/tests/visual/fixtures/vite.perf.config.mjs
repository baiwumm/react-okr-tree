import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * 性能夹具的打包配置（tests/visual/fixtures/perf-entry.tsx → 单个 IIFE）。
 *
 * 由 tests/visual/global-setup.ts 在 Playwright 启动时调一次，产物落在 test-results/（已 gitignore）。
 * 关键点三条：
 * 1. `react-okr-tree` 别名指到 **dist 产物**——测的就是发布出去的那份代码；
 * 2. NODE_ENV 钉 production，否则测的是 React 的开发版校验；
 * 3. react / react-dom 不打 external：浏览器里没有裸模块解析，夹具必须自包含。
 */
// fixtures → visual → tests → 包根（少退一级就会把 root 算成 tests/，
// 于是 entry 变成 tests/tests/visual/… 这种看不出来的错路径）
const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export default defineConfig({
  root: pkgRoot,
  configFile: false,
  plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  resolve: {
    alias: { 'react-okr-tree': resolve(pkgRoot, 'dist/react-okr-tree.es.js') },
  },
  logLevel: 'warn',
  build: {
    outDir: 'test-results/perf-fixture',
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: 'tests/visual/fixtures/perf-entry.tsx',
      formats: ['iife'],
      name: 'PerfFixture',
      fileName: () => 'perf-fixture.js',
    },
  },
})
