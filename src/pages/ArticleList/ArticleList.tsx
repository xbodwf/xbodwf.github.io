import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarToday, Category, Person } from '@mui/icons-material'
import { useLanguage } from '../../contexts/LanguageContext'
import { loadAllArticles } from '../../utils/articleLoader'
import { getPreloadedData } from '../../utils/preload'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import type { Article } from '../../types'
import './ArticleList.css'

const ArticleList: React.FC = () => {
  const { t, formatTime, formatRelativeTime } = useLanguage()
  const navigate = useNavigate()
  // 预渲染页面会在 window.__PRELOADED__ 里带上文章列表，用作首屏状态
  const getPreloadedArticles = (): Article[] | null => {
    const preloaded = getPreloadedData()?.articles
    return preloaded && preloaded.length > 0 ? preloaded : null
  }
  const [articles, setArticles] = useState<Article[]>(() => getPreloadedArticles() ?? [])
  const [loading, setLoading] = useState(() => getPreloadedArticles() === null)
  const [error, setError] = useState<string | null>(null)

  useDocumentTitle(t('nav.articles'))

  useEffect(() => {
    // 预渲染页面已经包含文章列表，无需再次请求
    if (getPreloadedArticles()) {
      return
    }

    const fetchArticles = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const loadedArticles = await loadAllArticles()
        
        // 按创建时间倒序排列
        const sortedArticles = loadedArticles.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        
        setArticles(sortedArticles)
      } catch (err) {
        console.error('Error loading articles:', err)
        setError('Failed to load articles')
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  // 解析 YAML front matter
  const parseFrontMatter = (yamlContent: string) => {
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

  const handleArticleClick = (articleId: string) => {
    navigate(`/p/${articleId}`)
  }

  const getExcerpt = (content: string, maxLength: number = 150) => {
    const plainText = content.replace(/[#*`\[\]()]/g, '').trim()
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...'
      : plainText
  }

  if (loading) {
    return (
      <div className="article-list-page">
        <div className="container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>{t('articleList.loading')}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="article-list-page">
      <div className="container">
        <header className="page-header">
          <h1 className="page-title">{t('articleList.title')}</h1>
          <p className="page-description">
            {t('articleList.description')}
          </p>
        </header>

        {articles.length > 0 ? (
          <div className="articles-grid">
            {articles.map((article) => (
              <article 
                key={article.id} 
                className="article-card"
                onClick={() => handleArticleClick(article.id)}
              >
                <div className="article-meta">
                  <div className="meta-item">
                    <CalendarToday className="meta-icon" />
                    <span className="meta-text">
                      {formatTime(article.createdAt)}
                    </span>
                  </div>
                  {article.category && (
                    <div className="meta-item">
                      <Category className="meta-icon" />
                      <span className="meta-text category">
                        {article.category}
                      </span>
                    </div>
                  )}
                </div>

                <h2 className="article-title">
                  {article.title}
                </h2>

                {article.description && (
                  <p className="article-description">
                    {article.description}
                  </p>
                )}

                <p className="article-excerpt">
                  {getExcerpt(article.content)}
                </p>

                {article.tags.length > 0 && (
                  <div className="article-tags">
                    {article.tags.map((tag, index) => (
                      <span key={index} className="article-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {article.authors.length > 0 && (
                  <div className="article-authors">
                    <Person className="meta-icon" />
                    <span className="meta-text">
                      {article.authors.map(author => author.name).join(', ')}
                    </span>
                  </div>
                )}

                <div className="article-footer">
                  <span className="read-more">{t('articleList.readMore')}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>{t('articleList.empty.title')}</h3>
            <p>{t('articleList.empty.description')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ArticleList