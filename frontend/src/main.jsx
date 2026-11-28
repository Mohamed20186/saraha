import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { Providers } from './store.jsx'
import { MotionConfig } from 'framer-motion'
import './index.css'
createRoot(document.getElementById('root')).render(
  <MotionConfig reducedMotion="user"><BrowserRouter><Providers><App /></Providers></BrowserRouter></MotionConfig>
)
