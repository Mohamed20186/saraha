// MOCK API. Everything is stored in localStorage so the UI can be tried without a backend.
// Later, replace each function body with a real fetch() to the Saraha API (same names, same shapes).
// In the mock, the OTP / reset code is always 123456 (shown on screen as a hint).
export const MOCK_CODE = '123456'
const delay = (ms = 400) => new Promise(r => setTimeout(r, ms))
const read = (k, d) => JSON.parse(localStorage.getItem(k) || JSON.stringify(d))
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))
const fail = (message) => { throw new Error(message) }

export async function signup({ name, email, password }) {
  await delay()
  const users = read('mock_users', [])
  if (users.find(u => u.email === email)) fail('Email already registered')
  if (password.length < 8) fail('Password must be at least 8 characters')
  users.push({ name, email, password, confirmed: false })
  write('mock_users', users)
  return { message: 'Account created. Check your email for the code.' }
}
export async function confirmEmail({ email, otp }) {
  await delay()
  const users = read('mock_users', [])
  const u = users.find(u => u.email === email) || fail('User not found')
  if (otp !== MOCK_CODE) fail('Wrong code')
  u.confirmed = true; write('mock_users', users)
  return { message: 'Email confirmed' }
}
export async function resendOtp({ email }) { await delay(); return { message: 'Code sent' } }
export async function login({ email, password }) {
  await delay()
  const u = read('mock_users', []).find(u => u.email === email && u.password === password) || fail('Invalid email or password')
  if (!u.confirmed) fail('Please confirm your email first')
  const session = { accessToken: 'mock-access', refreshToken: 'mock-refresh', email }
  write('mock_session', session)
  return session
}
export async function forgotPassword({ email }) { await delay(); return { message: 'If the email exists, a code was sent' } }
export async function resetPassword({ email, code, newPassword }) {
  await delay()
  if (code !== MOCK_CODE) fail('Wrong code')
  if (newPassword.length < 8) fail('Password must be at least 8 characters')
  const users = read('mock_users', [])
  const u = users.find(u => u.email === email) || fail('User not found')
  u.password = newPassword; write('mock_users', users)
  return { message: 'Password updated' }
}
export async function getProfile() {
  await delay(200)
  const s = read('mock_session', null) || fail('Not logged in')
  const u = read('mock_users', []).find(u => u.email === s.email) || fail('User not found')
  return { name: u.name, email: u.email }
}
export function isLoggedIn() { return !!read('mock_session', null) }
export function logout() { localStorage.removeItem('mock_session') }
