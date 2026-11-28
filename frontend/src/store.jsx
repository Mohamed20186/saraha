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
  useEffect(() => { api.me().then((u) => setUser(u)).catch(() => {}).finally(() => setReady(true)) }, [])
  useEffect(() => { const f = () => setUser(null); window.addEventListener('saraha:logout', f); return () => window.removeEventListener('saraha:logout', f) }, [])

  const t = useCallback((k) => dict[lang][k] ?? k, [lang])
  const notify = useCallback((msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 2600) }, [])

  // Translate an API error into the current language.
  const te = useCallback((e) => {
    const d = dict[lang], m = e?.message || ''
    const map = [['Invalid email or password','errLogin'],['Email is not verified','errNotVerified'],['user already exists','errExists'],['No account found','errNoAccount'],
      ['Invalid or expired OTP','errOtp'],['already verified','errAlreadyVerified'],['User not found','errUserNone'],['Refresh token','errSession'],['Authorization','errSession'],
      ['Invalid token','errSession'],['Unsupported authorization','errSession'],['Password was changed','errPassChanged'],['too large','errTooBig'],['file','errFile']]
    if (e?.status === 0) return d.errNetwork
    if (e?.status === 429) return d.errRate
    if (e?.status >= 500) return d.errServer
    if (e?.status === 400 && e.errors?.length) return e.errors.map((x) => x.message).filter(Boolean).slice(0, 2).join(' · ') || d.errValidation
    const hit = map.find(([k]) => m.toLowerCase().includes(k.toLowerCase()))
    return hit ? d[hit[1]] : d.errGeneric
  }, [lang])

  const value = { te, t, lang, setLang, dark, setDark, user, setUser, ready, notify }
  return (
    <Ctx.Provider value={value}>
      {children}
      <AnimatePresence>{toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center"><motion.div key={toast.msg} initial={{ opacity: 0, y: 24, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} className={`rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${toast.type === 'err' ? 'bg-rose-600' : 'bg-slate-900 dark:bg-brand-600'}`}>{toast.msg}</motion.div></div>
      )}</AnimatePresence>
    </Ctx.Provider>
  )
}
