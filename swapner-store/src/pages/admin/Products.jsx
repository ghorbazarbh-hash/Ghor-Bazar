import { useState } from 'react'
import { useStore, uid } from '../../lib/store'
import { money, nowISO } from '../../lib/format'
import { FormModal, Thumb } from '../../components/ui'
import { Tick } from './SimplePages'

export default function Products() {
  const { db, update, notify } = useStore()
  const [edit, setEdit] = useState(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [sel, setSel] = useState(new Set())
  const low = db.settings.lowStock
  const catName = (id) => db.categories.find((c) => c.id === id)?.name || '-'

  const rows = db.products
    .filter((p) => (p.name + ' ' + p.code + ' ' + (p.barcode || '')).toLowerCase().includes(q.toLowerCase()))
    .filter((p) => !cat || p.categoryId === cat)
    .slice().reverse().slice(0, 300)

  const fields = [
    { name: 'name', label: 'পণ্যের নাম', required: true, wide: true },
    { name: 'code', label: 'পণ্য কোড', hint: 'ফাঁকা রাখলে নিজে থেকে তৈরি হবে' },
    { name: 'barcode', label: 'বারকোড (ঐচ্ছিক)' },
    { name: 'categoryId', label: 'ক্যাটাগরি', type: 'select', options: (d) => d.categories.map((c) => ({ value: c.id, label: c.name })) },
    { name: 'brandId', label: 'ব্র্যান্ড', type: 'select', options: (d) => d.brands.map((c) => ({ value: c.id, label: c.name })) },
    { name: 'unit', label: 'ইউনিট', type: 'select', allowEmpty: false, options: (d) => d.units.map((c) => ({ value: c.name, label: c.name })) },
    { name: 'stock', label: 'স্টক পরিমাণ', type: 'number', step: '1' },
    { name: 'cost', label: 'ক্রয়মূল্য (Cost)', type: 'number' },
    { name: 'price', label: 'বিক্রয়মূল্য (Sale Price)', type: 'number', required: true },
    { name: 'oldPrice', label: 'আগের দাম / MRP (কাটা দাম)', type: 'number', hint: 'বিক্রয়মূল্যের চেয়ে বেশি দিলে ছাড় ব্যাজ দেখাবে' },
    { name: 'description', label: 'বিবরণ (অনলাইন শপে দেখাবে)', type: 'textarea' },
    { name: 'images', label: 'পণ্যের ছবি (প্রথমটি মেইন ছবি)', type: 'images', max: 4 },
    { name: 'featured', type: 'checkbox', label: '', checkLabel: '⭐ হোমপেজে “বিশেষ পণ্য” হিসেবে দেখান' },
    { name: 'active', type: 'checkbox', label: '', checkLabel: 'অনলাইন শপে দৃশ্যমান (বন্ধ করলে শুধু POS-এ থাকবে)' },
  ]

  const save = (data) => {
    update((d) => {
      if (edit.row) {
        d.products = d.products.map((p) => (p.id === edit.row.id ? { ...p, ...data, demo: false } : p))
      } else {
        let code = (data.code || '').trim()
        if (!code) {
          const max = d.products.reduce((m, p) => Math.max(m, +(String(p.code).match(/(\d+)$/)?.[1] || 0)), 0)
          code = 'P' + String(max + 1).padStart(3, '0')
        }
        d.products.push({ ...data, code, id: uid(), createdAt: nowISO() })
      }
    })
    notify(edit.row ? 'পণ্য আপডেট হয়েছে' : 'পণ্য যোগ হয়েছে ✓')
    setEdit(null)
  }
  const del = (p) => {
    if (!confirm(`"${p.name}" মুছে ফেলবেন?`)) return
    update((d) => { d.products = d.products.filter((x) => x.id !== p.id) })
    notify('মুছে ফেলা হয়েছে')
  }
  const pick = (id) => setSel((s0) => { const n = new Set(s0); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allOn = rows.length > 0 && rows.every((p) => sel.has(p.id))
  const bulk = (fn, msg) => {
    update((d) => d.products.forEach((p) => { if (sel.has(p.id)) fn(p) }))
    notify(`${sel.size}টি পণ্য — ${msg}`)
    setSel(new Set())
  }
  const bulkDelete = () => {
    if (!confirm(`${sel.size}টি পণ্য মুছে ফেলবেন?`)) return
    update((d) => { d.products = d.products.filter((p) => !sel.has(p.id)) })
    notify('মুছে ফেলা হয়েছে')
    setSel(new Set())
  }

  return (
    <>
      <div className="pagehead"><h2>Products / পণ্য</h2>
        <button className="btn" onClick={() => setEdit({ row: null })}>+ Add Product</button></div>
      <div className="tablecard">
        <div className="toolbar">
          <input placeholder="Search product name, code or barcode..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="cell" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">সব ক্যাটাগরি</option>
            {db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {sel.size > 0 && (
          <div className="bulkbar">
            <b>{sel.size}টি নির্বাচিত:</b>
            <button className="btn secondary small" onClick={() => bulk((p) => { p.active = true }, 'অনলাইনে দৃশ্যমান')}>👁 দেখান</button>
            <button className="btn secondary small" onClick={() => bulk((p) => { p.active = false }, 'লুকানো হয়েছে')}>🚫 লুকান</button>
            <button className="btn secondary small" onClick={() => bulk((p) => { p.featured = true }, 'বিশেষ পণ্য করা হয়েছে')}>⭐ বিশেষ করুন</button>
            <button className="btn secondary small" onClick={() => bulk((p) => { p.featured = false }, 'বিশেষ থেকে সরানো হয়েছে')}>☆ বিশেষ বাদ</button>
            <select className="cell" value="" onChange={(e) => { const v = e.target.value; if (v) bulk((p) => { p.categoryId = v === '__none' ? '' : v }, 'ক্যাটাগরি বদলানো হয়েছে') }}>
              <option value="">ক্যাটাগরি বদলান…</option>
              {db.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn danger small" onClick={bulkDelete}>🗑 মুছুন</button>
            <button className="btn secondary small" onClick={() => setSel(new Set())}>বাতিল</button>
          </div>
        )}
        <table>
          <thead><tr><th><input type="checkbox" className="tick" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(rows.map((p) => p.id)))} /></th><th></th><th>Code</th><th>Product Name</th><th>Category</th><th>Unit</th><th>Cost</th><th>Sale Price</th><th>Stock</th><th>অনলাইনে</th><th>⭐ বিশেষ</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} style={sel.has(p.id) ? { background: '#f7f8ff' } : undefined}>
                <td><input type="checkbox" className="tick" checked={sel.has(p.id)} onChange={() => pick(p.id)} /></td>
                <td><Thumb src={p.images?.[0]} size={36} /></td>
                <td>{p.code}</td>
                <td style={{ whiteSpace: 'normal', minWidth: 160 }}>{p.name} {p.featured && <span title="Featured">⭐</span>}</td>
                <td>{catName(p.categoryId)}</td><td>{p.unit || 'pcs'}</td><td>{money(p.cost)}</td><td>{money(p.price)}</td>
                <td style={{ fontWeight: 700, color: p.stock <= 0 ? '#e74b5c' : p.stock <= low ? '#b7791f' : undefined }}>{p.stock}</td>
                <td><Tick collection="products" row={p} field="active" /></td>
                <td><Tick collection="products" row={p} field="featured" def={false} /></td>
                <td><button className="mini" onClick={() => setEdit({ row: p })}>Edit</button> <button className="mini del" onClick={() => del(p)}>Delete</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="12" className="empty">No products yet — add your first product.</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && (
        <FormModal
          wide
          title={edit.row ? 'Edit Product' : 'Add Product'}
          fields={fields}
          initial={edit.row ? { ...edit.row } : { unit: 'pcs', stock: 0, cost: 0, price: '', oldPrice: 0, images: [], featured: false, active: true, categoryId: '', brandId: '' }}
          onSave={save}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  )
}
