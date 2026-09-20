import pkg from 'react-okr-tree/package.json'

/** 库版本从包真源读取，避免文档站里出现第二个版本号副本（发布时只改 packages/react-okr-tree） */
export const LIB_VERSION = pkg.version as string
