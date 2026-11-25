import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from './ui'
import { tk, fmtDateTime } from '../lib/format'
import { printThermal } from '../lib/print'

const width = (settings) => (settings.receiptWidth === '58' ? 'w58' : 'w80')

// The same markup is shown as a preview in the dialog and printed from #print-root.
function Thermal({ settings, children }) {
  return (
    <div className={'thermal ' + width(settings)}>
      <div className="t-center">
        {settings.receiptLogo !== false && <img className="t-logo" src="logo-icon.png" alt="" />}
        <div className="t-shop">{settings.shopName}</div>
        <div>{settings.address}</div>
        {settings.phone && <div>ফোন: {settings.phone}</div>}
      </div>
      <hr />
      {children}
    </div>
  )
}

const Row = ({ a, b, cls = '' }) => <div className={'t-row ' + cls}><span>{a}</span><span>{b}</span></div>
const Items = ({ items }) => (
  <>
    {items.map((i, k) => (
      <div className="t-item" key={k}>
        <div className="n">{i.name}</div>
        <Row a={`${i.qty} × ${tk(i.price)}`} b={tk(i.price * i.qty)} />
      </div>
    ))}
  </>
)

function SaleBody({ sale, settings }) {
  return (
    <Thermal settings={settings}>
      <Row a="ইনভয়েস" b={sale.invoice} />
      <Row a="তারিখ" b={fmtDateTime(sale.date)} />
      <Row a="কাস্টমার" b={sale.customer || 'Walk-in'} />
      <hr />
      <Items items={sale.items} />
      <hr />
      <Row a="সাবটোটাল" b={tk(sale.subtotal)} />
      {sale.discount > 0 && <Row a="ছাড়" b={'− ' + tk(sale.discount)} />}
      {sale.delivery > 0 && <Row a="ডেলিভারি" b={tk(sale.delivery)} />}
      <Row a="সর্বমোট" b={tk(sale.total)} cls="t-big" />
      <Row a={`পরিশোধ (${sale.method})`} b={tk(sale.paid)} />
      {sale.due > 0 && <Row a="বাকি" b={tk(sale.due)} cls="t-big" />}
      <hr />
      <div className="t-center">{settings.receiptFooter || `ধন্যবাদ! আবার আসবেন`}<br />{settings.tagline}</div>
    </Thermal>
  )
}

const root = () => document.getElementById('print-root')

export default function Receipt({ sale, settings, onClose, autoPrint }) {
  useEffect(() => {
    if (!autoPrint) return
    const t = setTimeout(printThermal, 450)
    return () => clearTimeout(t)
  }, [])
  return (
    <>
      <Modal title="ইনভয়েস / Receipt" onClose={onClose}>
        <div className="receipt-preview"><SaleBody sale={sale} settings={settings} /></div>
        <div className="modalfoot">
          <button className="btn secondary" onClick={onClose}>Close</button>
          <button className="btn" onClick={printThermal}>🖨 Print ({settings.receiptWidth === '58' ? '58' : '80'}mm)</button>
        </div>
      </Modal>
      {root() && createPortal(<SaleBody sale={sale} settings={settings} />, root())}
    </>
  )
}

// Delivery slip for an online order (hand it to the courier / delivery person)
export function OrderSlip({ order, settings }) {
  const cod = order.payMethod === 'cod'
  const body = (
    <Thermal settings={settings}>
      <div className="t-center t-big">অর্ডার স্লিপ</div>
      <Row a="অর্ডার নং" b={order.no} />
      <Row a="তারিখ" b={fmtDateTime(order.createdAt)} />
      <hr />
      <div className="t-cust">
        <b>{order.customer.name}</b>
        <div>📞 {order.customer.phone}</div>
        <div>📍 {order.customer.address}</div>
        {order.zoneName && <div>এলাকা: {order.zoneName}</div>}
      </div>
      <hr />
      <Items items={order.items} />
      <hr />
      <Row a="সাবটোটাল" b={tk(order.subtotal)} />
      {order.discount > 0 && <Row a={`ছাড় (${order.coupon})`} b={'− ' + tk(order.discount)} />}
      <Row a="ডেলিভারি চার্জ" b={tk(order.delivery)} />
      <Row a="সর্বমোট" b={tk(order.total)} cls="t-big" />
      <div className="t-box">
        {cod ? <>টাকা সংগ্রহ করুন<br /><span className="t-big">{tk(order.total)}</span></> : <>✔ পরিশোধিত — {order.payLabel || order.payMethod}{order.trxId ? <><br />TrxID: {order.trxId}</> : null}</>}
      </div>
      {order.note && <div>নোট: {order.note}</div>}
    </Thermal>
  )
  return root() ? createPortal(body, root()) : null
}
