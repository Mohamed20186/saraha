import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../api'
import { Card, Field, Button, Msg, useAction } from '../ui'
export default function Signup() {
  const [f, setF] = useState({ name: '', email: '', password: '' }); const nav = useNavigate()
  const a = useAction(api.signup)
  const submit = async e => { e.preventDefault(); if (await a.run(f)) nav('/confirm?email=' + encodeURIComponent(f.email)) }
  const set = k => e => setF({ ...f, [k]: e.target.value })
  return (<Card title="Create account" subtitle="Join Saraha and get honest messages">
    <form onSubmit={submit}><Msg error={a.error} />
      <Field label="Name" value={f.name} onChange={set('name')} required />
      <Field label="Email" type="email" value={f.email} onChange={set('email')} required />
      <Field label="Password" type="password" value={f.password} onChange={set('password')} required />
      <Button loading={a.loading}>Sign up</Button></form>
    <p className="text-sm text-slate-500 mt-4">Have an account? <Link className="text-indigo-600" to="/login">Log in</Link></p></Card>)
}
