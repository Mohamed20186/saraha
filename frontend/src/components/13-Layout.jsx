import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Moon, Sun, Languages, LogOut, MessageCircleHeart, Inbox, Settings } from 'lucide-react'
import { useApp } from '../store.jsx'
import { api } from '../api.js'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-extrabold">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-fuchsia-600 text-white"><MessageCircleHeart size={20} /></span>
      <span className="bg-gradient-to-r from-brand-600 to-fuchsia-600 bg-clip-text text-transparent">Saraha</span>
    </Link>
  )
}

export default function Layout({ children }) {
  const { t, lang, setLang, dark, setDark, user, setUser } = useApp()
  const nav = useNavigate()
  const logout = async () => { await api.logout(); setUser(null); nav('/') }
  const link = ({ isActive }) => `btn-ghost !px-3 ${isActive ? '!bg-brand-50 !text-brand-700 dark:!bg-slate-800 dark:!text-brand-200' : ''}`
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo />
          <nav className="flex items-center gap-1">
            {user && <>
              <NavLink to="/dashboard" className={link}><Inbox size={16} /><span className="hidden sm:inline">{t('dashboard')}</span></NavLink>
              <NavLink to="/settings" className={link}><Settings size={16} /><span className="hidden sm:inline">{t('settings')}</span></NavLink>
            </>}
            <button className="btn-ghost !px-3" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} title="Language"><Languages size={16} /><span className="hidden sm:inline">{t('lang')}</span></button>
            <button className="btn-ghost !px-3" onClick={() => setDark(!dark)} title={t('dark')}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            {user ? <button className="btn-ghost !px-3" onClick={logout}><LogOut size={16} /><span className="hidden sm:inline">{t('logout')}</span></button>
              : <><Link to="/login" className="btn-ghost">{t('login')}</Link><Link to="/signup" className="btn-primary hidden sm:inline-flex">{t('signup')}</Link></>}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="py-8 text-center text-xs text-slate-400"><p>{t('madeBy')} <span className="font-semibold text-brand-600" dir="ltr">Mohamed Abd-Elrahim</span> 🌚</p><p className="mt-1">{t('mockNote')}</p></footer>
    </div>
  )
}
