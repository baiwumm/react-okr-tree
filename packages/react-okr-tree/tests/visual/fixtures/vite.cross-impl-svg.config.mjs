import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * 跨实现几何夹具的打包配置（fixtures/cross-impl-svg-entry.tsx → 单个 IIFE）。
 * 与 vite.perf.config.mjs / vite.group-align.config.mjs 同三条要点：别名指到 dist 产物、
 * NODE_ENV 钉 production、react/react-dom 不打 external。
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
    outDir: 'test-results/cross-impl-svg-fixture',
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: 'tests/visual/fixtures/cross-impl-svg-entry.tsx',
      formats: ['iife'],
      name: 'CrossImplSvgFixture',
      fileName: () => 'cross-impl-svg-fixture.js',
    },
  },
})
