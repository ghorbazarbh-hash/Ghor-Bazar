import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { taka, bn, fmtDateTime } from '../lib/format'
import { StatusPill } from '../components/ui'

const STEPS = [['pending', 'অর্ডার পেয়েছি'], ['confirmed', 'কনফার্ম হয়েছে'], ['shipped', 'পাঠানো হয়েছে'], ['delivered', 'ডেলিভারি হয়েছে']]

export function Tracker({ order }) {
  if (order.status === 'cancelled') return <div className="trk-cancel">❌ অর্ডারটি বাতিল হয়েছে</div>
  const at = Object.fromEntries((order.history || []).map((h) => [h.status, h.at]))
  const idx = STEPS.findIndex(([k]) => k === order.status)
  return (
    <ol className="trk">
      {STEPS.map(([k, label], i) => (
        <li key={k} className={i <= idx ? 'done' : ''}>
          <span className="dot">{i <= idx ? '✓' : i + 1}</span>
          <b>{label}</b>
          <small>{at[k] ? fmtDateTime(at[k]) : ''}</small>
        </li>
      ))}
    </ol>
  )
}

function Orders() {
  const { api, notify } = useStore()
  const [orders, setOrders] = useState(null)
  const [open, setOpen] = useState('')
  const load = async () => { const r = await api('api/orders/mine'); if (r.ok) setOrders(r.orders) }
  useEffect(() => { load() }, [])
  const cancel = async (no) => {
    if (!confirm('অর্ডারটি বাতিল করবেন?')) return
    const r = await api(`api/orders/${no}/cancel`, { method: 'POST' })
    if (!r.ok) return notify(r.msg, 'error')
    notify('অর্ডার বাতিল হয়েছে')
    load()
  }
  if (!orders) return <div className="empty-sf">লোড হচ্ছে…</div>
  if (!orders.length) return <div className="empty-sf">আপনি এখনো কোনো অর্ডার করেননি।<br /><br /><Link to="/shop" className="btn-sf">কেনাকাটা শুরু করুন</Link></div>
  return (
    <div className="ord-list">
      {orders.map((o) => (
        <div className="ord" key={o.no}>
          <button className="ord-head" onClick={() => setOpen(open === o.no ? '' : o.no)}>
            <span><b>{o.no}</b><small>{fmtDateTime(o.createdAt)}</small></span>
            <span>{taka(o.total)} <StatusPill s={o.status} /></span>
          </button>
          {open === o.no && (
            <div className="ord-body">
              <Tracker order={o} />
              <div className="done-sum">
                {o.items.map((i, k) => <div key={k}><span>{i.name} × {bn(i.qty)}</span><b>{taka(i.price * i.qty)}</b></div>)}
                {o.discount > 0 && <div className="green"><span>ছাড় ({o.coupon})</span><b>− {taka(o.discount)}</b></div>}
                <div><span>ডেলিভারি ({o.zoneName})</span><b>{o.delivery ? taka(o.delivery) : 'ফ্রি'}</b></div>
                <div className="t"><span>সর্বমোট</span><b>{taka(o.total)}</b></div>
                <div><span>পেমেন্ট</span><b>{o.payLabel || o.payMethod}{o.trxId ? ` (TrxID: ${o.trxId})` : ''}</b></div>
                <div><span>ঠিকানা</span><b style={{ textAlign: 'right', maxWidth: 260 }}>{o.customer.address}</b></div>
              </div>
              {o.status === 'pending' && <button className="btn-sf alt" onClick={() => cancel(o.no)}>অর্ডার বাতিল করুন</button>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Profile() {
  const { customer, api, setUser, notify } = useStore()
  const [f, setF] = useState({ name: customer.name, phone: customer.phone, address: customer.address || '' })
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = async (e) => {
    e.preventDefault()
    const r = await api('api/auth/me', { method: 'PATCH', body: f })
    if (!r.ok) return notify(r.msg, 'error')
    setUser(r.user)
    notify('প্রোফাইল সংরক্ষিত ✓')
  }
  return (
    <form className="co-card" onSubmit={save} style={{ maxWidth: 520 }}>
      <h3>আমার তথ্য</h3>
      <label>ইমেইল<input value={customer.email} disabled /></label>
      <label>নাম<input value={f.name} onChange={set('name')} /></label>
      <label>মোবাইল<input value={f.phone} onChange={set('phone')} inputMode="tel" /></label>
      <label>ডেলিভারির ঠিকানা<textarea rows="3" value={f.address} onChange={set('address')} /></label>
      <button className="btn-sf" type="submit">সংরক্ষণ করুন</button>
    </form>
  )
}

function Password() {
  const { api, notify, setSession } = useStore()
  const [f, setF] = useState({ current: '', password: '', password2: '' })
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = async (e) => {
    e.preventDefault()
    if (f.password !== f.password2) return notify('নতুন পাসওয়ার্ড দুটি মিলছে না', 'error')
    const r = await api('api/auth/password', { method: 'POST', body: { current: f.current, password: f.password } })
    if (!r.ok) return notify(r.msg, 'error')
    setSession(r.token)
    setF({ current: '', password: '', password2: '' })
    notify('পাসওয়ার্ড বদলানো হয়েছে ✓')
  }
  return (
    <form className="co-card" onSubmit={save} style={{ maxWidth: 520 }}>
      <h3>পাসওয়ার্ড বদলান</h3>
      <label>বর্তমান পাসওয়ার্ড<input type="password" value={f.current} onChange={set('current')} autoComplete="current-password" /></label>
      <label>নতুন পাসওয়ার্ড<input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></label>
      <label>নতুন পাসওয়ার্ড আবার<input type="password" value={f.password2} onChange={set('password2')} autoComplete="new-password" /></label>
      <button className="btn-sf" type="submit">বদলান</button>
    </form>
  )
}

export default function Account() {
  const { auth, customer, logout } = useStore()
  const [tab, setTab] = useState('orders')
  if (auth.role === 'admin') return <Navigate to="/admin" replace />
  if (!customer) return <Navigate to="/login?next=/account" replace />
  return (
    <div className="wrap account">
      <div className="crumb"><Link to="/">হোম</Link> › <span>আমার অ্যাকাউন্ট</span></div>
      <div className="acc-head">
        <div><h1>হ্যালো, {customer.name} 👋</h1><small className="muted">{customer.email}</small></div>
        <button className="btn-sf alt" onClick={logout}>লগআউট</button>
      </div>
      <div className="acc-tabs">
        {[['orders', '📦 আমার অর্ডার'], ['profile', '👤 প্রোফাইল'], ['password', '🔒 পাসওয়ার্ড']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'orders' && <Orders />}
      {tab === 'profile' && <Profile />}
      {tab === 'password' && <Password />}
    </div>
  )
}
