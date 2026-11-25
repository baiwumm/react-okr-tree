# AGENTS.md

## 生成物不要手改

README、文档站页面、API 表等**生成物或衍生产物一律不手改**：改它们的来源，再走渲染 / 生成路径。本包的对应关系：

- **完整 API 表**的唯一来源是 `packages/react-okr-tree/shared/api.ts`，由文档站 `apps/website` 的 `<ApiTable>` 渲染（`/docs/api` 七张表）。改 API 面按顺序动三处：`src/` 的实现与 `OkrTreeHandle` → `shared/api.ts` 的表 → `tests/api-surface.spec.tsx` 放行（它断言表与实现（props / 回调 / ref 方法）双向不漂移）。
- **文档正文不写死 API 条数**（多少个 props / 回调 / 方法）。条数只在 `shared/api.ts` 的表里体现，由文档站 API 页渲染；历史发布说明（CHANGELOG 与其摘要页）里的当期数字除外，那是当时的事实。
- **README 的 API 一节只有 7 行手写的分组 / 条数概览**，不复制完整表格。本包**不提供** `gen:readme` 脚本（该计划已作废，见 `docs/requirements.md` 11.4 与 `docs/development-plan.md` 9.7），所以动了 `shared/api.ts` 的分组、条数或成员名，要顺手把这几行概览同步掉。
- **单元格里的行内代码用 `<code>`，不要用 Markdown 反引号**：`apps/website/components/docs/api-table.tsx` 按 HTML（`innerHTML` + `[&_code]` 补的 code 样式）消费单元格，反引号会露成字面字符。
- **样式与 DOM 契约**：`src/styles/style.css` + `transition.css` 是与源项目逐字相同的两份 CSS（diff 仅限包名注释），类名契约在 `src/dom-contract.ts`——文档站与视觉基线都按类名查询，别在产物侧改。

## 与 vue3-okr-tree 对齐

本包是 [`vue3-okr-tree`](https://github.com/baiwumm/vue3-okr-tree) 的 React 复刻版，版本号自 1.13.0 起与其**锁步**。README 的章节骨架与措辞两端刻意保持一致：改一端 README 的结构（新增 / 删除章节、指路表）时，另一端同步跟改，差异只允许出现在框架必然不同的地方。

## docs/ 目录与文档约定

`docs/` 的文件清单与定位见 [docs/README.md](./docs/README.md)（活文档：requirements / acceptance / perf；历史快照：development-plan）。本仓没有 roadmap / release-guide：版本演进看 `packages/react-okr-tree/CHANGELOG.md`，发布流程看 `.github/workflows/release.yml` 头注释——与 vue3 仓的 `docs/release-guide.md` 是同一条链路（推 `v*` tag 全自动、CI 经 OIDC Trusted Publishing 发包、无 token / GitHub Secrets）。约定：

- **文件名**一律 kebab-case 英文，按用途命名（不放版本号、不放日期）；新文档先在 `docs/README.md` 索引登记再落笔。
- **历史快照**在文首加「⚠️ 历史快照」横幅封存，正文不再随版本更新；最新门禁数字的**唯一权威是 `docs/acceptance.md`**，其余文档引用而非复制。
- **不写死易漂移的数字**（用例数、断言数、体积、run 号）：要刷新只刷新 `acceptance.md`，别处改措辞而不是抄数字。
- **活文档只写当前事实**：每句陈述都必须是「现在成立」的样子，不写日期、不写 `~~旧表述~~ → 新表述` 的修正痕迹、不写「曾经如何 / 后来改为」。改一条旧结论就把它改掉，历史从 `git log` 和 `CHANGELOG.md` 找；新事实直接写进去，读者不需要知道它变过几次。

以上规则以本节为单一来源，`docs/README.md` 只维护索引表。

## 代码与提交风格

- 注释密度高是刻意的：写「为什么」和约束（尤其反直觉的结论），不写「这行做了什么」。
- commit message 走 conventional commits + scope，中文主题：`fix(model): …`、`docs(api): …`、`chore(release): …`。破坏性变更用 `!`。
- **AI 参与的提交必须带 trailer**：正文后空一行追加连续的 trailer 块，`Co-authored-by: <产品名> <registry 邮箱>`（GitHub 只解析这一行，它决定多人作者与 Contributors 归属），模型名只进 `Assisted-by: <产品名>:<模型名>`。身份按**实际运行本次会话的产品**匹配 `ai-commit-trailer` skill 的 `references/agents.json`，不得照抄其它产品、不得把模型名塞进 `Co-authored-by` 的姓名位。纯人工改动不加 trailer。格式、身份表与校验流程以该 skill 为唯一规范，本文件不重复其定义。
- 提交前用该 skill 的 `node "$SKILL_DIR/scripts/normalize.mjs" check --message .git/COMMIT_TRAILER_MSG` 自检，**exit 0 才算通过**（`fix --write` 可自动归位 trailer）；`check --range` 报出的历史提交只报告、不重写——改写已推送历史是另一次显式决定。

示例：

```text
fix(viewport): 平移甩出画布边界松手不再卡 is-panning

指针离开元素后不再收 pointerup，改为在 window 上终结手势并清标志。

Co-authored-by: pi <noreply@pi.dev>
Assisted-by: pi:glm-4.6
```
