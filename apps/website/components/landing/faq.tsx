'use client'

import { Accordion, Typography } from '@heroui/react'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

import { SectionHeader } from '@/components/landing/section-header'
import { FAQ_ITEMS } from '@/lib/faq'
import { SITE } from '@/lib/site'

/**
 * 问答区：只回答「装之前就要知道」的六件事，答案与 docs/requirements.md 对齐。
 *
 * 手风琴用 HeroUI 的 Accordion（react-aria DisclosureGroup）：键盘、`aria-expanded`
 * 与分组语义由库负责，本站不再手搓。数据在 `lib/faq.ts`，与首页的 FAQPage JSON-LD
 * 共用同一份——两份各写一遍必然漂移。
 */

/**
 * 把 `反引号` 包起来的片段渲染成行内代码。
 * 用轻标记而不是存 ReactNode：同一份文本还要喂给 JSON-LD 的纯文本字段。
 */
function renderInline(text: string) {
  return text.split('`').map((chunk, index) =>
    index % 2 === 1 ? (
      <code key={index} className="rounded bg-default px-1 py-0.5 font-mono text-[0.9em]">
        {chunk}
      </code>
    ) : (
      chunk
    )
  )
}

export function Faq() {
  return (
    <section className="border-t border-border" id="faq">
      <div className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-24">
        <SectionHeader
          eyebrow="05 / 常见问题"
          sub="关于移植边界、数据更新与体积的六个问题。"
          title="常见问题"
        />

        {/* Accordion：使用官方默认解剖与间距，不覆盖内部结构样式 */}
        <Accordion className="mt-10">
          {FAQ_ITEMS.map((item, index) => (
            <Accordion.Item key={item.value} id={item.value}>
              <Accordion.Heading>
                <Accordion.Trigger>
                  <span className="flex flex-1 items-center gap-4">
                    <span className="font-mono text-[11px] text-muted">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Typography type="body-sm" weight="medium">
                      {item.title}
                    </Typography>
                  </span>
                  <Accordion.Indicator>
                    <ChevronDown />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>{renderInline(item.content)}</Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>

        <Typography className="mt-8" color="muted" type="body-sm">
          没有找到想问的？欢迎在{' '}
          <Link
            className="text-foreground underline underline-offset-4"
            href={SITE.github}
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </Link>{' '}
          提出 Issue。
        </Typography>
      </div>
    </section>
  )
}
