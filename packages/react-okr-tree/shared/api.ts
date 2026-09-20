/**
 * API 文档数据的单一来源（对齐源项目 vue3-okr-tree 的 shared/api.ts，换成 React 命名）。
 *
 * 三处消费：
 * - apps/website 的 `<ApiTable>`（文档站 API 页）
 * - README 的 API 段落（1.1.0 起由 scripts/gen-readme-api.mjs 生成）
 * - 类型定义由 src/ 自动派生，这里是「人读的说明文案」的唯一副本
 *
 * 注意：本文件可能被 Node 直接导入，只使用可擦除语法。
 * 单元格里的 <code> / <strong> 是 HTML 片段，由渲染器与 README 生成器分别处理。
 *
 * 命名规则（requirements R3 / D1–D4）：kebab-case → camelCase；
 * 事件 → onXxx 回调；插槽 → render props；v-model:x → x + onXxxChange。
 * 源项目的 `current-lable-class-name` / `show-collapsable` 等原版拼写**刻意保留**。
 */

export interface ApiSection {
  /** 锚点 id（文档站与 README 通用） */
  id: string
  title: string
  /** 表格上方的补充说明（HTML 片段，可为空） */
  intro: string
  columns: string[]
  rows: string[][]
}

export const attributesSection: ApiSection = {
  id: 'api-attributes',
  title: 'Attributes',
  intro:
    '与 vue3-okr-tree 逐项对齐（含原版拼写）；<code>className</code> / <code>style</code> / <code>children</code> 为 React 侧新增。',
  columns: ['prop', '说明', '类型', '可选值', '默认值'],
  rows: [
    ['data', '展示数据（数组，支持多根）', 'array', '—', '— (必填)'],
    ['direction', '树的展开方向', 'string', 'horizontal / vertical', 'vertical'],
    [
      'onlyBothTree',
      '飞书 OKR 模式：子树在根节点左右两边展开。只在 <code>direction="horizontal"</code> 时有效，且必须提供 <code>leftData</code>',
      'boolean',
      '—',
      'false',
    ],
    ['leftData', '左子树的数据，仅在 onlyBothTree 模式启用', 'array', '—', '—'],
    [
      'labelWidth',
      '节点宽度。number 单位 px；string 直接作为 style.width',
      'string / number',
      '—',
      'auto',
    ],
    [
      'labelHeight',
      '节点高度。number 单位 px；string 直接作为 style.height',
      'string / number',
      '—',
      'auto',
    ],
    [
      'labelClassName',
      '节点 className 的回调或固定串。<strong>入参是内部 TreeNode 实例</strong>（源数据在 <code>node.data</code>）',
      'Function(node) / string',
      '—',
      '—',
    ],
    ['currentLableClassName', '当前选中节点的 className（保留原版拼写）', 'Function(node) / string', '—', '—'],
    [
      'showCollapsable',
      '节点是否可展开/折叠（显示 +/- 圆盘）。为 false 时组件<strong>强制全部展开</strong>（原版行为）',
      'boolean',
      '—',
      'false',
    ],
    [
      'accordion',
      '手风琴：用户展开某节点时自动收起同级兄弟。只作用于<strong>交互</strong>展开（按钮、点卡片、键盘）；<code>expandNode</code> 与受控 <code>expandedKeys</code> 不受互斥限制',
      'boolean',
      '—',
      'false',
    ],
    [
      'expandOnClickNode',
      '点击卡片内容切换展开。叶子只选中不切换；OKR 根节点只切右侧子树',
      'boolean',
      '—',
      'false',
    ],
    [
      'showCheckbox',
      '复选框模式：卡片前渲染勾选框，父子联动半选态（<code>checkStrictly</code> 可关闭）。OKR 左右两树勾选独立维护，方法按 key 对两树同时生效',
      'boolean',
      '—',
      'false',
    ],
    ['checkStrictly', '父子不联动：勾选只作用于自身，无半选传播', 'boolean', '—', 'false'],
    [
      'defaultCheckedKeys',
      '初始勾选的 key 数组（需 <code>nodeKey</code>）。运行时变更 = 先清空再按新列表应用；data 重建后不恢复',
      'array',
      '—',
      '—',
    ],
    [
      'draggable',
      '拖拽换父级（HTML5 DnD）：可放到目标节点的 prev / inner / next。移动会同步修改源数据 children，inner 时目标自动展开。禁止放进自身或其子树；OKR 跨左右树默认禁止',
      'boolean',
      '—',
      'false',
    ],
    ['allowDrag', '返回 false 禁止拖动该节点（disabled 节点恒不可拖）', 'Function(node)', '—', '—'],
    [
      'allowDrop',
      '返回 false 禁止该放置位置；跨左右树默认禁止，明确返回 true 可放开',
      'Function(draggingNode, dropNode, type)',
      "type: 'prev' / 'inner' / 'next'",
      '—',
    ],
    [
      'connector',
      '连接线渲染模式。<code>svg</code> 只替换线条渲染，布局与 css 模式完全一致，随展开收起与尺寸变化自动重绘',
      'string',
      'css / svg',
      'css',
    ],
    ['connectorShape', 'svg 模式的路径形状（仅 <code>connector="svg"</code> 生效）', 'string', 'curve / orthogonal / straight', 'curve'],
    [
      'unstyled',
      '去掉卡片外观（背景/边框/圆角/阴影，含 hover），保留布局与连接线。<strong>刻意不动</strong> padding / 字号 / 文字色——改 padding 会移动节点盒、牵动连接线几何',
      'boolean',
      '—',
      'false',
    ],
    ['showNodeNum', '折叠时在圆盘内显示子节点数（只计未被 filter 隐藏的可见子节点）', 'boolean', '—', 'false'],
    ['defaultExpandAll', '默认全部展开（仅在 showCollapsable 为 true 时有意义）', 'boolean', '—', 'false'],
    [
      'renderContent',
      '节点内容区渲染函数。<strong>React 版不传 <code>h</code></strong>（D1），返回 <code>ReactNode</code>；入参 <code>node</code> 为内部 TreeNode（源数据在 <code>node.data</code>，文本在 <code>node.label</code>）',
      'Function(node)',
      '—',
      '—',
    ],
    ['nodeBtnContent', '展开按钮内容渲染函数，参数约定同上', 'Function(node)', '—', '—'],
    [
      'nodeComponent',
      '节点内容组件，以 <code>{ node, data }</code> 为 props。优先级 <code>renderNode</code> &gt; <code>nodeComponent</code> &gt; <code>renderContent</code>',
      'ComponentType',
      '—',
      '—',
    ],
    ['props', '字段映射配置，见下表', 'object', '—', '见下表'],
    ['nodeKey', '节点唯一标识字段名（整棵树应唯一）', 'string', '—', '—'],
    ['defaultExpandedKeys', '默认展开的 key 数组（需 nodeKey）；OKR 下左右两树同时生效', 'array', '—', '—'],
    ['currentNodeKey', '初始选中节点的 key（需 nodeKey，单向）', 'string / number', '—', '—'],
    [
      'filterNodeMethod',
      '节点筛选方法，返回 false 隐藏。<code>filter(\'\')</code> 时同样执行，需对空值返回 true 才能恢复全部显示',
      'Function(value, data, node)',
      '—',
      '—',
    ],
    ['animate', '展开过渡动画。系统开启「减弱动态效果」时自动按关闭处理', 'boolean', '—', 'false'],
    [
      'animateName',
      '动画名',
      'string',
      'okr-fade-in-linear / okr-fade-in / okr-zoom-in-center / okr-zoom-in-top / okr-zoom-in-bottom / okr-zoom-in-left',
      'okr-zoom-in-center',
    ],
    ['animateDuration', '动画时长 ms', 'number', '—', '200'],
    ['alignRoot', 'OKR 模式下按左右子树自动对齐根节点（纯 CSS），展开/收起不改变根位置；false 回退原版行为', 'boolean', '—', 'true'],
    [
      'theme',
      '内置主题或自定义名字（自定义需自写 <code>.okr-theme-{name}</code> 变量）。所有外观取值均可用 <code>--okr-*</code> 覆盖',
      'string',
      'default / feishu / dark / auto / minimal / colorful',
      'default',
    ],
    [
      'expandedKeys + onExpandedKeysChange',
      '受控展开态（需 nodeKey）：列表内展开、其余收起。未传 <code>expandedKeys</code> 时为非受控（默认行为）。只传值不传回调 = 锁定不可交互改',
      'array / Function(keys)',
      '—',
      '—',
    ],
    [
      'currentKey + onCurrentKeyChange',
      '受控选中态（需 nodeKey），<code>null</code> 表示无选中',
      'string / number / null / Function(key)',
      '—',
      '—',
    ],
    ['lazy', '懒加载：初始 data 中没有 children（或为空数组）的节点视为未加载，首次展开时调 <code>load</code>', 'boolean', '—', 'false'],
    [
      'load',
      '懒加载取数函数。<code>resolve(children)</code> 后子节点写入源数据 children 并展开；<code>reject()</code> 或抛错回到折叠态、可重试。<code>node.isLeftChild</code> 可区分 OKR 左树',
      'Function(node, resolve, reject?)',
      '—',
      '—',
    ],
    [
      'deepWatch',
      'data 深度侦听开关（创建期生效）：<code>true</code> 时每次渲染做结构脏检查以接住原地变更；<code>false</code> 只响应引用变化。React 下的能力边界见 requirements R2 / D7',
      'boolean',
      '—',
      'true',
    ],
    ['className / style', '透传到 <code>.org-chart-container</code> 根容器', 'string / CSSProperties', '—', '—'],
    ['children', '传函数时等价 <code>renderNode</code>（对应源项目 <code>#default</code> 插槽）', 'ReactNode | Function(scope)', '—', '—'],
  ],
}

export const propsSection: ApiSection = {
  id: 'api-props',
  title: 'props（字段映射配置）',
  intro: '通过 <code>props</code> prop 传入。',
  columns: ['字段', '说明', '类型', '默认值'],
  rows: [
    ['label', '节点文本：属性名或函数', 'string / function(data, node)', 'label'],
    ['children', '子节点属性名', 'string', 'children'],
    [
      'disabled',
      '禁用字段（<strong>真实生效</strong>：<code>is-disabled</code>、不选中、不触发 onNodeClick、不可拖）',
      'string / function(data, node)',
      'disabled',
    ],
    ['isLeaf', '叶子字段：lazy 下未加载节点据此判定，标记为叶子则不显示按钮、不触发 load', 'string / function(data, node)', '—'],
  ],
}

export const eventsSection: ApiSection = {
  id: 'api-events',
  title: 'Events（回调 props）',
  intro:
    '<code>node</code> 均为内部 TreeNode 实例。源项目回调的第三参 <code>nodeComponent</code>（组件实例）在 React 无对应概念，已移除（D2）；DOM 定位用 <code>handle.getNodeEl()</code>。',
  columns: ['回调', '说明', '参数'],
  rows: [
    ['onNodeClick', '节点被点击（同时设置选中态）', '(data, node)'],
    ['onNodeExpand', '节点展开', '(data, node)'],
    ['onNodeCollapse', '节点收起', '(data, node)'],
    [
      'onNodeContextMenu',
      '节点右键。<strong>仅当传入本回调时</strong>才阻止浏览器默认菜单。事件参数是 React 合成事件，原生事件取 <code>event.nativeEvent</code>（D11）',
      '(event, data, node)',
    ],
    ['onExpandedKeysChange', '受控展开态变化时触发（仅传入 expandedKeys 时）', '(keys)'],
    ['onCurrentKeyChange', '受控选中态变化时触发（仅传入 currentKey 时）', '(key | null)'],
    [
      'onCheck',
      '复选框被点击时触发（仅 showCheckbox；程序化 setCheckedKeys 不触发）',
      '(data, { checkedNodes, checkedKeys, halfCheckedNodes, halfCheckedKeys })',
    ],
    [
      'onCheckChange',
      '节点勾选态变化时触发（仅 showCheckbox；每个受影响节点各一次，含联动与 setCheckedKeys 批量变更）',
      '(data, checked, indeterminate)',
    ],
    ['onNodeDragStart', '开始拖拽（仅 draggable）', '(node, event)'],
    ['onNodeDragEnter', '拖拽进入某节点', '(draggingNode, dropNode, event)'],
    ['onNodeDragLeave', '拖拽离开某节点', '(draggingNode, dropNode, event)'],
    ['onNodeDragOver', '悬停在有效放置区内', '(draggingNode, dropNode, event)'],
    ['onNodeDragEnd', '拖拽结束；未完成放置时后两参为 null', '(draggingNode, dropNode | null, dropType | null, event)'],
    ['onNodeDrop', '完成放置（源数据已在 moveNode 中同步）', '(draggingNode, dropNode, dropType, event)'],
  ],
}

export const methodsSection: ApiSection = {
  id: 'api-methods',
  title: 'Methods（通过 ref 调用）',
  intro:
    '通过 <code>ref</code> 拿到 <code>OkrTreeHandle</code> 调用。增删类方法会同步修改传入的源数据（与源项目一致）。入参普遍接受 <strong>key / data 对象 / TreeNode 实例</strong>三种形态。',
  columns: ['方法', '说明', '参数'],
  rows: [
    ['filter', '触发过滤；onlyBothTree 下同时过滤左右子树。未设置 filterNodeMethod 时抛错', '(value)'],
    ['updateKeyChildren', '用新数据替换 key 节点的全部子节点（需 nodeKey，缺失抛错）', '(key, data)'],
    ['getNode', '获取内部 Node。OKR 下右树优先，未命中回退左树；<strong>未设 nodeKey 时按 data 对象查不到</strong>', '(data)'],
    ['getNodeEl', '取节点对应的 DOM 元素；未渲染/不可见时为 null', '(data)'],
    ['getNodeKey', '取节点用于列表 key 的值（nodeKey 字段或内部 $treeNodeId）', '(node)'],
    ['setCurrentNode', '按 Node 实例设置选中（需 nodeKey，缺失抛错）', '(node)'],
    ['setCurrentKey', '按 key 设置选中（需 nodeKey，缺失抛错）；传 null 取消高亮', '(key | null)'],
    ['getCurrentKey', '当前选中 key；无选中返回 null（需 nodeKey，缺失抛错）', '—'],
    ['getCurrentNode', '当前选中节点的 data；无选中返回 null', '—'],
    ['remove', '删除节点。<strong>必须设 nodeKey</strong>，未设置时静默无效。会同步删除源数据中的对应项', '(data)'],
    ['append', '追加子节点（省略 parent 则挂为根）。会同步写入源数据 children', '(data, parentNode?)'],
    ['insertBefore', '在参考节点前插入。同上会回写源数据', '(data, refNode)'],
    ['insertAfter', '在参考节点后插入。同上', '(data, refNode)'],
    ['expandAll', '展开全部（含左右两树）；lazy 下未加载节点先加载再展开', '—'],
    ['collapseAll', '收起全部（含左右两树）', '—'],
    ['expandNode', '展开指定节点，默认连同祖先；OKR 根节点同时展开两侧；lazy 下先加载。返回 Node 或 null', '(data, expandParent = true)'],
    ['collapseNode', '收起指定节点；OKR 根节点同时收起两侧', '(data)'],
    [
      'scrollToNode',
      '滚动到节点：默认先展开全部祖先、等待路径上的懒加载完成，再 scrollIntoView（居中，减弱动效时不用平滑）。返回是否完成',
      '(data, options?) options 为 ScrollIntoViewOptions + <code>expand</code>（默认 true）',
    ],
    ['getCheckedNodes', '勾选的 Node 实例列表（左右两树）', '(leafOnly = false)'],
    ['getCheckedKeys', '勾选的 key 列表（需 nodeKey；左右合并去重）', '(leafOnly = false)'],
    ['setCheckedKeys', '整体设置勾选（先清空；非 strictly 时带父子联动；OKR 左右同 key 同时生效）', '(keys, leafOnly = false)'],
    ['getHalfCheckedNodes', '半选节点实例列表', '—'],
    ['getHalfCheckedKeys', '半选节点 key 列表（需 nodeKey；左右合并去重）', '—'],
    ['isChecked', '节点当前是否勾选；未找到为 false', '(data)'],
    ['moveNode', '移动到目标的 prev / inner / next，同步源数据；inner 时目标自动展开。禁止放进自身或其子树。成功返回 true', '(data, target, type)'],
    [
      'getVisibleNodes',
      '当前真正可见的节点（含 OKR 左树）：自身通过过滤且各级祖先已展开到它。<strong>折叠子树仍挂载在 DOM 中</strong>，所以不等于 DOM 里的节点数',
      '—',
    ],
    ['getNodePath', '顶层到目标的链路（含目标）。左树节点的链路留在左树内，不跨接到右树根；未命中返回空数组', '(data)'],
    [
      'refreshData',
      '<strong>React 版新增（D7）</strong>：源数据被原地改动而宿主没重渲染时，显式触发增量更新（等价 Vue 的 deep watch）',
      '—',
    ],
    ['store / root', '数据仓库与虚拟根实例（源项目同样暴露，高级用法）', '—'],
  ],
}

export const slotsSection: ApiSection = {
  id: 'api-rendering',
  title: '渲染定制（对应源项目插槽）',
  intro:
    '源项目的具名插槽在 React 里是 render props，作用域参数形状保持一致。<code>renderNode</code> 与 <code>renderContent</code> 二选其一即可，插槽优先。',
  columns: ['prop', '对应源项目插槽', '作用域参数'],
  rows: [
    ['renderNode（或 children 传函数）', '<code>#default</code>', '<code>{ node, data }</code>，node 为内部 TreeNode'],
    [
      'renderExpandBtn',
      '<code>#expand-btn</code>',
      '<code>{ node, data, expanded, side, loading }</code>；side 为 <code>right</code>（常规/右子树）或 <code>left</code>（OKR 左子树）。<code>showNodeNum</code> 的折叠数字优先于它',
    ],
    ['empty', '<code>#empty</code>', '<code>data</code> 为空数组时渲染在容器内'],
    ['renderToolbar（OkrTreeViewport）', '<code>#toolbar</code>', '<code>{ zoom, zoomIn, zoomOut, reset, fit }</code>'],
  ],
}

export const compositionSection: ApiSection = {
  id: 'api-composition',
  title: '组合组件与键盘导航',
  intro:
    '<code>OkrTreeGroup</code> 让组内多棵 OKR 树的根节点水平坐标一致（替代源项目文档里「业务层手动量 DOM」）；<code>OkrTreeViewport</code> 提供画布缩放/平移/导出。键盘导航为所有树内置。',
  columns: ['名称', '类型', '说明'],
  rows: [
    ['OkrTreeGroup / align', 'prop，boolean，默认 true', 'false 时各树独立排布'],
    ['OkrTreeGroup / refresh()', 'method', '手动重新测量（字体加载完成、外部样式变化等；组件已自动响应成员挂载/更新与尺寸变化）'],
    ['OkrTreeGroup / children', '—', '放置若干 <code>&lt;OkrTree onlyBothTree /&gt;</code>'],
    ['OkrTreeViewport props', 'minZoom / maxZoom / zoomStep / zoom + onZoomChange / offset + onOffsetChange / wheelBehavior / toolbar / renderToolbar', '缩放范围与受控值；<code>wheelBehavior</code>：ctrl-zoom（默认，不劫持页面滚动）/ zoom / scroll'],
    ['OkrTreeViewport methods', 'zoomIn / zoomOut / reset / fitToScreen(padding?) / centerNode / exportImage / getZoom / getOffset', '双击复位；<code>fitToScreen</code> 默认四周留 20px；<code>centerNode</code> 先展开祖先再对准视口中心'],
    [
      'exportImage(options)',
      'method',
      '<code>{ type: \'png\' | \'svg\', scale = 2, background, toPng?, toSvg? }</code>。依赖可选 peer <code>html-to-image</code>；打包器下动态导入不可靠时用 <code>toPng / toSvg</code> 直接传入渲染函数',
    ],
    [
      '键盘导航',
      '—',
      'Tab 进入，↑/↓ 在可见节点间移动，→ 展开或进入子节点，← 收起或回到父节点，Enter/Space 选中（showCheckbox 下 Space 切换勾选），Home/End 首尾；OKR 根节点 ← 进入左子树，左树节点镜像。节点带 <code>role=treeitem</code> 与 <code>aria-level/expanded/selected/checked/disabled/setsize/posinset</code>，焦点环用 <code>--okr-focus-color</code> / <code>--okr-focus-width</code> 定制',
    ],
  ],
}

/** 全部 API 表（顺序即文档展示顺序） */
export const apiSections: ApiSection[] = [
  attributesSection,
  propsSection,
  eventsSection,
  methodsSection,
  slotsSection,
  compositionSection,
]
