import React from 'react'
import { Link } from 'react-router-dom'
import { GitHub, Language as WebIcon, Email, VideoLibrary } from '@mui/icons-material'
import DailyQuote from '../../components/DailyQuote/DailyQuote'
import { useLanguage } from '../../contexts/LanguageContext'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import './Home.css'

const Home: React.FC = () => {
  const { t } = useLanguage()
  
  useDocumentTitle(t('nav.home'))

  return (
    <div className="home">
      <DailyQuote />
      
      <section className="main-content-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('home.mainContent.title')}</h2>
            <p className="section-subtitle">{t('home.mainContent.subtitle')}</p>
          </div>
          
          <div className="content-grid">
            <div className="content-card">
              <div className="card-icon">
                <GitHub />
              </div>
              <h3 className="card-title">Re_ADOJAS</h3>
              <p className="card-description">
                一个基于 React 和 TypeScript 的 重制版 ADOFAI 谱面播放器.
              </p>
              <div className="card-actions">
                <a 
                  href="https://github.com/flutas-web/Re_ADOJAS" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="card-link"
                >
                  GitHub
                </a>
              </div>
            </div>

            <div className="content-card">
              <div className="card-icon">
                <WebIcon />
              </div>
              <h3 className="card-title">7th-Rhythm-Studio</h3>
              <p className="card-description">
                一站式节奏游戏(ADOFAI & Rhythm Doctor)工具集
              </p>
              <div className="card-actions">
                <a 
                  href="https://github.com/memsys-lizi/7th-Rhythm-Studio" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="card-link"
                >
                  GitHub
                </a>
                <a 
                  href="https://7th.rhythmdoctor.top/website" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="card-link"
                >
                  {t('nav.home')}
                </a>
                <a 
                  href="/p/1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="card-link"
                >
                  Redirect
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('home.contact.title')}</h2>
            <p className="section-subtitle">{t('home.contact.subtitle')}</p>
          </div>
          
          <div className="contact-grid">
            <a 
              href="mailto:xbodwf@outlook.com" 
              className="contact-card"
            >
              <div className="contact-icon">
                <Email />
              </div>
              <h3 className="contact-title">{t('home.contact.email')}</h3>
              <p className="contact-info">xbodwf@outlook.com</p>
            </a>

            <a 
              href="https://space.bilibili.com/1552375363" 
              target="_blank" 
              rel="noopener noreferrer"
              className="contact-card"
            >
              <div className="contact-icon">
                <VideoLibrary />
              </div>
              <h3 className="contact-title">{t('home.contact.bilibili')}</h3>
              <p className="contact-info">@Xbodwf</p>
            </a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4 className="footer-title">{t('home.footer.products.title')}</h4>
              <ul className="footer-links">
                <li><a href="https://github.com/xbodwf" target="_blank" rel="noopener noreferrer">{t('home.footer.products.github')}</a></li>
                <li><a href="/p">{t('home.footer.products.projects')}</a></li>
                <li><a href="/download">{t('home.footer.products.downloads')}</a></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4 className="footer-title">{t('home.footer.resources.title')}</h4>
              <ul className="footer-links">
                <li><a href="/help">{t('home.footer.resources.documentation')}</a></li>
                <li><a href="/help">{t('home.footer.resources.tutorials')}</a></li>
                <li><a href="https://github.com/xbodwf/discussions" target="_blank" rel="noopener noreferrer">{t('home.footer.resources.community')}</a></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4 className="footer-title">{t('home.footer.community.title')}</h4>
              <ul className="footer-links">
                <li><a href="https://github.com/xbodwf/discussions" target="_blank" rel="noopener noreferrer">{t('home.footer.community.discussions')}</a></li>
                <li><a href="https://github.com/xbodwf/issues" target="_blank" rel="noopener noreferrer">{t('home.footer.community.issues')}</a></li>
                <li><a href="https://github.com/xbodwf/contributing" target="_blank" rel="noopener noreferrer">{t('home.footer.community.contributions')}</a></li>
              </ul>
            </div>

            <div className="footer-section">
              <h4 className="footer-title">{t('home.footer.contact.title')}</h4>
              <ul className="footer-links">
                <li><a href="mailto:xbodwf@outlook.com">{t('home.footer.contact.email')}</a></li>
                <li><a href="https://space.bilibili.com/1234567890" target="_blank" rel="noopener noreferrer">{t('home.footer.contact.social')}</a></li>
                <li><a href="mailto:xbodwf@outlook.com">{t('home.footer.contact.feedback')}</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p className="footer-text">

              2025 Xbodwf
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Home