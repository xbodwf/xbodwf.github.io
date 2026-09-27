import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Theme } from '../types'
import { getPreloadedData } from '../utils/preload'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: ReactNode
}

const getInitialTheme = (): Theme => {
  // 预渲染页面优先使用构建时注入的主题，保证 hydration 前后一致
  const preloaded = getPreloadedData()
  if (preloaded?.theme) return preloaded.theme

  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
  }
  return 'light'
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  // hydration 完成后再同步用户保存的主题，避免服务端/客户端渲染不一致
  useEffect(() => {
    const saved = window.localStorage.getItem('theme')
    if ((saved === 'light' || saved === 'dark') && saved !== theme) {
      setTheme(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    window.localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
