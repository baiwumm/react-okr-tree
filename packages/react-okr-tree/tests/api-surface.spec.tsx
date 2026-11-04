import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { createRef } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ScriptKind, ScriptTarget, createSourceFile, isInterfaceDeclaration } from 'typescript'
import { OkrTree, type OkrTreeHandle } from '../src/index'
import {
  methodsSection,
  attributesSection,
  eventsSection,
  slotsSection,
  viewportSection,
} from '../shared/api'

/**
 * API 表与实现之间的防漂移测试（计划 1.6 / 6.4：`shared/api.ts` 是文档站与 README 的单一来源）。
 *
 * 1.16.0 起把 props / 事件 / render props 也纳入门禁：TS 接口编译后在运行时消失，
 * 只能读源码——用 TypeScript AST 取 `OkrTreeProps` / `OkrTreeViewportProps` 的键名，
 * 与 Attributes / Events / 渲染定制三节双向比对。`virtual` 曾漏登 Attributes 而无测试报警。
 */
const srcPath = (file: string) => resolve(process.cwd(), 'src', file)

/** 从 interface 里取全部属性键（跳过调用 / 索引签名） */
const interfaceKeys = (file: string, name: string) => {
  const source = createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ScriptTarget.Latest,
    true,
    ScriptKind.TSX
  )
  let keys: Set<string> | undefined
  source.forEachChild(node => {
    if (!isInterfaceDeclaration(node) || node.name.text !== name) return
    keys = new Set(
      node.members
        .filter(member => member.name !== undefined)
        .map(member => (member.name as { text: string }).text)
    )
  })
  if (!keys) throw new Error(`${file} 里找不到 interface ${name}`)
  return keys
}

const treeProps = interfaceKeys(srcPath('OkrTree.tsx'), 'OkrTreeProps')
const viewportProps = interfaceKeys(srcPath('OkrTreeViewport.tsx'), 'OkrTreeViewportProps')
const viewportHandle = interfaceKeys(srcPath('OkrTreeViewport.tsx'), 'OkrTreeViewportHandle')

/** 表格首列 → 名字；去说明括号，拆「expandedKeys + onExpandedKeysChange」「className / style」这类合并单元格 */
const splitNames = (cell: string) =>
  cell
    .replace(/（[^）]*）/g, '')
    .split(/\s+\/\s+|\s+\+\s+/)
    .map(name => name.trim())
    .filter(Boolean)

const documented = new Set<string>()
for (const section of [attributesSection, eventsSection, slotsSection]) {
  for (const row of section.rows) {
    for (const name of splitNames(row[0])) documented.add(name)
  }
}

describe('shared/api.ts 与 OkrTreeProps 一致', () => {
  it('每个真实 prop 都写进了 Attributes / Events / 渲染定制三节', () => {
    expect([...treeProps].filter(name => !documented.has(name))).toEqual([])
  })

  it('文档里的每个名字都是真实 prop（renderToolbar 属于 OkrTreeViewport）', () => {
    const documentedTree = new Set([...documented].filter(name => name !== 'renderToolbar'))
    expect([...documentedTree].filter(name => !treeProps.has(name))).toEqual([])
    expect(documentedTree.size).toBe(treeProps.size)
  })

  it('renderToolbar 确实声明在 OkrTreeViewportProps 上', () => {
    expect(documented.has('renderToolbar')).toBe(true)
    expect(viewportProps.has('renderToolbar')).toBe(true)
  })
})

describe('shared/api.ts 与 OkrTreeViewport 一致', () => {
  const viewportEvents = new Set(['onZoomChange', 'onOffsetChange'])
  const actualProps = new Set([...viewportProps].filter(name => !viewportEvents.has(name)))

  const rows = viewportSection.rows
  const documentedProps = new Set<string>()
  for (const row of rows.filter(row => row[1].startsWith('prop'))) {
    for (const name of splitNames(row[0])) documentedProps.add(name)
  }
  const documentedEvents = new Set(
    rows.filter(row => row[1].startsWith('event')).map(row => row[0])
  )
  const documentedMethods = new Set(
    rows.filter(row => row[1].startsWith('method')).map(row => row[0].replace(/\(.*$/, ''))
  )

  it('props 双向一致（缩放范围 / 受控值 / 工具栏 / 容器 props）', () => {
    expect([...documentedProps].filter(name => !actualProps.has(name))).toEqual([])
    expect([...actualProps].filter(name => !documentedProps.has(name))).toEqual([])
  })

  it('events 双向一致（onZoomChange / onOffsetChange）', () => {
    expect([...documentedEvents].filter(name => !viewportEvents.has(name))).toEqual([])
    expect([...viewportEvents].filter(name => !documentedEvents.has(name))).toEqual([])
  })

  it('ref 方法双向一致（含 exportImage）', () => {
    expect([...documentedMethods].filter(name => !viewportHandle.has(name))).toEqual([])
    expect([...viewportHandle].filter(name => !documentedMethods.has(name))).toEqual([])
  })
})

describe('shared/api.ts 与 OkrTreeHandle 一致', () => {
  const documented = new Set<string>()
  for (const row of methodsSection.rows) {
    // 最后一行是「store / root」这种合并单元格，按分隔符拆开
    for (const name of row[0].split(' / ')) documented.add(name.trim())
  }

  it('文档里的每个方法都能在 ref 上拿到', () => {
    const ref = createRef<OkrTreeHandle>()
    render(<OkrTree data={[{ id: 1, label: 'R' }]} ref={ref} />)
    const actual = ref.current!

    const missing = [...documented].filter(
      name => actual[name as keyof OkrTreeHandle] === undefined
    )
    expect(missing).toEqual([])
  })

  it('ref 上的每个成员都写进了文档表（不允许出现未记录的公开方法）', () => {
    const ref = createRef<OkrTreeHandle>()
    render(<OkrTree data={[{ id: 1, label: 'R' }]} ref={ref} />)

    const undocumented = Object.keys(ref.current!).filter(name => !documented.has(name))
    expect(undocumented).toEqual([])
  })

  it('方法面数量与表格行数一致', () => {
    const ref = createRef<OkrTreeHandle>()
    render(<OkrTree data={[{ id: 1, label: 'R' }]} ref={ref} />)
    // 表格 29 行，其中「store / root」占 2 个成员
    expect(methodsSection.rows.length).toBe(29)
    expect(Object.keys(ref.current!).length).toBe(documented.size)
  })
})
