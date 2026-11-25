import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { taka, bn } from '../lib/format'

export function Placeholder({ cat }) {
  return (
    <div className="ph">
      <span>{cat?.icon || '🏠'}</span>
    </div>
  )
}

export default function ProductCard({ p }) {
  const { db, addToCart } = useStore()
  const cat = db.categories.find((c) => c.id === p.categoryId)
  const off = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0
  const out = p.stock <= 0
  return (
    <div className={'pc' + (out ? ' out' : '')}>
      <Link to={`/product/${p.id}`} className="pc-img">
        {p.images?.[0] ? <img src={p.images[0]} alt={p.name} loading="lazy" /> : <Placeholder cat={cat} />}
        {off > 0 && !out && <span className="tag off">{bn(off)}% ছাড়</span>}
        {out && <span className="tag soldout">স্টক শেষ</span>}
      </Link>
      <div className="pc-body">
        {cat && <div className="pc-cat">{cat.name}</div>}
        <Link to={`/product/${p.id}`} className="pc-name">{p.name}</Link>
        <div className="pc-price">
          <b>{taka(p.price)}</b>
          {off > 0 && <s>{taka(p.oldPrice)}</s>}
        </div>
        {!out && p.stock <= db.settings.lowStock && <div className="pc-low">মাত্র {bn(p.stock)}টি বাকি</div>}
        <button className="add" disabled={out} onClick={() => addToCart(p.id)}>
          {out ? 'স্টক শেষ' : '🛒 কার্টে যোগ করুন'}
        </button>
      </div>
    </div>
  )
}
