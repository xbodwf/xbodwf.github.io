#!/usr/bin/env node
/**
 * 构建期预渲染脚本（vite build 之后执行）。
 *
 * 做三件事：
 * 1. 从 Assets 仓库拉取文章（raw 失败自动走 jsDelivr），缓存到 .cache/articles，
 *    并拷贝一份到 dist/articles —— 这样线上运行时不再依赖被墙的 raw.githubusercontent.com。
 * 2. 用 dist-ssr/entry-server.mjs 在 Node 里渲染首页 / 文章列表 / 每篇文章，
 *    生成带 title、description、og 标签和正文的静态 HTML，
 *    避免分享链接只能拿到空壳 index.html。
 * 3. 生成 404.html（SPA 兜底）、sitemap.xml、robots.txt。
 *
 * 可用环境变量：
 *   SITE_URL            站点地址，默认 https://xbouo.top
 *   SITE_NAME           站点名，默认 Xbodwf
 *   PRERENDER_LANGUAGE  预渲染语言 zh|en|ja，默认 zh
 *   PRERENDER_THEME     预渲染主题 light|dark，默认 light
 *   ARTICLES_REPO       文章仓库 owner/repo，默认 Xbodwf/Assets
 *   ARTICLES_BRANCH     文章仓库分支，默认 main
 */
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const DIST_DIR = path.join(ROOT, 'dist')
const CACHE_DIR = path.join(ROOT, '.cache', 'articles')
const SSR_ENTRY = path.join(ROOT, 'dist-ssr', 'entry-server.mjs')
const TEMPLATE_FILE = path.join(DIST_DIR, 'index.html')

const SITE_URL = (process.env.SITE_URL || 'https://xbouo.top').replace(/\/+$/, '')
const SITE_NAME = process.env.SITE_NAME || 'Xbodwf'
const LANGUAGE = process.env.PRERENDER_LANGUAGE || 'zh'
const THEME = process.env.PRERENDER_THEME === 'dark' ? 'dark' : 'light'
const ASSETS_REPO = process.env.ARTICLES_REPO || 'Xbodwf/Assets'
const ASSETS_BRANCH = process.env.ARTICLES_BRANCH || 'main'

const REMOTE_BASES = [
  `https://cdn.jsdelivr.net/gh/${ASSETS_REPO}@${ASSETS_BRANCH}/articles`,
  `https://raw.githubusercontent.com/${ASSETS_REPO}/${ASSETS_BRANCH}/articles`,
]

const LOG_PREFIX = '[prerender]'

const SITE_STRINGS = {
  zh: {
    homeTitle: `${SITE_NAME} - 个人站点与技术文章`,
    homeDescription: `${SITE_NAME} 的个人站点，分享技术文章、开发经验与开源项目。`,
    articlesTitle: `文章列表 - ${SITE_NAME}`,
    articlesDescription: `${SITE_NAME} 发布的技术文章列表，包含开发经验与技术笔记。`,
    notFoundTitle: `页面未找到 - ${SITE_NAME}`,
  },
  en: {
    homeTitle: `${SITE_NAME} - Personal site & tech articles`,
    homeDescription: `Personal site of ${SITE_NAME}: tech articles, dev notes and open source projects.`,
    articlesTitle: `Articles - ${SITE_NAME}`,
    articlesDescription: `Tech articles published by ${SITE_NAME}.`,
    notFoundTitle: `Page not found - ${SITE_NAME}`,
  },
  ja: {
    homeTitle: `${SITE_NAME} - 個人サイトと技術記事`,
    homeDescription: `${SITE_NAME} の個人サイト。技術記事や開発メモを公開しています。`,
    articlesTitle: `記事一覧 - ${SITE_NAME}`,
    articlesDescription: `${SITE_NAME} が公開した技術記事の一覧です。`,
    notFoundTitle: `ページが見つかりません - ${SITE_NAME}`,
  },
}

const strings = SITE_STRINGS[LANGUAGE] || SITE_STRINGS.zh

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// 与 src/utils/articleLoader.ts 中的 parseFrontMatter 保持一致，
// 否则预渲染数据与客户端解析结果不同会导致 hydration 不一致。
const parseFrontMatter = (yamlContent) => {
  const result = {}
  const lines = yamlContent.split(/\r?\n/)

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue

    const colonIndex = trimmedLine.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmedLine.slice(0, colonIndex).trim()
    const value = trimmedLine.slice(colonIndex + 1).trim()

    if (key === 'tags' && value.startsWith('[') && value.endsWith(']')) {
      result[key] = value
        .slice(1, -1)
        .split(',')
        .map(tag => tag.trim().replace(/['"]/g, ''))
    } else {
      result[key] = value.replace(/['"]/g, '')
    }
  }

  return result
}

const markdownToText = (markdown) =>
  markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const truncate = (text, maxLength) =>
  text.length > maxLength ? `${text.slice(0, maxLength)}…` : text

const fetchText = async (filename) => {
  for (const base of REMOTE_BASES) {
    const url = `${base}/${filename}`
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (response.ok) {
        return await response.text()
      }
      console.warn(`${LOG_PREFIX} ${url} 返回 ${response.status}`)
    } catch (error) {
      console.warn(`${LOG_PREFIX} 拉取失败 ${url}: ${error.message}`)
    }
  }
  return null
}

const readCacheOrNull = async (filename) => {
  const file = path.join(CACHE_DIR, filename)
  if (!existsSync(file)) return null
  return await readFile(file, 'utf8')
}

/** 拉取文章（网络优先，失败时回退到 .cache），并写入 dist/articles 供运行时使用 */
const loadArticles = async () => {
  let filesJson = await fetchText('files.json')
  if (!filesJson) {
    filesJson = await readCacheOrNull('files.json')
    if (filesJson) {
      console.warn(`${LOG_PREFIX} 网络不可用，使用 .cache/articles 里的文章缓存`)
    }
  }
  if (!filesJson) {
    throw new Error('无法获取文章列表 files.json（网络与缓存均不可用）')
  }

  const config = JSON.parse(filesJson)
  const metas = Array.isArray(config.articles) ? config.articles : []

  const articles = []
  for (const meta of metas) {
    let content = await fetchText(meta.filename)
    if (!content) {
      content = await readCacheOrNull(meta.filename)
    }
    if (!content) {
      console.warn(`${LOG_PREFIX} 跳过无法获取的文章：${meta.filename}`)
      continue
    }

    const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (!frontMatterMatch) {
      console.warn(`${LOG_PREFIX} 跳过缺少 front matter 的文章：${meta.filename}`)
      continue
    }

    const frontMatter = parseFrontMatter(frontMatterMatch[1])
    const articleContent = content.slice(frontMatterMatch[0].length).trim()

    articles.push({
      id: String(meta.id),
      title: frontMatter.title || meta.title || meta.filename,
      description: frontMatter.description || meta.description || '',
      content: articleContent,
      createdAt: frontMatter.date || new Date().toISOString(),
      updatedAt: frontMatter.updated || frontMatter.date || new Date().toISOString(),
      category: frontMatter.category || '',
      tags: Array.isArray(frontMatter.tags) ? frontMatter.tags : [],
      authors: Array.isArray(frontMatter.authors) ? frontMatter.authors : [],
    })

    // 写入缓存与站点同源目录
    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(path.join(CACHE_DIR, meta.filename), content, 'utf8')
  }

  // 与 ArticleList 的排序保持一致（创建时间倒序）
  articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(path.join(CACHE_DIR, 'files.json'), filesJson, 'utf8')
  await cp(CACHE_DIR, path.join(DIST_DIR, 'articles'), { recursive: true })

  console.log(`${LOG_PREFIX} 已加载 ${articles.length} 篇文章，并拷贝到 dist/articles`)
  return articles
}

const buildHead = ({ title, description, pathname, ogType, article, noindex = false }) => {
  const url = `${SITE_URL}${pathname}`
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow'}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:locale" content="${LANGUAGE}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  ]

  const ogImage = process.env.OG_IMAGE || (existsSync(path.join(DIST_DIR, 'og.png')) ? '/og.png' : null)
  if (ogImage) {
    const imageUrl = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`
    tags.push(`<meta property="og:image" content="${escapeHtml(imageUrl)}" />`)
    tags.push(`<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`)
  }

  if (article) {
    tags.push(`<meta property="article:published_time" content="${escapeHtml(article.createdAt)}" />`)
    if (article.updatedAt && article.updatedAt !== article.createdAt) {
      tags.push(`<meta property="article:modified_time" content="${escapeHtml(article.updatedAt)}" />`)
    }
    if (article.category) {
      tags.push(`<meta property="article:section" content="${escapeHtml(article.category)}" />`)
    }
    for (const tag of article.tags || []) {
      tags.push(`<meta property="article:tag" content="${escapeHtml(tag)}" />`)
    }
  }

  return tags.join('\n    ')
}

const injectPage = (template, { body, head, title, preloaded, styleTags, hydrate = true }) => {
  let html = template

  const rootOpenTag = hydrate ? '<div id="root">' : '<div id="root" data-hydrate="false">'
  html = html.replace('<div id="root"></div>', `${rootOpenTag}${body}</div>`)
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
  html = html.replace(/<meta name="description"[^>]*>\s*/, '')
  html = html.replace('<!--app-head-->', head)
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${LANGUAGE}">`)

  if (styleTags && styleTags.length > 0) {
    html = html.replace('</head>', `  ${styleTags.join('\n  ')}\n  </head>`)
  }

  const preloadScript = `<script>window.__PRELOADED__=${JSON.stringify(preloaded).replace(/</g, '\\u003c')}</script>`
  html = html.replace('</body>', `${preloadScript}\n  </body>`)

  return html
}

const writePage = async (pathname, html) => {
  const dir =
    pathname === '/'
      ? DIST_DIR
      : path.join(DIST_DIR, ...pathname.split('/').filter(Boolean))
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'index.html'), html, 'utf8')
}

const buildSitemap = (articles) => {
  const urls = [
    { loc: `${SITE_URL}/`, lastmod: articles[0]?.updatedAt || articles[0]?.createdAt },
    { loc: `${SITE_URL}/p/`, lastmod: articles[0]?.updatedAt || articles[0]?.createdAt },
    ...articles.map(article => ({
      loc: `${SITE_URL}/p/${article.id}/`,
      lastmod: article.updatedAt || article.createdAt,
    })),
  ]

  const entries = urls
    .map(({ loc, lastmod }) => {
      const lastmodTag = lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''
      return `  <url>\n    <loc>${escapeHtml(loc)}</loc>${lastmodTag}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

const main = async () => {
  if (!existsSync(TEMPLATE_FILE)) {
    throw new Error(`找不到 ${TEMPLATE_FILE}，请先执行 vite build`)
  }
  if (!existsSync(SSR_ENTRY)) {
    throw new Error(`找不到 ${SSR_ENTRY}，请先执行 vite build --config vite.ssr.config.ts`)
  }

  const template = await readFile(TEMPLATE_FILE, 'utf8')
  const { render } = await import(pathToFileURL(SSR_ENTRY).href)
  const articles = await loadArticles()

  // emotion（MUI）在 SSR 时会把 <style data-emotion> 渲染进 #root，
  // 客户端 hydration 时那里不会再有这些节点，会把整棵树判定为不一致；
  // 所以先抽出来，统一放进 head（客户端 emotion 会识别这些标签并复用）。
  const extractEmotionStyles = (html) => {
    const seen = new Set()
    const styleTags = []
    const strippedHtml = html.replace(
      /<style data-emotion="([^"]*)">([\s\S]*?)<\/style>/g,
      (_, dataEmotion, css) => {
        const dedupeKey = `${dataEmotion}\u0000${css}`
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey)
          styleTags.push(`<style data-emotion="${dataEmotion}">${css}</style>`)
        }
        return ''
      },
    )
    return { html: strippedHtml, styleTags }
  }

  // 渲染并抽离 emotion 样式
  const renderRoute = (pathname, data) => {
    const { html, styleTags } = extractEmotionStyles(render(pathname, data))
    return { body: html, styleTags }
  }

  const baseData = { language: LANGUAGE, theme: THEME }

  // 首页
  const homeHtml = injectPage(template, {
    ...renderRoute('/', { ...baseData, path: '/' }),
    head: buildHead({
      title: strings.homeTitle,
      description: strings.homeDescription,
      pathname: '/',
      ogType: 'website',
    }),
    title: strings.homeTitle,
    preloaded: { ...baseData, path: '/' },
  })
  await writePage('/', homeHtml)

  // 文章列表
  const listHtml = injectPage(template, {
    ...renderRoute('/p', { ...baseData, path: '/p', articles }),
    head: buildHead({
      title: strings.articlesTitle,
      description: strings.articlesDescription,
      pathname: '/p/',
      ogType: 'website',
    }),
    title: strings.articlesTitle,
    preloaded: { ...baseData, path: '/p', articles },
  })
  await writePage('/p', listHtml)

  // 每篇文章
  for (const article of articles) {
    const pathname = `/p/${article.id}/`
    const description = truncate(
      article.description || markdownToText(article.content),
      150,
    )
    const title = `${article.title} - ${SITE_NAME}`

    const html = injectPage(template, {
      ...renderRoute(`/p/${article.id}`, { ...baseData, path: pathname, article }),
      head: buildHead({
        title,
        description,
        pathname,
        ogType: 'article',
        article,
      }),
      title,
      preloaded: { ...baseData, path: pathname, article },
    })
    await writePage(`/p/${article.id}`, html)
  }

  // 404 兜底（GitHub Pages 对未知路径返回 404.html，交给前端路由）
  const notFoundHtml = injectPage(template, {
    ...renderRoute('/404', { ...baseData, path: '/404' }),
    hydrate: false,
    head: buildHead({
      title: strings.notFoundTitle,
      description: strings.notFoundTitle,
      pathname: '/404',
      ogType: 'website',
      noindex: true,
    }),
    title: strings.notFoundTitle,
    preloaded: { ...baseData, path: '/404' },
  })
  await writeFile(path.join(DIST_DIR, '404.html'), notFoundHtml, 'utf8')

  // sitemap & robots
  await writeFile(path.join(DIST_DIR, 'sitemap.xml'), buildSitemap(articles), 'utf8')
  await writeFile(
    path.join(DIST_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    'utf8',
  )

  console.log(`${LOG_PREFIX} 完成：预渲染 ${articles.length + 2} 个页面 + 404.html + sitemap.xml`)
}

main().catch(error => {
  console.error(`${LOG_PREFIX} 失败：${error.message}`)
  process.exitCode = 1
})
