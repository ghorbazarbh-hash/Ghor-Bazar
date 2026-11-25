import { useState } from 'react'
import CrudPage from './CrudPage'
import { FormModal, Thumb } from '../../components/ui'
import { useStore, uid, customerDue, supplierDue, collectCustomerDue, paySupplierDue } from '../../lib/store'
import { money, fmtDate, dayKey } from '../../lib/format'
import { THEME_BG } from '../../lib/theme'


// quick on/off tick shown inside tables (saved immediately)
export function Tick({ collection, row, field = 'active', def = true }) {
  const { update } = useStore()
  const on = def ? row[field] !== false : !!row[field]
  return (
    <label className="tickwrap" title={on ? 'চালু — ক্লিক করলে বন্ধ হবে' : 'বন্ধ — ক্লিক করলে চালু হবে'}>
      <input type="checkbox" className="tick" checked={on}
        onChange={(e) => update((d) => { const x = d[collection].find((y) => y.id === row.id); if (x) x[field] = e.target.checked })} />
      <span>{on ? 'চালু' : 'বন্ধ'}</span>
    </label>
  )
}

const yes = (v) => (v !== false ? <span className="pill">Active</span> : <span className="pill red">Off</span>)

export function Categories() {
  return (
    <CrudPage
      title="Categories / ক্যাটাগরি" collection="categories" addLabel="+ Add Category"
      defaults={{ active: true, icon: '📦', image: '' }}
      columns={[
        { label: 'Icon', render: (r) => (r.image ? <Thumb src={r.image} size={36} /> : <span style={{ fontSize: 24 }}>{r.icon}</span>) },
        { label: 'Name', key: 'name' },
        { label: 'Products', render: (r, db) => db.products.filter((p) => p.categoryId === r.id).length },
        { label: 'চালু/বন্ধ', render: (r) => <Tick collection="categories" row={r} /> },
      ]}
      fields={[
        { name: 'name', label: 'ক্যাটাগরির নাম', required: true, wide: true },
        { name: 'icon', label: 'ইমোজি আইকন', hint: 'যেমন 🍳 🛏️ 💡 (ছবি না দিলে এটি দেখাবে)' },
        { name: 'active', type: 'checkbox', label: '', checkLabel: 'অনলাইন শপে দেখান' },
        { name: 'image', label: 'ক্যাটাগরির ছবি (ঐচ্ছিক)', type: 'image', maxW: 500 },
      ]}
      onDelete={(d, r) => d.products.forEach((p) => { if (p.categoryId === r.id) p.categoryId = '' })}
    />
  )
}

const nameOnly = [{ name: 'name', label: 'নাম', required: true, wide: true }]
export const Brands = () => (
  <CrudPage title="Brands / ব্র্যান্ড" collection="brands" addLabel="+ Add Brand" columns={[{ label: 'Name', key: 'name' }, { label: 'Products', render: (r, db) => db.products.filter((p) => p.brandId === r.id).length }]} fields={nameOnly} />
)
export const Units = () => (
  <CrudPage title="Units / ইউনিট" collection="units" addLabel="+ Add Unit" columns={[{ label: 'Name', key: 'name' }]} fields={nameOnly} />
)
export const ExpenseCategories = () => (
  <CrudPage title="Expense Category" collection="expenseCats" addLabel="+ Add Category" columns={[{ label: 'Name', key: 'name' }]} fields={nameOnly} />
)

export function Expenses() {
  const { db } = useStore()
  const total = db.expenses.reduce((s, e) => s + e.amount, 0)
  return (
    <CrudPage
      title="Expense / খরচ" collection="expenses" addLabel="+ Add Expense" reverse
      sortFn={(a, b) => new Date(a.date) - new Date(b.date)}
      defaults={{ date: dayKey(new Date()), method: 'Cash' }}
      intro={<>মোট খরচ: <b>{money(total)}</b></>}
      searchKeys={['category', 'details']}
      columns={[
        { label: 'Date', render: (r) => fmtDate(r.date) },
        { label: 'Category', key: 'category' },
        { label: 'Details', key: 'details' },
        { label: 'Method', key: 'method' },
        { label: 'Amount', render: (r) => money(r.amount) },
      ]}
      fields={[
        { name: 'date', label: 'তারিখ', type: 'date', required: true },
        { name: 'category', label: 'খরচের ধরন', type: 'select', options: (d) => d.expenseCats.map((c) => ({ value: c.name, label: c.name })), required: true },
        { name: 'details', label: 'বিবরণ', wide: true },
        { name: 'amount', label: 'পরিমাণ (৳)', type: 'number', required: true },
        { name: 'method', label: 'পেমেন্ট মাধ্যম', type: 'select', allowEmpty: false, options: ['Cash', 'bKash', 'Nagad', 'Bank'].map((x) => ({ value: x, label: x })) },
      ]}
    />
  )
}

function PartyPage({ kind }) {
  const { db, update, notify } = useStore()
  const [pay, setPay] = useState(null)
  const isCust = kind === 'customers'
  const dueOf = (r) => (isCust ? customerDue(db, r) : supplierDue(db, r))
  return (
    <>
      <CrudPage
        title={isCust ? 'Customers / কাস্টমার' : 'Suppliers / সরবরাহকারী'} collection={kind} addLabel={isCust ? '+ Add Customer' : '+ Add Supplier'}
        defaults={{ openingDue: 0, phone: '', address: '' }} searchKeys={['name', 'phone']}
        columns={[
          { label: 'Name', key: 'name' }, { label: 'Phone', render: (r) => r.phone || '-' }, { label: 'Address', render: (r) => r.address || '-' },
          ...(isCust ? [{ label: 'Orders', render: (r, d) => d.sales.filter((s) => s.customerId === r.id).length }] : []),
          { label: isCust ? 'Due' : 'Purchase Due', render: (r) => <span style={{ color: dueOf(r) > 0 ? '#e74b5c' : undefined }}>{money(dueOf(r))}</span> },
        ]}
        fields={[
          { name: 'name', label: 'নাম', required: true, wide: true },
          { name: 'phone', label: 'ফোন' },
          { name: 'openingDue', label: 'পুরনো বাকি (৳)', type: 'number' },
          { name: 'address', label: 'ঠিকানা', wide: true },
        ]}
        extraActions={(r) => dueOf(r) > 0 && <><button className="mini" onClick={() => setPay(r)}>{isCust ? 'Receive' : 'Pay'}</button>{' '}</>}
      />
      {pay && (
        <FormModal
          title={(isCust ? 'বাকি আদায় — ' : 'পেমেন্ট — ') + pay.name}
          initial={{ amount: dueOf(pay), method: 'Cash' }}
          fields={[
            { name: 'amount', label: `পরিমাণ (বাকি ${dueOf(pay)})`, type: 'number', required: true },
            { name: 'method', label: 'মাধ্যম', type: 'select', allowEmpty: false, options: ['Cash', 'bKash', 'Nagad', 'Bank'].map((x) => ({ value: x, label: x })) },
          ]}
          onClose={() => setPay(null)}
          onSave={(v) => {
            if (v.amount <= 0 || v.amount > dueOf(pay) + 0.001) return notify('পরিমাণ সঠিক নয়', 'error')
            update((d) => (isCust ? collectCustomerDue(d, pay.id, v.amount, v.method) : paySupplierDue(d, pay.id, v.amount, v.method)))
            notify('সংরক্ষিত ✓')
            setPay(null)
          }}
        />
      )}
    </>
  )
}
export const Customers = () => <PartyPage kind="customers" />
export const Suppliers = () => <PartyPage kind="suppliers" />

const THEMES = [['navy', 'গাঢ় নীল'], ['copper', 'কপার/কমলা'], ['teal', 'টিল/সবুজ-নীল'], ['gold', 'গোল্ড']]

export function Banners() {
  return (
    <CrudPage
      title="Banners / ব্যানার" collection="banners" addLabel="+ Add Banner"
      defaults={{ position: 'hero', theme: 'navy', order: 1, active: true, link: '/shop', image: '', buttonText: 'এখনই কিনুন' }}
      sortFn={(a, b) => (a.position === b.position ? (a.order || 0) - (b.order || 0) : a.position === 'hero' ? -1 : 1)}
      intro={<>
        <b>হিরো স্লাইডার</b> = হোমপেজের উপরের বড় ব্যানার (ছবির সাইজ প্রায় <b>1600×600</b>)। <b>প্রোমো স্ট্রিপ</b> = ক্যাটাগরির নিচের ছোট ব্যানার (প্রায় <b>800×400</b>)।
        ছবি না দিলে নির্বাচিত রঙের থিমে লেখাসহ সুন্দর ব্যানার দেখাবে। ছবিতে নিজের লেখা থাকলে শিরোনাম ফাঁকা রাখুন।
      </>}
      columns={[
        { label: 'Preview', render: (r) => <div style={{ width: 90, height: 40, borderRadius: 6, background: r.image ? `url(${r.image}) center/cover` : THEME_BG[r.theme] }} /> },
        { label: 'Title', render: (r) => r.title || <i style={{ color: '#999' }}>(শুধু ছবি)</i> },
        { label: 'Position', render: (r) => (r.position === 'hero' ? 'হিরো স্লাইডার' : 'প্রোমো স্ট্রিপ') },
        { label: 'Order', key: 'order' },
        { label: 'চালু/বন্ধ', render: (r) => <Tick collection="banners" row={r} /> },
      ]}
      fields={[
        { name: 'position', label: 'কোথায় দেখাবে', type: 'select', allowEmpty: false, options: [{ value: 'hero', label: 'হিরো স্লাইডার (উপরের বড়)' }, { value: 'promo', label: 'প্রোমো স্ট্রিপ (ছোট)' }] },
        { name: 'order', label: 'ক্রম (১ আগে দেখাবে)', type: 'number', step: '1' },
        { name: 'title', label: 'শিরোনাম', wide: true },
        { name: 'subtitle', label: 'উপশিরোনাম', wide: true },
        { name: 'buttonText', label: 'বাটনের লেখা' },
        { name: 'link', label: 'ক্লিক করলে কোথায় যাবে', type: 'select', allowEmpty: false, options: (d) => [{ value: '/shop', label: 'সব পণ্য' }, ...d.categories.map((c) => ({ value: '/shop?cat=' + c.id, label: 'ক্যাটাগরি: ' + c.name }))] },
        { name: 'theme', label: 'রঙের থিম (ছবি না থাকলে)', type: 'select', allowEmpty: false, options: THEMES.map(([value, label]) => ({ value, label })) },
        { name: 'active', type: 'checkbox', label: '', checkLabel: 'চালু আছে' },
        { name: 'image', label: 'ব্যানার ছবি', type: 'image', maxW: 1600 },
      ]}
    />
  )
}

export function Promotions() {
  return (
    <CrudPage
      title="Promotions / কুপন" collection="coupons" addLabel="+ Add Coupon"
      defaults={{ type: 'percent', value: 10, minOrder: 0, maxDiscount: 0, active: true, expires: '' }}
      intro="গ্রাহক চেকআউটে কুপন কোড দিয়ে ছাড় পাবেন। পণ্যে ‘আগের দাম’ দিলে আলাদা ছাড় ব্যাজ নিজে থেকেই দেখাবে।"
      columns={[
        { label: 'Code', render: (r) => <b>{r.code}</b> },
        { label: 'Discount', render: (r) => (r.type === 'percent' ? r.value + '%' : money(r.value)) },
        { label: 'Min order', render: (r) => money(r.minOrder) },
        { label: 'Expires', render: (r) => (r.expires ? fmtDate(r.expires) : '—') },
        { label: 'চালু/বন্ধ', render: (r) => <Tick collection="coupons" row={r} /> },
      ]}
      beforeSave={(v) => ({ ...v, code: String(v.code).trim().toUpperCase().replace(/\s+/g, '') })}
      fields={[
        { name: 'code', label: 'কুপন কোড', required: true },
        { name: 'type', label: 'ধরন', type: 'select', allowEmpty: false, options: [{ value: 'percent', label: 'শতাংশ (%)' }, { value: 'fixed', label: 'নির্দিষ্ট টাকা (৳)' }] },
        { name: 'value', label: 'ছাড়ের পরিমাণ', type: 'number', required: true },
        { name: 'minOrder', label: 'সর্বনিম্ন অর্ডার (৳)', type: 'number' },
        { name: 'maxDiscount', label: 'সর্বোচ্চ ছাড় (৳, % এর ক্ষেত্রে; ০ = সীমা নেই)', type: 'number' },
        { name: 'expires', label: 'মেয়াদ শেষ (ঐচ্ছিক)', type: 'date' },
        { name: 'active', type: 'checkbox', label: '', checkLabel: 'চালু আছে' },
      ]}
    />
  )
}

/* ================= delivery charge (admin decides, customers see it at checkout) ================= */
function ZoneRow({ z, onChange, onDelete, canDelete }) {
  const [name, setName] = useState(z.name)
  const [charge, setCharge] = useState(String(z.charge))
  return (
    <tr>
      <td><input className="cell wide" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== z.name && onChange({ name: name.trim() })} /></td>
      <td><input className="cell" type="number" min="0" value={charge} onChange={(e) => setCharge(e.target.value)} onBlur={() => +charge !== z.charge && onChange({ charge: Math.max(0, +charge || 0) })} /></td>
      <td><label className="tickwrap"><input type="checkbox" className="tick" checked={z.active !== false} onChange={(e) => onChange({ active: e.target.checked })} /><span>{z.active !== false ? 'চালু' : 'বন্ধ'}</span></label></td>
      <td>{canDelete && <button className="mini del" onClick={onDelete}>Delete</button>}</td>
    </tr>
  )
}

export function DeliveryZones() {
  const { db, update, notify } = useStore()
  const zones = db.settings.deliveryZones
  const [free, setFree] = useState(String(db.settings.freeDeliveryOver || 0))
  const patch = (id, v) => update((d) => { d.settings.deliveryZones = d.settings.deliveryZones.map((z) => (z.id === id ? { ...z, ...v } : z)) })
  const add = () => update((d) => { d.settings.deliveryZones.push({ id: 'z-' + uid(), name: 'নতুন এলাকা', charge: 60, active: true }) })
  const del = (z) => {
    if (zones.length <= 1) return notify('কমপক্ষে একটি ডেলিভারি এলাকা রাখতে হবে', 'error')
    if (confirm(`"${z.name}" মুছবেন?`)) update((d) => { d.settings.deliveryZones = d.settings.deliveryZones.filter((x) => x.id !== z.id) })
  }
  return (
    <>
      <div className="pagehead"><h2>Delivery Charge / ডেলিভারি চার্জ</h2><button className="btn" onClick={add}>+ নতুন এলাকা</button></div>
      <div className="notice box">
        এখানে যে এলাকা ও চার্জ দেবেন, গ্রাহক চেকআউটের সময় ঠিক সেটাই দেখে নিজের এলাকা বেছে নেবেন। নাম বা টাকা বদলে বাইরে ক্লিক করলেই সেভ হয়ে যাবে।
        কোনো এলাকায় সাময়িক ডেলিভারি বন্ধ রাখতে “বন্ধ” করে দিন। নির্দিষ্ট একটি অর্ডারের চার্জ আলাদা করতে চাইলে Online Orders থেকে সেই অর্ডার খুলে বদলাতে পারবেন।
      </div>
      <div className="tablecard">
        <table>
          <thead><tr><th>এলাকার নাম</th><th>চার্জ (৳)</th><th>চালু/বন্ধ</th><th></th></tr></thead>
          <tbody>
            {zones.map((z) => <ZoneRow key={z.id + z.name + z.charge} z={z} onChange={(v) => patch(z.id, v)} onDelete={() => del(z)} canDelete={zones.length > 1} />)}
          </tbody>
        </table>
      </div>
      <div className="tablecard setcard" style={{ marginTop: 12 }}>
        <h3>ফ্রি ডেলিভারি</h3>
        <div className="toolbar" style={{ padding: 0 }}>
          <span style={{ fontSize: 12 }}>এতো টাকা বা তার বেশি অর্ডারে ডেলিভারি ফ্রি: ৳</span>
          <input className="cell" type="number" min="0" value={free} onChange={(e) => setFree(e.target.value)}
            onBlur={() => update((d) => { d.settings.freeDeliveryOver = Math.max(0, +free || 0) })} />
          <span className="hint">০ দিলে ফ্রি ডেলিভারি অফার বন্ধ থাকবে</span>
        </div>
      </div>
    </>
  )
}

/* ================= payment methods (admin switches on/off, customers see only the active ones) ================= */
function PayRow({ m, onChange, onDelete }) {
  const [label, setLabel] = useState(m.label)
  const [number, setNumber] = useState(m.number || '')
  const [note, setNote] = useState(m.note || '')
  const isCod = m.id === 'cod'
  return (
    <tr>
      <td><label className="tickwrap"><input type="checkbox" className="tick" checked={!!m.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} /><span>{m.enabled ? 'চালু' : 'বন্ধ'}</span></label></td>
      <td><input className="cell wide" value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => label.trim() && label !== m.label && onChange({ label: label.trim() })} /></td>
      <td>{isCod ? <span className="muted">—</span> : <input className="cell" placeholder="01XXXXXXXXX" value={number} onChange={(e) => setNumber(e.target.value)} onBlur={() => number !== (m.number || '') && onChange({ number: number.trim() })} />}</td>
      <td><input className="cell wide" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (m.note || '') && onChange({ note })} /></td>
      <td>{isCod ? <span className="muted">—</span> : <label className="tickwrap"><input type="checkbox" className="tick" checked={!!m.needsTrx} onChange={(e) => onChange({ needsTrx: e.target.checked })} /><span>দরকার</span></label>}</td>
      <td>{!isCod && <button className="mini del" onClick={onDelete}>Delete</button>}</td>
    </tr>
  )
}

export function PaymentMethods() {
  const { db, update } = useStore()
  const list = db.settings.paymentMethods
  const patch = (id, v) => update((d) => { d.settings.paymentMethods = d.settings.paymentMethods.map((m) => (m.id === id ? { ...m, ...v } : m)) })
  const add = () => update((d) => { d.settings.paymentMethods.push({ id: 'pm-' + uid(), label: 'Rocket', enabled: false, number: '', note: 'Send Money করে TrxID দিন', needsTrx: true }) })
  const del = (m) => { if (confirm(`"${m.label}" মুছবেন?`)) update((d) => { d.settings.paymentMethods = d.settings.paymentMethods.filter((x) => x.id !== m.id) }) }
  const anyOn = list.some((m) => m.enabled)
  return (
    <>
      <div className="pagehead"><h2>Payment Methods / পেমেন্ট পদ্ধতি</h2><button className="btn" onClick={add}>+ নতুন পদ্ধতি</button></div>
      <div className="notice box">
        টিক দেওয়া পদ্ধতিগুলোই শুধু গ্রাহক চেকআউটে দেখবেন। bKash/Nagad-এর মতো পদ্ধতিতে আপনার নম্বর দিন, আর “TrxID দরকার” টিক থাকলে গ্রাহককে ট্রানজেকশন আইডি দিতে হবে।
        {!anyOn && <b style={{ color: '#bd3445' }}> ⚠ কোনো পদ্ধতি চালু নেই — এই অবস্থায় গ্রাহক অর্ডার করতে পারবেন না।</b>}
      </div>
      <div className="tablecard">
        <table>
          <thead><tr><th>চালু/বন্ধ</th><th>নাম</th><th>আপনার নম্বর</th><th>গ্রাহককে নির্দেশনা</th><th>TrxID</th><th></th></tr></thead>
          <tbody>{list.map((m) => <PayRow key={m.id + m.label + m.number + m.note + m.enabled} m={m} onChange={(v) => patch(m.id, v)} onDelete={() => del(m)} />)}</tbody>
        </table>
      </div>
    </>
  )
}
