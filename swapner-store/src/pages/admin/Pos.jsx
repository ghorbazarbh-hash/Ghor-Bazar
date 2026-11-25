import { useMemo, useState } from 'react'
import { useStore, recordSale } from '../../lib/store'
import { money } from '../../lib/format'
import { Thumb } from '../../components/ui'
import Receipt from '../../components/Receipt'

export default function Pos() {
  const { db, update, notify } = useStore()
  const [q, setQ] = useState('')
  const [cart, setCart] = useState([])
  const [customer, setCustomer] = useState('')
  const [method, setMethod] = useState('Cash')
  const [discount, setDiscount] = useState('')
  const [paid, setPaid] = useState('')
  const [receipt, setReceipt] = useState(null)

  const active = db.products.filter((p) => p.active !== false)
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    const list = t ? active.filter((p) => (p.name + ' ' + p.code + ' ' + (p.barcode || '')).toLowerCase().includes(t)) : active
    return list.slice(0, 30)
  }, [q, db.products])

  const add = (p, qty = 1) => {
    if (p.stock <= 0) return notify('স্টক নেই', 'error')
    setCart((c) => {
      const ex = c.find((x) => x.id === p.id)
      if (ex) {
        if (ex.qty + qty > p.stock) { notify(`স্টকে মাত্র ${p.stock}টি আছে`, 'error'); return c }
        return c.map((x) => (x.id === p.id ? { ...x, qty: x.qty + qty } : x))
      }
      return [...c, { id: p.id, name: p.name, price: p.price, cost: p.cost, qty, stock: p.stock }]
    })
  }
  // scanner / Enter: exact code or barcode first, else the only/first match
  const onEnter = (e) => {
    if (e.key !== 'Enter') return
    const t = q.trim().toLowerCase()
    if (!t) return
    const p = active.find((x) => x.code?.toLowerCase() === t || (x.barcode || '').toLowerCase() === t) || (matches.length ? matches[0] : null)
    if (p) { add(p); setQ('') } else notify('পণ্য পাওয়া যায়নি', 'error')
  }
  const setQty = (id, qty) => setCart((c) => c.map((x) => (x.id === id ? { ...x, qty: Math.max(1, Math.min(qty || 1, x.stock)) } : x)))
  const setPrice = (id, price) => setCart((c) => c.map((x) => (x.id === id ? { ...x, price: +price || 0 } : x)))

  const subtotal = cart.reduce((s, x) => s + x.price * x.qty, 0)
  const disc = Math.min(+discount || 0, subtotal)
  const total = subtotal - disc
  const paidNum = method === 'Due' ? 0 : paid === '' ? total : Math.min(+paid || 0, total)
  const due = total - paidNum

  const checkout = () => {
    if (!cart.length) return notify('কার্ট খালি', 'error')
    if (due > 0 && !customer.trim()) return notify('বাকি রাখতে কাস্টমারের নাম দিন', 'error')
    const sale = update((d) =>
      recordSale(d, { items: cart, customerName: customer.trim(), method, discount: disc, paid: method === 'Due' ? 0 : paid === '' ? undefined : +paid, source: 'pos' }),
    )
    setCart([]); setCustomer(''); setDiscount(''); setPaid(''); setMethod('Cash'); setQ('')
    notify('বিক্রয় সম্পন্ন ✓')
    setReceipt(sale)
  }

  return (
    <>
      <div className="pagehead"><h2>New Sale / বিক্রয়</h2></div>
      <div className="pos">
        <div className="pos-left">
          <div className="tablecard">
            <div className="toolbar">
              <input autoFocus placeholder="পণ্যের নাম / কোড / বারকোড — স্ক্যান করে Enter চাপুন" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onEnter} />
            </div>
            <div className="pos-grid">
              {matches.map((p) => (
                <button key={p.id} className={'pos-item' + (p.stock <= 0 ? ' out' : '')} onClick={() => add(p)}>
                  <Thumb src={p.images?.[0]} size={44} fallback="▣" />
                  <span className="pn">{p.name}</span>
                  <span className="pp">{money(p.price)}</span>
                  <span className="ps">স্টক: {p.stock}</span>
                </button>
              ))}
              {!matches.length && <div className="empty">কোনো পণ্য পাওয়া যায়নি</div>}
            </div>
          </div>
        </div>

        <div className="pos-right">
          <div className="tablecard">
            <table>
              <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {cart.map((x) => (
                  <tr key={x.id}>
                    <td style={{ whiteSpace: 'normal', minWidth: 120 }}>{x.name}</td>
                    <td><input className="cell" type="number" min="0" value={x.price} onChange={(e) => setPrice(x.id, e.target.value)} /></td>
                    <td>
                      <div className="qty">
                        <button onClick={() => setQty(x.id, x.qty - 1)}>−</button>
                        <input value={x.qty} onChange={(e) => setQty(x.id, +e.target.value)} />
                        <button onClick={() => setQty(x.id, x.qty + 1)}>+</button>
                      </div>
                    </td>
                    <td>{money(x.price * x.qty)}</td>
                    <td><button className="mini del" onClick={() => setCart(cart.filter((c) => c.id !== x.id))}>✕</button></td>
                  </tr>
                ))}
                {!cart.length && <tr><td colSpan="5" className="empty">Cart is empty</td></tr>}
              </tbody>
            </table>
            <div className="pos-sum">
              <div className="row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
              <div className="row"><span>Discount (৳)</span><input className="cell" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" /></div>
              <div className="row total"><span>Total</span><b>{money(total)}</b></div>
              <div className="row">
                <span>Customer</span>
                <input list="custlist" className="cell wide" placeholder="Walk-in / নাম" value={customer} onChange={(e) => setCustomer(e.target.value)} />
                <datalist id="custlist">{db.customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
              </div>
              <div className="row">
                <span>Payment</span>
                <select className="cell wide" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="Cash">Cash</option><option value="bKash">bKash</option><option value="Nagad">Nagad</option><option value="Card">Card</option><option value="Due">Due (বাকি)</option>
                </select>
              </div>
              {method !== 'Due' && (
                <div className="row"><span>Paid (৳)</span><input className="cell" type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder={String(total)} /></div>
              )}
              {due > 0 && <div className="row due"><span>Due</span><b>{money(due)}</b></div>}
              <button className="btn big" onClick={checkout}>Complete Sale</button>
            </div>
          </div>
        </div>
      </div>
      <div className="notice">Barcode scanner: সার্চ বক্সে ক্লিক করে বারকোড স্ক্যান করুন — পণ্য নিজে থেকেই কার্টে যোগ হবে।</div>
      {receipt && <Receipt autoPrint={!!db.settings.autoPrint} sale={receipt} settings={db.settings} onClose={() => setReceipt(null)} />}
    </>
  )
}
