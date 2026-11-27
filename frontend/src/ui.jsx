import { useState } from 'react'
export function Card({ title, subtitle, children }) {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-indigo-600 to-fuchsia-500 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-slate-500 mt-1 mb-6 text-sm">{subtitle}</p>}
        {children}
      </div>
    </div>)
}
export function Field({ label, ...p }) {
  return (<label className="block mb-4"><span className="text-sm font-medium text-slate-700">{label}</span>
    <input {...p} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></label>)
}
export function Button({ loading, children, ...p }) {
  return (<button {...p} disabled={loading} className="w-full rounded-lg bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 disabled:opacity-60">{loading ? 'Please wait...' : children}</button>)
}
export function Msg({ error, ok }) {
  if (!error && !ok) return null
  return <p className={`mb-4 text-sm rounded-lg px-3 py-2 ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{error || ok}</p>
}
// runs an async action with loading + error state
export function useAction(fn) {
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [ok, setOk] = useState('')
  const run = async (...a) => { setLoading(true); setError(''); setOk(''); try { const r = await fn(...a); setLoading(false); return r } catch (e) { setError(e.message); setLoading(false) } }
  return { run, loading, error, ok, setOk }
}
