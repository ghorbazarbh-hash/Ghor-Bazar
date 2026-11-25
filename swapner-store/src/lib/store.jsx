import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { COLLECTIONS, defaultSettings, mergeStale } from './logic.js'

// all the business logic lives in logic.js (shared with the server); re-exported here for the pages
export * from './logic.js'

const TOKEN_KEY = 'sgb_token'
const CART_KEY = 'swapnerGhorBazarCart'

const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' } }
const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ } }

// relative URLs, so the shop also works when hosted in a sub-folder
export async function api(path, { method = 'GET', body } = {}) {
  try {
    const t = getToken()
    const res = await fetch(path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(t ? { Authorization: 'Bearer ' + t } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })
    const j = await res.json().catch(() => null)
    if (!j) return { ok: false, status: res.status, msg: 'সার্ভার থেকে সঠিক উত্তর আসেনি' }
    return { status: res.status, ...j }
  } catch {
    return { ok: false, status: 0, msg: 'সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না — ইন্টারনেট চেক করুন' }
  }
}

function publicToDb(pub) {
  const d = {}
  COLLECTIONS.forEach((k) => (d[k] = []))
  d.units = []
  d.products = pub.products || []
  d.categories = pub.categories || []
  d.brands = pub.brands || []
  d.banners = pub.banners || []
  d.settings = { ...defaultSettings, ...(pub.settings || {}) }
  return d
}

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

export function StoreProvider({ children }) {
  const [db, setDb] = useState(null)
  const dbRef = useRef(null)
  const setBoth = (d) => { dbRef.current = d; setDb(d) }
  const [auth, setAuth] = useState({ role: null, user: null, mustChange: false })
  const authRef = useRef(auth)
  authRef.current = auth
  const [ready, setReady] = useState(false)
  const [offline, setOffline] = useState(false)
  const [toast, setToast] = useState(null)
  const [sync, setSync] = useState('saved') // saved | saving | error

  const notify = useCallback((msg, type = 'ok') => setToast({ msg, type, id: Date.now() }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3400)
    return () => clearTimeout(t)
  }, [toast])

  /* ---------- loading data ---------- */
  const meta = useRef({ rev: 0, at: '' }) // admin copy version
  const dirty = useRef(false)
  const inflight = useRef(false)
  const timer = useRef(null)

  const loadPublic = useCallback(async () => {
    const r = await api('api/public')
    if (!r.rev) { setOffline(true); return false }
    setOffline(false)
    setBoth(publicToDb(r))
    return true
  }, [])
  const loadAdmin = useCallback(async () => {
    const r = await api('api/admin/db')
    if (!r.ok) return false
    meta.current = { rev: r.rev, at: r.at }
    dirty.current = false
    setBoth(r.db)
    return true
  }, [])

  const logoutLocal = useCallback(async () => {
    setToken('')
    clearTimeout(timer.current)
    dirty.current = false
    setAuth({ role: null, user: null, mustChange: false })
    await loadPublic()
  }, [loadPublic])

  // first load
  useEffect(() => {
    let dead = false
    ;(async () => {
      if (getToken()) {
        const me = await api('api/auth/me')
        if (me.ok && me.role === 'admin') {
          if (await loadAdmin()) { if (!dead) setAuth({ role: 'admin', user: null, mustChange: !!me.mustChange }) }
          else await loadPublic()
        } else if (me.ok && me.role === 'user') {
          await loadPublic()
          if (!dead) setAuth({ role: 'user', user: me.user, mustChange: false })
        } else {
          if (me.status === 401) setToken('')
          await loadPublic()
        }
      } else await loadPublic()
      if (!dead) setReady(true)
    })()
    return () => { dead = true }
  }, [loadAdmin, loadPublic])

  // visitors: refresh prices / stock when they come back to the tab
  useEffect(() => {
    const h = () => { if (document.visibilityState === 'visible' && authRef.current.role !== 'admin') loadPublic() }
    document.addEventListener('visibilitychange', h)
    const t = setInterval(h, 90_000)
    return () => { document.removeEventListener('visibilitychange', h); clearInterval(t) }
  }, [loadPublic])

  /* ---------- admin: save every change to the server ---------- */
  const flush = useCallback(async () => {
    if (inflight.current || !dirty.current || authRef.current.role !== 'admin') return
    inflight.current = true
    dirty.current = false
    const used = { ...meta.current }
    const r = await api('api/admin/db', { method: 'PUT', body: { db: dbRef.current, baseRev: used.rev, baseAt: used.at } })
    inflight.current = false
    if (r.ok) {
      meta.current = { rev: r.rev, at: r.at }
      if (r.db) setBoth(dirty.current ? mergeStale(r.db, dbRef.current, used.at) : r.db)
      if (dirty.current) flush()
      else setSync('saved')
    } else {
      dirty.current = true
      if (r.status === 401) { notify('লগইনের মেয়াদ শেষ — আবার লগইন করুন', 'error'); logoutLocal(); return }
      setSync('error')
      notify(r.msg || 'সেভ হয়নি — আবার চেষ্টা করছি', 'error')
      timer.current = setTimeout(flush, 5000)
    }
  }, [logoutLocal, notify])

  // run fn on a copy of the data (admin only); whatever fn returns is passed back
  const update = useCallback((fn) => {
    const d = structuredClone(dbRef.current)
    const res = fn(d)
    setBoth(d)
    dirty.current = true
    setSync('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 350)
    return res
  }, [flush])

  const replaceAll = useCallback(async (next) => {
    clearTimeout(timer.current)
    const r = await api('api/admin/db', { method: 'PUT', body: { db: next, replace: true } })
    if (!r.ok) return notify(r.msg || 'রিস্টোর হয়নি', 'error')
    meta.current = { rev: r.rev, at: r.at }
    dirty.current = false
    setBoth(r.db)
    setSync('saved')
    return true
  }, [notify])

  // warn before closing the tab with unsaved changes
  useEffect(() => {
    const h = (e) => { if (dirty.current || inflight.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [])

  // admin: pick up new online orders / other changes automatically
  useEffect(() => {
    if (auth.role !== 'admin') return
    const t = setInterval(async () => {
      if (dirty.current || inflight.current || document.visibilityState !== 'visible') return
      const r = await api('api/admin/rev')
      if (!r.rev || r.rev === meta.current.rev || dirty.current || inflight.current) return
      const before = dbRef.current.orders.filter((o) => o.status === 'pending').length
      if (await loadAdmin()) {
        const after = dbRef.current.orders.filter((o) => o.status === 'pending').length
        if (after > before) notify(`🔔 ${after - before}টি নতুন অনলাইন অর্ডার এসেছে!`)
      }
    }, 10_000)
    return () => clearInterval(t)
  }, [auth.role, loadAdmin, notify])

  /* ---------- login / register / logout (one login for customers and admin) ---------- */
  const afterAuth = async (r) => {
    setToken(r.token)
    if (r.role === 'admin') {
      if (!(await loadAdmin())) { setToken(''); return { ok: false, msg: 'ডেটা লোড করা যায়নি' } }
      setAuth({ role: 'admin', user: null, mustChange: !!r.mustChange })
    } else {
      await loadPublic()
      setAuth({ role: 'user', user: r.user, mustChange: false })
    }
    return r
  }
  const login = async (email, password) => {
    const r = await api('api/auth/login', { method: 'POST', body: { email, password } })
    return r.ok ? afterAuth(r) : r
  }
  const register = async (form) => {
    const r = await api('api/auth/register', { method: 'POST', body: form })
    return r.ok ? afterAuth(r) : r
  }
  const logout = () => logoutLocal()
  const setUser = (user) => setAuth((a) => ({ ...a, user }))
  const setMustChange = (v) => setAuth((a) => ({ ...a, mustChange: v }))
  const setSession = (token) => setToken(token)

  /* ---------- storefront cart ---------- */
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]') } catch { return [] } })
  const [cartOpen, setCartOpen] = useState(false)
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch { /* ignore */ } }, [cart])
  const addToCart = (id, qty = 1, open = true) => {
    const p = dbRef.current.products.find((x) => x.id === id)
    if (!p) return
    setCart((c) => {
      const ex = c.find((x) => x.id === id)
      const nq = Math.min((ex ? ex.qty : 0) + qty, p.stock)
      if (ex) return c.map((x) => (x.id === id ? { ...x, qty: nq } : x))
      return [...c, { id, qty: Math.min(qty, p.stock) }]
    })
    if (open) setCartOpen(true)
  }
  const setCartQty = (id, qty) => setCart((c) => (qty <= 0 ? c.filter((x) => x.id !== id) : c.map((x) => (x.id === id ? { ...x, qty } : x))))
  const clearCart = () => setCart([])

  // upload a (browser-compressed) image to the server, get a short URL back
  const uploadImage = useCallback(async (dataUrl) => {
    const r = await api('api/admin/upload', { method: 'POST', body: { dataUrl } })
    if (!r.ok) throw new Error(r.msg || 'আপলোড হয়নি')
    return r.url
  }, [])

  if (!ready) return <div className="boot">স্বপ্নের ঘর বাজার — লোড হচ্ছে…</div>
  if (!db) return <div className="boot" style={{ textAlign: 'center', padding: 20 }}>সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।<br />একটু পরে পেজটি রিফ্রেশ করুন।</div>
  return (
    <Ctx.Provider
      value={{
        db, update, replaceAll, notify, toast, sync, offline,
        auth, admin: auth.role === 'admin', customer: auth.role === 'user' ? auth.user : null,
        login, register, logout, setUser, setMustChange, setSession, api, uploadImage,
        cart, cartOpen, setCartOpen, addToCart, setCartQty, clearCart, reloadPublic: loadPublic,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}
