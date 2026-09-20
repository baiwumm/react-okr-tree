/**
 * 构建后处理：为 CJS require 条件生成 dist/index.d.cts。
 *
 * package.json 声明 "type": "module"，单一 index.d.ts 会被 TS 视为 ESM 声明，
 * 导致 @arethetypeswrong/cli 报 "Masquerading as ESM"（CJS require 解析到 ESM 类型）。
 * 声明内容为纯 `export declare` 语法，.d.cts 与 .d.ts 通用，直接复制即可。
 *
 * 源项目在这一步还会用 esbuild 补压一次 ESM 产物（Vite lib 多格式构建不压 es 输出）。
 * 这里刻意不做：Vite 8 下实测 `vite build` 已对三种格式统一走 Oxc 压缩，
 * 而 ESM 的顶层导出名必须原样保留，事后用 transformWithOxc 再跑一遍只省下 0.5 kB gzip
 * （16.00 → 15.53），换来的是产物与 sourcemap 错位、需要额外删掉 .es.js.map。
 * 体积预算（ESM gzip ≤ 20 kB）本来就有富余，不值当。
 */
import { copyFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dts = resolve(root, 'dist/index.d.ts')
const dcts = resolve(root, 'dist/index.d.cts')

if (!existsSync(dts)) {
  console.error('[post-build] 缺少 dist/index.d.ts，请先执行 vite build')
  process.exit(1)
}
copyFileSync(dts, dcts)
console.log('[post-build] 已生成 dist/index.d.cts')
