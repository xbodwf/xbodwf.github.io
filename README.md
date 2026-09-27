# Xbodwf 个人站点

React 19 + TypeScript + Vite + React Router 的静态站点，部署在 GitHub Pages（自定义域名 `xbouo.top`）。

## 为什么是预渲染

站点是 SPA，但分享链接时爬虫（微信、QQ、Telegram、搜索引擎）不会执行 JS。
如果直接部署空壳 `index.html`，分享卡片只会显示 “Loading”，文章正文也无法被收录。

因此 `pnpm build` 会在打包后做一次预渲染，为首页、文章列表和每篇文章生成真实的静态 HTML
（title / description / og 标签 + 正文），客户端再对这些 HTML 做 hydration。

## 构建与部署

```bash
pnpm install
pnpm dev        # 本地开发
pnpm build      # tsc + 客户端构建 + SSR 构建 + 预渲染
pnpm preview    # 预览 dist
pnpm deploy     # 构建并推送到 gh-pages 分支
```

`pnpm build` 的流程：

1. `vite build` —— 客户端产物输出到 `dist/`
2. `vite build --config vite.ssr.config.ts` —— SSR 入口输出到 `dist-ssr/`
3. `node scripts/prerender.mjs` —— 拉取文章、生成静态页面

### 预渲染脚本做的事

- 从 `Xbodwf/Assets` 仓库拉取 `articles/files.json` 与各篇 markdown（raw 失败自动走 jsDelivr），
  缓存到 `.cache/articles/`，并拷贝一份到 `dist/articles/`。
  线上运行时优先读同源 `/articles/...`，不再依赖国内访问不稳定的 `raw.githubusercontent.com`。
- 为 `/`、`/p`、`/p/<id>` 生成带 meta 信息和正文的 HTML，写入对应目录的 `index.html`。
- 生成 `404.html`（SPA 兜底）、`sitemap.xml`、`robots.txt`。

### 常用环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SITE_URL` | `https://xbouo.top` | 用于 canonical / og:url / sitemap |
| `SITE_NAME` | `Xbodwf` | 站点名 |
| `PRERENDER_LANGUAGE` | `zh` | 预渲染语言（zh / en / ja） |
| `PRERENDER_THEME` | `light` | 预渲染主题（light / dark） |
| `ARTICLES_REPO` / `ARTICLES_BRANCH` | `Xbodwf/Assets` / `main` | 文章仓库 |
| `OG_IMAGE` | 无 | 分享缩略图地址，也可直接放 `public/og.png` |

### 自定义域名

`public/CNAME` 里保存了 `xbouo.top`，会随构建进入 `dist/`，
部署脚本使用 `gh-pages -d dist --dotfiles`，确保 CNAME、`.nojekyll` 等文件不会被部署时清掉。

## 目录说明

- `src/` —— 应用源码（`entry-server.tsx` 是预渲染入口）
- `scripts/prerender.mjs` —— 预渲染与文章本地化脚本
- `vite.ssr.config.ts` —— 预渲染用的 SSR 构建配置
