import React, { useState } from 'react'
import { api } from '../api.js'
import { useApp } from '../store.jsx'
import { Field, Submit } from '../components/ui.jsx'

export default function Settings() {
  const { t, user, setUser, notify, lang, setLang, dark, setDark } = useApp()
  const [name, setName] = useState(user.name); const [bio, setBio] = useState(user.bio || ''); const [busy, setBusy] = useState(false)
  const save = async (e) => { e.preventDefault(); setBusy(true); setUser(await api.updateProfile(user.id, { name, bio })); setBusy(false); notify(t('saved')) }
  const seg = (on, label, fn) => <button type="button" onClick={fn} className={`btn !py-1.5 ${on ? 'bg-brand-600 text-white' : 'btn-outline'}`}>{label}</button>
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <form onSubmit={save} className="card space-y-4">
        <h1 className="text-xl font-extrabold">{t('profile')}</h1>
        <Field label={t('name')} value={name} onChange={(e) => setName(e.target.value)} required />
        <Field label={t('username')} value={user.username} disabled dir="ltr" />
        <Field label={t('email')} value={user.email} disabled dir="ltr" />
        <Field label={t('bio')} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={80} placeholder={t('askMe')} />
        <Submit loading={busy}>{t('save')}</Submit>
      </form>
      <div className="card space-y-4">
        <div className="flex items-center justify-between"><span className="font-medium">Language / اللغة</span><span className="flex gap-2">{seg(lang === 'ar', 'العربية', () => setLang('ar'))}{seg(lang === 'en', 'English', () => setLang('en'))}</span></div>
        <div className="flex items-center justify-between"><span className="font-medium">Theme / المظهر</span><span className="flex gap-2">{seg(!dark, 'Light ☀️', () => setDark(false))}{seg(dark, 'Dark 🌙', () => setDark(true))}</span></div>
      </div>
    </div>
  )
}
