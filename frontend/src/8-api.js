// Mock API backed by localStorage. Same function names as the real endpoints
// so it can be swapped for fetch() calls to the Saraha backend later.
// Real routes: POST /auth/signup, /auth/confirm-email, /auth/resend-otp, /auth/login,
// /auth/forgot-password, /auth/reset-password, /auth/revoke.
const DB = 'saraha_mock_db', SESSION = 'saraha_mock_session'
const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms))
const read = () => JSON.parse(localStorage.getItem(DB) || '{"users":[],"messages":[]}')
const write = (d) => localStorage.setItem(DB, JSON.stringify(d))
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }) }
const DEMO_CODE = '123456'
const pub = ({ password, ...u }) => u

function seed() {
  const d = read()
  if (d.users.length) return
  d.users.push({ id: 'u1', name: 'Mohamed', username: 'mohamed', email: 'demo@saraha.app', password: 'Demo@1234', confirmed: true, bio: 'اسألني أي حاجة', createdAt: Date.now() })
  const samples = ['شغلك في الـ backend تحفة، كمل 🔥', 'ممكن تشرح الـ JWT في بوست؟', 'إنت أكتر واحد بيسهر على الكود في الشلة 😂', 'فخور بيك يا باشا']
  samples.forEach((text, i) => d.messages.push({ id: 'm' + i, toId: 'u1', text, createdAt: Date.now() - (i + 1) * 3600e3 * 5, read: i > 1, fav: i === 3 }))
  write(d)
}
seed()

export const api = {
  demoCode: DEMO_CODE,
  async signup({ name, username, email, password }) {
    await wait(); const d = read()
    if (d.users.some((u) => u.email === email.toLowerCase())) fail('Email already registered', 409)
    if (d.users.some((u) => u.username === username.toLowerCase())) fail('Username taken', 409)
    d.users.push({ id: 'u' + Date.now(), name, username: username.toLowerCase(), email: email.toLowerCase(), password, confirmed: false, bio: '', createdAt: Date.now() })
    write(d); return { email }
  },
  async confirmEmail({ email, code }) {
    await wait(); const d = read(); const u = d.users.find((x) => x.email === email.toLowerCase())
    if (!u) fail('User not found', 404)
    if (code !== DEMO_CODE) fail('Wrong code')
    u.confirmed = true; write(d); return true
  },
  async resendOtp() { await wait(); return true },
  async login({ email, password }) {
    await wait(); const u = read().users.find((x) => x.email === email.toLowerCase() && x.password === password)
    if (!u) fail('Invalid email or password', 401)
    if (!u.confirmed) fail('EMAIL_NOT_CONFIRMED', 403)
    localStorage.setItem(SESSION, u.id); return pub(u)
  },
  async me() { const u = read().users.find((x) => x.id === localStorage.getItem(SESSION)); return u ? pub(u) : null },
  async logout() { localStorage.removeItem(SESSION) },
  async forgotPassword({ email }) { await wait(); return { email } },
  async resetPassword({ email, code, password }) {
    await wait(); const d = read(); const u = d.users.find((x) => x.email === email.toLowerCase())
    if (!u || code !== DEMO_CODE) fail('Wrong or expired code')
    u.password = password; write(d); return true
  },
  async updateProfile(id, patch) {
    await wait(250); const d = read(); const u = d.users.find((x) => x.id === id)
    Object.assign(u, patch); write(d); return pub(u)
  },
  async getUser(username) { await wait(250); const u = read().users.find((x) => x.username === username.toLowerCase()); return u ? pub(u) : null },
  async sendMessage(username, text) {
    await wait(); const d = read(); const u = d.users.find((x) => x.username === username.toLowerCase())
    if (!u) fail('User not found', 404)
    d.messages.push({ id: 'm' + Date.now(), toId: u.id, text, createdAt: Date.now(), read: false, fav: false }); write(d)
  },
  async listMessages(userId) { await wait(250); return read().messages.filter((m) => m.toId === userId).sort((a, b) => b.createdAt - a.createdAt) },
  async patchMessage(id, patch) { const d = read(); Object.assign(d.messages.find((m) => m.id === id), patch); write(d) },
  async deleteMessage(id) { const d = read(); d.messages = d.messages.filter((m) => m.id !== id); write(d) },
}
