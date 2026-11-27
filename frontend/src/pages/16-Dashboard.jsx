import React, { useEffect, useState } from 'react'
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
          <div key={label} className="card !p-4 text-center"><Icon className="mx-auto text-brand-500" size={20} /><div className="mt-1 text-2xl font-extrabold">{n}</div><div className="text-xs text-slate-500">{label}</div></div>
        ))}
      </div>
      <div className="flex gap-2">
        {[['all', t('all')], ['new', t('unread')], ['fav', t('favs')]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`btn !py-1.5 ${tab === k ? 'bg-brand-600 text-white' : 'btn-outline'}`}>{l}</button>
        ))}
      </div>
      {!msgs ? <p className="text-center text-slate-400">{t('loading')}</p> : list.length === 0 ? (
        <div className="card py-14 text-center text-slate-500"><Inbox className="mx-auto mb-3 opacity-40" size={40} />{t('empty')}</div>
      ) : (
        <ul className="space-y-3">
          {list.map((m) => (
            <li key={m.id} onClick={() => !m.read && patch(m, { read: true })} className={`card animate-pop cursor-pointer !p-4 ${!m.read ? 'border-brand-400 ring-2 ring-brand-500/10' : ''}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-2">{!m.read && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-white">{t('unread')}</span>}{timeAgo(m.createdAt, t)}</span>
                <span className="flex gap-1">
                  <button className="btn-ghost !p-2" onClick={(e) => { e.stopPropagation(); patch(m, { fav: !m.fav }) }}><Star size={16} className={m.fav ? 'fill-amber-400 text-amber-400' : ''} /></button>
                  <button className="btn-ghost !p-2 hover:!text-rose-500" title={t('del')} onClick={(e) => { e.stopPropagation(); del(m) }}><Trash2 size={16} /></button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
