import React from 'react'
import { Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function Field({ label, error, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <input className={`input ${error ? '!border-rose-500' : ''}`} {...props} />
      {error && <span className="mt-1 block text-xs text-rose-500">{error}</span>}
    </label>
  )
}
export function Submit({ loading, children, ...p }) {
  return <button className="btn-primary w-full" disabled={loading} {...p}>{loading && <Loader2 className="animate-spin" size={16} />}{children}</button>
}
export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto mt-6 max-w-md animate-pop">
      <div className="card !p-8">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6 space-y-4">{children}</div>
      </div>
      {footer && <p className="mt-4 text-center text-sm text-slate-500">{footer}</p>}
    </div>
  )
}
export function ErrorBox({ children }) {
  return <AnimatePresence>{children ? <motion.div key={String(children)} initial={{ opacity: 0, height: 0, x: 0 }} animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -4, 4, 0] }} exit={{ opacity: 0, height: 0 }} transition={{ duration: .35 }} className="overflow-hidden rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40">{children}</motion.div> : null}</AnimatePresence>
}
export function timeAgo(ts, t) {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return t('now')
  if (m < 60) return m + ' ' + t('min')
  const h = Math.floor(m / 60)
  return h < 24 ? h + ' ' + t('hr') : Math.floor(h / 24) + ' ' + t('day')
}
