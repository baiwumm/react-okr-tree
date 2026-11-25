<!-- markdownlint-disable MD041 -- 模板正文直接进 PR 描述，不带头部标题 -->

## 变更说明

<!-- 一句话说明「为什么改」，以及改前改后的行为差异 -->

Closes #

## 涉及范围

- [ ] 库实现（`packages/react-okr-tree/src`）
- [ ] API 表（`packages/react-okr-tree/shared/api.ts`）与文档站 API 页
- [ ] 文档站页面 / Demo（`apps/website`）
- [ ] 测试与视觉基线（`packages/react-okr-tree/tests`）
- [ ] 脚本与构建链（`packages/react-okr-tree/scripts`、`vite.config.ts`）
- [ ] 仅仓库级（`docs/` / `.github/` / 根配置）

## 一致性与真源检查

- [ ] 若动 API 面：三处按顺序同步——`src/` 的实现与 `OkrTreeHandle` → `shared/api.ts` 的表 → `tests/api-surface.spec.tsx` 放行；README 的 7 行分组 / 条数概览同步（`packages/react-okr-tree/README.md` 与根 README 都不写死条数之外的表格）
- [ ] 若动行为：与 `vue3-okr-tree` 锁步——同号即同一功能面，上游是否已同改 / 是否需要先提上游
- [ ] 若动有意的框架差异（D1–D12）：已回写 `docs/requirements.md` §8，并在迁移页同步
- [ ] 若动样式或 DOM：`src/styles/style.css` + `transition.css` 仍与源项目逐字相同（diff 仅限包名注释），类名契约仍以 `src/dom-contract.ts` 为准
- [ ] 若动 REST / 数据结构语义：`docs/requirements.md` 的对应章节已按「就地更正」体例回写（`~~旧~~ → 新 + 日期`）
- [ ] 若动产物面（`exports` / dist 结构 / peer）：`pnpm build` 后跑过 `pnpm verify:dist` 与 `pnpm verify:package`
- [ ] 若新增依赖：只进 dev 侧，`dependencies` 保持为空，peer 变更要在 PR 里说明理由
- [ ] 若 AI 参与提交：trailer 按 AGENTS.md，`ai-commit-trailer` 的 `normalize.mjs check` exit 0

## 验证结果

<!-- 填实际跑过的命令与结果；未跑的项写明原因 -->

- 库门禁（`pnpm format:check` / `pnpm lint` / `pnpm build` / `pnpm typecheck` / `pnpm test` / `pnpm test:coverage` / `pnpm verify:dist` / `pnpm verify:package` / `pnpm size`）：
- 文档站（`pnpm --filter react-okr-tree-website build` + `pnpm typecheck:website` + `verify:fonts` + `verify:export`）：
- 视觉（`pnpm test:visual`；改了 DOM / CSS / 样式变量必须跑，基线更新要与本批改动一一对应）：

## 截图 / 录屏

<!-- 有视觉变化附录屏；无视觉变化可删除本节 -->
