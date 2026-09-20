/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { fileURLToPath, URL } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// 库模式构建：ESM + UMD + CJS，外部化 react，CSS 抽出为 dist/style.css，类型打包为 dist/index.d.ts
export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: r('./tsconfig.json'),
      entryRoot: r('./src'),
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['tests/**', 'dev/**', 'scripts/**'],
      bundleTypes: true,
      insertTypesEntry: true,
      copyDtsFiles: false,
    }),
  ],
  build: {
    lib: {
      entry: r('./src/index.ts'),
      name: 'ReactOkrTree',
      formats: ['es', 'umd', 'cjs'],
      // cjs 用 .cjs 扩展名以兼容 "type": "module" 下的 require()
      fileName: format => (format === 'cjs' ? 'react-okr-tree.cjs' : `react-okr-tree.${format}.js`),
      cssFileName: 'style',
    },
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ],
      output: {
        exports: 'named',
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          // UMD 走 CDN 时 JSX runtime 也得有全局名，否则构建会自己猜一个
          'react/jsx-runtime': 'ReactJSXRuntime',
          'react/jsx-dev-runtime': 'ReactJSXDevRuntime',
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [r('./tests/setup.ts')],
    include: ['tests/**/*.spec.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
})
