import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { marked } from 'marked'
import type { Tokens } from 'marked'
import Markdown from '../../utils/markdown';
import hljs from 'highlight.js'
import { useTheme } from '../../contexts/ThemeContext'
import ThemeManager from '../../utils/themeManager'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import { useLanguage } from '../../contexts/LanguageContext'
import { loadArticle } from '../../utils/articleLoader'
import { getPreloadedData } from '../../utils/preload'
import type { Article as ArticleType } from '../../types'
import './Article.css'

const Article: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { t, formatTime, formatRelativeTime } = useLanguage()
  const { theme } = useTheme()
  // 预渲染页面会在 window.__PRELOADED__ 里带上本文数据，用作首屏状态
  const getPreloadedArticle = (): ArticleType | null => {
    const preloaded = getPreloadedData()?.article
    return preloaded && preloaded.id === id ? preloaded : null
  }
  const [article, setArticle] = useState<ArticleType | null>(getPreloadedArticle)
  const [loading, setLoading] = useState(() => getPreloadedArticle() === null)
  const [error, setError] = useState<string | null>(null)
  const [themeLoading, setThemeLoading] = useState(false)

  // 动态设置页面标题
  const getPageTitle = () => {
    if (loading) return t('article.loading')
    if (error) return t('article.notFound')
    if (article) return article.title
    return t('article.error')
  }
  
  useDocumentTitle(getPageTitle())

  // 加载主题
  useEffect(() => {
    const loadTheme = async () => {
      setThemeLoading(true)
      try {
        const themeManager = ThemeManager.getInstance()
        await themeManager.loadHighlightTheme(theme)
      } catch (error) {
        console.error('Failed to load theme:', error)
      } finally {
        setThemeLoading(false)
      }
    }

    loadTheme()
  }, [theme])

  useEffect(() => {
    // 预渲染数据已经包含当前文章，无需再次请求
    const preloaded = getPreloadedData()?.article
    if (preloaded && preloaded.id === id) {
      setArticle(preloaded)
      setError(null)
      setLoading(false)
      return
    }

    const fetchArticle = async () => {
      if (!id) {
        setError('Article ID is required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const articleData = await loadArticle(id)
        
        if (!articleData) {
          throw new Error('Article not found')
        }
        
        setArticle(articleData)
      } catch (err) {
        console.error('Error fetching article:', err)
        setError(err instanceof Error ? err.message : 'Failed to load article')
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [id])

  // 处理文章内锚点定位（如 /p/2/#9-表格-tables，来自站内搜索或外部链接）
  useEffect(() => {
    if (!article || !location.hash) return
    const rawAnchor = location.hash.replace(/^#+/, '')
    if (!rawAnchor) return

    // URL 里的 hash 是百分号编码的，先解码再找元素
    let anchor = rawAnchor
    try {
      anchor = decodeURIComponent(rawAnchor)
    } catch {
      // 保底：用未解码的原始值
    }

    const timer = setTimeout(() => {
      const element = document.getElementById(anchor)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [article, location.hash])

  // 获取语言显示名称
  const getLanguageDisplayName = (lang: string): string => {
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'javascript': 'JavaScript',
      'ts': 'TypeScript',
      'typescript': 'TypeScript',
      'jsx': 'JSX',
      'tsx': 'TSX',
      'py': 'Python',
      'python': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'csharp': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'ruby': 'Ruby',
      'go': 'Go',
      'rust': 'Rust',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'dart': 'Dart',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'toml': 'TOML',
      'ini': 'INI',
      'sql': 'SQL',
      'bash': 'Bash',
      'sh': 'Shell',
      'powershell': 'PowerShell',
      'ps1': 'PowerShell',
      'dockerfile': 'Dockerfile',
      'makefile': 'Makefile',
      'markdown': 'Markdown',
      'md': 'Markdown',
      'text': 'Text',
      'txt': 'Text',
      'plaintext': 'Text'
    }
    
    return languageMap[lang.toLowerCase()] || lang.toUpperCase()
  }

  // 解析文章内容
  const parsedContent = useMemo((): string => {
    if (!article) return ''

    // 配置 marked
    const renderer = new marked.Renderer()
    
    // 自定义代码块渲染 - 直接生成完整的HTML
    renderer.code = ({ text, lang, escaped }: Tokens.Code) => {
      const language = lang || 'text'
      const displayName = getLanguageDisplayName(language)
      const codeId = `code-${Math.random().toString(36).substr(2, 9)}`
      
      // 进行语法高亮
      let highlightedCode = text
      try {
        if (hljs.getLanguage(language)) {
          highlightedCode = hljs.highlight(text, { language }).value
        } else {
          highlightedCode = hljs.highlightAuto(text).value
        }
      } catch (error) {
        console.warn('Highlight error:', error)
        highlightedCode = text
      }
      
      return `
        <div class="code-block ${themeLoading ? 'theme-loading' : ''}">
          <div class="code-header">
            <span class="code-language">${displayName}</span>
            <button class="copy-button" onclick="copyCodeToClipboard('${codeId}', this)" aria-label="Copy code to clipboard" title="Copy">
              <svg class="copy-icon" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
              <svg class="check-icon" viewBox="0 0 24 24" width="16" height="16" style="display: none;">
                <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span class="copy-text">Copy</span>
            </button>
          </div>
          <pre class="code-pre"><code id="${codeId}" class="language-${language}" data-raw-code="${text.replace(/"/g, '&quot;')}">${highlightedCode}</code></pre>
        </div>
      `
    }
    
    // 自定义内联代码渲染
    renderer.codespan = ({ text }: Tokens.Codespan) => {
      return `<code class="inline-code">${text}</code>`
    }
    
    // 自定义标题渲染，添加锚点
    renderer.heading = ({ tokens, depth }: Tokens.Heading) => {
      // 简单地将 tokens 转换为文本
      const text = tokens.map(token => {
        if ('text' in token) return token.text
        if ('raw' in token) return token.raw
        return ''
      }).join('')
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      return `<h${depth} id="${id}" class="article-heading">${text}</h${depth}>`
    }
    
    // 自定义段落渲染
    renderer.paragraph = ({ tokens }: Tokens.Paragraph) => {
      // 简单地将 tokens 转换为文本
      const text = tokens.map(token => {
        if ('text' in token) return token.text
        if ('raw' in token) return token.raw
        return ''
      }).join('')
      return `<p class="article-paragraph">${text}</p>`
    }
    
    marked.setOptions({
      renderer,
      breaks: true,
      gfm: true
    })
    
    // 确保 marked 返回字符串而不是 Promise
    const result = marked(article.content)
    return typeof result === 'string' ? result : ''
  }, [article, themeLoading])

  // 添加复制功能的全局函数
  useEffect(() => {
    // 添加全局复制函数
    (window as any).copyCodeToClipboard = async (codeId: string, button: HTMLButtonElement) => {
      const codeElement = document.getElementById(codeId)
      if (!codeElement) return
      
      const rawCode = codeElement.getAttribute('data-raw-code') || codeElement.textContent || ''
      
      try {
        await navigator.clipboard.writeText(rawCode)
        
        // 更新按钮状态
        const copyIcon = button.querySelector('.copy-icon') as HTMLElement
        const checkIcon = button.querySelector('.check-icon') as HTMLElement
        const copyText = button.querySelector('.copy-text') as HTMLElement
        
        if (copyIcon) copyIcon.style.display = 'none'
        if (checkIcon) checkIcon.style.display = 'inline'
        if (copyText) copyText.textContent = 'Copied!'
        
        setTimeout(() => {
          if (copyIcon) copyIcon.style.display = 'inline'
          if (checkIcon) checkIcon.style.display = 'none'
          if (copyText) copyText.textContent = 'Copy'
        }, 2000)
      } catch (err) {
        console.error('Failed to copy code:', err)
        // 降级方案
        const textArea = document.createElement('textarea')
        textArea.value = rawCode
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          // 重新获取按钮元素
          const copyText = button.querySelector('.copy-text') as HTMLElement
          if (copyText) copyText.textContent = 'Copied!'
          setTimeout(() => {
            if (copyText) copyText.textContent = 'Copy'
          }, 2000)
        } catch (fallbackErr) {
          console.error('Fallback copy failed:', fallbackErr)
        }
        document.body.removeChild(textArea)
      }
    }

    // 清理函数
    return () => {
      delete (window as any).copyCodeToClipboard
    }
  }, [])

  if (loading) {
    return (
      <div className="article-container">
        <div className="article-loading">
          <div className="loading-spinner"></div>
          <p>{t('article.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="article-container">
        <div className="article-error">
          <h1>{t('article.notFound')}</h1>
          <p>{error || t('article.error')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="article-container">
      <article className="article">
        <header className="article-header">
          <h1 className="article-title">{article.title}</h1>
          {article.description && (
            <p className="article-description">{article.description}</p>
          )}
          
          <div className="article-meta">
            <div className="article-meta-item">
              <span className="article-meta-label"></span>
              <time className="article-meta-value" dateTime={article.createdAt}>
                {article.createdAt}
              </time>
            </div>
            
            {article.updatedAt !== article.createdAt && (
              <div className="article-meta-item">
                <span className="article-meta-label">{t('article.updatedAt')}</span>
                <time className="article-meta-value" dateTime={article.updatedAt}>
                  {article.updatedAt}
                </time>
              </div>
            )}
            
            {article.category && (
              <div className="article-meta-item">
                <span className="article-meta-value article-category">{`${article.category} `}</span>
              </div>
            )}
            
            {article.authors && article.authors.length > 0 && (
              <div className="article-meta-item">
                <span className="article-meta-label">{t('article.authors')}</span>
                <div className="article-authors">
                  {article.authors.map((author, index) => (
                    <span key={index} className="article-author">
                      {author.website ? (
                        <a href={author.website} target="_blank" rel="noopener noreferrer">
                          {author.name}
                        </a>
                      ) : (
                        author.name
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {article.tags && article.tags.length > 0 && (
            <div className="article-tags">
              {article.tags.map((tag, index) => (
                <span key={index} className="article-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>
        
        <div 
          className="article-content"
          /*dangerouslySetInnerHTML={{ __html: parsedContent }}*/
        >
          <Markdown content={article.content} />
        </div>
      </article>
    </div>
  )
}

export default Article