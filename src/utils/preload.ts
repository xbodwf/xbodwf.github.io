import type { Article, Language, Theme } from '../types'

/**
 * 构建期预渲染时注入到 HTML 里的首屏数据。
 * 服务端（prerender 脚本）通过 setPreloadedData 注入，
 * 客户端从 window.__PRELOADED__ 读取，保证 hydration 前后渲染结果一致。
 */
export interface PreloadedData {
  path: string
  language: Language
  theme: Theme
  article?: Article | null
  articles?: Article[] | null
}

declare global {
  interface Window {
    __PRELOADED__?: PreloadedData
    __HASH_REDIRECT__?: boolean
  }
}

let serverPreloaded: PreloadedData | undefined

export const setPreloadedData = (data?: PreloadedData) => {
  serverPreloaded = data
}

export const getPreloadedData = (): PreloadedData | undefined => {
  if (typeof window !== 'undefined') {
    return window.__PRELOADED__
  }
  return serverPreloaded
}
