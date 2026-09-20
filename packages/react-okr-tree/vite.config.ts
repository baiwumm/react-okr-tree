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
        /**
         * RSC 边界（requirements R8）：整包都是客户端代码（hooks / useEffect / ResizeObserver），
         * 但没有 'use client' 的话，Next App Router 的消费者在 server component 里
         * 直接 import 就会抛 "useState only works in client components"。
         * 走 Rollup banner 而不是事后改文件——那样 sourcemap 的行号会整体错位一行。
         * 分号不能省：Oxc 压缩会把 banner 与下一行并成一行，UMD 就变成
         * `'use client'(function(...))`——字符串被当函数调用，整包在加载期直接炸。
         */
        banner: "'use client';\n",
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
    // 按目录白名单收，不用 tests/**：tests/visual 下是 Playwright 规格，
    // 通配进来会让 vitest 把 test.describe 当自己的 API 跑（源项目同样用白名单）。
    include: [
      'tests/*.spec.{ts,tsx}',
      'tests/model/**/*.spec.{ts,tsx}',
      'tests/components/**/*.spec.{ts,tsx}',
      'tests/ssr/**/*.spec.{ts,tsx}',
    ],
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
