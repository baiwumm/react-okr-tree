# docs/ 目录索引

| 文件                                         | 定位                                                | 状态                                     |
| -------------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| [requirements.md](./requirements.md)         | 需求基线（R 移植决策 / D 有意差异 / 11 节已定决策） | 活文档（仅接收事实性回写）               |
| [acceptance.md](./acceptance.md)             | 验收审计 + G 项收口台账（门禁数字的唯一权威）       | 活文档                                   |
| [perf.md](./perf.md)                         | 性能基线（jsdom bench + 真实浏览器 + size-limit）   | 冻结基线（数字随 `pnpm bench` 复测刷新） |
| [development-plan.md](./development-plan.md) | 1.0.0 开发计划                                      | 历史快照（文首横幅封存）                 |

本仓没有独立的 roadmap / release-guide：版本演进看 `packages/react-okr-tree/CHANGELOG.md`，发布流程看 `.github/workflows/release.yml` 头注释——与姊妹仓 [vue3-okr-tree](https://github.com/baiwumm/vue3-okr-tree) 的 `docs/release-guide.md` 是同一条链路（两仓自 1.13.0 起同号锁步，各自打各自的 tag）。

与 vue3 仓的 `docs/` 保持同名同位（acceptance / requirements / development-plan / perf），便于两端口径互查。

## 约定

见根目录 [AGENTS.md](../AGENTS.md) 的「docs/ 目录与文档约定」一节——规则以那里为单一来源，本文件只维护上表的索引。
