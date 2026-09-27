import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import Header from './components/Header/Header'
import Home from './pages/Home/Home'
import Article from './components/Article/Article'
import ArticleList from './pages/ArticleList/ArticleList'
import NotFound from './pages/NotFound/NotFound'
//import PackagePage from "./pages/PackagePage";

import './App.css'
import './assets/fonts/fonts.css'

/**
 * 应用主体（不含 Router）。
 * 客户端由 main.tsx 用 BrowserRouter 包裹，
 * 预渲染时由 entry-server.tsx 用 MemoryRouter 包裹。
 */
function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <div className="app">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/p" element={<ArticleList />} />
              <Route path="/p/:id" element={<Article />} />
              {/*<Route path="/packages/:packagename/:article?" element={<PackagePage />} />*/}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
