import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getState, commit, UPLOAD_DIR, DATA_DIR } from './db.js'
import { hashPassword, verifyPassword, burnTime, signToken, readToken, tooMany, noteFail, clearFails } from './auth.js'
import { buildPublicData, couponDiscount, placeOrder, customerCancel, withDefaults, mergeStale, uid } from '../src/lib/logic.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '../dist')
const PORT = +process.env.PORT || 3001
const app = express()
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY)
app.disable('x-powered-by')

/* ---------- first run: create the admin account ---------- */
if (!getState().admin) {
  const email = String(process.env.ADMIN_EMAIL || 'admin@swapnerghor.com').toLowerCase().trim()
  const pw = process.env.ADMIN_PASSWORD || 'admin123'
  commit((s) => { s.admin = { email, hash: hashPassword(pw), ver: 1, mustChange: !process.env.ADMIN_PASSWORD } })
  console.log(`[setup] অ্যাডমিন তৈরি হয়েছে → ইমেইল: ${email}${process.env.ADMIN_PASSWORD ? '' : '  পাসওয়ার্ড: admin123 (লগইনের পর বদলে নিন!)'}`)
}

/* ---------- helpers ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^(?:\+?88)?01[3-9]\d{8}$/
const str = (v, max) => String(v ?? '').trim().slice(0, max)
const normEmail = (v) => str(v, 120).toLowerCase()
const normPhone = (v) => str(v, 20).replace(/[\s-]/g, '')
const fail = (res, code, msg) => res.status(code).json({ ok: false, msg })
const userView = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, address: u.address, createdAt: u.createdAt })
const orderView = (o) => ({
  no: o.no, createdAt: o.createdAt, status: o.status, customer: o.customer,
  items: o.items.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
  subtotal: o.subtotal, discount: o.discount, coupon: o.coupon, zoneName: o.zoneName, delivery: o.delivery, total: o.total,
  payMethod: o.payMethod, payLabel: o.payLabel, trxId: o.trxId, note: o.note, history: o.history,
})

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'same-origin')
  next()
})

// attach req.auth when a valid token is sent
app.use((req, _res, next) => {
  const h = req.headers.authorization || ''
  const p = h.startsWith('Bearer ') ? readToken(h.slice(7)) : null
  const s = getState()
  req.auth = null
  if (p?.r === 'admin' && s.admin && p.v === s.admin.ver) req.auth = { role: 'admin' }
  else if (p?.r === 'user') {
    const u = s.users.find((x) => x.id === p.id)
    if (u && !u.blocked && (u.pv || 0) === (p.pv || 0)) req.auth = { role: 'user', user: u }
  }
  next()
})
const needUser = (req, res, next) => (req.auth?.role === 'user' ? next() : fail(res, 401, 'আগে লগইন করুন'))
const needAdmin = (req, res, next) => (req.auth?.role === 'admin' ? next() : fail(res, 401, 'অ্যাডমিন লগইন দরকার'))

/* ---------- image upload (admin) — registered before the global JSON parser: it has its own larger limit ---------- */
app.post('/api/admin/upload', needAdmin, express.json({ limit: '8mb' }), (req, res) => {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.dataUrl || ''))
  if (!m) return fail(res, 400, 'ছবির ফরম্যাট ঠিক নয়')
  const buf = Buffer.from(m[2], 'base64')
  if (buf.length > 4 * 1024 * 1024) return fail(res, 413, 'ছবি অনেক বড় (৪MB এর কম হতে হবে)')
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  const isPng = buf.subarray(0, 4).toString('hex') === '89504e47'
  const isWebp = buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP'
  if (!(isJpg || isPng || isWebp)) return fail(res, 400, 'এটি সঠিক ছবি ফাইল নয়')
  const name = uid().replace(/-/g, '') + (isJpg ? '.jpg' : isPng ? '.png' : '.webp')
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf)
  res.json({ ok: true, url: 'uploads/' + name })
})

app.use(express.json({ limit: '6mb' }))

/* ---------- public catalogue ---------- */
app.get('/api/public', (_req, res) => {
  const s = getState()
  res.setHeader('Cache-Control', 'no-cache')
  res.json({ rev: s.rev, ...buildPublicData(s.db) })
})

/* ---------- auth: one login for customers AND admin ---------- */
app.post('/api/auth/register', (req, res) => {
  const b = req.body || {}
  const name = str(b.name, 80), email = normEmail(b.email), phone = normPhone(b.phone), address = str(b.address, 300), pw = String(b.password || '')
  if (name.length < 2) return fail(res, 400, 'আপনার নাম লিখুন')
  if (!EMAIL_RE.test(email)) return fail(res, 400, 'সঠিক ইমেইল দিন')
  if (!PHONE_RE.test(phone)) return fail(res, 400, 'সঠিক মোবাইল নম্বর দিন (যেমন 01XXXXXXXXX)')
  if (pw.length < 6 || pw.length > 100) return fail(res, 400, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
  const s = getState()
  if (s.users.some((u) => u.email === email) || s.admin?.email === email) return fail(res, 409, 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা আছে')
  const user = { id: uid(), name, email, phone, address, hash: hashPassword(pw), pv: 0, blocked: false, createdAt: new Date().toISOString() }
  commit((st) => { st.users.push(user) })
  res.json({ ok: true, role: 'user', token: signToken({ r: 'user', id: user.id, pv: 0 }, 30), user: userView(user) })
})

app.post('/api/auth/login', (req, res) => {
  const email = normEmail(req.body?.email), pw = String(req.body?.password || '')
  const key = `${req.ip}|${email}`
  if (tooMany(key)) return fail(res, 429, 'অনেকবার ভুল হয়েছে — ১০ মিনিট পর আবার চেষ্টা করুন')
  const s = getState()
  if (s.admin && s.admin.email === email) {
    if (verifyPassword(pw, s.admin.hash)) {
      clearFails(key)
      return res.json({ ok: true, role: 'admin', email: s.admin.email, token: signToken({ r: 'admin', v: s.admin.ver }, 7), mustChange: !!s.admin.mustChange })
    }
  } else {
    const u = s.users.find((x) => x.email === email)
    if (u && verifyPassword(pw, u.hash)) {
      if (u.blocked) return fail(res, 403, 'এই অ্যাকাউন্টটি বন্ধ করা আছে — আমাদের সাথে যোগাযোগ করুন')
      clearFails(key)
      return res.json({ ok: true, role: 'user', token: signToken({ r: 'user', id: u.id, pv: u.pv || 0 }, 30), user: userView(u) })
    }
    if (!u) burnTime(pw)
  }
  noteFail(key)
  fail(res, 401, 'ইমেইল বা পাসওয়ার্ড ভুল')
})

app.get('/api/auth/me', (req, res) => {
  if (!req.auth) return fail(res, 401, 'লগইন নেই')
  if (req.auth.role === 'admin') return res.json({ ok: true, role: 'admin', email: getState().admin.email, mustChange: !!getState().admin.mustChange })
  res.json({ ok: true, role: 'user', user: userView(req.auth.user) })
})

app.patch('/api/auth/me', needUser, (req, res) => {
  const b = req.body || {}
  const name = str(b.name, 80), phone = normPhone(b.phone), address = str(b.address, 300)
  if (name.length < 2) return fail(res, 400, 'আপনার নাম লিখুন')
  if (!PHONE_RE.test(phone)) return fail(res, 400, 'সঠিক মোবাইল নম্বর দিন')
  const u = req.auth.user
  commit(() => { u.name = name; u.phone = phone; u.address = address })
  res.json({ ok: true, user: userView(u) })
})

app.post('/api/auth/password', needUser, (req, res) => {
  const { current, password } = req.body || {}
  const u = req.auth.user
  if (!verifyPassword(String(current || ''), u.hash)) return fail(res, 400, 'বর্তমান পাসওয়ার্ড ভুল')
  if (String(password || '').length < 6) return fail(res, 400, 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে')
  commit(() => { u.hash = hashPassword(String(password)); u.pv = (u.pv || 0) + 1 })
  res.json({ ok: true, token: signToken({ r: 'user', id: u.id, pv: u.pv }, 30) })
})

// coupon codes are never sent to visitors — they are checked here
app.post('/api/coupon', (req, res) => {
  const subtotal = Math.max(0, +req.body?.subtotal || 0)
  const r = couponDiscount(getState().db, str(req.body?.code, 40), subtotal)
  res.json({ ok: r.ok, msg: r.msg, discount: r.discount, code: r.code })
})

/* ---------- customer orders ---------- */
app.post('/api/orders', needUser, (req, res) => {
  const b = req.body || {}
  const c = b.customer || {}
  const name = str(c.name, 80), phone = normPhone(c.phone), address = str(c.address, 300)
  if (name.length < 2) return fail(res, 400, 'আপনার নাম লিখুন')
  if (!PHONE_RE.test(phone)) return fail(res, 400, 'সঠিক মোবাইল নম্বর দিন (যেমন 01XXXXXXXXX)')
  if (address.length < 8) return fail(res, 400, 'সম্পূর্ণ ঠিকানা লিখুন')
  if (!Array.isArray(b.items) || b.items.length > 100) return fail(res, 400, 'কার্ট খালি')
  const result = commit((s) => {
    const r = placeOrder(s.db, {
      customer: { name, phone, address }, userId: req.auth.user.id,
      items: b.items.map((i) => ({ id: String(i.id), qty: i.qty })),
      couponCode: str(b.couponCode, 40), zoneId: str(b.zoneId, 60), payMethod: str(b.payMethod, 40), trxId: b.trxId, note: b.note,
    })
    return r
  })
  if (!result.ok) return fail(res, 400, result.msg)
  // remember the latest delivery details on the account
  commit(() => { const u = req.auth.user; u.phone = phone; if (!u.address) u.address = address })
  res.json({ ok: true, order: orderView(result.order) })
})

app.get('/api/orders/mine', needUser, (req, res) => {
  const uidv = req.auth.user.id
  res.json({ ok: true, orders: getState().db.orders.filter((o) => o.userId === uidv).slice().reverse().map(orderView) })
})
app.get('/api/orders/:no', needUser, (req, res) => {
  const o = getState().db.orders.find((x) => x.no === req.params.no && x.userId === req.auth.user.id)
  if (!o) return fail(res, 404, 'অর্ডার পাওয়া যায়নি')
  res.json({ ok: true, order: orderView(o) })
})
app.post('/api/orders/:no/cancel', needUser, (req, res) => {
  const r = commit((s) => customerCancel(s.db, req.params.no, req.auth.user.id))
  if (!r.ok) return fail(res, 400, r.msg)
  const o = getState().db.orders.find((x) => x.no === req.params.no)
  res.json({ ok: true, order: orderView(o) })
})

/* ---------- admin ---------- */
app.get('/api/admin/rev', needAdmin, (_req, res) => res.json({ rev: getState().rev }))
app.get('/api/admin/db', needAdmin, (_req, res) => {
  const s = getState()
  res.json({ ok: true, rev: s.rev, at: s.at, db: s.db })
})

app.put('/api/admin/db', needAdmin, (req, res) => {
  const b = req.body || {}
  const inc = b.db
  if (!inc || typeof inc !== 'object' || !Array.isArray(inc.products) || !Array.isArray(inc.orders) || typeof inc.settings !== 'object') return fail(res, 400, 'ডেটা ঠিক নয়')
  let next = withDefaults(inc)
  const s = getState()
  const stale = !b.replace && b.baseRev !== s.rev
  if (stale) next = mergeStale(s.db, next, String(b.baseAt || ''))
  commit((st) => { st.db = next })
  res.json({ ok: true, rev: getState().rev, at: getState().at, db: stale || b.replace ? next : undefined })
})

app.get('/api/admin/users', needAdmin, (_req, res) => {
  const s = getState()
  res.json({
    ok: true,
    users: s.users.map((u) => {
      const mine = s.db.orders.filter((o) => o.userId === u.id)
      return { ...userView(u), blocked: !!u.blocked, orders: mine.length, spent: mine.filter((o) => o.status === 'delivered').reduce((a, o) => a + o.total, 0) }
    }),
  })
})
app.patch('/api/admin/users/:id', needAdmin, (req, res) => {
  const u = getState().users.find((x) => x.id === req.params.id)
  if (!u) return fail(res, 404, 'ইউজার পাওয়া যায়নি')
  commit(() => { u.blocked = !!req.body?.blocked })
  res.json({ ok: true })
})
app.post('/api/admin/users/:id/reset', needAdmin, (req, res) => {
  const u = getState().users.find((x) => x.id === req.params.id)
  if (!u) return fail(res, 404, 'ইউজার পাওয়া যায়নি')
  const tmp = Math.random().toString(36).slice(2, 10)
  commit(() => { u.hash = hashPassword(tmp); u.pv = (u.pv || 0) + 1 })
  res.json({ ok: true, password: tmp })
})

app.post('/api/admin/credentials', needAdmin, (req, res) => {
  const { currentPassword, email, newPassword } = req.body || {}
  const s = getState()
  if (!verifyPassword(String(currentPassword || ''), s.admin.hash)) return fail(res, 400, 'বর্তমান পাসওয়ার্ড ভুল')
  const em = normEmail(email || s.admin.email)
  if (!EMAIL_RE.test(em)) return fail(res, 400, 'সঠিক ইমেইল দিন')
  if (s.users.some((u) => u.email === em)) return fail(res, 409, 'এই ইমেইল দিয়ে একটি কাস্টমার অ্যাকাউন্ট আছে')
  if (newPassword && String(newPassword).length < 8) return fail(res, 400, 'অ্যাডমিন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে')
  commit((st) => {
    st.admin.email = em
    if (newPassword) { st.admin.hash = hashPassword(String(newPassword)); st.admin.mustChange = false }
    st.admin.ver += 1
  })
  res.json({ ok: true, token: signToken({ r: 'admin', v: getState().admin.ver }, 7), mustChange: !!getState().admin.mustChange })
})

/* ---------- static files ---------- */
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, index: false, dotfiles: 'ignore' }))
app.use('/api', (_req, res) => fail(res, 404, 'পাওয়া যায়নি'))
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: 'index.html' }))
} else {
  app.get('/', (_req, res) => res.type('text').send('dist ফোল্ডার নেই — আগে `npm run build` চালান।'))
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') return fail(res, 413, 'ডেটা অনেক বড়')
  if (err instanceof SyntaxError) return fail(res, 400, 'ভুল অনুরোধ')
  console.error(err)
  fail(res, 500, 'সার্ভারে সমস্যা হয়েছে')
})

app.listen(PORT, '0.0.0.0', () => console.log(`স্বপ্নের ঘর বাজার চলছে → http://localhost:${PORT}   (ডেটা: ${DATA_DIR})`))
