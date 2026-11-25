import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 视觉基线必须两平台成对：`visual.yml` 跑在 ubuntu-24.04（只认 `-linux.png`），本机生成的是
 * `-win32.png`。缺一半时 Playwright 的 handleMissing 只在那一个平台上红，所以「成对」本身要有一条
 * 与平台无关的门禁——11-04 缺 4 张、11-25 缺 2 张且让 17 张过期，两次都是靠人肉在提交正文里记账。
 *
 * 修法不是本地补：`-win32` 改名冒充 `-linux` 会骗过这条门禁，真实补法只有跑一次
 * Snapshot Bootstrap（见 `.github/workflows/snapshot-bootstrap.yml` 头注释）。
 */
// 用 process.cwd() 而不是 import.meta.url：jsdom 环境里后者被 vite 改写成 http 形态，fileURLToPath 会抛
// （tests/api-surface.spec.tsx 读源码也是这个写法）。
const dir = resolve(process.cwd(), 'tests/visual/visual.spec.ts-snapshots')
const names = (suffix: string) =>
  new Set(
    readdirSync(dir)
      .filter(f => f.endsWith(suffix))
      .map(f => f.slice(0, -suffix.length))
  )

describe('视觉基线两平台成对', () => {
  it('每个 -win32.png 都有同名 -linux.png，反之亦然', () => {
    const win32 = names('-chromium-win32.png')
    const linux = names('-chromium-linux.png')
    expect({
      // 缺 linux = CI 那侧判红；缺 win32 = 本地跑不了，同样要补
      缺linux: [...win32].filter(n => !linux.has(n)).sort(),
      缺win32: [...linux].filter(n => !win32.has(n)).sort(),
    }).toEqual({ 缺linux: [], 缺win32: [] })
  })

  it('目录非空（防止路径写错后上面那条退化成永真）', () => {
    expect(names('-chromium-win32.png').size).toBeGreaterThan(0)
  })
})
