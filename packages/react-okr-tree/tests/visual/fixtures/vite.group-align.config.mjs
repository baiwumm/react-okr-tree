import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * 组对齐行为夹具的打包配置（tests/visual/fixtures/group-align-entry.tsx → 单个 IIFE）。
 * 与 vite.perf.config.mjs 同样的三条要点：别名指到 dist 产物（测的就是发出去的那份代码）、
 * NODE_ENV 钉 production、react/react-dom 不打 external（浏览器里没有裸模块解析）。
 * 由 tests/visual/global-setup.ts 在 Playwright 启动时调一次，产物落在 test-results/。
 */
// fixtures → visual → tests → 包根
const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export default defineConfig({
  root: pkgRoot,
  configFile: false,
  plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  resolve: {
    alias: { 'react-okr-tree': resolve(pkgRoot, 'dist/react-okr-tree.es.js') },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  logLevel: 'warn',
  build: {
    outDir: 'test-results/group-align-fixture',
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: 'tests/visual/fixtures/group-align-entry.tsx',
      formats: ['iife'],
      name: 'GroupAlignFixture',
      fileName: () => 'group-align-fixture.js',
    },
  },
})
