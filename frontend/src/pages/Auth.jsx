import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api.js'
import { useApp } from '../store.jsx'
import { AuthCard, Field, Submit, ErrorBox } from '../components/ui.jsx'

function useForm(initial) {
  const [v, setV] = useState(initial)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const on = (k) => ({ value: v[k], onChange: (e) => setV({ ...v, [k]: e.target.value }) })
  const run = async (fn) => { setErr(''); setLoading(true); try { await fn() } catch (e) { setErr(e.message) } finally { setLoading(false) } }
  return { v, on, err, setErr, loading, run }
}
const useQ = () => new URLSearchParams(useLocation().search)

export function Login() {
  const { t, setUser, notify } = useApp(); const nav = useNavigate(); const f = useForm({ email: '', password: '' })
  const submit = (e) => { e.preventDefault(); f.run(async () => {
    try { setUser(await api.login(f.v)); nav('/dashboard') }
    catch (x) { if (x.message === 'EMAIL_NOT_CONFIRMED') { notify(t('confirmEmail')); nav('/confirm?email=' + encodeURIComponent(f.v.email)) } else throw x }
  }) }
  return (
    <AuthCard title={t('login')} footer={<>{t('noAccount')} <Link className="font-semibold text-brand-600" to="/signup">{t('signup')}</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox>{f.err}</ErrorBox>
        <Field label={t('email')} type="email" required {...f.on('email')} placeholder="demo@saraha.app" />
        <Field label={t('password')} type="password" required {...f.on('password')} placeholder="Demo@1234" />
        <Link to="/forgot" className="block text-sm text-brand-600">{t('forgot')}</Link>
        <Submit loading={f.loading}>{t('login')}</Submit>
      </form>
    </AuthCard>
  )
}

export function Signup() {
  const { t } = useApp(); const nav = useNavigate(); const f = useForm({ name: '', username: '', email: '', password: '', confirm: '' })
  const submit = (e) => { e.preventDefault(); if (f.v.password !== f.v.confirm) return f.setErr(t('passMismatch'))
    f.run(async () => { await api.signup(f.v); nav('/confirm?email=' + encodeURIComponent(f.v.email)) }) }
  return (
    <AuthCard title={t('signup')} subtitle={t('sub')} footer={<>{t('haveAccount')} <Link className="font-semibold text-brand-600" to="/login">{t('login')}</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox>{f.err}</ErrorBox>
        <Field label={t('name')} required {...f.on('name')} />
        <Field label={t('username')} required pattern="[a-zA-Z0-9_]{3,20}" {...f.on('username')} dir="ltr" />
        <Field label={t('email')} type="email" required {...f.on('email')} dir="ltr" />
        <Field label={t('password')} type="password" required minLength={8} {...f.on('password')} />
        <Field label={t('confirmPassword')} type="password" required {...f.on('confirm')} />
        <Submit loading={f.loading}>{t('signup')}</Submit>
      </form>
    </AuthCard>
  )
}

export function Confirm() {
  const { t, notify } = useApp(); const nav = useNavigate(); const email = useQ().get('email') || ''; const f = useForm({ code: '' })
  const submit = (e) => { e.preventDefault(); f.run(async () => { await api.confirmEmail({ email, code: f.v.code }); notify('✓'); nav('/login') }) }
  return (
    <AuthCard title={t('confirmEmail')} subtitle={<>{t('codeSent')} <b dir="ltr">{email}</b></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox>{f.err}</ErrorBox>
        <Field label={t('code')} required maxLength={6} inputMode="numeric" dir="ltr" className="input text-center text-xl tracking-[.5em]" {...f.on('code')} />
        <p className="text-xs text-slate-400">{t('hint')}: {api.demoCode}</p>
        <Submit loading={f.loading}>{t('confirmEmail')}</Submit>
        <button type="button" className="btn-ghost w-full" onClick={async () => { await api.resendOtp(); notify(t('codeSent') + ' ' + email) }}>{t('resend')}</button>
      </form>
    </AuthCard>
  )
}

export function Forgot() {
  const { t } = useApp(); const nav = useNavigate(); const f = useForm({ email: '' })
  const submit = (e) => { e.preventDefault(); f.run(async () => { await api.forgotPassword(f.v); nav('/reset?email=' + encodeURIComponent(f.v.email)) }) }
  return (
    <AuthCard title={t('resetTitle')} footer={<Link className="font-semibold text-brand-600" to="/login">{t('backToLogin')}</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox>{f.err}</ErrorBox>
        <Field label={t('email')} type="email" required dir="ltr" {...f.on('email')} />
        <Submit loading={f.loading}>{t('resetSend')}</Submit>
      </form>
    </AuthCard>
  )
}

export function Reset() {
  const { t, notify } = useApp(); const nav = useNavigate(); const email = useQ().get('email') || ''; const f = useForm({ code: '', password: '' })
  const submit = (e) => { e.preventDefault(); f.run(async () => { await api.resetPassword({ email, ...f.v }); notify(t('saved')); nav('/login') }) }
  return (
    <AuthCard title={t('resetTitle')} subtitle={<>{t('codeSent')} <b dir="ltr">{email}</b></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox>{f.err}</ErrorBox>
        <Field label={t('code')} required maxLength={6} dir="ltr" {...f.on('code')} />
        <Field label={t('newPass')} type="password" required minLength={8} {...f.on('password')} />
        <p className="text-xs text-slate-400">{t('hint')}: {api.demoCode}</p>
        <Submit loading={f.loading}>{t('resetDo')}</Submit>
      </form>
    </AuthCard>
  )
}
