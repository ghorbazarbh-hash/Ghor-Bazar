import { useEffect, useState } from 'react'
import { Navigate, useLocation, NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { downloadBackup } from '../../lib/backup'
import { Toast } from '../../components/ui'

const GROUPS = [
  ['MAIN MENU', [
    ['/admin', '▦', 'Dashboard', true],
    ['/admin/pos', '🛒', 'New Sale'],
    ['/admin/sales', '▤', 'Sale List'],
    ['/admin/purchase', '📦', 'Purchase'],
    ['/admin/returns', '↩', 'Return'],
    ['/admin/damage', '⚠', 'Damage'],
    ['/admin/stock', '▣', 'Stock Report'],
    ['/admin/adjust', '⇄', 'Sale Adjust'],
  ]],
  ['ONLINE STORE', [
    ['/admin/orders', '🧾', 'Online Orders', false, 'orders'],
    ['/admin/banners', '🖼', 'Banner'],
    ['/admin/delivery', '🚚', 'Delivery Charge'],
    ['/admin/payments', '💳', 'Payment Methods'],
  ]],
  ['PRODUCTS', [
    ['/admin/products', '▣', 'Product'],
    ['/admin/categories', '▦', 'Category'],
    ['/admin/brands', '✦', 'Brand'],
    ['/admin/units', '◈', 'Unit'],
  ]],
  ['EXPENSE & PAYMENT', [
    ['/admin/expenses', '৳', 'Expense'],
    ['/admin/expense-categories', '▸', 'Expense Category'],
  ]],
  ['CUSTOMER & SUPPLIER', [
    ['/admin/suppliers', '♙', 'Supplier'],
    ['/admin/customers', '♧', 'Customer'],
  ]],
  ['ACCOUNT', [['/admin/accounts', '৳', 'Account']]],
  ['PROMOTION', [['/admin/promotions', '★', 'Promotion']]],
  ['REPORT & ANALYSIS', [['/admin/reports', '▤', 'Reports']]],
  ['SETTING & DATABASE', [
    ['/admin/users', '♙', 'User Management'],
    ['/admin/backup', '▣', 'Backup & Restore'],
    ['/admin/settings', '⚙', 'Setting'],
    ['/admin/about', 'ⓘ', 'About'],
  ]],
]

export default function AdminLayout() {
  const { db, admin, auth, logout, sync } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [menu, setMenu] = useState(false)
  useEffect(() => { setMenu(false) }, [loc.pathname])
  if (!admin) return <Navigate to={auth.role === 'user' ? '/account' : '/login?next=/admin'} replace />
  const pending = db.orders.filter((o) => o.status === 'pending').length
  const s = db.settings

  return (
    <div className="admin">
      <div className={'app' + (menu ? ' menu-open' : '')}>
        <div className="scrim" onClick={() => setMenu(false)} />
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-row">
              <img src="logo-icon.png" alt="" className="brand-logo" />
              <div>স্বপ্নের ঘর বাজার<small>Inventory &amp; POS System</small></div>
            </div>
          </div>
          {GROUPS.map(([g, items]) => (
            <div key={g}>
              <div className="group">{g}</div>
              {items.map(([to, ico, label, end, badge]) => (
                <NavLink key={to} to={to} end={!!end} className={({ isActive }) => 'nav' + (isActive ? ' active' : '')} title={label}>
                  <span className="ico">{ico}</span>
                  <span>{label}</span>
                  {badge === 'orders' && pending > 0 && <span className="badge">{pending}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </aside>
        <main className="main">
          <header className="topbar">
            <button className="burger" aria-label="menu" onClick={() => setMenu(true)}>☰</button>
            <div className="tb-title">
              <div className="store">{s.shopName}</div>
              <div className="address">{s.address}</div>
            </div>
            <div className="topright">
              <span className={'syncpill ' + sync}>{sync === 'saving' ? 'সেভ হচ্ছে…' : sync === 'error' ? '⚠ সেভ হয়নি' : '✓ সেভ হয়েছে'}</span>
              <Link to="/" target="_blank"><button>🌐 দোকান দেখুন</button></Link>
              <button onClick={() => downloadBackup(db)}>Backup</button>
              <button onClick={() => nav('/admin/backup')}>Restore</button>
              <button onClick={async () => { await logout(); nav('/login') }}>Logout</button>
            </div>
          </header>
          {auth.mustChange && (
            <div className="warnbar">
              ⚠ আপনি এখনো ডিফল্ট পাসওয়ার্ড (<b>admin123</b>) ব্যবহার করছেন। <Link to="/admin/users">এখনই অ্যাডমিন ইমেইল ও পাসওয়ার্ড বদলান →</Link>
            </div>
          )}
          <div className="content"><Outlet /></div>
        </main>
      </div>
      <Toast />
    </div>
  )
}
