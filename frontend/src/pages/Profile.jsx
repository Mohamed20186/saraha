import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api'
import { Card, Button } from '../ui'
export default function Profile() {
  const [p, setP] = useState(null); const nav = useNavigate()
  useEffect(() => { api.getProfile().then(setP).catch(() => nav('/login')) }, [])
  return (<Card title={p ? `Hi, ${p.name}` : 'Loading...'} subtitle={p?.email}>
    <p className="text-slate-600 text-sm mb-6">Your anonymous messages will appear here once that feature exists in the backend.</p>
    <Button onClick={() => { api.logout(); nav('/login') }}>Log out</Button></Card>)
}
