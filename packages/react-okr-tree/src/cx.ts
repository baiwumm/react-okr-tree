import { getNodeKey } from './model/util'
import type { TreeNodeData } from './types'

/** 极小的视图层辅助：类名拼接与 React key 取值，只为对齐源项目模板写法，不引外部依赖 */
export function cx(...parts: Array<string | false | null | undefined | string[]>): string {
  const out: string[] = []
  for (const part of parts) {
    if (!part) continue
    if (typeof part === 'string') out.push(part)
    else out.push(...part.filter(Boolean))
  }
  return out.join(' ')
}

/** 由对象字面量表达的状态类（对应源项目 `:class="{ a: cond }"` 写法） */
export function cxState(state: Record<string, boolean | undefined | null>): string {
  const out: string[] = []
  for (const key in state) {
    if (state[key]) out.push(key)
  }
  return out.join(' ')
}

/**
 * 兄弟节点的 React key：优先用 `nodeKey` 指向的字段（与源项目 `:key="getNodeKey(child)"` 一致）。
 * 但 `nodeKey` 配了、数据里却没有该字段时取到 undefined，同层的 key 会全变成同一个 undefined，
 * React 因此无法区分兄弟并误复用子树——这里回退到 TreeNode 自增 id（唯一且随节点重建而稳定）。
 */
export function reactKey(
  nodeKey: string | undefined,
  node: { id: number; data: TreeNodeData }
): string | number {
  return (getNodeKey(nodeKey, node.data) as string | number | undefined) ?? node.id
}
