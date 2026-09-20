import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Card, Cards } from 'fumadocs-ui/components/card'
import { Callout } from 'fumadocs-ui/components/callout'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { ApiTable } from '@/components/docs/api-table'
import { DemoBlock } from '@/components/docs/demo-block'
import type { MDXComponents } from 'mdx/types'

/**
 * MDX 可用组件白名单
 *
 * 文档正文只允许使用这里注册的组件——内容真源在 `content/`，
 * 保持组件面收窄，避免有人顺手引入未审查的第三方组件。
 *
 * `<DemoBlock>` / `<ApiTable>` 是本站新增的两个：demo 组件全部带 `'use client'`
 * （requirements 6.3 第 1 点，MDX 默认在服务端渲染，交互必须落到客户端）。
 * EventLog / ThemeSwitcher 随阶段 8 的 Demo 一起登记。
 */
export function getMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    ...defaultMdxComponents,
    Cards,
    Card,
    Callout,
    Steps,
    Step,
    Tabs,
    Tab,
    DemoBlock,
    ApiTable,
    ...components,
  }
}
