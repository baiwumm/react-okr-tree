import { BUILT_IN_THEMES } from 'react-okr-tree'

/**
 * 首页数字的唯一来源（Hero 数据行 / SpecSheet / 特性段都读这里）
 *
 * 为什么单列一个模块：AGENTS 里那条「不写死易漂移的数字」不只约束文档正文，落地页同理——
 * 同一个「6 套主题」散落在三个 tsx 里，改库时就一定会漏掉一处。
 *
 * 主题数直接取库导出的 `BUILT_IN_THEMES`；动画清单只能手动镜像：库侧 `AnimateName` 是
 * 类型联合、没有运行时常量（补一个导出会动 API 面与 `verify:dist` 的断言，不值得），
 * 所以这里与 `packages/react-okr-tree/src/types.ts` 同序同值地抄一份，改库的动画清单时同步改这里。
 */
const ANIMATE_NAMES = [
  'okr-fade-in-linear',
  'okr-fade-in',
  'okr-zoom-in-center',
  'okr-zoom-in-top',
  'okr-zoom-in-bottom',
  'okr-zoom-in-left',
] as const

/** 三种布局：vertical / horizontal / OKR 双向（后者的开关是 onlyBothTree + leftData） */
const LAYOUTS = ['vertical', 'horizontal', 'okr'] as const

export const FACTS = {
  layouts: LAYOUTS.length,
  themes: BUILT_IN_THEMES.length,
  animations: ANIMATE_NAMES.length,
  /** 运行时依赖数量：react / react-dom 是 peer，其余全是可选 peer */
  runtimeDeps: 0,
} as const

/** 规格表与主题展示位共用的主题清单（顺序即库里 BUILT_IN_THEMES 的顺序） */
export const THEME_LIST = BUILT_IN_THEMES
