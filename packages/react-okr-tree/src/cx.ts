/** 极小的类名拼接：只为对齐源项目模板里的 :class 数组写法，不引 clsx 依赖 */
export function cx(...parts: Array<string | false | null | undefined | string[]>): string {
  const out: string[] = []
  for (const part of parts) {
    if (!part) continue
    if (typeof part === 'string') out.push(part)
    else out.push(...part.filter(Boolean))
  }
  return out.join(' ')
}

/** 由对象字面量表达的状态类（对应源项目 `:class="{ a: cond }"` 写法） */
export function cxState(state: Record<string, boolean | undefined | null>): string {
  const out: string[] = []
  for (const key in state) {
    if (state[key]) out.push(key)
  }
  return out.join(' ')
}
