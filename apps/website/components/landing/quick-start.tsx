import { Typography } from '@heroui/react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { SectionHeader } from '@/components/landing/section-header'

/**
 * 快速开始段：终端窗口 + 三步编号（对应参考站的 QuickStart）。
 * 命令取自文档「快速开始」正文；三行代码是库的最小可用姿势，不写「规划中」的能力。
 */
const LINES: { kind: 'comment' | 'command' | 'output'; text: string }[] = [
  { kind: 'comment', text: '# 组件本体零运行时依赖，peer 只有 react / react-dom' },
  { kind: 'command', text: 'pnpm add react-okr-tree' },
  { kind: 'comment', text: '# 样式是独立文件，不引就只是纯结构树' },
  { kind: 'output', text: "import 'react-okr-tree/style.css'" },
  { kind: 'comment', text: '# 三种布局只差 props，主题挂在根容器的类名上' },
  { kind: 'output', text: '<OkrTree data={data} direction="vertical" />' },
]

const STEPS = [
  {
    title: '装包',
    body: 'peer 只要求 React 18.2 以上；html-to-image 是 optional peer，只有导出图片才需要。',
  },
  {
    title: '引一次样式表',
    body: '主题与几何全部走 --okr-* 变量；传 unstyled 可以只保留结构，外观完全自绘。',
  },
  {
    title: '传数据',
    body: 'data 换引用会重建；同引用原地改写靠渲染期脏检查，必要时 ref.refreshData() 兜底。',
  },
]

export function QuickStart() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="01 / 开始"
          sub="一个组件、一条样式表、一份数据。命令与文档「快速开始」正文同源，跑不通就是文档写错了。"
          title="三行之内把它跑起来"
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="frame">
            <div className="flex items-center gap-2 border-b border-border bg-surface-secondary px-4 py-2.5">
              <span aria-hidden className="size-2.5 rounded-full bg-danger/70" />
              <span aria-hidden className="size-2.5 rounded-full bg-accent/60" />
              <span aria-hidden className="size-2.5 rounded-full bg-success/60" />
              <Typography className="ms-3 font-mono" color="muted" type="body-xs">
                terminal — react-okr-tree
              </Typography>
            </div>

            <div className="flex flex-col gap-1.5 overflow-x-auto px-5 py-5 font-mono text-[13px] leading-relaxed">
              {LINES.map((line, index) => (
                <span
                  key={index}
                  className={line.kind === 'command' ? 'text-foreground' : 'text-muted'}
                >
                  {line.kind === 'command' ? (
                    <>
                      <span aria-hidden className="me-2 text-accent">
                        $
                      </span>
                      <span className="whitespace-pre">{line.text}</span>
                    </>
                  ) : (
                    <span className="whitespace-pre">{line.text}</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <ol className="flex flex-col justify-center gap-6">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex flex-col gap-1.5 border-t border-border pt-5 first:border-t-0 first:pt-0"
              >
                <span className="font-mono text-[11px] font-semibold text-accent">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Typography type="body-sm" weight="medium">
                  {step.title}
                </Typography>
                <Typography color="muted" type="body-xs">
                  {step.body}
                </Typography>
              </li>
            ))}
            <li>
              <Link
                className="group inline-flex items-center gap-1.5 text-sm text-accent"
                href="/docs/guide/demos/"
              >
                看全部可交互 Demo
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}
