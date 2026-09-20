# 性能基线（计划 9.3）

> 复现：`pnpm build && pnpm bench`（脚本 [scripts/benchmark.mjs](../packages/react-okr-tree/scripts/benchmark.mjs)，输出即下表）。
> 环境：Node v24.15、jsdom 模拟 DOM、跑的是 **dist ESM 产物**（不是 src），Windows / 单机。
> jsdom 无真实布局与样式计算，单节点 DOM 开销显著高于真实浏览器（源项目实测约 3–5 倍），
> 所以**数值只用于横向对比与回归告警**，不代表浏览器真实帧率；浏览器侧首屏门禁（Chromium < 300 ms）在 9.2 的 Playwright 里。

## 数据规模

40 个部门 × 50 名员工（两层），总计 2040 个节点对象。与源项目 `scripts/benchmark.mjs` 同一份数据形状，便于横向比。

## 基线（jsdom，2026-09-20）

| 场景 | 耗时（3 轮取最优） | 与 Vue 版（其 perf.md，2026-09-18）对照 |
| ---- | ---- | ---- |
| 首渲染（默认折叠，仅 40 个根可见） | ≈ 220 ms | 620 ms → **快约 2.8 倍** |
| 首渲染（`defaultExpandAll`，2040 个节点全量 DOM） | ≈ 182 ms | 1070 ms → **快约 5.9 倍** |
| `expandAll()`（状态 + 渲染） | ≈ 91 ms | 4.7 ms → **慢约 19 倍** |
| `collapseAll()` | ≈ 77 ms | 3.9 ms → **慢约 20 倍** |
| `filter('员工-1')` + 恢复全显（两次过滤） | ≈ 153 ms | 300 ms → **快约 2 倍** |
| 原地 push + pop 一个节点（宿主重渲染 → 结构脏检查增量） | ≈ 6.6 ms | 67 ms → **快约 10 倍** |
| 深层 label 原地修改（脏检查判定结构未变，跳过重建） | ≈ 0.5 ms | 43 ms → **快约 86 倍** |
| 展开单个节点（R1 局部更新，可见节点 40 → 90） | ≈ 0.6 ms | 源项目无此场景 |

方差的量级：同一台机器同一份产物，两轮全量跑的首渲染差 10–40 ms（GC 与其他进程影响），
所以上表按「同一个数量级」读，不要按小数点读。

## 三条结构性差异（为什么不是同向的）

1. **首渲染快 2.8–5.9 倍**：React 侧 `data` 是普通对象，模型层不包代理；
   Vue 的 `reactive(data)` 要为这 2040 个对象建响应式代理，这部分开销在挂载前就要付掉。
   代价转移到下面第 2 条。
2. **`expandAll` / `collapseAll` 慢约 20 倍**：Vue 的细粒度响应式在展开时只 patch 变化的
   class 与内联样式；React 必须重跑这 2040 个组件函数再 reconcile 一遍。
   这是「组件粒度」而非「依赖粒度」模型的固有差。
   **但它只在整树操作时成立**——见第 3 条与最后一行：真实的用户路径是点一个节点的 ± 。
3. **原地变更快 10–86 倍**：源项目为此付了一次 `data` 的 O(N) 深遍历（Vue 的 deep watch），
   React 侧换成渲染时的 `sameItems` + `isStructureDirty` 廉价比对（引用逐个比，命中即短路），
   非结构变更直接 0.5 ms 跳过重建。这条差距就是 requirements R2 / D7 的取舍结果。

`expandAll` 的 91 ms 说明一件事：**不要把整树展开当默认路径**。需要「一进来就全展开」时优先用
`defaultExpandAll`（走首渲染，182 ms 且只发生一次），而不是挂载后再 `ref.expandAll()`。

## 测量本身的两条纪律（踩过才写下来的）

- 场景 7 最初测出 **0.01 ms**，看着像「React 局部更新快得离谱」，实际是 `measure()` 会跑 3 轮，
  而 `expandNode` 不幂等：第二轮起目标节点早就展开了，什么都没发生。
  现在每轮前先 `collapseAll()`，并且**函数里断言「可见节点数必须增加」**——
  数量没变就直接抛错，不允许输出一个漂亮的空数字。
- 场景 5 / 6 的 `tree.render()` 是必需的：React 没有深监听，宿主不重渲染就什么都不会发生。
  这不是脚本缺陷，正是 D7 要表达的行为，所以两条各测一遍。

## 产物体积（同一天的 size-limit 结果，门禁见 package.json）

| 产物 | gzip | 预算 |
| ---- | ---- | ---- |
| `react-okr-tree.es.js` | 18.48 kB | ≤ 20 kB |
| `style.css` | 3.79 kB | ≤ 4 kB |
| `react-okr-tree.umd.js` | 16.66 kB | ≤ 21 kB |

零运行时依赖（`react` / `react-dom` 为 peer，`html-to-image` 为 optional peer 且只经变量的
动态 import 引用，不会被打进产物）。两条预算余量都只有个位数百分比，加特性前先跑 `pnpm size`。
