/**
 * 订阅原语（requirements R1）。
 *
 * 源项目用 shallowReactive 包装 Node / Store 做精细更新；React 观察不到普通对象突变，
 * 但**不能**为此把模型改成不可变——那会破坏 Q3（回写用户源数据）与 Q4（按引用比较做增量重建）。
 * 因此这里保持模型可变，只加一层显式通知：状态写入走访问器，通知在访问器里发生。
 *
 * 通知是同步的：React 18+ 的自动批处理会把一次事件里的多次通知合并成一次重渲染
 * （tests/spike-r1.spec.tsx 实测：整树批量展开时每个节点恰好重渲染一次）。
 */

/** 可订阅对象：TreeNode / TreeStore 都实现它 */
export interface Subscribable {
  /** React useSyncExternalStore 用；引用必须稳定 */
  subscribe(listener: () => void): () => void
  /** 快照值：每次通知后自增，作为「我变了」的单调标识 */
  getSnapshot(): number
}

export class Notifier implements Subscribable {
  private rev = 0
  private listeners = new Set<() => void>()

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): number => this.rev

  /**
   * 通知全部订阅者。
   * 复制一份监听器列表再遍历：订阅者（React 的 handleStoreChange）可能在回调里增删监听，
   * 直接迭代 Set 会漏掉或重复触发。
   */
  notify(): void {
    this.rev += 1
    for (const listener of [...this.listeners]) listener()
  }
}
