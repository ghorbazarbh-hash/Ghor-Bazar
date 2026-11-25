import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore, deliveryFor, activeZones, activePayments } from '../lib/store'
import { taka, bn } from '../lib/format'
import { useCartLines } from '../components/StoreLayout'

const PHONE_RE = /^(?:\+?88)?01[3-9]\d{8}$/

export default function Checkout() {
  const { db, auth, customer, api, notify, clearCart, reloadPublic } = useStore()
  const nav = useNavigate()
  const { lines, subtotal } = useCartLines()
  const s = db.settings
  const zones = activeZones(s)
  const pays = activePayments(s)

  const [f, setF] = useState({ name: customer?.name || '', phone: customer?.phone || '', address: customer?.address || '', note: '' })
  const [zoneId, setZoneId] = useState(zones[0]?.id || '')
  const [payId, setPayId] = useState(pays[0]?.id || '')
  const [trx, setTrx] = useState('')
  const [code, setCode] = useState('')
  const [coupon, setCoupon] = useState(null) // { code, discount }
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  // keep the selected options valid if the shop owner changes them meanwhile
  useEffect(() => { if (!zones.some((z) => z.id === zoneId)) setZoneId(zones[0]?.id || '') }, [zones.map((z) => z.id).join()])
  useEffect(() => { if (!pays.some((p) => p.id === payId)) setPayId(pays[0]?.id || '') }, [pays.map((p) => p.id).join()])

  // the server decides the discount; re-check when the cart changes
  useEffect(() => {
    if (!coupon) return
    let dead = false
    api('api/coupon', { method: 'POST', body: { code: coupon.code, subtotal } }).then((r) => {
      if (dead) return
      if (r.ok) setCoupon({ code: r.code, discount: r.discount })
      else { setCoupon(null); notify(r.msg, 'error') }
    })
    return () => { dead = true }
  }, [subtotal])

  const applyCoupon = async () => {
    if (!code.trim()) return
    const r = await api('api/coupon', { method: 'POST', body: { code, subtotal } })
    if (!r.ok) { setCoupon(null); return notify(r.msg, 'error') }
    setCoupon({ code: r.code, discount: r.discount })
    notify(`${r.msg} — ${taka(r.discount)} ছাড়!`)
  }

  const discount = coupon?.discount || 0
  const delivery = deliveryFor(s, subtotal - discount, zoneId)
  const total = subtotal - discount + (delivery || 0)
  const pay = pays.find((p) => p.id === payId)

  const submit = async (e) => {
    e.preventDefault()
    if (!lines.length) return notify('কার্ট খালি', 'error')
    if (f.name.trim().length < 2) return notify('আপনার নাম লিখুন', 'error')
    if (!PHONE_RE.test(f.phone.trim().replace(/[\s-]/g, ''))) return notify('সঠিক মোবাইল নম্বর দিন (যেমন 01XXXXXXXXX)', 'error')
    if (f.address.trim().length < 8) return notify('সম্পূর্ণ ঠিকানা লিখুন', 'error')
    if (!zoneId) return notify('ডেলিভারি এলাকা নির্বাচন করুন', 'error')
    if (!pay) return notify('পেমেন্ট পদ্ধতি নির্বাচন করুন', 'error')
    if (pay.needsTrx && trx.trim().length < 6) return notify('পেমেন্টের TrxID দিন', 'error')
    setBusy(true)
    const r = await api('api/orders', {
      method: 'POST',
      body: {
        customer: { name: f.name, phone: f.phone, address: f.address }, items: lines.map((l) => ({ id: l.p.id, qty: l.qty })),
        zoneId, payMethod: payId, trxId: trx, couponCode: coupon?.code || '', note: f.note,
      },
    })
    setBusy(false)
    if (!r.ok) {
      if (r.status === 401) return nav('/login?next=/checkout')
      reloadPublic()
      return notify(r.msg || 'অর্ডার হয়নি, আবার চেষ্টা করুন', 'error')
    }
    clearCart()
    nav(`/order/${r.order.no}`)
  }

  if (!lines.length)
    return (
      <div className="wrap empty-sf" style={{ margin: '60px auto' }}>
        <div style={{ fontSize: 48 }}>🛍️</div>আপনার কার্ট খালি।<br /><br /><Link className="btn-sf" to="/shop">কেনাকাটা করুন</Link>
      </div>
    )

  if (!customer)
    return (
      <div className="wrap checkout">
        <div className="crumb"><Link to="/">হোম</Link> › <span>চেকআউট</span></div>
        <div className="done-card" style={{ maxWidth: 520, margin: '20px auto' }}>
          <div style={{ fontSize: 46 }}>🔐</div>
          <h2 style={{ color: 'var(--navy)', margin: '6px 0' }}>অর্ডার করতে লগইন করুন</h2>
          <p className="muted" style={{ fontSize: 14 }}>
            {auth.role === 'admin' ? 'আপনি অ্যাডমিন হিসেবে লগইন আছেন। অর্ডার করতে কাস্টমার অ্যাকাউন্ট লাগবে।' : 'লগইন করলে আপনি অর্ডারের অবস্থা দেখতে ও পরের বার দ্রুত অর্ডার করতে পারবেন। আপনার কার্ট সংরক্ষিত থাকবে।'}
          </p>
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            <Link className="btn-sf big" to="/login?next=/checkout">লগইন করুন</Link>
            <Link className="btn-sf alt big" to="/register?next=/checkout">নতুন অ্যাকাউন্ট খুলুন</Link>
          </div>
        </div>
      </div>
    )

  return (
    <div className="wrap checkout">
      <div className="crumb"><Link to="/">হোম</Link> › <span>চেকআউট</span></div>
      <form className="co-grid" onSubmit={submit}>
        <div className="co-card">
          <h3>ডেলিভারির তথ্য</h3>
          <label>আপনার নাম *<input value={f.name} onChange={set('name')} placeholder="পূর্ণ নাম" /></label>
          <label>মোবাইল নম্বর *<input value={f.phone} onChange={set('phone')} placeholder="01XXXXXXXXX" inputMode="tel" /></label>
          <label>সম্পূর্ণ ঠিকানা *<textarea rows="3" value={f.address} onChange={set('address')} placeholder="গ্রাম/মহল্লা, থানা, জেলা" /></label>
          <label>অর্ডার নোট (ঐচ্ছিক)<input value={f.note} onChange={set('note')} placeholder="বিশেষ কোনো নির্দেশনা" /></label>

          <h3 style={{ marginTop: 20 }}>ডেলিভারি এলাকা</h3>
          {zones.length ? (
            <div className="pay-opts">
              {zones.map((z) => (
                <label key={z.id} className={'pay' + (zoneId === z.id ? ' on' : '')}>
                  <input type="radio" name="zone" checked={zoneId === z.id} onChange={() => setZoneId(z.id)} />
                  <b>{z.name}</b>
                  <small>ডেলিভারি চার্জ: {deliveryFor(s, subtotal - discount, z.id) === 0 ? 'ফ্রি 🎉' : taka(z.charge)}</small>
                </label>
              ))}
            </div>
          ) : <div className="pay-box">এই মুহূর্তে অনলাইন ডেলিভারি বন্ধ আছে।{s.phone ? ` অর্ডার করতে কল করুন: ${s.phone}` : ''}</div>}
          {+s.freeDeliveryOver > 0 && <small className="muted" style={{ display: 'block', marginTop: 6 }}>{taka(s.freeDeliveryOver)} বা তার বেশি অর্ডারে ডেলিভারি ফ্রি।</small>}

          <h3 style={{ marginTop: 20 }}>পেমেন্ট পদ্ধতি</h3>
          {pays.length ? (
            <div className="pay-opts">
              {pays.map((p) => (
                <label key={p.id} className={'pay' + (payId === p.id ? ' on' : '')}>
                  <input type="radio" name="pay" checked={payId === p.id} onChange={() => setPayId(p.id)} />
                  <b>{p.id === 'cod' ? '💵 ' : '📱 '}{p.label}</b>
                  {p.note && <small>{p.note}</small>}
                </label>
              ))}
            </div>
          ) : <div className="pay-box">এই মুহূর্তে অনলাইন পেমেন্ট বন্ধ আছে।{s.phone ? ` কল করুন: ${s.phone}` : ''}</div>}
          {pay?.needsTrx && (
            <div className="pay-box">
              {pay.number ? <p>এই নম্বরে <b>{taka(total)}</b> পাঠান: <b className="num">{pay.number}</b></p> : <p>পেমেন্টের নম্বর পেতে আমাদের কল করুন{s.phone ? `: ${s.phone}` : ''}।</p>}
              <label>Transaction ID (TrxID) *<input value={trx} onChange={(e) => setTrx(e.target.value)} placeholder="যেমন 8N7A6D5..." /></label>
            </div>
          )}
        </div>

        <div className="co-card sum">
          <h3>অর্ডার সারসংক্ষেপ</h3>
          {lines.map(({ p, qty }) => (
            <div className="sum-line" key={p.id}><span>{p.name} <small>× {bn(qty)}</small></span><b>{taka(p.price * qty)}</b></div>
          ))}
          <div className="coupon">
            <input placeholder="কুপন কোড" value={code} onChange={(e) => setCode(e.target.value)} />
            <button type="button" onClick={applyCoupon}>প্রয়োগ</button>
          </div>
          <div className="sum-line"><span>সাবটোটাল</span><b>{taka(subtotal)}</b></div>
          {discount > 0 && <div className="sum-line green"><span>কুপন ছাড় ({coupon.code})</span><b>− {taka(discount)}</b></div>}
          <div className="sum-line"><span>ডেলিভারি চার্জ</span><b>{delivery === null ? '—' : delivery ? taka(delivery) : 'ফ্রি'}</b></div>
          <div className="sum-line total"><span>সর্বমোট</span><b>{taka(total)}</b></div>
          <button className="btn-sf big" type="submit" disabled={busy || !zones.length || !pays.length}>{busy ? 'অপেক্ষা করুন…' : 'অর্ডার কনফার্ম করুন'}</button>
        </div>
      </form>
    </div>
  )
}
