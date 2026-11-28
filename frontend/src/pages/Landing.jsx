import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EyeOff, ShieldCheck, Link2, ArrowRight } from 'lucide-react'
import { useApp } from '../store.jsx'

export default function Landing() {
  const { t, user } = useApp()
  const feats = [[EyeOff, 'f1'], [ShieldCheck, 'f2'], [Link2, 'f3']]
  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-fuchsia-600 to-pink-500 px-6 py-20 text-center text-white shadow-2xl shadow-brand-600/20">
        <div className="float-slow absolute -top-24 -start-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="float-slow [animation-delay:-3s] absolute -bottom-24 -end-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }} className="relative mx-auto max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">{t('tagline')}</motion.h1>
        <p className="relative mx-auto mt-4 max-w-xl text-white/85">{t('sub')}</p>
        <div className="relative mt-8 flex justify-center gap-3">
          <Link to={user ? '/dashboard' : '/signup'} className="btn bg-white text-brand-700 shadow-lg hover:bg-brand-50">{t('start')}<ArrowRight size={16} className="rtl:rotate-180" /></Link>
          {!user && <Link to="/login" className="btn border border-white/40 text-white hover:bg-white/10">{t('login')}</Link>}
        </div>
      </section>
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {feats.map(([Icon, k], i) => (
          <motion.div key={k} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .1, duration: .4 }} whileHover={{ y: -6 }} className="card hover:shadow-lg">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-slate-800"><Icon size={22} /></span>
            <h3 className="mt-4 font-bold">{t(k)}</h3>
            <p className="mt-1 text-sm text-slate-500">{t(k + 'd')}</p>
          </motion.div>
        ))}
      </section>
    </div>
  )
}
