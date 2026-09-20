import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-4xl font-bold tracking-tight">react-okr-tree</h1>
      <p className="max-w-xl text-center text-muted-foreground">
        组织架构图 / OKR 树 React 组件文档站脚手架占位页，落地页组件见阶段 7.3。
      </p>
      <Link
        href="/docs"
        className="rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-background"
      >
        进入文档
      </Link>
    </main>
  )
}
