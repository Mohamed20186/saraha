import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { dict } from './i18n.js'
import { api } from './api.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function Providers({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'ar')
  const [dark, setDark] = useState(localStorage.getItem('dark') === '1')
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('lang', lang)
  }, [lang])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('dark', dark ? '1' : '0')
  }, [dark])
  useEffect(() => { api.me().then((u) => { setUser(u); setReady(true) }) }, [])

  const t = useCallback((k) => dict[lang][k] ?? k, [lang])
  const notify = useCallback((msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600) }, [])

  const value = { t, lang, setLang, dark, setDark, user, setUser, ready, notify }
  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-pop rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${toast.type === 'err' ? 'bg-rose-600' : 'bg-slate-900 dark:bg-brand-600'}`}>{toast.msg}</div>
      )}
    </Ctx.Provider>
  )
}
