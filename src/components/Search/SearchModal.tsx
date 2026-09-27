import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Search as SearchIcon, Close } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { loadSearchIndex, searchDocuments } from '../../utils/searchIndex'
import type { SearchDocument, SearchHit } from '../../utils/searchIndex'
import './SearchModal.css'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')
  const [documents, setDocuments] = useState<SearchDocument[]>([])
  const [indexLoading, setIndexLoading] = useState(false)
  const [indexError, setIndexError] = useState(false)
  const indexRequested = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 第一次打开搜索时再加载索引（同源 JSON，只请求一次）
  useEffect(() => {
    if (!isOpen || indexRequested.current) return
    indexRequested.current = true

    setIndexLoading(true)
    setIndexError(false)

    loadSearchIndex()
      .then(setDocuments)
      .catch(error => {
        console.error('Failed to load search index:', error)
        indexRequested.current = false
        setIndexError(true)
      })
      .finally(() => setIndexLoading(false))
  }, [isOpen])

  // 本地检索，输入即出结果
  const searchResults = useMemo(
    () => (searchValue.trim() ? searchDocuments(documents, searchValue) : []),
    [documents, searchValue],
  )

  // 键盘事件处理
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // 自动聚焦
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleArticleClick = (hit: SearchHit) => {
    const anchor = hit.anchor ? `#${encodeURIComponent(hit.anchor)}` : ''
    navigate(`/p/${hit.document.id}${anchor}`)
    onClose()
    setSearchValue('')
  }

  const clearSearch = () => {
    setSearchValue('')
  }

  const highlightText = (text: string, searchTerm: string) => {
    const term = searchTerm.trim()
    if (!term) return text

    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi')
    const lowerTerm = term.toLowerCase()

    return text.split(regex).map((part, index) =>
      part.toLowerCase() === lowerTerm ? (
        <mark key={index} className="search-highlight">{part}</mark>
      ) : (
        part
      )
    )
  }

  if (!isOpen) return null

  return (
    <div className="search-modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-header">
          <div className="search-modal-input-container">
            <SearchIcon className="search-modal-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t('search.placeholder')}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="search-modal-input"
            />
            {searchValue && (
              <button className="search-modal-clear" onClick={clearSearch}>
                <Close />
              </button>
            )}
          </div>
          <button className="search-modal-close" onClick={onClose}>
            <Close />
          </button>
        </div>
        
        <div className="search-modal-content">
          {indexLoading ? (
            <div className="search-modal-loading">
              <div className="loading-spinner"></div>
              <span>{t('common.loading')}</span>
            </div>
          ) : indexError ? (
            <div className="search-modal-no-results">
              <p>{t('common.error')}</p>
            </div>
          ) : searchValue ? (
            searchResults.length > 0 ? (
              <>
                <div className="search-modal-results-header">
                  {t('search.resultsCount', { count: searchResults.length })}
                </div>
                <div className="search-modal-results">
                  {searchResults.map((hit) => (
                    <div
                      key={hit.document.id}
                      className="search-modal-result-item"
                      onClick={() => handleArticleClick(hit)}
                    >
                      <h3 className="search-result-title">
                        {highlightText(hit.document.title, searchValue)}
                      </h3>
                      {hit.snippet && (
                        <p className="search-result-description">
                          {highlightText(hit.snippet, searchValue)}
                        </p>
                      )}
                      <div className="search-result-meta">
                        {hit.heading && (
                          <span className="search-result-section">
                            § {highlightText(hit.heading, searchValue)}
                          </span>
                        )}
                        {hit.document.category && (
                          <span className="search-result-category">
                            {highlightText(hit.document.category, searchValue)}
                          </span>
                        )}
                        {hit.document.tags.length > 0 && (
                          <div className="search-result-tags">
                            {hit.document.tags.map((tag, index) => (
                              <span key={index} className="search-result-tag">
                                {highlightText(tag, searchValue)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="search-modal-no-results">
                <p>{t('search.noResults')}</p>
              </div>
            )
          ) : (
            <div className="search-modal-empty">
              <p>{t('search.inputPlaceholder')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchModal
