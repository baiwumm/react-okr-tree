import { markNodeData, getNodeKey, warnReadonlySource } from './util'
import { Notifier } from './notifier'
import type { Subscribable } from './notifier'
import type { TreeStore } from './tree-store'
import type { TreeKey, TreeNodeData } from '../types'

const getPropertyFromData = function (node: TreeNode, prop: string) {
  const props: Record<string, any> = node.store.props || {}
  const data = node.data || {}
  const config = props[prop]

  if (typeof config === 'function') {
    return config(data, node)
  } else if (typeof config === 'string') {
    return data[config]
  } else if (typeof config === 'undefined') {
    const dataProp = data[prop]
    return dataProp === undefined ? '' : dataProp
  }
}

let nodeIdSeed = 0

/** 仅用于测试复位内部 id 计数器 */
export function resetNodeIdSeed(): void {
  nodeIdSeed = 0
}

export interface TreeNodeOptions {
  data?: TreeNodeData | TreeNodeData[] | null
  store?: TreeStore
  parent?: TreeNode | null
  [key: string]: any
}

/** 子节点容器：普通数组，变更一律走 TreeNode 的 replace* / insert* 方法（由它们负责通知） */
export const createChildNodes = (): TreeNode[] => []

/**
 * 数据节点模型。
 *
 * 响应式约定（requirements R1 第 6 条）：
 * - 状态字段是「私有字段 + 公开访问器」，赋值即通知，因此源项目里 `node.expanded = true`
 *   这类语句可以逐字平移，不存在忘记 bump；
 * - 等值短路（值没变就不通知），避免重复赋值造成无谓重渲染；
 * - `data` 及所有源数据对象保持原始引用，不做任何包装（否则破坏 setData 的引用比较
 *   与 removeChild 的 indexOf 逻辑，见 Q3/Q4）；
 * - 子列表的变更通知的是「拥有该列表的节点」，因为它负责渲染子循环。
 */
export class TreeNode implements Subscribable {
  id: number
  isLeftChild: boolean
  store!: TreeStore

  /** 懒加载完成（成功或失败）后依次执行的回调 */
  loadCallbacks: Array<(success: boolean) => void> = []

  private notifier = new Notifier()
  private _data: any = null
  private _parent: TreeNode | null = null
  private _level = 0
  private _expanded = false
  private _leftExpanded = false
  private _isCurrent = false
  private _visible = true
  private _checked = false
  private _indeterminate = false
  private _isLeaf = false
  private _loaded = false
  private _loading = false
  private _childNodes: TreeNode[] = []
  private _leftChildNodes: TreeNode[] = []

  constructor(options: TreeNodeOptions, isLeftChild = false) {
    this.isLeftChild = isLeftChild
    this.id = nodeIdSeed++
    for (const name in options) {
      if (Object.prototype.hasOwnProperty.call(options, name)) {
        ;(this as any)[name] = options[name]
      }
    }
    // 构造期直接写私有字段：此时挂监听的人还不存在，走 setter 只会产生无意义的通知
    this._level = 0
    if (this.parent) {
      this._level = this.parent.level + 1
    }
    if (!this.store) {
      throw new Error('[Node]store is required!')
    }
  }

  subscribe = this.notifier.subscribe
  getSnapshot = this.notifier.getSnapshot

  /** 主动通知（供 TreeStore 的批量操作与组件登记使用） */
  notify(): void {
    this.notifier.notify()
    this.store?.notifyMutation()
  }

  get parent(): TreeNode | null {
    return this._parent
  }
  /**
   * 父节点变化也要通知：节点的 aria-setsize / aria-posinset 读的是父节点的子列表，
   * 移动节点（moveNode）后若不重渲染，序号会停在旧值。
   */
  set parent(value: TreeNode | null) {
    if (this._parent === value) return
    this._parent = value
    this.notify()
  }

  get level(): number {
    return this._level
  }
  /** 数据属性 data-level 与 aria-level 都读它，moveNode 修正层级后必须重渲染 */
  set level(value: number) {
    if (this._level === value) return
    this._level = value
    this.notify()
  }

  get data(): any {
    return this._data
  }
  set data(value: any) {
    if (this._data === value) return
    this._data = value
    this.notify()
  }

  get expanded(): boolean {
    return this._expanded
  }
  set expanded(value: boolean) {
    if (this._expanded === value) return
    this._expanded = value
    this.notify()
  }

  get leftExpanded(): boolean {
    return this._leftExpanded
  }
  set leftExpanded(value: boolean) {
    if (this._leftExpanded === value) return
    this._leftExpanded = value
    this.notify()
  }

  get isCurrent(): boolean {
    return this._isCurrent
  }
  set isCurrent(value: boolean) {
    if (this._isCurrent === value) return
    this._isCurrent = value
    this.notify()
  }

  get visible(): boolean {
    return this._visible
  }
  set visible(value: boolean) {
    if (this._visible === value) return
    this._visible = value
    this.notify()
  }

  get checked(): boolean {
    return this._checked
  }
  set checked(value: boolean) {
    if (this._checked === value) return
    this._checked = value
    this.notify()
  }

  get indeterminate(): boolean {
    return this._indeterminate
  }
  set indeterminate(value: boolean) {
    if (this._indeterminate === value) return
    this._indeterminate = value
    this.notify()
  }

  get isLeaf(): boolean {
    return this._isLeaf
  }
  set isLeaf(value: boolean) {
    if (this._isLeaf === value) return
    this._isLeaf = value
    this.notify()
  }

  get loaded(): boolean {
    return this._loaded
  }
  set loaded(value: boolean) {
    if (this._loaded === value) return
    this._loaded = value
    this.notify()
  }

  get loading(): boolean {
    return this._loading
  }
  set loading(value: boolean) {
    if (this._loading === value) return
    this._loading = value
    this.notify()
  }

  /** 读取用：返回活数组。变更必须走 replaceChildNodes / insertChildAt / removeChildAt */
  get childNodes(): TreeNode[] {
    return this._childNodes
  }

  get leftChildNodes(): TreeNode[] {
    return this._leftChildNodes
  }

  replaceChildNodes(next: TreeNode[]): void {
    this._childNodes.splice(0, this._childNodes.length, ...next)
    this.notify()
  }

  replaceLeftChildNodes(next: TreeNode[]): void {
    this._leftChildNodes.splice(0, this._leftChildNodes.length, ...next)
    this.notify()
  }

  get key(): TreeKey | undefined {
    const nodeKey = this.store.key
    if (this._data && nodeKey) return this._data[nodeKey]
    return undefined
  }

  get label(): string {
    return getPropertyFromData(this, 'label')
  }

  get disabled(): boolean {
    return !!getPropertyFromData(this, 'disabled')
  }

  /** 构建子树与初始状态 */
  init(isLeftChild: boolean) {
    const store = this.store
    if (this._data) {
      this.setData(this._data, isLeftChild)
      if (store.defaultExpandAll || !store.showCollapsable) {
        this.expanded = true
        this.leftExpanded = true
      }
    }

    if (!Array.isArray(this._data)) {
      markNodeData(this, this._data)
    }
    if (!this._data) return
    const defaultExpandedKeys = store.defaultExpandedKeys
    const key = store.key
    if (key && defaultExpandedKeys && defaultExpandedKeys.indexOf(this.key as TreeKey) !== -1) {
      this.expand(true)
    }
    // current-node-key 初始选中由 TreeStore 构造末尾统一处理（Q2：左右两树同时生效、无残留高亮）
    this.updateLeafState()
  }

  setData(data: any, isLeftChild: boolean = this.isLeftChild) {
    if (!Array.isArray(data)) {
      markNodeData(this, data)
    }
    this._data = data
    // 注销旧子树，避免 nodesMap 残留过期节点
    this._childNodes.forEach(child => this.store.deregisterNode(child))
    this._childNodes = createChildNodes()
    let children: any[]
    if (this.level === 0 && Array.isArray(this._data)) {
      children = this._data
    } else {
      children = getPropertyFromData(this, 'children') || []
    }
    for (let i = 0, j = children.length; i < j; i++) {
      this.insertChild({ data: children[i] }, null, null, isLeftChild)
    }
    // 懒加载：初始构建时已带 children 的节点视为已加载；没有 children（或为空数组）的
    // 节点视为未加载，首次展开时触发 load。非 lazy 模式全部视为已加载。
    this.loaded = !this.store.lazy || children.length > 0
    this.notify()
  }

  /**
   * data 引用未变、内部原地变更时，按当前源数据增量重建子树（requirements Q4）。
   * 尽量复用已有子节点（先按 data 引用、再按 key 匹配），保留 expanded / leftExpanded / isCurrent 状态。
   */
  updateChildren() {
    const store = this.store
    const childrenKey = (store.props && store.props.children) || 'children'
    let newData: any[]
    if (this.level === 0) {
      newData = Array.isArray(this._data) ? this._data : []
    } else {
      newData = (this._data && this._data[childrenKey]) || []
    }

    // 脏检查（Q4 增量语义 + 1.5.0 性能）：源 children 与现有 childNodes 逐项同引用且数量一致时，
    // 本层结构未变——跳过本层重建（不做 Map 匹配、不触发无谓重渲染），仅向下做廉价检查。
    // 深层结构变更（如孙子层 push）会在对应层级各自命中脏检查后重建。
    const currentNodes = this._childNodes
    if (
      currentNodes.length === newData.length &&
      currentNodes.every((n, i) => n.data === newData[i])
    ) {
      currentNodes.forEach(child => child.updateChildren())
      return
    }

    const oldNodes = this._childNodes.slice()
    const byData = new Map<any, TreeNode>()
    oldNodes.forEach(n => byData.set(n.data, n))
    const used = new Set<TreeNode>()

    const next: TreeNode[] = []
    for (let i = 0; i < newData.length; i++) {
      const childData = newData[i]
      let node = byData.get(childData)
      if ((!node || used.has(node)) && store.key && childData && typeof childData === 'object') {
        const k = childData[store.key]
        node = oldNodes.find(n => !used.has(n) && n.key !== undefined && n.key === k)
      }
      if (node && !used.has(node)) {
        used.add(node)
        if (node.data !== childData) {
          // key 相同但引用变化：换绑源数据并重新注册
          store.deregisterNode(node)
          node.data = childData
          markNodeData(node, childData)
          store.registerNode(node)
        }
        node.parent = this
        node.level = this.level + 1
        node.updateChildren()
      } else {
        node = createNode({ data: childData, parent: this, store }, this.isLeftChild)
        node.level = this.level + 1
        used.add(node)
      }
      next.push(node)
    }

    oldNodes.forEach(n => {
      if (!used.has(n)) {
        store.deregisterNode(n)
        if (store.currentNode === n) store.currentNode = null
        if (store.currentLeftNode === n) store.currentLeftNode = null
        n.parent = null
      }
    })

    // 与 setData 一致：重建后按源数据是否带 children 刷新懒加载状态
    this.loaded = !store.lazy || newData.length > 0
    this.replaceChildNodes(next)
    this.updateLeafState()
    // 复用的节点保留勾选态、新节点默认未勾选，按子树重算自身与祖先的全选 / 半选
    this.refreshCheckedUpward()
  }

  /**
   * 只读版脏检查：源数据 children 与本层 childNodes 是否已经不一致（含逐层向下）。
   *
   * React 版需要它来决定「这次渲染到底要不要走 setData」——setData 会连带 setLeftData
   * 整棵重建左树，若无脑每帧调用，左子树的过滤 / 展开结果会被反复冲掉。
   * 判据与 updateChildren 完全一致，保证两者不会一个说变了、另一个说没变。
   */
  isStructureDirty(): boolean {
    const store = this.store
    const childrenKey = (store.props && store.props.children) || 'children'
    let source: any[]
    if (this.level === 0) {
      source = Array.isArray(this._data) ? this._data : []
    } else {
      source = (this._data && this._data[childrenKey]) || []
    }
    const nodes = this._childNodes
    if (nodes.length !== source.length) return true
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].data !== source[i]) return true
      if (nodes[i].isStructureDirty()) return true
    }
    return false
  }

  insertChild(
    child: TreeNodeOptions | TreeNode,
    index?: number | null,
    batch?: boolean | null,
    isLeftChild?: boolean
  ) {
    if (!child) throw new Error('insertChild error: child is required.')
    let node: TreeNode
    if (!(child instanceof TreeNode)) {
      if (!batch) {
        const children = this.getChildren(true)
        if (children && children.indexOf(child.data) === -1) {
          try {
            if (index === undefined || index === null || index < 0) {
              children.push(child.data)
            } else {
              children.splice(index, 0, child.data)
            }
          } catch {
            // 冻结/只读源数据：跳过回写（视图仍会插入节点）并给出开发期警告
            warnReadonlySource('append / insert（写入 children）')
          }
        }
      }
      node = createNode(
        { ...child, parent: this, store: this.store },
        isLeftChild === undefined ? this.isLeftChild : isLeftChild
      )
    } else {
      node = child
      node.parent = this
    }
    node.level = this.level + 1
    if (index === undefined || index === null || index < 0) {
      this._childNodes.push(node)
    } else {
      this._childNodes.splice(index, 0, node)
    }
    this.notify()
    this.updateLeafState()
    // 新子节点默认未勾选，可能改变自身的全选 / 半选（进而影响祖先）
    this.refreshCheckedUpward()
  }

  getChildren(forceInit = false): any[] | null {
    if (this.level === 0) return this._data
    const data = this._data
    if (!data) return null

    const props = this.store.props
    let children = 'children'
    if (props) {
      children = props.children || 'children'
    }

    // 冻结/只读源数据：占位与初始化写入会抛 TypeError，降级为跳过写入并给出开发期警告
    if (data[children] === undefined) {
      try {
        data[children] = null
      } catch {
        /* 只读数据：跳过占位写入 */
      }
    }

    if (forceInit && !data[children]) {
      try {
        data[children] = []
      } catch {
        warnReadonlySource('append / insert（写入 children）')
        return null
      }
    }

    return data[children]
  }

  updateLeafState() {
    // 懒加载：未加载节点的 isLeaf 由 props.isLeaf 字段（或函数）决定，默认视为有子节点
    if (this.store.lazy && !this._loaded && this.level > 0) {
      const isLeafProp = this.store.props && (this.store.props as any).isLeaf
      this.isLeaf = isLeafProp === undefined ? false : !!getPropertyFromData(this, 'isLeaf')
      return
    }
    const childNodes = this._childNodes
    this.isLeaf = !childNodes || childNodes.length === 0
  }

  /** 节点的收起 */
  collapse() {
    this.expanded = false
  }

  /**
   * 复选框选中：checkStrictly 下只改自身；否则 deep（默认）时向下联动全部后代
   * （含 disabled 节点，与 el-tree 一致——disabled 仅阻止直接点击），并向上重算祖先的
   * 选中 / 半选态。indeterminate 只能由 refreshCheckedUpward 从子节点推导，不直接置位。
   */
  setChecked(value: boolean, deep = !this.store.checkStrictly) {
    if (this.store.checkStrictly) {
      this.checked = value
      this.indeterminate = false
      return
    }
    this.checked = value
    this.indeterminate = false
    if (deep) {
      const walk = (node: TreeNode) => {
        node.checked = value
        node.indeterminate = false
        node.childNodes.forEach(walk)
      }
      this._childNodes.forEach(walk)
    }
    this.parent?.refreshCheckedUpward()
  }

  /**
   * 由子节点重算自身选中 / 半选，并继续向上重算全部祖先（checkStrictly 下不联动）。
   * 勾选联动、增删子节点、懒加载完成后共用。
   */
  refreshCheckedUpward() {
    if (this.store.checkStrictly) return
    // 从自身开始沿父链上算（level 0 的虚拟根不参与），别名是这个遍历的固有写法
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: TreeNode | null = this
    while (node && node.level > 0) {
      const children = node.childNodes
      if (children.length > 0) {
        const all = children.every(c => c.checked)
        const some = children.some(c => c.checked || c.indeterminate)
        node.checked = all
        node.indeterminate = !all && some
      }
      node = node.parent
    }
  }

  /**
   * 节点的展开；expandParent 为 true 时连同祖先一起展开。
   * 懒加载模式下展开未加载节点会先触发 load，resolve 后写入源数据 children、构建子节点，再展开；
   * reject / load 抛错时保持折叠态（可重试）。
   */
  expand(expandParent = false) {
    const store = this.store
    const doExpand = () => {
      if (expandParent) {
        let parent = this.parent
        while (parent && parent.level > 0) {
          parent.expand(false)
          parent = parent.parent
        }
      }
      if (this.isLeftChild) this.leftExpanded = true
      else this.expanded = true
    }
    if (store.lazy && store.load && !this._loaded && !this._isLeaf && this.level > 0) {
      this.loadData(success => {
        if (!success) return
        doExpand()
        store.onExpandSettled?.()
      })
      return
    }
    doExpand()
  }

  /**
   * 触发懒加载：调用 store.load，resolve 后经 insertChild 同步写入源数据 children 并构建子节点。
   * 加载中重复调用只会登记回调，不重复发起 load；完成（成功或失败）后依次执行全部回调。
   */
  loadData(onSettled?: (success: boolean) => void) {
    const store = this.store
    if (!store.lazy || !store.load || this._loaded || this.level === 0) {
      onSettled?.(this._loaded)
      return
    }
    if (onSettled) this.loadCallbacks.push(onSettled)
    if (this._loading) return
    this.loading = true
    const resolve = (children?: TreeNodeData[]) => {
      if (this.loading) this.finishLoad(true, children)
    }
    const reject = () => {
      if (this.loading) this.finishLoad(false)
    }
    try {
      store.load(this, resolve, reject)
    } catch (error) {
      // load 同步抛错：回到折叠态且可重试
      this.finishLoad(false)
      console.error('[react-okr-tree] load 函数执行出错:', error)
    }
  }

  private finishLoad(success: boolean, children?: TreeNodeData[]) {
    const callbacks = this.loadCallbacks
    this.loadCallbacks = []
    this.loading = false
    if (success) {
      this.loaded = true
      if (Array.isArray(children)) {
        for (const childData of children) {
          // insertChild 会同步写入源数据 children（与 append 语义一致）并构建子节点
          this.insertChild({ data: childData })
        }
      }
    }
    this.updateLeafState()
    callbacks.forEach(cb => cb(success))
  }

  /** 等待该节点未完成的懒加载结束；已加载或非懒加载时立即 resolve */
  whenLoaded(): Promise<boolean> {
    if (!this.store.lazy || this._loaded || this.level === 0) {
      return Promise.resolve(this._loaded)
    }
    return new Promise(resolve => this.loadCallbacks.push(resolve))
  }

  removeChild(child: TreeNode) {
    const children = this.getChildren() || []
    const dataIndex = children.indexOf(child.data)
    if (dataIndex > -1) {
      try {
        children.splice(dataIndex, 1)
      } catch {
        // 深层冻结的 children 数组：跳过源数据删除并给出开发期警告，视图仍正常移除
        warnReadonlySource('remove（从 children 删除）')
      }
    }

    const index = this._childNodes.indexOf(child)

    if (index > -1) {
      if (this.store) this.store.deregisterNode(child)
      child.parent = null
      this._childNodes.splice(index, 1)
      this.notify()
    }

    this.updateLeafState()
    this.refreshCheckedUpward()
  }

  insertBefore(child: TreeNodeOptions | TreeNode, ref?: TreeNode) {
    let index: number | undefined
    if (ref) {
      index = this._childNodes.indexOf(ref)
    }
    this.insertChild(child, index)
  }

  insertAfter(child: TreeNodeOptions | TreeNode, ref?: TreeNode) {
    let index: number | undefined
    if (ref) {
      index = this._childNodes.indexOf(ref)
      if (index !== -1) index += 1
    }
    this.insertChild(child, index)
  }
}

/**
 * 创建节点。
 *
 * 源项目要把实例包成 shallowReactive 代理后再初始化，以保证 parent / 注册表持有的是代理；
 * React 版没有代理这一层（通知在访问器里），实例本身即身份，因此直接 new + init。
 */
export function createNode(options: TreeNodeOptions, isLeftChild = false): TreeNode {
  const node = new TreeNode(options, isLeftChild)
  node.init(isLeftChild)
  node.store.registerNode(node)
  return node
}

export { getNodeKey }
