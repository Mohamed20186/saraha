// API layer. Auth + user endpoints call the real Saraha backend.
// Anonymous messages are still MOCKED (localStorage) until the backend has /message routes:
// search for "MOCK" below, and replace those functions with fetch calls when ready.
//
// Backend base URL: VITE_API_URL (default "/api", which the Vite dev server proxies to
// http://localhost:3000, see vite.config.js; the backend has no CORS yet).
export const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
const TOKENS = 'saraha_tokens'

export class ApiError extends Error {
  constructor(message, status = 0, errors = []) { super(message); this.status = status; this.errors = errors }
}

export const tokens = {
  get: () => { try { return JSON.parse(localStorage.getItem(TOKENS)) } catch { return null } },
  set: (t) => localStorage.setItem(TOKENS, JSON.stringify(t)),
  clear: () => localStorage.removeItem(TOKENS),
}
const lang = () => localStorage.getItem('lang') || 'ar'

async function raw(path, { method = 'GET', body, token, form } = {}) {
  const headers = { 'Accept-Language': lang() }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(API_URL + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) })
  } catch { throw new ApiError('Network error', 0) }
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(json?.message || res.statusText, res.status, json?.errors || [])
  return json?.data ?? null
}

let refreshing = null
async function rotate() {
  const t = tokens.get()
  if (!t?.refreshToken) throw new ApiError('Refresh token has already been used or expired', 401)
  refreshing ??= raw('/auth/rotate-token', { method: 'POST', token: t.refreshToken })
    .then((n) => { tokens.set(n); return n })
    .catch((e) => { tokens.clear(); window.dispatchEvent(new Event('saraha:logout')); throw e })
    .finally(() => { refreshing = null })
  return refreshing
}

// Authenticated request: on 401, rotate the refresh token once and retry.
async function authed(path, opts = {}) {
  const t = tokens.get()
  if (!t?.accessToken) throw new ApiError('Authorization header is required', 401)
  try { return await raw(path, { ...opts, token: t.accessToken }) }
  catch (e) {
    if (e.status !== 401) throw e
    const n = await rotate()
    return raw(path, { ...opts, token: n.accessToken })
  }
}

export const imageUrl = (p) => (p ? (/^https?:/.test(p) ? p : API_URL + p) : null)
export const fullName = (u) => (u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : '')
const norm = (u) => (u ? { ...u, id: u.id || u._id } : null)

export const api = {
  // ---- auth (real) ----
  signup: (b) => raw('/auth/signup', { method: 'POST', body: b }),
  confirmEmail: ({ email, otp }) => raw('/auth/confirm-email', { method: 'POST', body: { email, otp } }),
  resendOtp: ({ email }) => raw('/auth/resend-otp', { method: 'POST', body: { email } }),
  async login({ email, password }) {
    tokens.set(await raw('/auth/login', { method: 'POST', body: { email, password } }))
    return api.me()
  },
  async logout() {
    // The backend only supports logoutType 1 (all devices) for now.
    try { const t = tokens.get(); if (t?.refreshToken) await raw('/auth/logout', { method: 'POST', token: t.refreshToken, body: { logoutType: 1 } }) }
    catch { /* ignore: local session is cleared anyway */ }
    tokens.clear()
  },
  forgotPassword: ({ email }) => raw('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (b) => raw('/auth/reset-password', { method: 'POST', body: b }),

  // ---- user (real) ----
  async me() {
    if (!tokens.get()) return null
    try { return norm(await authed('/user/profile')) }
    catch (e) { if (e.status === 401) { tokens.clear(); return null } throw e }
  },
  async updateProfile(patch) { await authed('/user/profile', { method: 'PATCH', body: patch }); return api.me() },
  async uploadImage(file) { const f = new FormData(); f.append('image', file); await authed('/user/image', { method: 'POST', form: f }); return api.me() },
  async getUser(id) {
    try { return norm(await raw(`/user/user-profile/${encodeURIComponent(id)}`)) }
    catch (e) { if (e.status === 404 || e.status === 400) return null; throw e }
  },

  // ---- messages (MOCK, localStorage) ----
  messages: {
    async list(userId) {
      await wait(250); const d = readDb()
      if (!d.seeded.includes(userId)) {
        d.seeded.push(userId)
        ;['شغلك في الـ backend تحفة، كمل 🔥', 'ممكن تشرح الـ JWT في بوست؟', 'إنت أكتر واحد بيسهر على الكود في الشلة 😂', 'فخور بيك يا باشا'].forEach((text, i) =>
          d.messages.push({ id: `seed-${userId}-${i}`, toId: userId, text, createdAt: Date.now() - (i + 1) * 5 * 3600e3, read: i > 1, fav: i === 3 }))
        writeDb(d)
      }
      return d.messages.filter((m) => m.toId === userId).sort((a, b) => b.createdAt - a.createdAt)
    },
    async send(userId, text) {
      await wait(); const d = readDb()
      d.messages.push({ id: 'm' + Date.now(), toId: userId, text, createdAt: Date.now(), read: false, fav: false }); writeDb(d)
    },
    async patch(id, patch) { const d = readDb(); Object.assign(d.messages.find((m) => m.id === id) || {}, patch); writeDb(d) },
    async remove(id) { const d = readDb(); d.messages = d.messages.filter((m) => m.id !== id); writeDb(d) },
  },
}

const DB = 'saraha_mock_messages'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const readDb = () => JSON.parse(localStorage.getItem(DB) || '{"messages":[],"seeded":[]}')
const writeDb = (d) => localStorage.setItem(DB, JSON.stringify(d))
