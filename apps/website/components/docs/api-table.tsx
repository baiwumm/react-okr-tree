import { apiSections, type ApiSection } from '../../../../shared/api'

/**
 * API 表：内容取自仓库根的 `shared/api.ts`（单一来源，README 生成器读的是同一份）。
 *
 * 单元格里带 `<code>` / `<strong>` 片段，所以用 innerHTML 渲染——数据是本仓库构建期文件，
 * 不是用户输入。`prose` 作用域不到组件内部的 code，故在 td 上手动补 code 样式。
 */
export function ApiTable({ id }: { id?: string }) {
  const sections: ApiSection[] = id ? apiSections.filter(s => s.id === id) : apiSections
  return (
    <>
      {sections.map(section => (
        <section key={section.id} id={section.id} className="my-6 scroll-mt-16">
          <h3 className="text-lg font-semibold">{section.title}</h3>
          {section.intro ? (
            <p
              className="mt-1 text-sm text-fd-muted-foreground [&_code]:text-[0.85em]"
              dangerouslySetInnerHTML={{ __html: section.intro }}
            />
          ) : null}
          <div className="mt-3 overflow-x-auto rounded-xl border border-fd-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-fd-secondary/50">
                  {section.columns.map(col => (
                    <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, i) => (
                  <tr key={i} className="border-t border-fd-border align-top">
                    {row.map((cell, j) =>
                      j === 0 ? (
                        <td
                          key={j}
                          className="px-3 py-2 font-mono whitespace-nowrap text-fd-primary"
                        >
                          {cell}
                        </td>
                      ) : (
                        <td
                          key={j}
                          className="px-3 py-2 text-fd-muted-foreground [&_code]:rounded [&_code]:bg-fd-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]"
                          dangerouslySetInnerHTML={{ __html: cell }}
                        />
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  )
}
