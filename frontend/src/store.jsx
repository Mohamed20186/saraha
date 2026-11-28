import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
      <AnimatePresence>{toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center"><motion.div key={toast.msg} initial={{ opacity: 0, y: 24, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} className={`rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${toast.type === 'err' ? 'bg-rose-600' : 'bg-slate-900 dark:bg-brand-600'}`}>{toast.msg}</motion.div></div>
      )}</AnimatePresence>
    </Ctx.Provider>
  )
}
