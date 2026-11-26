import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { taka, bn } from '../lib/format'
import ProductCard, { Placeholder } from '../components/ProductCard'

export default function ProductPage() {
  const { id } = useParams()
  const { db, addToCart } = useStore()
  const nav = useNavigate()
  const [img, setImg] = useState(0)
  const [qty, setQty] = useState(1)
  const p = db.products.find((x) => x.id === id && x.active !== false)
  if (!p) return <div className="wrap empty-sf" style={{ margin: '60px auto' }}>পণ্যটি পাওয়া যায়নি। <Link to="/shop">সব পণ্য দেখুন</Link></div>

  const cat = db.categories.find((c) => c.id === p.categoryId)
  const brand = db.brands.find((b) => b.id === p.brandId)
  const off = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0
  const out = p.stock <= 0
  const related = db.products.filter((x) => x.active !== false && x.id !== p.id && x.categoryId === p.categoryId).slice(0, 4)
  const s = db.settings
  const wa = s.whatsapp && `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(`আসসালামু আলাইকুম, আমি "${p.name}" সম্পর্কে জানতে চাই।`)}`
  const imgs = p.images || []

  return (
    <div className="wrap pdp">
      <div className="crumb"><Link to="/">হোম</Link> › {cat && <><Link to={'/shop?cat=' + cat.id}>{cat.name}</Link> › </>}<span>{p.name}</span></div>
      <div className="pdp-grid">
        <div className="gallery">
          <div className="g-main">{imgs[img] ? <img src={imgs[img]} alt={p.name} /> : <Placeholder cat={cat} />}{off > 0 && !out && <span className="tag off">{bn(off)}% ছাড়</span>}</div>
          {imgs.length > 1 && <div className="g-thumbs">{imgs.map((src, i) => <button key={i} className={i === img ? 'on' : ''} onClick={() => setImg(i)}><img src={src} alt="" /></button>)}</div>}
        </div>
        <div className="pdp-info">
          <h1>{p.name}</h1>
          <div className="meta">
            {brand && <span>ব্র্যান্ড: <b>{brand.name}</b></span>}
            <span>কোড: <b>{p.code}</b></span>
          </div>
          <div className="pdp-price"><b>{taka(p.price)}</b>{off > 0 && <s>{taka(p.oldPrice)}</s>}{off > 0 && <em>সাশ্রয় {taka(p.oldPrice - p.price)}</em>}</div>
          <div className={'stockline ' + (out ? 'out' : '')}>{out ? '❌ স্টক শেষ' : p.stock <= s.lowStock ? `⚠️ মাত্র ${bn(p.stock)}টি বাকি` : '✅ স্টকে আছে'}</div>
          {!out && (
            <div className="buy-row">
              <div className="qtybox lg">
                <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span>{bn(qty)}</span><button onClick={() => setQty(Math.min(p.stock, qty + 1))}>+</button>
              </div>
              <button className="btn-sf" onClick={() => addToCart(p.id, qty)}>🛒 কার্টে যোগ করুন</button>
              <button className="btn-sf alt" onClick={() => { addToCart(p.id, qty, false); nav('/checkout') }}>এখনই কিনুন</button>
            </div>
          )}
          {wa && <a className="wa-link" href={wa} target="_blank" rel="noreferrer">💬 WhatsApp-এ জিজ্ঞাসা করুন</a>}
          <ul className="perks"><li>🚚 হোম ডেলিভারি</li><li>💵 ক্যাশ অন ডেলিভারি</li><li>🔁 সহজ রিটার্ন</li></ul>
          {p.description && <div className="desc"><h3>পণ্যের বিবরণ</h3><p>{p.description}</p></div>}
        </div>
      </div>
      {related.length > 0 && (
        <section className="sec">
          <div className="sec-title"><h2><span className="orn">❖</span> একই ধরনের পণ্য <span className="orn">❖</span></h2></div>
          <div className="grid">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </div>
  )
}
