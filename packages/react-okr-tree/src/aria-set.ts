import type { TreeNode } from './model/node'

export interface SetPosition {
  node: TreeNode
  size: number
  pos: number
}

/**
 * 按层一次算出每个子节点的 aria-setsize / aria-posinset（O(n)，替代逐项 indexOf）。
 *
 * 语义与「先 filter 出可见兄弟、再 indexOf + 1」逐字一致：被 filter 隐藏的兄弟不计入，
 * 否则读屏会播报不存在的项；自身不可见时 pos 为 0（原式 indexOf 返回 -1）。
 * 左右两树各自成组 —— 调用方按侧各调一次。
 */
export function setPositions(list: TreeNode[]): SetPosition[] {
  let size = 0
  const positions = list.map(node => {
    if (node.visible) size += 1
    return node.visible ? size : 0
  })
  return list.map((node, i) => ({ node, size, pos: positions[i] }))
}
