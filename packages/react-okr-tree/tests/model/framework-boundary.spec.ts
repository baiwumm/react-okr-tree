import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * requirements 2.7 / R1：模型层必须与框架无关。
 *
 * 源项目正是靠这一点把 TreeStore / Node 从 Vue 2 平移到 Vue 3 几乎零改动；
 * React 版继承了同样的边界，所以这条约束要由测试守住，而不是靠 review 记忆。
 */
// vitest 的工作目录就是包根目录；import.meta.url 在 jsdom 环境下不是 file 协议，不能用来定位源码
const srcDir = resolve(process.cwd(), 'src')

const read = (relative: string): string => readFileSync(resolve(srcDir, relative), 'utf8')

describe('模型层框架无关性', () => {
  it('src/model 下不引用 react / react-dom', () => {
    const files = readdirSync(resolve(srcDir, 'model')).filter(f => /\.(ts|tsx)$/.test(f))
    expect(files.length).toBeGreaterThan(0)
    const offenders = files.filter(f =>
      /from\s+['"]react(-dom)?(\/[^'"]*)?['"]/.test(read(`model/${f}`))
    )
    expect(offenders).toEqual([])
  })

  it('viewport.ts 不引用 react，且 html-to-image 只经变量动态导入', () => {
    const code = read('viewport.ts')
    expect(code).not.toMatch(/from\s+['"]react/)
    // 说明符必须是变量：写死 import('html-to-image') 会让打包器把可选依赖内联进发布产物
    expect(code).toMatch(/import\(\s*\/\* @vite-ignore \*\/\s*specifier\)/)
    expect(code).not.toMatch(/import\(\s*['"]html-to-image['"]\s*\)/)
  })
})
