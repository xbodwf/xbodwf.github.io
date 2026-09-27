import type { Article } from '../types'

interface ArticleMetadata {
  id: string
  filename: string
  title: string
  description: string
}

interface FilesConfig {
  articles: ArticleMetadata[]
}

// 文章数据源，按顺序尝试：
// 1. 站点同源目录（构建期由 scripts/prerender.mjs 拷贝进 dist/articles，国内访问最稳）
// 2. jsDelivr 镜像（GitHub 直连不通时的兜底）
// 3. GitHub raw（最后的兜底）
const ARTICLE_BASES = [
  '/articles',
  'https://cdn.jsdelivr.net/gh/Xbodwf/Assets@main/articles',
  'https://raw.githubusercontent.com/Xbodwf/Assets/main/articles'
]

// 依次尝试各个数据源，解析失败（例如开发服务器把未知路径回退成了 index.html）继续尝试下一个
const fetchFromSources = async <T>(filename: string, parse: (text: string) => T): Promise<T | null> => {
  for (const base of ARTICLE_BASES) {
    try {
      const response = await fetch(`${base}/${filename}`, { cache: 'no-store' })
      if (!response.ok) continue
      const text = await response.text()
      try {
        return parse(text)
      } catch {
        continue
      }
    } catch (error) {
      console.warn(`Failed to load ${base}/${filename}, trying next source`, error)
    }
  }
  return null
}

// 解析 YAML front matter
export const parseFrontMatter = (yamlContent: string) => {
  const result: any = {}
  const lines = yamlContent.split(/\r?\n/)
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) continue
    
    const colonIndex = trimmedLine.indexOf(':')
    if (colonIndex === -1) continue
    
    const key = trimmedLine.slice(0, colonIndex).trim()
    const value = trimmedLine.slice(colonIndex + 1).trim()
    
    if (key === 'tags' && value.startsWith('[') && value.endsWith(']')) {
      result[key] = value.slice(1, -1).split(',').map(tag => tag.trim().replace(/['"]/g, ''))
    } else {
      result[key] = value.replace(/['"]/g, '')
    }
  }
  
  return result
}

// 加载文章配置
export const loadArticlesConfig = async (): Promise<FilesConfig> => {
  const config = await fetchFromSources('files.json', text => JSON.parse(text) as FilesConfig)
  if (config) {
    return config
  }
  console.error('Error loading articles config: no available source')
  // 返回默认配置作为后备
  return {
    articles: [
      
    ]
  }
}

// 加载单个文章
export const loadArticle = async (id: string): Promise<Article | null> => {
  const config = await loadArticlesConfig()
  const articleMeta = config.articles.find(article => article.id === id)
  
  if (!articleMeta) {
    return null
  }

  const content = await fetchFromSources(articleMeta.filename, text => {
    // 防止把 HTML 回退页当成 markdown
    if (!text.trimStart().startsWith('---')) {
      throw new Error('Not a markdown document')
    }
    return text
  })

  if (!content) {
    return null
  }

  const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  
  if (!frontMatterMatch) {
    return null
  }
  
  const frontMatter = parseFrontMatter(frontMatterMatch[1])
  const articleContent = content.slice(frontMatterMatch[0].length).trim()
  
  return {
    id: articleMeta.id,
    title: frontMatter.title || articleMeta.title,
    description: frontMatter.description || articleMeta.description,
    content: articleContent,
    createdAt: frontMatter.date || new Date().toISOString(),
    updatedAt: frontMatter.updated || frontMatter.date || new Date().toISOString(),
    category: frontMatter.category || '',
    tags: frontMatter.tags || [],
    authors: frontMatter.authors || []
  }
}

// 加载所有文章
export const loadAllArticles = async (): Promise<Article[]> => {
  try {
    const config = await loadArticlesConfig()
    const articlePromises = config.articles.map(articleMeta => loadArticle(articleMeta.id))
    const articles = await Promise.all(articlePromises)
    return articles.filter(Boolean) as Article[]
  } catch (error) {
    console.error('Error loading all articles:', error)
    return []
  }
}

// 搜索文章（按ID或标题）
export const searchArticles = async (query: string): Promise<Article[]> => {
  if (!query.trim()) {
    return []
  }
  
  const config = await loadArticlesConfig()
  const searchTerm = query.toLowerCase()
  
  // 首先检查是否是精确的ID匹配
  const exactIdMatch = config.articles.find(article => article.id === query)
  if (exactIdMatch) {
    const article = await loadArticle(exactIdMatch.id)
    return article ? [article] : []
  }
  
  // 然后进行标题和描述的模糊搜索
  const matchingMeta = config.articles.filter(article => 
    article.id.toLowerCase().includes(searchTerm) ||
    article.title.toLowerCase().includes(searchTerm) ||
    article.description.toLowerCase().includes(searchTerm)
  )
  
  const articlePromises = matchingMeta.map(meta => loadArticle(meta.id))
  const articles = await Promise.all(articlePromises)
  return articles.filter(Boolean) as Article[]
}
