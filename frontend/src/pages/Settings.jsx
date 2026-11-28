import React, { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { api } from '../api.js'
import { useApp } from '../store.jsx'
import { Field, Submit, Avatar, ErrorBox } from '../components/ui.jsx'

export default function Settings() {
  const { t, te, user, setUser, notify, lang, setLang, dark, setDark } = useApp()
  const [firstName, setFirst] = useState(user.firstName); const [lastName, setLast] = useState(user.lastName)
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const fileRef = useRef()
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { setUser(await api.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() })); notify(t('saved')) }
    catch (x) { setErr(te(x)) } finally { setBusy(false) }
  }
  const upload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setErr(''); try { setUser(await api.uploadImage(file)); notify(t('saved')) } catch (x) { setErr(te(x)) }
    e.target.value = ''
  }
  const seg = (on, label, fn) => <button type="button" onClick={fn} className={`btn !py-1.5 ${on ? 'bg-brand-600 text-white' : 'btn-outline'}`}>{label}</button>
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <form onSubmit={save} className="card space-y-4">
        <h1 className="text-xl font-extrabold">{t('profile')}</h1>
        <ErrorBox>{err}</ErrorBox>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current.click()} className="group relative rounded-full">
            <Avatar user={user} size={72} />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100"><Camera size={20} /></span>
          </button>
          <button type="button" className="btn-outline" onClick={() => fileRef.current.click()}>{t('changePhoto')}</button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('firstName')} value={firstName} onChange={(e) => setFirst(e.target.value)} required minLength={3} maxLength={50} />
          <Field label={t('lastName')} value={lastName} onChange={(e) => setLast(e.target.value)} required minLength={3} maxLength={50} />
        </div>
        <Field label={t('email')} value={user.email} disabled dir="ltr" />
        <Submit loading={busy}>{t('save')}</Submit>
      </form>
      <div className="card space-y-4">
        <div className="flex items-center justify-between"><span className="font-medium">Language / اللغة</span><span className="flex gap-2">{seg(lang === 'ar', 'العربية', () => setLang('ar'))}{seg(lang === 'en', 'English', () => setLang('en'))}</span></div>
        <div className="flex items-center justify-between"><span className="font-medium">Theme / المظهر</span><span className="flex gap-2">{seg(!dark, 'Light ☀️', () => setDark(false))}{seg(dark, 'Dark 🌙', () => setDark(true))}</span></div>
      </div>
    </div>
  )
}
