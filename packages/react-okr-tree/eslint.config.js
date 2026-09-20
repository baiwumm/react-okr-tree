import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dev/dist/**',
      'node_modules/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // requirements R3：exhaustive-deps 不许关闭——它是这套「可变 store + 订阅」最容易出错的地方
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // 模型层是从源项目逐字移植的，any 来自其既有数据流（node.data 为用户任意对象）
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'vite.config.ts', 'vite.dev.config.ts', 'playwright.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // benchmark / gen-og 跑在 Node 里，但 page.evaluate 与 jsdom 会读浏览器全局，按浏览器环境放行
    files: ['scripts/benchmark.mjs', 'scripts/gen-og.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  }
)
