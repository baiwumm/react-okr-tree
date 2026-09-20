'use client'

/** 一行日志：`event` 是事件名（与 api 表的回调名对得上），`text` 是关键信息 */
export interface LogLine {
  event: string
  text: string
}

/** 保留的条数上限——宿主每点一次就多一条 state，不设上限会一直往上堆 */
export const LOG_LIMIT = 8

/**
 * 极简事件日志面板（对应源项目 playground/components/EventLog.vue）
 *
 * 源项目是 `ref.log.push(event, text)`（Vue 的 `defineExpose`），React 没有对应的命令式写法，
 * 所以这里改成纯展示：日志数组由宿主自己 `useState` 持有，本组件只负责渲染。
 * 宿主侧的三行样板（state + 截断 push + clear）留在用例里，读代码的人一眼能看到上限在哪。
 */
export function EventLog({
  title = '事件输出',
  lines,
  onClear,
}: {
  title?: string
  lines: LogLine[]
  onClear?: () => void
}) {
  return (
    <div className="mb-3 rounded-lg border border-fd-border bg-fd-accent p-3 text-sm">
      <div className="mb-1 flex items-center justify-between gap-2 text-fd-muted-foreground">
        <span>
          {title}（最近 {LOG_LIMIT} 条）
        </span>
        {onClear && lines.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-fd-border px-2 py-0.5 hover:bg-fd-muted"
          >
            清空
          </button>
        )}
      </div>
      {lines.length === 0 ? (
        <p className="text-fd-muted-foreground">尚未触发事件，试试点击节点 / 右键 / 展开按钮。</p>
      ) : (
        <ul className="space-y-0.5 font-mono text-xs">
          {lines.map((line, i) => (
            <li key={`${line.event}-${i}`}>
              <span className="text-fd-muted-foreground">{line.event}</span> → {line.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
