import React from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { useApp } from './store.jsx'
import Landing from './pages/Landing.jsx'
import { Login, Signup, Confirm, Forgot, Reset } from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Settings from './pages/Settings.jsx'
import PublicProfile from './pages/PublicProfile.jsx'

function Private({ children }) {
  const { user, ready } = useApp()
  if (!ready) return null
  return user ? children : <Navigate to="/login" replace />
}
function NotFound() {
  const { t } = useApp()
  return <div className="py-24 text-center"><h1 className="text-5xl font-extrabold">404</h1><p className="mt-2 text-slate-500">{t('notFound')}</p><Link to="/" className="btn-primary mt-6 inline-flex">{t('home')}</Link></div>
}
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
        <Route path="/settings" element={<Private><Settings /></Private>} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
