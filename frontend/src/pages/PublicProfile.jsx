import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Send, CheckCircle2 } from 'lucide-react'
import { api, fullName } from '../api.js'
import { useApp } from '../store.jsx'
import { ErrorBox, Avatar } from '../components/ui.jsx'

export default function PublicProfile() {
  const { id } = useParams(); const { t, te } = useApp()
  const [u, setU] = useState(undefined); const [text, setText] = useState(''); const [state, setState] = useState('idle'); const [err, setErr] = useState('')
  useEffect(() => { api.getUser(id).then(setU).catch((x) => { setErr(te(x)); setU(null) }) }, [id])
  const send = async (e) => { e.preventDefault(); setState('busy'); setErr('')
    try { await api.messages.send(id, text.trim()); setText(''); setState('done') } catch (x) { setErr(te(x)); setState('idle') } }
  if (u === undefined) return <div className="mx-auto max-w-lg"><div className="skeleton h-80" /></div>
  if (u === null) return <p className="py-20 text-center text-slate-500">{t('userNone')}</p>
  return (
    <div className="mx-auto max-w-lg animate-pop">
      <div className="card !p-8 text-center">
        <div className="mx-auto w-fit"><Avatar user={u} size={80} /></div>
        <h1 className="mt-4 text-xl font-extrabold">{fullName(u)}</h1>
        <p className="mt-2 text-slate-500">{t('askMe')}</p>
        {state === 'done' ? (
          <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="mt-6 rounded-2xl bg-emerald-50 p-6 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: .15, type: 'spring', stiffness: 400, damping: 12 }} className="inline-block"><CheckCircle2 className="mx-auto mb-2" /></motion.span>{t('sentOk')}
            <button className="btn-outline mt-4" onClick={() => setState('idle')}>{t('sendAnon')}</button>
          </motion.div>
        ) : (
          <form onSubmit={send} className="mt-6 space-y-3 text-start">
            <ErrorBox>{err}</ErrorBox>
            <textarea className="input min-h-32 resize-none" maxLength={500} required value={text} onChange={(e) => setText(e.target.value)} placeholder={t('writeMsg')} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{text.length}/500 {t('chars')}</span>
              <button className="btn-primary" disabled={state === 'busy' || !text.trim()}><Send size={16} className="rtl:-scale-x-100" />{t('send')}</button>
            </div>
          </form>
        )}
      </div>
      <p className="mt-4 text-center text-sm"><Link to="/signup" className="text-brand-600">{t('signup')} →</Link></p>
    </div>
  )
}
