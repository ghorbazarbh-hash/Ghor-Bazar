import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { THEME_BG } from '../lib/theme'
import ProductCard from '../components/ProductCard'

function BLink({ to, className, children, style }) {
  if (/^https?:/.test(to || '')) return <a href={to} className={className} style={style} target="_blank" rel="noreferrer">{children}</a>
  return <Link to={to || '/shop'} className={className} style={style}>{children}</Link>
}

function Deco() {
  // decorative house + bag outline, echoing the logo
  return (
    <svg className="deco" viewBox="0 0 300 220" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M20 110 L150 20 L280 110" />
      <path d="M60 100 V200 H240 V100" />
      <path d="M115 90 q35-55 70 0" />
      <rect x="105" y="90" width="90" height="90" rx="8" />
      <rect x="140" y="120" width="20" height="20" />
      <path d="M236 28 a22 22 0 1 0 22 30 a17 17 0 1 1 -22 -30z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function Hero({ banners }) {
  const [i, setI] = useState(0)
  const [pause, setPause] = useState(false)
  const n = banners.length
  useEffect(() => {
    if (n < 2 || pause) return
    const t = setInterval(() => setI((x) => (x + 1) % n), 5500)
    return () => clearInterval(t)
  }, [n, pause])
  useEffect(() => { if (i >= n) setI(0) }, [n, i])
  if (!n) return null
  return (
    <section className="hero wrap" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
      <div className="hero-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {banners.map((b) => {
          const imgOnly = b.image && !b.title && !b.subtitle
          return (
            <div className="slide" key={b.id} style={{ background: b.image ? `#10133e url(${b.image}) center/cover no-repeat` : THEME_BG[b.theme] || THEME_BG.navy }}>
              {imgOnly ? <BLink to={b.link} className="slide-full" /> : (
                <>
                  {b.image && <div className="shade" />}
                  {!b.image && <Deco />}
                  <div className="slide-text">
                    <h2>{b.title}</h2>
                    {b.subtitle && <p>{b.subtitle}</p>}
                    {b.buttonText && <BLink to={b.link} className="btn-sf light">{b.buttonText} →</BLink>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      {n > 1 && (
        <>
          <button className="arrow l" onClick={() => setI((i - 1 + n) % n)} aria-label="prev">‹</button>
          <button className="arrow r" onClick={() => setI((i + 1) % n)} aria-label="next">›</button>
          <div className="dots">{banners.map((b, k) => <button key={b.id} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={'slide ' + (k + 1)} />)}</div>
        </>
      )}
    </section>
  )
}

const SecTitle = ({ children, to, more }) => (
  <div className="sec-title">
    <h2><span className="orn">❖</span> {children} <span className="orn">❖</span></h2>
    {to && <Link to={to}>{more || 'সব দেখুন'} →</Link>}
  </div>
)

export default function Home() {
  const { db } = useStore()
  const active = (b) => b.active !== false
  const byOrder = (a, b) => (a.order || 0) - (b.order || 0)
  const hero = db.banners.filter((b) => active(b) && b.position === 'hero').sort(byOrder)
  const promo = db.banners.filter((b) => active(b) && b.position === 'promo').sort(byOrder)
  const cats = db.categories.filter((c) => c.active !== false)
  const prods = db.products.filter((p) => p.active !== false)
  const featured = prods.filter((p) => p.featured)
  const latest = prods.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 8)
  const s = db.settings
  const trust = [
    ['🚚', 'হোম ডেলিভারি', 'দ্রুত ও নিরাপদ ডেলিভারি'],
    ['💵', 'ক্যাশ অন ডেলিভারি', 'পণ্য হাতে পেয়ে টাকা দিন'],
    ['✅', 'মানসম্মত পণ্য', 'যাচাই করা ভালো মানের পণ্য'],
    ['🔁', 'সহজ রিটার্ন', 'সমস্যা হলে সহজে ফেরত'],
  ]

  return (
    <>
      <Hero banners={hero} />
      <section className="wrap trust">
        {trust.map(([i, t, d]) => <div key={t}><span>{i}</span><div><b>{t}</b><small>{d}</small></div></div>)}
      </section>

      {cats.length > 0 && (
        <section className="wrap sec">
          <SecTitle>ক্যাটাগরি</SecTitle>
          <div className="cat-grid">
            {cats.map((c) => (
              <Link to={'/shop?cat=' + c.id} className="cat-tile" key={c.id}>
                <div className="cat-ic">{c.image ? <img src={c.image} alt="" /> : <span>{c.icon}</span>}</div>
                <b>{c.name}</b>
              </Link>
            ))}
          </div>
        </section>
      )}

      {promo.length > 0 && (
        <section className="wrap promo-grid">
          {promo.slice(0, 3).map((b) => (
            <BLink key={b.id} to={b.link} className="promo" style={{ background: b.image ? `url(${b.image}) center/cover` : THEME_BG[b.theme] }}>
              {(b.title || b.subtitle) && <div><h3>{b.title}</h3>{b.subtitle && <p>{b.subtitle}</p>}</div>}
            </BLink>
          ))}
        </section>
      )}

      {featured.length > 0 && (
        <section className="wrap sec">
          <SecTitle to="/shop">বিশেষ পণ্য</SecTitle>
          <div className="grid">{featured.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <section className="wrap sec">
        <SecTitle to="/shop">নতুন পণ্য</SecTitle>
        {latest.length ? <div className="grid">{latest.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <div className="empty-sf">শীঘ্রই নতুন পণ্য আসছে...</div>}
      </section>

      <section className="wrap sec">
        <div className="about-strip">
          <img src="logo-icon.png" alt="" />
          <div><h3>{s.shopName}</h3><p>{s.tagline}</p><small>📍 {s.address}</small></div>
          <Link to="/shop" className="btn-sf">কেনাকাটা করুন</Link>
        </div>
      </section>
    </>
  )
}
