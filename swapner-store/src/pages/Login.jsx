import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../lib/store'

// One login page for everybody: customers go to their account, the shop owner (admin email + password) goes to the admin panel.
export default function Login() {
  const { auth, login, register, notify } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [sp] = useSearchParams()
  const next = sp.get('next') || ''
  const [mode, setMode] = useState(loc.pathname === '/register' ? 'register' : 'login')
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', password2: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  if (auth.role === 'admin') return <Navigate to="/admin" replace />
  if (auth.role === 'user') return <Navigate to={next.startsWith('/') && !next.startsWith('/admin') ? next : '/account'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (mode === 'register' && f.password !== f.password2) return setErr('পাসওয়ার্ড দুটি মিলছে না')
    setBusy(true)
    const r = mode === 'login' ? await login(f.email, f.password) : await register({ name: f.name, email: f.email, phone: f.phone, password: f.password })
    setBusy(false)
    if (!r.ok) return setErr(r.msg || 'কিছু একটা সমস্যা হয়েছে')
    if (r.role === 'admin') nav('/admin', { replace: true })
    else {
      notify(mode === 'login' ? `স্বাগতম, ${r.user.name}!` : 'অ্যাকাউন্ট তৈরি হয়েছে ✓')
      nav(next.startsWith('/') && !next.startsWith('/admin') ? next : '/account', { replace: true })
    }
  }

  return (
    <div className="wrap authwrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr('') }}>লগইন</button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr('') }}>নতুন অ্যাকাউন্ট</button>
        </div>
        <h2>{mode === 'login' ? 'আপনার অ্যাকাউন্টে ঢুকুন' : 'নতুন অ্যাকাউন্ট খুলুন'}</h2>
        {next === '/checkout' && <div className="auth-note">অর্ডার করতে লগইন করা দরকার — আপনার কার্টের পণ্যগুলো সংরক্ষিত আছে।</div>}
        {mode === 'register' && <label>আপনার নাম<input value={f.name} onChange={set('name')} autoComplete="name" /></label>}
        <label>ইমেইল<input type="email" value={f.email} onChange={set('email')} autoComplete="email" inputMode="email" autoFocus /></label>
        {mode === 'register' && <label>মোবাইল নম্বর<input value={f.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" inputMode="tel" autoComplete="tel" /></label>}
        <label>পাসওয়ার্ড<input type="password" value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {mode === 'register' && <label>পাসওয়ার্ড আবার লিখুন<input type="password" value={f.password2} onChange={set('password2')} autoComplete="new-password" /></label>}
        {err && <div className="auth-err">{err}</div>}
        <button className="btn-sf big" type="submit" disabled={busy}>{busy ? 'অপেক্ষা করুন…' : mode === 'login' ? 'লগইন করুন' : 'অ্যাকাউন্ট খুলুন'}</button>
        <small className="muted" style={{ textAlign: 'center' }}>পাসওয়ার্ড ভুলে গেলে আমাদের কল করুন — আমরা নতুন পাসওয়ার্ড দিয়ে দেব।</small>
        <Link to="/" className="auth-back">← দোকানে ফিরে যান</Link>
      </form>
    </div>
  )
}
