import { useSyncExternalStore } from 'react'
import type { TreeNode } from '../model/node'

/** 服务端快照：SSR 下不订阅，首屏正确性来自直接读模型字段（requirements R8） */
function serverSnapshot(): number {
  return 0
}

/**
 * 订阅单个节点的版本（requirements R1）。
 *
 * 只订阅自己：展开态、勾选、选中、可见性、自己的子列表都挂在自身上，
 * 因此点击一个节点的 +/- 只有它重渲染。
 *
 * 需要读「兄弟序号」的信息（aria-setsize / aria-posinset）不在此处订阅父节点，
 * 而是由父节点在渲染子列表时算好当 props 传下来——那样订阅关系是单向的，
 * moveNode 换父级时不会出现「订阅停在旧父节点」的失配。
 */
export function useNodeVersion(node: TreeNode): number {
  return useSyncExternalStore(node.subscribe, node.getSnapshot, serverSnapshot)
}
