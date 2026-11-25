import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { taka, bn } from '../lib/format'
import { Tracker } from './Account'

export default function OrderDone() {
  const { no } = useParams()
  const { db, api, customer } = useStore()
  const [o, setO] = useState(undefined)
  const s = db.settings
  useEffect(() => { api(`api/orders/${no}`).then((r) => setO(r.ok ? r.order : null)) }, [no])

  if (o === undefined) return <div className="wrap empty-sf" style={{ margin: '60px auto' }}>লোড হচ্ছে…</div>
  if (!o) return <div className="wrap empty-sf" style={{ margin: '60px auto' }}>অর্ডার পাওয়া যায়নি। <Link to={customer ? '/account' : '/login'}>{customer ? 'আমার অর্ডার' : 'লগইন করুন'}</Link></div>

  // optional shortcut: tell the shop on WhatsApp too
  const waText = `আসসালামু আলাইকুম, আমি অর্ডার ${o.no} করেছি। মোট ${o.total} টাকা।`
  const waUrl = s.whatsapp ? `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(waText)}` : ''

  return (
    <div className="wrap done">
      <div className="done-card">
        <div className="tick">✓</div>
        <h1>ধন্যবাদ, {o.customer.name}!</h1>
        <p>আপনার অর্ডার নম্বর <b>{o.no}</b></p>
        <p className="muted">আমরা শীঘ্রই অর্ডার কনফার্ম করব। অর্ডারের অবস্থা “আমার অ্যাকাউন্ট” থেকে দেখতে পারবেন।{s.phone && <> প্রয়োজনে কল করুন: <a href={`tel:${s.phone}`}>{s.phone}</a></>}</p>
        <Tracker order={o} />
        <div className="done-sum">
          {o.items.map((i, k) => <div key={k}><span>{i.name} × {bn(i.qty)}</span><b>{taka(i.price * i.qty)}</b></div>)}
          {o.discount > 0 && <div className="green"><span>ছাড় ({o.coupon})</span><b>− {taka(o.discount)}</b></div>}
          <div><span>ডেলিভারি ({o.zoneName})</span><b>{o.delivery ? taka(o.delivery) : 'ফ্রি'}</b></div>
          <div className="t"><span>সর্বমোট</span><b>{taka(o.total)}</b></div>
          <div><span>পেমেন্ট</span><b>{o.payLabel || o.payMethod}{o.trxId ? ` (TrxID: ${o.trxId})` : ''}</b></div>
          <div><span>ডেলিভারি ঠিকানা</span><b style={{ textAlign: 'right', maxWidth: 260 }}>{o.customer.address}</b></div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/account" className="btn-sf alt">আমার অর্ডার</Link>
          <Link to="/shop" className="btn-sf">আরও কেনাকাটা করুন</Link>
          {waUrl && <a className="btn-sf wa" href={waUrl} target="_blank" rel="noreferrer">💬 WhatsApp-এ জানান</a>}
        </div>
      </div>
    </div>
  )
}
