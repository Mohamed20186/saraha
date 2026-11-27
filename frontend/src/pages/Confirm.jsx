import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../api'
import { Card, Field, Button, Msg, useAction } from '../ui'
export default function Confirm() {
  const [sp] = useSearchParams(); const email = sp.get('email') || ''; const [otp, setOtp] = useState(''); const nav = useNavigate()
  const a = useAction(api.confirmEmail); const r = useAction(api.resendOtp)
  const submit = async e => { e.preventDefault(); if (await a.run({ email, otp })) nav('/login?confirmed=1') }
  return (<Card title="Confirm your email" subtitle={`We sent a code to ${email}`}>
    <form onSubmit={submit}><Msg error={a.error || r.error} ok={r.ok} />
      <Field label="Code" value={otp} onChange={e => setOtp(e.target.value)} inputMode="numeric" required />
      <Button loading={a.loading}>Confirm</Button></form>
    <button className="text-sm text-indigo-600 mt-4" onClick={async () => { if (await r.run({ email })) r.setOk('New code sent') }}>Resend code</button>
    <p className="text-xs text-slate-400 mt-4">Demo mode: the code is {api.MOCK_CODE}. <Link to="/signup" className="underline">Back</Link></p></Card>)
}
