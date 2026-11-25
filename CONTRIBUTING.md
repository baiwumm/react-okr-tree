# Contributing to react-okr-tree

Thanks for taking the time to contribute. This repository is maintained by a single maintainer, so short, focused changes are much easier to review and land.

## Before you start

- Read [AGENTS.md](./AGENTS.md). It is the source of truth for repository layout, the generated-artifact rules (`shared/api.ts` → API 表 → `tests/api-surface.spec.tsx`), the CSS / DOM contract, `docs/` conventions and the commit trailer format.
- For anything larger than a small fix, start an [Ideas discussion](https://github.com/baiwumm/react-okr-tree/discussions/categories/ideas) first so the approach can be agreed on before code lands. Setup and usage questions go to [Q&A](https://github.com/baiwumm/react-okr-tree/discussions/categories/q-a) — both categories have form templates.
- Bug reports go through the issue forms (`.github/ISSUE_TEMPLATE` — blank issues are disabled). The bug form already collects what matters: affected version, import path, browser, layout and the minimal repro.
- This library is a React port of [`vue3-okr-tree`](https://github.com/baiwumm/vue3-okr-tree) and the two ship in lockstep (same version number = same feature surface). A behaviour change is only complete when both sides agree — the intentional differences are enumerated in `docs/requirements.md` §8 (D1–D12) and on the [migration page](https://react-okr-tree.baiwumm.com/docs/migration/).

## Development

Requirements: Node ≥ 22.13 (the toolchain floor; CI runs 22 and 24) and pnpm (version pinned by the `packageManager` field).

```bash
pnpm install
pnpm format:check   # prettier
pnpm lint           # eslint
pnpm build          # vite lib build + post-build（先出 dist，视觉夹具按包名 import）
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest（测试与源码同目录）
pnpm test:coverage  # 阈值在 vite.config.ts
pnpm verify:dist    # jsdom 里挂载三种格式，断言产物清单
pnpm verify:package # publint + attw
pnpm size           # size-limit 预算
```

These are exactly what CI runs (`.github/workflows/ci.yml`, Node 22 / 24) and must pass locally before every push. Additional checks by change surface:

- `apps/website`（文档站）: `pnpm build` → `pnpm --filter react-okr-tree-website build` → `pnpm typecheck:website` → `pnpm --filter react-okr-tree-website verify:export`. 字体是手工子集，新增文案后跑 `pnpm fonts:subset`，否则 `verify:fonts` 会红。
- API 面：改 `src/` 与 `OkrTreeHandle` 之后同步 `packages/react-okr-tree/shared/api.ts`，`tests/api-surface.spec.tsx` 会拦住双向漂移；README 的 7 行分组 / 条数概览跟着改。
- 样式与 DOM：`src/styles/style.css` + `transition.css` 与源项目逐字相同（diff 仅限包名注释），类名契约在 `src/dom-contract.ts`，改它们等于改与 Vue 版的对齐基准——先在 issue 里说清。
- 视觉回归：`pnpm test:visual`（Playwright + Chromium，Linux 基线固定跑在 ubuntu-24.04）。改了 DOM / CSS / 样式变量就必须跑；基线更新只能与真实改动一一对应，顺手更新等于把回归门禁关掉。

## Pull requests

- Keep the diff focused: one logical change per PR. `main` 已开分支保护，所有改动走 PR。
- Use conventional commit messages with a scope and a Chinese subject (`fix(model): …` / `docs(api): …`).
- If an AI assistant helped, add the required trailer block described in [AGENTS.md](./AGENTS.md) (validated by the `ai-commit-trailer` skill). Commits without it will not credit the tool.
- Decision records (why / why not / why reverted) belong in the living docs (`docs/requirements.md` 对应章节), not only in the commit message. 活文档用「就地更正」体例：`~~旧表述~~ → 新表述 + 日期`。

## Dependencies

The published package keeps **zero runtime dependencies** — `dependencies` stays empty, and React ships as `peerDependencies` (`html-to-image` stays optional in `peerDependenciesMeta`). New dependencies can only go to the dev side, with the reason stated in the PR. 版本一律精确锁定（根 `.npmrc` 的 `save-exact=true`），升级走 Dependabot PR。

## Community

By participating in this project you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md). Report unacceptable behavior to <me@baiwumm.com>.

## Security

Do not open public issues or pull requests for vulnerabilities. Use [private reporting](https://github.com/baiwumm/react-okr-tree/security/advisories/new) and see [SECURITY.md](./SECURITY.md).
