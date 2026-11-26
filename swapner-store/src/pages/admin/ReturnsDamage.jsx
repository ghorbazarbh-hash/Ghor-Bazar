import { useState } from 'react'
import { useStore, addReturn, addDamage } from '../../lib/store'
import { money, fmtDateTime } from '../../lib/format'
import { FormModal } from '../../components/ui'

const productOptions = (db) => db.products.map((p) => ({ value: p.id, label: `${p.name} (${p.code || '-'}) — স্টক ${p.stock}` }))

export function Returns() {
  const { db, update, notify } = useStore()
  const [open, setOpen] = useState(false)
  const rows = db.returns.slice().reverse()
  return (
    <>
      <div className="pagehead"><h2>Returns / রিটার্ন</h2><button className="btn" onClick={() => setOpen(true)}>+ Add Return</button></div>
      <div className="notice box">গ্রাহক পণ্য ফেরত দিলে এখানে লিখুন। “স্টকে ফেরত” টিক দিলে পণ্য আবার স্টকে যোগ হবে, আর রিফান্ডের টাকা লাভ থেকে কমবে।</div>
      <div className="tablecard">
        <table>
          <thead><tr><th>Date</th><th>Product</th><th>Invoice</th><th>Qty</th><th>Refund</th><th>Restock</th><th>Reason</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{fmtDateTime(r.date)}</td><td>{r.name}</td><td>{r.invoice || '-'}</td><td>{r.qty}</td><td>{money(r.amount)}</td><td>{r.restock ? 'হ্যাঁ' : 'না'}</td><td>{r.reason || '-'}</td></tr>
            ))}
            {!rows.length && <tr><td colSpan="7" className="empty">কোনো রিটার্ন নেই</td></tr>}
          </tbody>
        </table>
      </div>
      {open && (
        <FormModal
          title="Add Return"
          initial={{ qty: 1, restock: true }}
          fields={[
            { name: 'productId', label: 'পণ্য', type: 'select', options: productOptions, required: true, wide: true },
            { name: 'qty', label: 'পরিমাণ', type: 'number', required: true, step: '1' },
            { name: 'amount', label: 'রিফান্ড (৳)', type: 'number', required: true },
            { name: 'invoice', label: 'ইনভয়েস নম্বর (ঐচ্ছিক)' },
            { name: 'reason', label: 'কারণ' },
            { name: 'restock', type: 'checkbox', label: '', checkLabel: 'পণ্যটি আবার স্টকে যোগ করুন' },
          ]}
          onClose={() => setOpen(false)}
          onSave={(v) => {
            if (v.qty <= 0) return notify('পরিমাণ দিন', 'error')
            update((d) => addReturn(d, v))
            notify('রিটার্ন সংরক্ষিত')
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

export function Damage() {
  const { db, update, notify } = useStore()
  const [open, setOpen] = useState(false)
  const rows = db.damages.slice().reverse()
  return (
    <>
      <div className="pagehead"><h2>Damage & Wastage / নষ্ট পণ্য</h2><button className="btn" onClick={() => setOpen(true)}>+ Add Damage</button></div>
      <div className="notice box">নষ্ট/ভাঙা/মেয়াদোত্তীর্ণ পণ্য লিখলে স্টক কমে যাবে এবং ক্রয়মূল্য অনুযায়ী ক্ষতি লাভ থেকে বাদ যাবে।</div>
      <div className="tablecard">
        <table>
          <thead><tr><th>Date</th><th>Product</th><th>Qty</th><th>Loss</th><th>Reason</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{fmtDateTime(r.date)}</td><td>{r.name}</td><td>{r.qty}</td><td>{money(r.cost * r.qty)}</td><td>{r.reason || '-'}</td></tr>
            ))}
            {!rows.length && <tr><td colSpan="5" className="empty">কোনো ড্যামেজ নেই</td></tr>}
          </tbody>
        </table>
      </div>
      {open && (
        <FormModal
          title="Add Damage"
          initial={{ qty: 1 }}
          fields={[
            { name: 'productId', label: 'পণ্য', type: 'select', options: productOptions, required: true, wide: true },
            { name: 'qty', label: 'পরিমাণ', type: 'number', required: true, step: '1' },
            { name: 'reason', label: 'কারণ' },
          ]}
          onClose={() => setOpen(false)}
          onSave={(v) => {
            const p = db.products.find((x) => x.id === v.productId)
            if (v.qty <= 0 || (p && v.qty > p.stock)) return notify('পরিমাণ সঠিক নয় (স্টকের বেশি)', 'error')
            update((d) => addDamage(d, v))
            notify('ড্যামেজ সংরক্ষিত')
            setOpen(false)
          }}
        />
      )}
    </>
  )
}
