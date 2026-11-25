import { useState } from 'react'
import { useStore } from '../../lib/store'
import { money, downloadCSV } from '../../lib/format'
import { Thumb } from '../../components/ui'

export default function Stock() {
  const { db } = useStore()
  const [f, setF] = useState('all')
  const [q, setQ] = useState('')
  const low = db.settings.lowStock
  const cat = (id) => db.categories.find((c) => c.id === id)?.name || '-'
  let rows = db.products.filter((p) => (p.name + p.code).toLowerCase().includes(q.toLowerCase()))
  if (f === 'low') rows = rows.filter((p) => p.stock > 0 && p.stock <= low)
  if (f === 'out') rows = rows.filter((p) => p.stock <= 0)
  const cost = rows.reduce((s, p) => s + p.stock * p.cost, 0)
  const retail = rows.reduce((s, p) => s + p.stock * p.price, 0)

  const exp = () =>
    downloadCSV('stock-report.csv', ['Code', 'Product', 'Category', 'Unit', 'Cost', 'Price', 'Stock', 'Cost Value', 'Retail Value'],
      db.products.map((p) => [p.code, p.name, cat(p.categoryId), p.unit, p.cost, p.price, p.stock, p.stock * p.cost, p.stock * p.price]))

  return (
    <>
      <div className="pagehead"><h2>Stock Report</h2><button className="btn secondary" onClick={exp}>Export CSV</button></div>
      <div className="tablecard">
        <div className="toolbar">
          <input placeholder="Search product..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="cell" value={f} onChange={(e) => setF(e.target.value)}>
            <option value="all">সব পণ্য</option><option value="low">স্টক কম (≤{low})</option><option value="out">স্টক শেষ</option>
          </select>
        </div>
        <table>
          <thead><tr><th></th><th>Product</th><th>Category</th><th>Stock</th><th>Cost Value</th><th>Retail Value</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td><Thumb src={p.images?.[0]} size={32} /></td>
                <td>{p.name}</td><td>{cat(p.categoryId)}</td><td>{p.stock} {p.unit}</td>
                <td>{money(p.stock * p.cost)}</td><td>{money(p.stock * p.price)}</td>
                <td>{p.stock <= 0 ? <span className="pill red">স্টক শেষ</span> : p.stock <= low ? <span className="pill amber">Low stock</span> : <span className="pill">In stock</span>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="7" className="empty">No stock records</td></tr>}
          </tbody>
          {rows.length > 0 && <tfoot><tr><td colSpan="4"><b>মোট</b></td><td><b>{money(cost)}</b></td><td colSpan="2"><b>{money(retail)}</b></td></tr></tfoot>}
        </table>
      </div>
    </>
  )
}
