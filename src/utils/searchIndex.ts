import { loadAllArticles } from './articleLoader'

export interface SearchSection {
  heading: string
  anchor: string
  text: string
}

export interface SearchDocument {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  date: string
  updated: string
  sections: SearchSection[]
}

export interface SearchHit {
  document: SearchDocument
  score: number
  snippet: string
  /** 命中章节在页面内的锚点，为空表示跳到文章顶部 */
  anchor: string
  /** 命中的章节标题 */
  heading: string
}

// 构建期由 scripts/prerender.mjs 生成，与文章页面同源
const SEARCH_INDEX_URL = '/search-index.json'

let indexPromise: Promise<SearchDocument[]> | null = null

const markdownToText = (markdown: string) =>
  markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const fetchIndex = async (): Promise<SearchDocument[]> => {
  try {
    const response = await fetch(SEARCH_INDEX_URL)
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data?.documents) && data.documents.length > 0) {
        return data.documents as SearchDocument[]
      }
    }
  } catch (error) {
    console.warn('搜索索引加载失败，回退到文章接口', error)
  }

  // 开发环境（没有 prerender 产物）或索引缺失时的兜底
  const articles = await loadAllArticles()
  return articles.map(article => ({
    id: article.id,
    title: article.title,
    description: article.description || '',
    category: article.category || '',
    tags: article.tags || [],
    date: article.createdAt,
    updated: article.updatedAt,
    sections: [{ heading: '', anchor: '', text: markdownToText(article.content) }],
  }))
}

/** 加载搜索索引（同源 JSON，只请求一次） */
export const loadSearchIndex = (): Promise<SearchDocument[]> => {
  if (!indexPromise) {
    indexPromise = fetchIndex().catch(error => {
      indexPromise = null
      throw error
    })
  }
  return indexPromise
}

const makeSnippet = (text: string, index: number, queryLength: number) => {
  if (!text) return ''
  if (index < 0) {
    return text.length > 120 ? `${text.slice(0, 120)}…` : text
  }
  const start = Math.max(0, index - 40)
  const end = Math.min(text.length, index + queryLength + 80)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}

const countOccurrences = (text: string, query: string) => text.split(query).length - 1

/** 纯本地检索：标题 > 标签 > 描述 > 分类 > 正文，命中章节返回锚点 */
export const searchDocuments = (
  documents: SearchDocument[],
  query: string,
  limit = 20,
): SearchHit[] => {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const hits: SearchHit[] = []

  for (const document of documents) {
    const title = document.title.toLowerCase()
    const description = document.description.toLowerCase()
    const category = document.category.toLowerCase()

    let score = 0
    if (title.includes(needle)) score += 100
    if (document.tags.some(tag => tag.toLowerCase().includes(needle))) score += 50
    if (description.includes(needle)) score += 40
    if (category.includes(needle)) score += 30

    let anchor = ''
    let heading = ''
    let snippet = ''
    let bestSectionScore = 0

    for (const section of document.sections) {
      const sectionHeading = section.heading.toLowerCase()
      const text = section.text.toLowerCase()
      let sectionScore = 0

      if (sectionHeading.includes(needle)) sectionScore += 25

      const textIndex = text.indexOf(needle)
      if (textIndex >= 0) {
        sectionScore += 10 + Math.min(countOccurrences(text, needle), 5) * 2
      }

      if (sectionScore > bestSectionScore) {
        bestSectionScore = sectionScore
        anchor = section.anchor
        heading = section.heading
        snippet = makeSnippet(section.text, textIndex, needle.length)
      }

      score += sectionScore
    }

    if (score === 0) continue

    if (!snippet) {
      snippet = makeSnippet(document.description || document.sections[0]?.text || '', -1, 0)
    }

    hits.push({ document, score, snippet, anchor, heading })
  }

  return hits
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return new Date(b.document.date).getTime() - new Date(a.document.date).getTime()
    })
    .slice(0, limit)
}
