import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as api from '../api'
import { Card, Field, Button, Msg, useAction } from '../ui'
export default function Forgot() {
  const [email, setEmail] = useState(''); const nav = useNavigate(); const a = useAction(api.forgotPassword)
  const submit = async e => { e.preventDefault(); if (await a.run({ email })) nav('/reset?email=' + encodeURIComponent(email)) }
  return (<Card title="Forgot password" subtitle="We will email you a reset code">
    <form onSubmit={submit}><Msg error={a.error} />
      <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
      <Button loading={a.loading}>Send code</Button></form>
    <p className="text-sm mt-4"><Link className="text-indigo-600" to="/login">Back to login</Link></p></Card>)
}
