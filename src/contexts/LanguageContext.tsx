import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { zh } from '../locales/zh'
import { en } from '../locales/en'
import { ja } from '../locales/ja'
import type { Language } from '../types'
import type { Translations, SupportedLanguage } from '../locales'
import { SUPPORTED_LANGUAGES, LANGUAGE_INFO } from '../locales'
import { getPreloadedData } from '../utils/preload'

const isSupportedLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)

// 语言包映射
const translations: Record<Language, Translations> = {
  zh,
  en,
  ja
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, any>) => string
  getNestedTranslation: (path: string) => string
  formatTime: (date: string | Date) => string
  formatRelativeTime: (date: string | Date) => string
  SUPPORTED_LANGUAGES: typeof SUPPORTED_LANGUAGES
  LANGUAGE_INFO: typeof LANGUAGE_INFO
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // 获取浏览器默认语言
  const getBrowserLanguage = (): Language => {
    if (typeof navigator === 'undefined') return 'zh'
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('zh')) return 'zh'
    if (browserLang.startsWith('ja')) return 'ja'
    return 'en'
  }

  const getInitialLanguage = (): Language => {
    // 预渲染页面优先使用构建时注入的语言，保证 hydration 前后一致
    const preloaded = getPreloadedData()
    if (preloaded?.language) return preloaded.language

    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('language')
      if (isSupportedLanguage(saved)) {
        return saved
      }
      return getBrowserLanguage()
    }
    return 'zh'
  }

  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
    // 设置 HTML lang 属性
    document.documentElement.lang = lang
  }

  useEffect(() => {
    // 初始化时设置 HTML lang 属性
    document.documentElement.lang = language
  }, [language])

  // hydration 完成后再同步用户保存的语言，避免服务端/客户端渲染不一致
  useEffect(() => {
    const saved = window.localStorage.getItem('language')
    if (isSupportedLanguage(saved) && saved !== language) {
      setLanguageState(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 获取嵌套的翻译文本
  const getNestedTranslation = (path: string): string => {
    const keys = path.split('.')
    let current: any = translations[language]
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return path // 如果找不到，返回原始路径
      }
    }
    
    return typeof current === 'string' ? current : path
  }

  // 简单的翻译函数（向后兼容）
  const t = (key: string, params?: Record<string, any>): string => {
    let translation = getNestedTranslation(key)
    
    // 处理参数替换
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(`{${paramKey}}`, String(value))
      })
    }
    
    return translation
  }

  // 格式化时间
  const formatTime = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    
    return d.toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'ja' ? 'ja-JP' : 'en-US', options)
  }

  // 格式化相对时间
  const formatRelativeTime = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return t('time.justNow')
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${t('time.minutesAgo')}`
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours} ${t('time.hoursAgo')}`
    }
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `${diffInDays} ${t('time.daysAgo')}`
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) {
      return `${diffInWeeks} ${t('time.weeksAgo')}`
    }
    
    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) {
      return `${diffInMonths} ${t('time.monthsAgo')}`
    }
    
    const diffInYears = Math.floor(diffInDays / 365)
    return `${diffInYears} ${t('time.yearsAgo')}`
  }

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      getNestedTranslation,
      formatTime,
      formatRelativeTime,
      SUPPORTED_LANGUAGES,
      LANGUAGE_INFO
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}