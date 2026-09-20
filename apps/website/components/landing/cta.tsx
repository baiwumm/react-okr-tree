import { ArrowRight, Github, Package } from 'lucide-react'
import Link from 'next/link'
import { LIB_VERSION } from '@/lib/version'
import { SITE } from '@/lib/site'

/** 行动号召：装包命令 + 两个出口。参考站同一位置用的是渐变按钮，这里沿用 .btn-solid */
export function Cta() {
  return (
    <section className="px-6 py-24">
      <div className="card-premium mx-auto max-w-4xl px-8 py-14 text-center">
        <h2 className="text-balance text-3xl font-bold tracking-tight">
          现在就把它放进你的 React 项目
        </h2>
        <p className="mx-auto mt-3 max-w-md text-pretty text-muted-foreground">
          零运行时依赖，peer 只要求 React 18.2 以上。样式是一条独立的
          <code className="mx-1 font-mono text-[0.9em]">style.css</code>，不引就只是个纯结构树。
        </p>
        <pre className="mx-auto mt-8 w-fit rounded-xl border bg-muted/50 px-5 py-3 text-left font-mono text-sm">
          <code>
            <span className="text-muted-foreground">$</span> npm i react-okr-tree@{LIB_VERSION}
          </code>
        </pre>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/docs/start" className="btn-solid px-6 py-2.5 text-sm font-bold">
            <Package size={16} />
            快速开始
            <ArrowRight size={16} />
          </Link>
          <a
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            className="btn-outline px-6 py-2.5 text-sm font-bold text-foreground"
          >
            <Github size={16} />
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  )
}
