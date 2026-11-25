import { useState } from 'react'
import { useStore, setOrderStatus, setOrderDelivery } from '../../lib/store'
import { money, fmtDateTime } from '../../lib/format'
import { Modal, StatusPill, ORDER_STATUS } from '../../components/ui'
import { OrderSlip } from '../../components/Receipt'
import { printThermal } from '../../lib/print'

const NEXT = { pending: 'confirmed', confirmed: 'shipped', shipped: 'delivered' }
const NEXT_LABEL = { pending: '✓ কনফার্ম করুন', confirmed: '🚚 শিপ করুন', shipped: '📦 ডেলিভারড করুন' }
const payName = (o) => o.payLabel || o.payMethod

export default function Orders() {
  const { db, update, notify } = useStore()
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const [dv, setDv] = useState('')
  const order = db.orders.find((o) => o.id === openId)

  const rows = db.orders
    .filter((o) => tab === 'all' || o.status === tab)
    .filter((o) => !q.trim() || (o.no + ' ' + o.customer.name + ' ' + o.customer.phone).toLowerCase().includes(q.toLowerCase()))
    .slice().reverse()
  const count = (s) => db.orders.filter((o) => o.status === s).length

  const open = (o) => { setOpenId(o.id); setDv(String(o.delivery)) }
  const change = (o, status) => {
    if (status === 'cancelled' && !confirm('অর্ডারটি বাতিল করবেন?')) return
    const res = update((d) => setOrderStatus(d, o.id, status))
    if (!res.ok) notify(res.msg, 'error')
    else notify('স্ট্যাটাস আপডেট হয়েছে ✓')
  }
  const saveDelivery = (o) => {
    const res = update((d) => setOrderDelivery(d, o.id, dv))
    if (!res.ok) notify(res.msg, 'error')
    else notify('ডেলিভারি চার্জ বদলানো হয়েছে ✓')
  }
  const canEditDelivery = order && ['pending', 'confirmed'].includes(order.status)

  return (
    <>
      <div className="pagehead no-print"><h2>Online Orders / অনলাইন অর্ডার</h2></div>
      <div className="range" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
        <button className={tab === 'all' ? 'selected' : ''} onClick={() => setTab('all')}>সব ({db.orders.length})</button>
        {Object.entries(ORDER_STATUS).map(([k, v]) => (
          <button key={k} className={tab === k ? 'selected' : ''} onClick={() => setTab(k)}>{v.label} ({count(k)})</button>
        ))}
      </div>
      <div className="notice box">
        গ্রাহকের অর্ডার এখানে নিজে থেকেই চলে আসে (প্রতি ১০ সেকেন্ডে আপডেট হয়)। কনফার্ম করলে স্টক কমবে, ডেলিভারড হলে অর্ডারটি Sale List-এ বিক্রি হিসেবে যোগ হবে (লাভ-ক্ষতির হিসাবে আসবে)। বাতিল করলে স্টক ফেরত আসবে।
      </div>
      <div className="tablecard">
        <div className="toolbar"><input placeholder="অর্ডার নম্বর / নাম / ফোন দিয়ে খুঁজুন..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <table>
          <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td><b>{o.no}</b></td><td>{fmtDateTime(o.createdAt)}</td>
                <td>{o.customer.name}<br /><small className="muted">{o.customer.phone}</small></td>
                <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td><td>{money(o.total)}</td>
                <td>{payName(o)}{o.trxId && <><br /><small className="muted">TrxID: {o.trxId}</small></>}</td>
                <td><StatusPill s={o.status} /></td>
                <td><button className="mini" onClick={() => open(o)}>View</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="8" className="empty">কোনো অর্ডার নেই</td></tr>}
          </tbody>
        </table>
      </div>

      {order && (
        <Modal title={`অর্ডার ${order.no}`} onClose={() => setOpenId(null)} wide>
          <div className="order-detail">
            <div className="od-grid">
              <div>
                <h4>গ্রাহক</h4>
                <p><b>{order.customer.name}</b><br />📞 {order.customer.phone}<br />📍 {order.customer.address}</p>
                {order.note && <p className="muted">নোট: {order.note}</p>}
              </div>
              <div>
                <h4>পেমেন্ট ও ডেলিভারি</h4>
                <p>{payName(order)}{order.trxId && <><br />TrxID: <b>{order.trxId}</b></>}</p>
                <p>এলাকা: {order.zoneName || '-'}<br />স্ট্যাটাস: <StatusPill s={order.status} /></p>
              </div>
            </div>
            <table className="linetable">
              <thead><tr><th>পণ্য</th><th>দাম</th><th>Qty</th><th>মোট</th></tr></thead>
              <tbody>{order.items.map((i, k) => <tr key={k}><td>{i.name}</td><td>{money(i.price)}</td><td>{i.qty}</td><td>{money(i.price * i.qty)}</td></tr>)}</tbody>
            </table>
            {canEditDelivery && (
              <div className="dvedit">
                <span>এই অর্ডারের ডেলিভারি চার্জ (৳):</span>
                <input className="cell" type="number" min="0" value={dv} onChange={(e) => setDv(e.target.value)} />
                <button className="btn secondary small" onClick={() => saveDelivery(order)} disabled={+dv === order.delivery}>চার্জ বদলান</button>
              </div>
            )}
            <div className="od-tot">
              <div><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
              {order.discount > 0 && <div><span>ছাড় ({order.coupon})</span><span>- {money(order.discount)}</span></div>}
              <div><span>ডেলিভারি চার্জ</span><span>{money(order.delivery)}</span></div>
              <div className="big"><span>মোট</span><span>{money(order.total)}</span></div>
            </div>
            <div className="od-hist">
              {order.history.map((h, k) => <span key={k}><StatusPill s={h.status} /> {fmtDateTime(h.at)}</span>)}
            </div>
          </div>
          <div className="modalfoot">
            <button className="btn secondary" onClick={() => setOpenId(null)}>Close</button>
            <button className="btn secondary" onClick={printThermal}>🖨 অর্ডার স্লিপ</button>
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <>
                <button className="btn danger" onClick={() => change(order, 'cancelled')}>অর্ডার বাতিল</button>
                <button className="btn" onClick={() => change(order, NEXT[order.status])}>{NEXT_LABEL[order.status]}</button>
              </>
            )}
          </div>
          <OrderSlip order={order} settings={db.settings} />
        </Modal>
      )}
    </>
  )
}
