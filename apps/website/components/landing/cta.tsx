'use client'

import { ArrowRight, Package } from 'lucide-react'
import { motion } from 'motion/react'
import { ButtonLink } from '@/components/motion/button/base'
import { TiltCard } from '@/components/motion/tilt-card'
import { GithubIcon } from '@/components/ui/brand-icons'
import { LIB_VERSION } from '@/lib/version'
import { SITE } from '@/lib/site'

/** 行动号召：装包命令 + 两个出口。按钮用 beUI 的 ButtonLink（与参考站同一件） */
export function Cta() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* 大卡面倾角收到 3 度，与首页小卡片的 6 度在视觉摆幅上对齐；
              宽度约束挂在 TiltCard 上，glare 光斑才不会铺进卡片两侧空白 */}
          <TiltCard max={3} className="rounded-3xl">
            <div className="glass-card rounded-3xl px-8 py-14 text-center">
              <h2 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
                现在就把它放进你的 React 项目
              </h2>
              <p className="mx-auto mt-3 max-w-md text-pretty text-muted-foreground">
                零运行时依赖，peer 只要求 React 18.2 以上。样式是一条独立的
                <code className="mx-1 font-mono text-[0.9em]">style.css</code>
                ，不引就只是个纯结构树。
              </p>
              <pre className="mx-auto mt-8 w-fit rounded-2xl border bg-card/80 px-5 py-3 text-left font-mono text-sm">
                <code>
                  <span className="text-muted-foreground">$</span> npm i react-okr-tree@
                  {LIB_VERSION}
                </code>
              </pre>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href="/docs" variant="primary" size="lg">
                  <Package size={16} />
                  快速开始
                  <ArrowRight size={16} />
                </ButtonLink>
                <ButtonLink
                  href={SITE.github}
                  target="_blank"
                  rel="noreferrer"
                  variant="secondary"
                  size="lg"
                >
                  <GithubIcon className="size-4" />
                  Star on GitHub
                </ButtonLink>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      </div>
    </section>
  )
}
