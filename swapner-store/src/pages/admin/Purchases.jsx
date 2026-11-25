import { useState } from 'react'
import { useStore, recordPurchase, paySupplierDue } from '../../lib/store'
import { money, fmtDateTime } from '../../lib/format'
import { Modal, FormModal } from '../../components/ui'

function PurchaseModal({ onClose }) {
  const { db, update, notify } = useStore()
  const [supplierId, setSupplierId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [lines, setLines] = useState([{ pid: '', qty: 1, cost: '' }])
  const [paid, setPaid] = useState('')
  const [method, setMethod] = useState('Cash')
  const [note, setNote] = useState('')

  const setLine = (i, patch) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)))
  const pick = (i, pid) => {
    const p = db.products.find((x) => x.id === pid)
    setLine(i, { pid, cost: p ? p.cost : '' })
  }
  const valid = lines.filter((l) => l.pid && +l.qty > 0)
  const total = valid.reduce((s, l) => s + (+l.cost || 0) * +l.qty, 0)
  const paidNum = paid === '' ? total : Math.min(+paid || 0, total)

  const save = () => {
    if (!valid.length) return notify('অন্তত একটি পণ্য নির্বাচন করুন', 'error')
    if (!supplierId && !supplierName.trim()) return notify('সরবরাহকারী নির্বাচন বা নাম লিখুন', 'error')
    const items = valid.map((l) => {
      const p = db.products.find((x) => x.id === l.pid)
      return { id: p.id, name: p.name, qty: +l.qty, cost: +l.cost || 0 }
    })
    update((d) => {
      let sid = supplierId
      const nm = supplierName.trim()
      if (!sid && nm) {
        let s = d.suppliers.find((x) => x.name.toLowerCase() === nm.toLowerCase())
        if (!s) { s = { id: crypto.randomUUID?.() || String(Date.now()), name: nm, phone: '', address: '', openingDue: 0 }; d.suppliers.push(s) }
        sid = s.id
      }
      recordPurchase(d, { supplierId: sid, supplierName: nm, items, paid: paidNum, method, note })
    })
    notify('ক্রয় সংরক্ষিত — স্টক বেড়েছে ✓')
    onClose()
  }

  return (
    <Modal title="Add Purchase / পণ্য ক্রয়" onClose={onClose} wide>
      <div className="formgrid">
        <label><span className="flabel">সরবরাহকারী</span>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— নতুন / নাম লিখুন —</option>
            {db.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {!supplierId && <label><span className="flabel">নতুন সরবরাহকারীর নাম</span><input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></label>}
        <div className="wide">
          <table className="linetable">
            <thead><tr><th>পণ্য</th><th style={{ width: 80 }}>Qty</th><th style={{ width: 110 }}>ক্রয়মূল্য</th><th style={{ width: 110 }}>মোট</th><th style={{ width: 30 }}></th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select value={l.pid} onChange={(e) => pick(i, e.target.value)}>
                      <option value="">— পণ্য —</option>
                      {db.products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                    </select>
                  </td>
                  <td><input type="number" min="1" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} /></td>
                  <td><input type="number" min="0" step="0.01" value={l.cost} onChange={(e) => setLine(i, { cost: e.target.value })} /></td>
                  <td>{money((+l.cost || 0) * (+l.qty || 0))}</td>
                  <td>{lines.length > 1 && <button type="button" className="mini del" onClick={() => setLines(lines.filter((_, k) => k !== i))}>✕</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn secondary small" onClick={() => setLines([...lines, { pid: '', qty: 1, cost: '' }])}>+ আরেকটি পণ্য</button>
        </div>
        <label><span className="flabel">পরিশোধ (৳)</span><input type="number" min="0" value={paid} placeholder={String(total)} onChange={(e) => setPaid(e.target.value)} /></label>
        <label><span className="flabel">পেমেন্ট মাধ্যম</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>{['Cash', 'bKash', 'Nagad', 'Bank'].map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label className="wide"><span className="flabel">নোট</span><input value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <div className="wide sumline">মোট: <b>{money(total)}</b> · পরিশোধ: <b>{money(paidNum)}</b> · বাকি: <b style={{ color: total - paidNum > 0 ? '#e74b5c' : undefined }}>{money(total - paidNum)}</b></div>
        <div className="modalfoot wide">
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save}>Save Purchase</button>
        </div>
      </div>
    </Modal>
  )
}

export default function Purchases() {
  const { db, update, notify } = useStore()
  const [add, setAdd] = useState(false)
  const [view, setView] = useState(null)
  const [pay, setPay] = useState(null)
  const rows = db.purchases.slice().reverse()

  return (
    <>
      <div className="pagehead"><h2>Purchase / পণ্য ক্রয়</h2><button className="btn" onClick={() => setAdd(true)}>+ Add Purchase</button></div>
      <div className="notice box">ক্রয় সেভ করলে পণ্যের স্টক নিজে থেকেই বাড়বে এবং ক্রয়মূল্য আপডেট হবে।</div>
      <div className="tablecard">
        <table>
          <thead><tr><th>Date</th><th>Supplier</th><th>Items</th><th>Amount</th><th>Paid</th><th>Due</th><th></th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{fmtDateTime(p.date)}</td><td>{p.supplier || '-'}</td><td>{p.itemsCount || 0}</td><td>{money(p.total)}</td><td>{money(p.paid)}</td>
                <td style={{ color: p.due > 0 ? '#e74b5c' : undefined }}>{money(p.due)}</td>
                <td>
                  {p.items?.length > 0 && <button className="mini" onClick={() => setView(p)}>Items</button>}{' '}
                  {p.due > 0 && p.supplierId && <button className="mini" onClick={() => setPay(p)}>Pay due</button>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="7" className="empty">No purchases recorded</td></tr>}
          </tbody>
        </table>
      </div>
      {add && <PurchaseModal onClose={() => setAdd(false)} />}
      {view && (
        <Modal title={`ক্রয়ের তালিকা — ${view.supplier}`} onClose={() => setView(null)}>
          <table className="linetable"><thead><tr><th>পণ্য</th><th>Qty</th><th>দর</th><th>মোট</th></tr></thead>
            <tbody>{view.items.map((i, k) => <tr key={k}><td>{i.name}</td><td>{i.qty}</td><td>{money(i.cost)}</td><td>{money(i.cost * i.qty)}</td></tr>)}</tbody></table>
          <div className="modalfoot"><button className="btn secondary" onClick={() => setView(null)}>Close</button></div>
        </Modal>
      )}
      {pay && (
        <FormModal
          title={`সরবরাহকারীকে পেমেন্ট — ${pay.supplier}`}
          initial={{ amount: pay.due, method: 'Cash' }}
          fields={[
            { name: 'amount', label: `পরিমাণ (বাকি ${pay.due})`, type: 'number', required: true },
            { name: 'method', label: 'মাধ্যম', type: 'select', allowEmpty: false, options: ['Cash', 'bKash', 'Nagad', 'Bank'].map((x) => ({ value: x, label: x })) },
          ]}
          onClose={() => setPay(null)}
          onSave={(v) => {
            if (v.amount <= 0 || v.amount > pay.due) return notify('পরিমাণ সঠিক নয়', 'error')
            update((d) => paySupplierDue(d, pay.supplierId, v.amount, v.method))
            notify('পেমেন্ট সংরক্ষিত')
            setPay(null)
          }}
        />
      )}
    </>
  )
}
