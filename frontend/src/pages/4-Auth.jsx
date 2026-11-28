import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api.js'
import { useApp } from '../store.jsx'
import GoogleButton from '../components/GoogleButton.jsx'
import { AuthCard, Field, Submit, ErrorBox } from '../components/ui.jsx'

function useForm(initial) {
  const { te } = useApp()
  const [v, setV] = useState(initial)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const on = (k) => ({ value: v[k], onChange: (e) => setV({ ...v, [k]: e.target.value }) })
  const run = async (fn) => { setErr(''); setLoading(true); try { await fn() } catch (e) { setErr(te(e)) } finally { setLoading(false) } }
  return { v, on, err, setErr, loading, run }
}
const useQ = () => new URLSearchParams(useLocation().search)

export function Login() {
  const { t, te, setUser, notify } = useApp(); const nav = useNavigate(); const f = useForm({ email: '', password: '' })
  const submit = (e) => { e.preventDefault(); f.run(async () => {
    try { setUser(await api.login(f.v)); nav('/dashboard') }
    catch (x) { if (x.status === 403) { notify(te(x), 'err'); nav('/confirm?email=' + encodeURIComponent(f.v.email)) } else throw x }
  }) }
  return (
    <AuthCard title={t('login')} footer={<>{t('noAccount')} <Link className="font-semibold text-brand-600" to="/signup">{t('signup')}</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox>{f.err}</ErrorBox>
        <Field label={t('email')} type="email" required dir="ltr" autoComplete="email" {...f.on('email')} />
        <Field label={t('password')} type="password" required autoComplete="current-password" {...f.on('password')} />
        <Link to="/forgot" className="block text-sm text-brand-600">{t('forgot')}</Link>
        <Submit loading={f.loading}>{t('login')}</Submit>
      </form>
      <GoogleButton />
    </AuthCard>
  )
}

export function Signup() {
  const { t } = useApp(); const nav = useNavigate()
  const f = useForm({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
  const submit = (e) => { e.preventDefault(); if (f.v.password !== f.v.confirmPassword) return f.setErr(t('passMismatch'))
    f.run(async () => { await api.signup(f.v); nav('/confirm?email=' + encodeURIComponent(f.v.email)) }) }
  return (
    <AuthCard title={t('signup')} subtitle={t('sub')} footer={<>{t('haveAccount')} <Link className="font-semibold text-brand-600" to="/login">{t('login')}</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox>{f.err}</ErrorBox>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('firstName')} required minLength={3} maxLength={50} {...f.on('firstName')} />
          <Field label={t('lastName')} required minLength={3} maxLength={50} {...f.on('lastName')} />
        </div>
        <Field label={t('email')} type="email" required dir="ltr" autoComplete="email" {...f.on('email')} />
        <Field label={t('password')} type="password" required minLength={8} autoComplete="new-password" {...f.on('password')} />
        <p className="-mt-2 text-xs text-slate-400">{t('passHint')}</p>
        <Field label={t('confirmPassword')} type="password" required autoComplete="new-password" {...f.on('confirmPassword')} />
        <Submit loading={f.loading}>{t('signup')}</Submit>
      </form>
      <GoogleButton />
    </AuthCard>
  )
}

export function Confirm() {
  const { t, notify } = useApp(); const nav = useNavigate(); const email = useQ().get('email') || ''; const f = useForm({ otp: '' })
  const submit = (e) => { e.preventDefault(); f.run(async () => { await api.confirmEmail({ email, otp: f.v.otp.trim() }); notify('✓'); nav('/login') }) }
  const resend = () => f.run(async () => { await api.resendOtp({ email }); notify(t('codeSent') + ' ' + email) })
  return (
    <AuthCard title={t('confirmEmail')} subtitle={<>{t('codeSent')} <b dir="ltr">{email}</b></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox>{f.err}</ErrorBox>
        <Field label={t('code')} required maxLength={6} inputMode="numeric" pattern="\d{6}" dir="ltr" autoComplete="one-time-code" {...f.on('otp')} />
        <Submit loading={f.loading}>{t('confirmEmail')}</Submit>
        <button type="button" className="btn-ghost w-full" onClick={resend}>{t('resend')}</button>
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
  const { t, notify } = useApp(); const nav = useNavigate(); const email = useQ().get('email') || ''
  const f = useForm({ otp: '', password: '', confirmPassword: '' })
  const submit = (e) => { e.preventDefault(); if (f.v.password !== f.v.confirmPassword) return f.setErr(t('passMismatch'))
    f.run(async () => { await api.resetPassword({ email, ...f.v, otp: f.v.otp.trim() }); notify(t('saved')); nav('/login') }) }
  return (
    <AuthCard title={t('resetTitle')} subtitle={<>{t('codeSent')} <b dir="ltr">{email}</b></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox>{f.err}</ErrorBox>
        <Field label={t('code')} required maxLength={6} inputMode="numeric" pattern="\d{6}" dir="ltr" {...f.on('otp')} />
        <Field label={t('newPass')} type="password" required minLength={8} autoComplete="new-password" {...f.on('password')} />
        <p className="-mt-2 text-xs text-slate-400">{t('passHint')}</p>
        <Field label={t('confirmPassword')} type="password" required autoComplete="new-password" {...f.on('confirmPassword')} />
        <Submit loading={f.loading}>{t('resetDo')}</Submit>
      </form>
    </AuthCard>
  )
}
