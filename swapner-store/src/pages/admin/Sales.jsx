import { useState } from 'react'
import { useStore, collectSaleDue, deleteSale } from '../../lib/store'
import { money, fmtDateTime, RANGES, rangeBounds, inRange, downloadCSV } from '../../lib/format'
import { FormModal } from '../../components/ui'
import Receipt from '../../components/Receipt'

export function SalesList() {
  const { db, update, notify } = useStore()
  const [range, setRange] = useState('All')
  const [q, setQ] = useState('')
  const [view, setView] = useState(null)
  const b = rangeBounds(range)
  const rows = db.sales
    .filter((s) => inRange(s.date, b))
    .filter((s) => !q.trim() || (s.invoice + ' ' + s.customer).toLowerCase().includes(q.toLowerCase()))
    .slice()
    .reverse()
  const total = rows.reduce((a, s) => a + s.total, 0)

  const del = (s) => {
    if (!confirm(`ইনভয়েস ${s.invoice} মুছবেন? (স্টক ফেরত আসবে)`)) return
    update((d) => deleteSale(d, s.id))
    notify('ইনভয়েস মুছে ফেলা হয়েছে')
  }
  const exp = () =>
    downloadCSV('sales.csv', ['Invoice', 'Date', 'Customer', 'Source', 'Payment', 'Total', 'Paid', 'Due'],
      rows.map((s) => [s.invoice, s.date, s.customer, s.source, s.method, s.total, s.paid, s.due]))

  return (
    <>
      <div className="pagehead"><h2>Sales List</h2><button className="btn secondary" onClick={exp}>Export CSV</button></div>
      <div className="tablecard">
        <div className="toolbar">
          <input placeholder="Invoice / customer search..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={range} onChange={(e) => setRange(e.target.value)} className="cell">{RANGES.map((r) => <option key={r}>{r}</option>)}</select>
        </div>
        <table>
          <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Source</th><th>Payment</th><th>Amount</th><th>Due</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.invoice}</td><td>{fmtDateTime(s.date)}</td><td>{s.customer || 'Walk-in'}</td>
                <td><span className="pill" style={s.source === 'online' ? { background: '#e0f6fb', color: '#0e7490' } : undefined}>{s.source === 'online' ? 'Online' : 'POS'}</span></td>
                <td>{s.method}</td><td>{money(s.total)}</td>
                <td style={{ color: s.due > 0 ? '#e74b5c' : undefined }}>{money(s.due)}</td>
                <td><button className="mini" onClick={() => setView(s)}>View</button> <button className="mini del" onClick={() => del(s)}>Delete</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="8" className="empty">No sales recorded</td></tr>}
          </tbody>
          {rows.length > 0 && <tfoot><tr><td colSpan="5"><b>Total ({rows.length} invoices)</b></td><td colSpan="3"><b>{money(total)}</b></td></tr></tfoot>}
        </table>
      </div>
      {view && <Receipt sale={view} settings={db.settings} onClose={() => setView(null)} />}
    </>
  )
}

export function SaleAdjust() {
  const { db, update, notify } = useStore()
  const [pay, setPay] = useState(null)
  const rows = db.sales.filter((s) => s.due > 0).slice().reverse()
  return (
    <>
      <div className="pagehead"><h2>Sale Adjust / বাকি আদায়</h2></div>
      <div className="notice box">যেসব ইনভয়েসে বাকি আছে সেগুলো এখানে দেখাবে। টাকা পেলে “Collect” চেপে আদায় লিখুন।</div>
      <div className="tablecard">
        <table>
          <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Total</th><th>Paid</th><th>Due</th><th></th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.invoice}</td><td>{fmtDateTime(s.date)}</td><td>{s.customer || 'Walk-in'}</td><td>{money(s.total)}</td><td>{money(s.paid)}</td>
                <td style={{ color: '#e74b5c' }}>{money(s.due)}</td>
                <td><button className="mini" onClick={() => setPay(s)}>Collect</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="7" className="empty">কোনো বাকি নেই ✓</td></tr>}
          </tbody>
        </table>
      </div>
      {pay && (
        <FormModal
          title={`বাকি আদায় — ${pay.invoice}`}
          initial={{ amount: pay.due, method: 'Cash' }}
          fields={[
            { name: 'amount', label: `পরিমাণ (সর্বোচ্চ ${pay.due})`, type: 'number', required: true },
            { name: 'method', label: 'পেমেন্ট মাধ্যম', type: 'select', allowEmpty: false, options: ['Cash', 'bKash', 'Nagad', 'Card'].map((x) => ({ value: x, label: x })) },
          ]}
          onClose={() => setPay(null)}
          onSave={(v) => {
            if (v.amount <= 0 || v.amount > pay.due) return notify('পরিমাণ সঠিক নয়', 'error')
            update((d) => collectSaleDue(d, pay.id, v.amount, v.method))
            notify('আদায় সংরক্ষিত')
            setPay(null)
          }}
        />
      )}
    </>
  )
}
