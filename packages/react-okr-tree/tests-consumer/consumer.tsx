/**
 * 消费者类型示例（CI 的 peer-matrix 作业在这里编译**发布产物**的 d.ts）
 *
 * 这里刻意不 import `src/`，而是 import 包名 `react-okr-tree`，由同目录的 tsconfig.json 用
 * `paths` 指到 `../dist/index.d.ts`。库自身的 `pnpm typecheck` 编译的是源码，
 * 编译不到「产物 d.ts 在 React 18 的类型下是否可用」这件事——
 * 只要产物的公开面上出现一个 `@types/react@19` 才有的类型，这里就会红。
 *
 * 所以这个文件的每一条都是断言：改动公开 API 类型时，它跟着改；不要为了让 CI 绿而放宽它。
 */
import { createRef, useMemo, useRef, useState } from 'react'
import OkrTreeDefault, {
  OkrTree,
  OkrTreeGroup,
  OkrTreeViewport,
  getNodeKey,
  type OkrTreeHandle,
  type TreeNode,
  type TreeNodeData,
} from 'react-okr-tree'

type Dept = { id: number; label: string; head?: string; children?: Dept[] }

const data: Dept[] = [{ id: 1, label: '总部', children: [{ id: 2, label: '研发', head: '张三' }] }]

// 默认导出与具名导出是同一个组件（D6）
const SameComponent: typeof OkrTree = OkrTreeDefault

export function Basic() {
  const ref = useRef<OkrTreeHandle>(null)
  const rows = useMemo(() => data, [])
  return (
    <OkrTree
      data={rows}
      nodeKey="id"
      ref={ref}
      direction="horizontal"
      showCollapsable
      showNodeNum
      defaultExpandAll
      animate
      animateName="zoom-left"
      animateDuration={240}
      labelWidth={160}
      labelHeight="3rem"
      theme="feishu"
      connector="svg"
      connectorShape="orthogonal"
      onNodeClick={(node: Dept, tree: TreeNode) => console.log(node.id, tree.level)}
      onNodeExpand={(node: Dept) => node.label}
      onNodeContextMenu={(event, node: Dept) => event.preventDefault()}
      onExpandedKeysChange={keys => keys.map(k => String(k)).join(',')}
      currentKey={2}
      labelClassName={node => `lvl-${node.level}`}
      currentLableClassName="is-active"
      renderContent={node => <span>{node.label}</span>}
      renderNode={scope => <b>{`${scope.node.level}:${scope.data.label}`}</b>}
      renderExpandBtn={scope => (scope.expanded ? '−' : '+')}
      filterNodeMethod={(value: string, row: TreeNodeData) =>
        !value || String(row.label).includes(value)
      }
    />
  )
}

export function Typed() {
  // 泛型直接写在组件上（D5：源项目的 createTypedOkrTree 没有了）
  const ref = createRef<OkrTreeHandle>()
  return (
    <OkrTree<Dept>
      data={data}
      nodeKey="id"
      ref={ref}
      onCheck={(row: Dept) => row.head}
      renderNode={({ node, data: row }) => (
        <em>
          {row.label}-{node.isLeaf ? 'leaf' : 'branch'}
        </em>
      )}
    />
  )
}

export function Imperative() {
  const ref = createRef<OkrTreeHandle>()
  const run = () => {
    const h = ref.current
    if (!h) return
    h.filter('研发')
    h.expandAll()
    h.collapseAll()
    h.refreshData()
    h.append({ id: 3, label: '新部门' }, 1)
    h.insertBefore({ id: 4, label: '前置' }, 2)
    h.insertAfter({ id: 5, label: '后置' }, 2)
    h.remove(2)
    h.updateKeyChildren(1, data)
    h.setCheckedKeys([2])
    const keys: (string | number)[] = h.getCheckedKeys()
    const path: TreeNode[] = h.getNodePath(2)
    const visible: TreeNode[] = h.getVisibleNodes()
    const el: HTMLElement | null = h.getNodeEl(2)
    const moved: boolean = h.moveNode(3, 2, 'inner')
    const node = h.getNode(2)
    void [
      keys,
      path,
      visible,
      el,
      moved,
      node,
      h.store,
      h.root,
      getNodeKey('id', {} as TreeNodeData),
    ]
  }
  return <OkrTree data={data} nodeKey="id" ref={ref} showCheckbox draggable />
}

export function Grouped() {
  const [rows, setRows] = useState<Dept[]>(data)
  return (
    <OkrTreeGroup align>
      <OkrTree<Dept> data={rows} nodeKey="id" onlyBothTree direction="horizontal" leftData={data} />
      <OkrTree<Dept>
        data={rows.slice(0, 1)}
        nodeKey="id"
        onlyBothTree
        direction="horizontal"
        leftData={data}
      />
    </OkrTreeGroup>
  )
}

export function Canvas() {
  const [zoom, setZoom] = useState(1)
  return (
    <OkrTreeViewport
      zoom={zoom}
      minZoom={0.4}
      maxZoom={2}
      wheelBehavior="ctrl-zoom"
      onZoomChange={setZoom}
    >
      <OkrTree<Dept> data={data} nodeKey="id" />
    </OkrTreeViewport>
  )
}

// 引用一次，确保这条类型关系真的参与编译（noUnusedLocals 没开，靠 void 表达意图）
void SameComponent
