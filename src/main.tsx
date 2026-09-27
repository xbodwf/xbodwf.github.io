import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import 'instant.page'

const rootElement = document.getElementById('root')!

const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// 预渲染页面（#root 里已有与当前路由一致的内容）走 hydration，
// 其余情况（旧 hash 链接跳转、404 兜底页等）照常挂载
const canHydrate =
  rootElement.hasChildNodes() &&
  rootElement.dataset.hydrate !== 'false' &&
  window.__HASH_REDIRECT__ !== true

if (canHydrate) {
  hydrateRoot(rootElement, app)
} else {
  createRoot(rootElement).render(app)
}
