import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import * as api from '../api'
import { Card, Field, Button, Msg, useAction } from '../ui'
export default function Login() {
  const [sp] = useSearchParams(); const [f, setF] = useState({ email: '', password: '' }); const nav = useNavigate()
  const a = useAction(api.login)
  const submit = async e => { e.preventDefault(); if (await a.run(f)) nav('/profile') }
  return (<Card title="Welcome back" subtitle="Log in to your Saraha account">
    <form onSubmit={submit}><Msg error={a.error} ok={sp.get('confirmed') ? 'Email confirmed. You can log in now.' : sp.get('reset') ? 'Password updated. Log in.' : ''} />
      <Field label="Email" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required />
      <Field label="Password" type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required />
      <Button loading={a.loading}>Log in</Button></form>
    <div className="flex justify-between text-sm mt-4"><Link className="text-indigo-600" to="/forgot">Forgot password?</Link><Link className="text-indigo-600" to="/signup">Sign up</Link></div></Card>)
}
