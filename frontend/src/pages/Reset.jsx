import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../api'
import { Card, Field, Button, Msg, useAction } from '../ui'
export default function Reset() {
  const [sp] = useSearchParams(); const email = sp.get('email') || ''; const nav = useNavigate()
  const [code, setCode] = useState(''); const [newPassword, setP] = useState(''); const a = useAction(api.resetPassword)
  const submit = async e => { e.preventDefault(); if (await a.run({ email, code, newPassword })) nav('/login?reset=1') }
  return (<Card title="Reset password" subtitle={`Enter the code sent to ${email}`}>
    <form onSubmit={submit}><Msg error={a.error} />
      <Field label="Code" value={code} onChange={e => setCode(e.target.value)} required />
      <Field label="New password" type="password" value={newPassword} onChange={e => setP(e.target.value)} required />
      <Button loading={a.loading}>Update password</Button></form>
    <p className="text-xs text-slate-400 mt-4">Demo mode: the code is {api.MOCK_CODE}.</p></Card>)
}
