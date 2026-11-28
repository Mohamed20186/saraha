import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Star, Trash2, Inbox, Mail, Heart } from 'lucide-react'
import { api } from '../api.js'
import { useApp } from '../store.jsx'
import { timeAgo } from '../components/ui.jsx'

export default function Dashboard() {
  const { t, user, notify } = useApp()
  const [msgs, setMsgs] = useState(null)
  const [tab, setTab] = useState('all')
  const [copied, setCopied] = useState(false)
  const link = `${location.origin}/u/${user.username}`
  const load = () => api.listMessages(user.id).then(setMsgs)
  useEffect(() => { load() }, [])
  const patch = async (m, p) => { await api.patchMessage(m.id, p); setMsgs(msgs.map((x) => (x.id === m.id ? { ...x, ...p } : x))) }
  const del = async (m) => { await api.deleteMessage(m.id); setMsgs(msgs.filter((x) => x.id !== m.id)) }
  const copy = () => { navigator.clipboard?.writeText(link); setCopied(true); notify(t('copied')); setTimeout(() => setCopied(false), 1800) }
  const list = (msgs || []).filter((m) => tab === 'all' || (tab === 'fav' ? m.fav : !m.read))
  const stats = msgs ? [[Inbox, t('total'), msgs.length], [Mail, t('newMsgs'), msgs.filter((m) => !m.read).length], [Heart, t('favCount'), msgs.filter((m) => m.fav).length]] : []
  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-br from-brand-600 to-fuchsia-600 !border-0 text-white">
        <p className="text-sm text-white/80">{t('yourLink')}</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <div dir="ltr" className="flex-1 truncate rounded-xl bg-white/15 px-4 py-2.5 text-sm">{link}</div>
          <button onClick={copy} className="btn bg-white text-brand-700 hover:bg-brand-50">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? t('copied') : t('copy')}</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stats.map(([Icon, label, n]) => (
          <motion.div key={label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} className="card !p-4 text-center"><Icon className="mx-auto text-brand-500" size={20} /><div className="mt-1 text-2xl font-extrabold">{n}</div><div className="text-xs text-slate-500">{label}</div></motion.div>
        ))}
      </div>
      <div className="flex gap-2">
        {[['all', t('all')], ['new', t('unread')], ['fav', t('favs')]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`btn relative !py-1.5 ${tab === k ? 'text-white' : 'btn-outline'}`}>
            {tab === k && <motion.span layoutId="tab" className="absolute inset-0 rounded-xl bg-brand-600" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
            <span className="relative">{l}</span>
          </button>
        ))}
      </div>
      {!msgs ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div> : list.length === 0 ? (
        <div className="card py-14 text-center text-slate-500"><Inbox className="mx-auto mb-3 opacity-40" size={40} />{t('empty')}</div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
          {list.map((m) => (
            <motion.li layout key={m.id} initial={{ opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 60, scale: .95 }} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} onClick={() => !m.read && patch(m, { read: true })} className={`card cursor-pointer !p-4 ${!m.read ? 'border-brand-400 ring-2 ring-brand-500/10' : ''}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-2">{!m.read && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-white">{t('unread')}</span>}{timeAgo(m.createdAt, t)}</span>
                <span className="flex gap-1">
                  <button className="btn-ghost !p-2" onClick={(e) => { e.stopPropagation(); patch(m, { fav: !m.fav }) }}><motion.span key={String(m.fav)} initial={{ scale: .5, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }} className="inline-flex"><Star size={16} className={m.fav ? 'fill-amber-400 text-amber-400' : ''} /></motion.span></button>
                  <button className="btn-ghost !p-2 hover:!text-rose-500" title={t('del')} onClick={(e) => { e.stopPropagation(); del(m) }}><Trash2 size={16} /></button>
                </span>
              </div>
            </motion.li>
          ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
