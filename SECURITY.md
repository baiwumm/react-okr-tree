# Security Policy

`react-okr-tree` 是纯前端的 React 组件库：没有服务端、没有账号体系、不发起网络请求、不落盘。
攻击面很窄，但有三块值得认真对待——发布产物本身的形状、SSR 下的 `window` 访问、以及可选的
`html-to-image` 导出链路。

## 报告漏洞

**请不要为安全问题开公开 issue 或 PR。** 走 GitHub 私密漏洞报告：

<https://github.com/baiwumm/react-okr-tree/security/advisories/new>

请写明：受影响的版本、React 版本、复现步骤、以及你预期的影响面。PoC 里请使用伪造数据，
不要贴真实项目的业务数据或凭证。

这是个人维护的项目，响应是尽力而为的：收到后会在 advisory 里给确认，修复前请留出时间，
不要在未协调的情况下公开细节。

## 范围

**在范围内**：

- 发布产物与声明不一致：`dist` 里实际存在的文件、`exports` 声明的子路径、`peerDependencies`
  与 `peerDependenciesMeta`（`html-to-image` 必须保持 optional）互相矛盾
- 误把非预期文件打进包里（`files` 白名单被绕过、构建产物带入开发期代码或 sourcemap 之外的杂项）
- SSR：`react-dom/server` 渲染期间访问 `window` / `document` / `navigator` 导致服务端崩溃，
  或首屏与服务端标记不一致引发 hydration 报错
- 可选依赖 `html-to-image` 的动态 `import()` 被无条件执行（未使用导出能力时也去加载第三方代码）
- 组件对使用方传入的值做了不安全的注入（目前 `node.label` 走 React 文本节点，不走
  `dangerouslySetInnerHTML`；若发现例外即为漏洞）
- 依赖链漏洞：请先走 Dependabot / `npm audit`；本库的 `dependencies` 为空，peer 由使用方负责

**不在范围内**：

- 使用方自己引入的 XSS：`renderNode` / `nodeComponent` / `renderContent` 的返回值完全由使用方控制
- 样式与布局问题（连接线错位、主题色、打印分页、虚拟滚动下的占位尺寸）
- 浏览器不支持 / 降级行为（例如 `ResizeObserver`、`visualViewport` 缺失）
- 文档站（`apps/website`）的构建产物问题：那是静态站点，按普通 bug 走 issue
- 依赖链上的通用漏洞（同上，走 Dependabot）

## 受支持的版本

只有**最新发布的版本**接收安全修复。本库与 [`vue3-okr-tree`](https://github.com/baiwumm/vue3-okr-tree)
同号锁步，安全修复会走新版本发布 + 两端同步，不单独回补旧版本。
