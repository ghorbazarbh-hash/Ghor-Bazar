import crypto from 'node:crypto'
import { SECRET } from './db.js'

// ---------- passwords (scrypt, per-user salt) ----------
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(pw, salt, 64)
  return `${salt.toString('base64')}$${hash.toString('base64')}`
}
export function verifyPassword(pw, stored) {
  try {
    const [s, h] = String(stored).split('$')
    const hash = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64)
    return crypto.timingSafeEqual(hash, Buffer.from(h, 'base64'))
  } catch {
    return false
  }
}
const DUMMY = hashPassword('dummy-password-for-timing')
export const burnTime = (pw) => verifyPassword(pw, DUMMY)

// ---------- signed tokens (HMAC-SHA256) ----------
const b64u = (b) => Buffer.from(b).toString('base64url')
export function signToken(payload, days) {
  const body = b64u(JSON.stringify({ ...payload, exp: Date.now() + days * 864e5 }))
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}
export function readToken(tok) {
  try {
    const [body, sig] = String(tok).split('.')
    const good = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
    const a = Buffer.from(sig), b = Buffer.from(good)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    return p.exp > Date.now() ? p : null
  } catch {
    return null
  }
}

// ---------- brute-force protection for login ----------
const fails = new Map()
const WINDOW = 10 * 60 * 1000
export function tooMany(key, max = 8) {
  const e = fails.get(key)
  if (!e) return false
  if (Date.now() - e.first > WINDOW) { fails.delete(key); return false }
  return e.n >= max
}
export function noteFail(key) {
  const e = fails.get(key)
  if (!e || Date.now() - e.first > WINDOW) fails.set(key, { n: 1, first: Date.now() })
  else e.n += 1
}
export const clearFails = (key) => fails.delete(key)
setInterval(() => { const now = Date.now(); for (const [k, v] of fails) if (now - v.first > WINDOW) fails.delete(k) }, 60_000).unref()
