import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useStore, activePayments } from '../lib/store'
import { taka, bn } from '../lib/format'
import { Toast } from './ui'
import { Placeholder } from './ProductCard'

export function useCartLines() {
  const { db, cart } = useStore()
  const lines = cart
    .map((c) => {
      const p = db.products.find((x) => x.id === c.id && x.active !== false)
      return p ? { p, qty: Math.min(c.qty, Math.max(p.stock, 0)) || 0 } : null
    })
    .filter((l) => l && l.qty > 0)
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
  return { lines, subtotal, count: lines.reduce((s, l) => s + l.qty, 0) }
}

function CartDrawer() {
  const { db, cartOpen, setCartOpen, setCartQty } = useStore()
  const nav = useNavigate()
  const { lines, subtotal } = useCartLines()
  const s = db.settings
  const free = +s.freeDeliveryOver || 0
  const delivery = free > 0 && subtotal < free ? 1 : 0
  return (
    <>
      <div className={'drawer-bg' + (cartOpen ? ' show' : '')} onClick={() => setCartOpen(false)} />
      <aside className={'drawer' + (cartOpen ? ' show' : '')}>
        <div className="drawer-head"><h3>আপনার কার্ট</h3><button onClick={() => setCartOpen(false)} aria-label="close">✕</button></div>
        <div className="drawer-body">
          {lines.map(({ p, qty }) => (
            <div className="cl" key={p.id}>
              <div className="cl-img">{p.images?.[0] ? <img src={p.images[0]} alt="" /> : <Placeholder cat={db.categories.find((c) => c.id === p.categoryId)} />}</div>
              <div className="cl-info">
                <Link to={`/product/${p.id}`} onClick={() => setCartOpen(false)}>{p.name}</Link>
                <div className="cl-price">{taka(p.price)}</div>
                <div className="qtybox">
                  <button onClick={() => setCartQty(p.id, qty - 1)}>−</button>
                  <span>{bn(qty)}</span>
                  <button onClick={() => setCartQty(p.id, Math.min(qty + 1, p.stock))} disabled={qty >= p.stock}>+</button>
                </div>
              </div>
              <div className="cl-tot">{taka(p.price * qty)}<button className="rm" onClick={() => setCartQty(p.id, 0)}>মুছুন</button></div>
            </div>
          ))}
          {!lines.length && <div className="cart-empty"><div>🛍️</div>কার্ট খালি আছে<br /><button className="btn-sf" onClick={() => { setCartOpen(false); nav('/shop') }}>কেনাকাটা শুরু করুন</button></div>}
        </div>
        {lines.length > 0 && (
          <div className="drawer-foot">
            {free > 0 && delivery > 0 && <div className="free-hint">আরও <b>{taka(free - subtotal)}</b> এর পণ্য কিনলে <b>ফ্রি ডেলিভারি</b>!</div>}
            {free > 0 && delivery === 0 && <div className="free-hint ok">🎉 আপনি ফ্রি ডেলিভারি পাচ্ছেন</div>}
            <div className="sumrow"><span>সাবটোটাল</span><b>{taka(subtotal)}</b></div>
            <button className="btn-sf big" onClick={() => { setCartOpen(false); nav('/checkout') }}>চেকআউট করুন →</button>
          </div>
        )}
      </aside>
    </>
  )
}

export default function StoreLayout() {
  const { db, setCartOpen, auth, customer } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [q, setQ] = useState('')
  useEffect(() => { setCartOpen(false) }, [loc.pathname])
  const { count } = useCartLines()
  const s = db.settings
  const cats = db.categories.filter((c) => c.active !== false)

  const search = (e) => {
    e.preventDefault()
    nav('/shop' + (q.trim() ? '?q=' + encodeURIComponent(q.trim()) : ''))
  }

  return (
    <div className="sf">
      {s.announcement && <div className="announce">{s.announcement}</div>}
      <header className="sf-head">
        <div className="wrap head-row">
          <Link to="/" className="logo"><img src="logo.png" alt={s.shopName} /></Link>
          <form className="search" onSubmit={search}>
            <input placeholder="পণ্যের নাম লিখে খুঁজুন..." value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit" aria-label="search">🔍</button>
          </form>
          <div className="head-actions">
            {s.phone && <a href={`tel:${s.phone}`} className="callbtn"><span>📞</span><span className="ctxt">অর্ডারে কল করুন<b>{s.phone}</b></span></a>}
            {auth.role === 'admin' ? (
              <Link to="/admin" className="acctbtn"><span>⚙️</span><span className="atxt">অ্যাডমিন</span></Link>
            ) : customer ? (
              <Link to="/account" className="acctbtn"><span>👤</span><span className="atxt">{customer.name.split(' ')[0]}</span></Link>
            ) : (
              <Link to="/login" className="acctbtn"><span>👤</span><span className="atxt">লগইন</span></Link>
            )}
            <button className="cartbtn" onClick={() => setCartOpen(true)} aria-label="cart">
              🛒{count > 0 && <span className="cnt">{bn(count)}</span>}
            </button>
          </div>
        </div>
        <nav className="catnav">
          <div className="wrap catnav-in">
            <NavLink to="/" end>হোম</NavLink>
            <NavLink to="/shop" end className={() => (loc.pathname === '/shop' && !loc.search.includes('cat=') ? 'active' : '')}>সব পণ্য</NavLink>
            {cats.map((c) => (
              <Link key={c.id} to={'/shop?cat=' + c.id} className={loc.search.includes('cat=' + c.id) ? 'active' : ''}>{c.icon} {c.name}</Link>
            ))}
          </div>
        </nav>
      </header>

      <main><Outlet /></main>

      <footer className="sf-foot">
        <div className="wrap foot-grid">
          <div>
            <div className="foot-logo"><img src="logo.png" alt="" /></div>
            <p>{s.aboutText}</p>
          </div>
          <div>
            <h4>যোগাযোগ</h4>
            <p>📍 {s.address}</p>
            {s.phone && <p>📞 <a href={`tel:${s.phone}`}>{s.phone}</a></p>}
            {s.email && <p>✉️ <a href={`mailto:${s.email}`}>{s.email}</a></p>}
            {s.facebook && <p>👍 <a href={s.facebook} target="_blank" rel="noreferrer">Facebook পেজ</a></p>}
          </div>
          <div>
            <h4>দ্রুত লিংক</h4>
            <p><Link to="/shop">সব পণ্য</Link></p>
            {cats.slice(0, 5).map((c) => <p key={c.id}><Link to={'/shop?cat=' + c.id}>{c.name}</Link></p>)}
          </div>
          <div>
            <h4>পেমেন্ট</h4>
            {activePayments(s).map((m) => <p key={m.id}>{m.id === 'cod' ? '💵' : '📱'} {m.label}</p>)}
            <p>🚚 হোম ডেলিভারি</p>
          </div>
        </div>
        <div className="foot-bar">
          <div className="wrap">
            <span>© {new Date().getFullYear()} {s.shopName} — {s.tagline}</span>
            <Link to="/login" className="adminlink">Login</Link>
          </div>
        </div>
      </footer>

      {s.whatsapp && (
        <a className="wa-float" href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">💬</a>
      )}
      <CartDrawer />
      <Toast />
    </div>
  )
}
