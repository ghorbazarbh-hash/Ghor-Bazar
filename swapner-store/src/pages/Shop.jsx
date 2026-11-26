import { Link, useSearchParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { bn } from '../lib/format'
import ProductCard from '../components/ProductCard'

export default function Shop() {
  const { db } = useStore()
  const [sp, setSp] = useSearchParams()
  const cat = sp.get('cat') || ''
  const q = (sp.get('q') || '').trim().toLowerCase()
  const sort = sp.get('sort') || 'new'
  const stockOnly = sp.get('stock') === '1'
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }) }

  const cats = db.categories.filter((c) => c.active !== false)
  let list = db.products.filter((p) => p.active !== false)
  if (cat) list = list.filter((p) => p.categoryId === cat)
  if (q) list = list.filter((p) => (p.name + ' ' + (p.description || '') + ' ' + p.code).toLowerCase().includes(q))
  if (stockOnly) list = list.filter((p) => p.stock > 0)
  list = list.slice().sort((a, b) =>
    sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  const curCat = cats.find((c) => c.id === cat)

  return (
    <div className="wrap shop">
      <div className="crumb"><Link to="/">হোম</Link> › <span>{curCat ? curCat.name : 'সব পণ্য'}</span>{q && <> › “{sp.get('q')}”</>}</div>
      <div className="shop-grid">
        <aside className="filters">
          <h4>ক্যাটাগরি</h4>
          <button className={!cat ? 'on' : ''} onClick={() => set('cat', '')}>সব পণ্য</button>
          {cats.map((c) => (
            <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => set('cat', c.id)}>
              {c.icon} {c.name} <small>({bn(db.products.filter((p) => p.active !== false && p.categoryId === c.id).length)})</small>
            </button>
          ))}
          <label className="chk-sf"><input type="checkbox" checked={stockOnly} onChange={(e) => set('stock', e.target.checked ? '1' : '')} /> শুধু স্টকে আছে</label>
        </aside>
        <div>
          <div className="shop-bar">
            <span>{bn(list.length)}টি পণ্য</span>
            <select value={sort} onChange={(e) => set('sort', e.target.value)}>
              <option value="new">নতুন আগে</option><option value="low">দাম: কম → বেশি</option><option value="high">দাম: বেশি → কম</option>
            </select>
          </div>
          {list.length ? <div className="grid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <div className="empty-sf">😕 কোনো পণ্য পাওয়া যায়নি</div>}
        </div>
      </div>
    </div>
  )
}
