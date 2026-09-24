# AGENTS.md

## 生成物不要手改

README、文档站页面、API 表等**生成物或衍生产物一律不手改**：改它们的来源，再走渲染 / 生成路径。本包的对应关系：

- **完整 API 表**的唯一来源是 `packages/react-okr-tree/shared/api.ts`，由文档站 `apps/website` 的 `<ApiTable>` 渲染（`/docs/api` 六张表）。改 API 面按顺序动三处：`src/` 的实现与 `OkrTreeHandle` → `shared/api.ts` 的表 → `tests/api-surface.spec.tsx` 放行（它断言表与 `OkrTreeHandle` 双向不漂移）。
- **文档正文不写死 API 条数**（多少个 props / 回调 / 方法）。条数只在 `shared/api.ts` 的表里体现，由文档站 API 页渲染；历史发布说明（CHANGELOG 与其摘要页）里的当期数字除外，那是当时的事实。
- **README 的 API 一节只有 6 行手写的分组 / 条数概览**，不复制完整表格。本包**不提供** `gen:readme` 脚本（该计划已作废，见 `docs/requirements.md` 11.4 与 `docs/development-plan.md` 9.7），所以动了 `shared/api.ts` 的分组、条数或成员名，要顺手把这几行概览同步掉。
- **单元格里的行内代码用 `<code>`，不要用 Markdown 反引号**：`apps/website/components/docs/api-table.tsx` 按 HTML（`innerHTML` + `[&_code]` 补的 code 样式）消费单元格，反引号会露成字面字符。
- **样式与 DOM 契约**：`src/styles/style.css` + `transition.css` 是与源项目逐字相同的两份 CSS（diff 仅限包名注释），类名契约在 `src/dom-contract.ts`——文档站与视觉基线都按类名查询，别在产物侧改。

## 与 vue3-okr-tree 对齐

本包是 [`vue3-okr-tree`](https://github.com/baiwumm/vue3-okr-tree) 的 React 复刻版，版本号自 1.13.0 起与其**锁步**。README 的章节骨架与措辞两端刻意保持一致：改一端 README 的结构（新增 / 删除章节、指路表）时，另一端同步跟改，差异只允许出现在框架必然不同的地方。

## docs/ 目录与文档约定

`docs/` 的文件清单与定位见 [docs/README.md](./docs/README.md)（活文档：requirements / acceptance / perf；历史快照：development-plan）。本仓没有 roadmap / release-guide：版本演进看 `packages/react-okr-tree/CHANGELOG.md`，发布流程看 `.github/workflows/release.yml` 头注释——与 vue3 仓的 `docs/release-guide.md` 是同一条链路（推 `v*` tag 全自动、CI 经 OIDC Trusted Publishing 发包、无 token / GitHub Secrets）。约定：

- **文件名**一律 kebab-case 英文，按用途命名（不放版本号、不放日期）；新文档先在 `docs/README.md` 索引登记再落笔。
- **历史快照**在文首加「⚠️ 历史快照」横幅封存，正文不再随版本更新；最新门禁数字的**唯一权威是 `docs/acceptance.md`**，其余文档引用而非复制。
- **不写死易漂移的数字**（用例数、断言数、体积、run 号）：要刷新只刷新 `acceptance.md`，别处改措辞而不是抄数字。
- **改活文档用就地更正体例**：`~~旧表述~~ → 新表述 + 日期`，保留历史结论，不整段重写、不抹掉当时的判断。

以上规则以本节为单一来源，`docs/README.md` 只维护索引表。
