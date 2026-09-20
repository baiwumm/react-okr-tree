import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// 开发/视觉回归用的最小 harness：直接引 src，不走 dist。
// 24 个用例的真身在 dev/demos/ 下，阶段 7 的文档站通过 transpilePackages 复用同一批组件。
export default defineConfig({
  root: r('./dev'),
  plugins: [react()],
  resolve: {
    alias: {
      'react-okr-tree/src': r('./src'),
    },
  },
  server: {
    port: 5199,
  },
  build: {
    outDir: r('./dev/dist'),
    emptyOutDir: true,
  },
})
