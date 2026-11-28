import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useApp } from '../store.jsx'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SRC = 'https://accounts.google.com/gsi/client'
let loading = null
const loadGis = () => {
  if (window.google?.accounts?.id) return Promise.resolve()
  loading ??= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = SRC; s.async = true; s.onload = res; s.onerror = () => { loading = null; rej(new Error('gis')) }
    document.head.appendChild(s)
  })
  return loading
}

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
)

export default function GoogleButton() {
  const { t, te, lang, dark, setUser, notify } = useApp()
  const nav = useNavigate(); const box = useRef(); const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!CLIENT_ID) return
    let off = false
    loadGis().then(() => {
      if (off || !box.current) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async ({ credential }) => {
          try { setUser(await api.googleLogin(credential)); nav('/dashboard') }
          catch (e) { notify(e.status === 404 ? t('googleSoon') : te(e), 'err') }
        },
      })
      box.current.innerHTML = ''
      window.google.accounts.id.renderButton(box.current, {
        type: 'standard', theme: dark ? 'filled_black' : 'outline', size: 'large', text: 'continue_with',
        shape: 'rectangular', logo_alignment: 'left', locale: lang, width: Math.min(box.current.offsetWidth || 360, 400),
      })
    }).catch(() => setFailed(true))
    return () => { off = true }
  }, [lang, dark])

  return (
    <div>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />{t('or')}<span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>
      {CLIENT_ID && !failed ? (
        <div ref={box} className="flex min-h-10 justify-center [color-scheme:light]" />
      ) : (
        <button type="button" className="btn-outline w-full" onClick={() => notify(failed ? t('googleBlocked') : t('googleOff'), 'err')} title={t('googleOff')}>
          <GoogleG />{t('googleContinue')}
        </button>
      )}
    </div>
  )
}
