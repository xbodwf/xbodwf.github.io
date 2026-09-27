import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { setPreloadedData } from './utils/preload'
import type { PreloadedData } from './utils/preload'

/**
 * 构建期预渲染入口：由 scripts/prerender.mjs 调用。
 * 用 MemoryRouter 在 Node 里渲染指定路径，返回可注入到 #root 的 HTML。
 *
 * 注意：这里必须用 renderToString 而不是 renderToStaticMarkup——
 * 前者会在相邻文本节点之间插入 <!-- --> 分隔符，客户端 hydration 才能对上。
 */
export const render = (path: string, data: PreloadedData): string => {
  setPreloadedData(data)
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}
