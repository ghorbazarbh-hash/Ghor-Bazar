import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, normalizeBackup } from '../../lib/store'
import { downloadBackup } from '../../lib/backup'
import { fmtDate, money } from '../../lib/format'
import { Input, Modal } from '../../components/ui'

const FIELDS = [
  ['দোকানের তথ্য', [
    { name: 'shopName', label: 'দোকানের নাম', required: true },
    { name: 'tagline', label: 'ট্যাগলাইন' },
    { name: 'address', label: 'ঠিকানা', wide: true },
    { name: 'phone', label: 'ফোন নম্বর', hint: 'অনলাইন শপে হেডার ও ফুটারে দেখাবে' },
    { name: 'whatsapp', label: 'WhatsApp নম্বর (৮৮০ সহ, যেমন 8801XXXXXXXXX)', hint: 'দিলে WhatsApp বাটন চালু হবে' },
    { name: 'email', label: 'ইমেইল' },
    { name: 'facebook', label: 'Facebook পেজ লিংক' },
    { name: 'aboutText', label: 'আমাদের সম্পর্কে (ফুটারে)', type: 'textarea', wide: true },
  ]],
  ['অনলাইন শপ', [
    { name: 'announcement', label: 'উপরের ঘোষণা বার (ফাঁকা রাখলে লুকানো থাকবে)', wide: true },
  ]],
  ['রশিদ / POS প্রিন্টার', [
    { name: 'receiptWidth', label: 'থার্মাল পেপার সাইজ', type: 'select', allowEmpty: false, options: [{ value: '76', label: '৩ ইঞ্চি (৭৬ মিমি) — সাধারণ POS প্রিন্টার' }, { value: '80', label: '৮০ মিমি (বড় রোল)' }, { value: '58', label: '৫৮ মিমি (ছোট রোল)' }] },
    { name: 'receiptLogo', label: 'লোগো', type: 'checkbox', checkLabel: 'রশিদে লোগো ছাপুন' },
    { name: 'autoPrint', label: 'অটো প্রিন্ট', type: 'checkbox', checkLabel: 'বিক্রয় শেষ হলেই রশিদ প্রিন্ট ডায়ালগ খুলুন' },
    { name: 'receiptFooter', label: 'রশিদের নিচের লেখা (ফাঁকা থাকলে "ধন্যবাদ! আবার আসবেন")', wide: true },
  ]],
  ['ইনভেন্টরি', [{ name: 'lowStock', label: 'স্টক কম ধরার সীমা (এর ≤ হলে সতর্কতা)', type: 'number', step: '1' }]],
]

export function Settings() {
  const { db, update, notify } = useStore()
  const [v, setV] = useState({ ...db.settings })
  const save = (e) => {
    e.preventDefault()
    if (!v.shopName.trim()) return notify('দোকানের নাম দিন', 'error')
    const out = { ...v, lowStock: +v.lowStock || 0 }
    update((d) => { d.settings = { ...d.settings, ...out } })
    notify('সেটিংস সংরক্ষিত ✓')
  }
  return (
    <>
      <div className="pagehead"><h2>Settings</h2></div>
      <div className="notice box">🖨 <b>POS প্রিন্টার:</b> প্রিন্টারের ড্রাইভারে পেপার সাইজ ৮০ মিমি/৫৮ মিমি সেট করুন, প্রিন্ট ডায়ালগে Margins = None দিন। ডায়ালগ ছাড়া সাথে সাথে প্রিন্ট করতে Chrome কে <code>--kiosk-printing</code> দিয়ে চালান।</div>
      <div className="notice box">ডেলিভারি চার্জ ও এলাকা ঠিক করতে <Link to="/admin/delivery">Delivery Charge</Link> পেজে, আর bKash/Nagad/ক্যাশ অন ডেলিভারি চালু-বন্ধ করতে <Link to="/admin/payments">Payment Methods</Link> পেজে যান।</div>
      <form onSubmit={save}>
        {FIELDS.map(([title, fields]) => (
          <div className="tablecard setcard" key={title}>
            <h3>{title}</h3>
            <div className="formgrid">
              {fields.map((f) => (
                <label key={f.name} className={f.wide ? 'wide' : ''}>
                  <span className="flabel">{f.label}</span>
                  <Input f={f} value={v[f.name]} onChange={(val) => setV((s) => ({ ...s, [f.name]: val }))} db={db} />
                  {f.hint && <span className="hint">{f.hint}</span>}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button className="btn big" type="submit" style={{ maxWidth: 240 }}>সেভ করুন</button>
      </form>
    </>
  )
}

export function Users() {
  const { api, notify, setSession, setMustChange } = useStore()
  const [email, setEmail] = useState('')
  const [cur, setCur] = useState('')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [users, setUsers] = useState(null)
  const [tmp, setTmp] = useState(null)

  const load = async () => { const r = await api('api/admin/users'); if (r.ok) setUsers(r.users) }
  useEffect(() => {
    api('api/auth/me').then((r) => r.ok && setEmail(r.email || ''))
    load()
  }, [])

  const save = async (e) => {
    e.preventDefault()
    if (p1 && p1 !== p2) return notify('পাসওয়ার্ড দুটি মিলছে না', 'error')
    const r = await api('api/admin/credentials', { method: 'POST', body: { currentPassword: cur, email, newPassword: p1 } })
    if (!r.ok) return notify(r.msg, 'error')
    setSession(r.token)
    setMustChange(!!r.mustChange)
    setCur(''); setP1(''); setP2('')
    notify('অ্যাডমিন লগইন তথ্য আপডেট হয়েছে ✓')
  }
  const block = async (u) => {
    const r = await api(`api/admin/users/${u.id}`, { method: 'PATCH', body: { blocked: !u.blocked } })
    if (r.ok) load()
  }
  const reset = async (u) => {
    if (!confirm(`${u.name} এর জন্য নতুন পাসওয়ার্ড তৈরি করবেন? পুরনোটি আর কাজ করবে না।`)) return
    const r = await api(`api/admin/users/${u.id}/reset`, { method: 'POST' })
    if (r.ok) setTmp({ name: u.name, email: u.email, password: r.password })
    else notify(r.msg, 'error')
  }

  return (
    <>
      <div className="pagehead"><h2>User Management</h2></div>
      <div className="notice box">
        লগইন পেজ (<code>/#/login</code>) সবার জন্য একটাই — কাস্টমার নিজের ইমেইল-পাসওয়ার্ড দিলে নিজের অ্যাকাউন্টে ঢোকে, আর নিচের অ্যাডমিন ইমেইল-পাসওয়ার্ড দিলে সরাসরি এই অ্যাডমিন প্যানেল খোলে।
      </div>
      <div className="tablecard setcard" style={{ maxWidth: 560 }}>
        <h3>অ্যাডমিন লগইন বদলান</h3>
        <form className="formgrid" onSubmit={save} autoComplete="off">
          <label className="wide"><span className="flabel">অ্যাডমিন ইমেইল</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="wide"><span className="flabel">বর্তমান পাসওয়ার্ড (নিশ্চিত করতে)</span><input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></label>
          <label><span className="flabel">নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)</span><input type="password" value={p1} onChange={(e) => setP1(e.target.value)} autoComplete="new-password" /></label>
          <label><span className="flabel">আবার লিখুন</span><input type="password" value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" /></label>
          <button className="btn wide" type="submit">আপডেট করুন</button>
        </form>
        <p className="hint" style={{ marginTop: 8 }}>পাসওয়ার্ড না বদলাতে চাইলে নতুন পাসওয়ার্ড ঘর ফাঁকা রাখুন (শুধু ইমেইল বদলাবে)।</p>
      </div>

      <h3 style={{ margin: '18px 2px 8px' }}>কাস্টমার অ্যাকাউন্ট {users ? `(${users.length})` : ''}</h3>
      <div className="tablecard">
        <table>
          <thead><tr><th>নাম</th><th>ইমেইল</th><th>ফোন</th><th>যোগ দিয়েছেন</th><th>অর্ডার</th><th>মোট কেনা</th><th>অবস্থা</th><th></th></tr></thead>
          <tbody>
            {(users || []).map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.phone}</td><td>{fmtDate(u.createdAt)}</td><td>{u.orders}</td><td>{money(u.spent)}</td>
                <td>{u.blocked ? <span className="pill red">বন্ধ</span> : <span className="pill">সচল</span>}</td>
                <td><button className="mini" onClick={() => reset(u)}>পাসওয়ার্ড রিসেট</button> <button className={'mini ' + (u.blocked ? '' : 'del')} onClick={() => block(u)}>{u.blocked ? 'চালু করুন' : 'বন্ধ করুন'}</button></td>
              </tr>
            ))}
            {users && !users.length && <tr><td colSpan="8" className="empty">এখনো কোনো কাস্টমার অ্যাকাউন্ট খোলেনি</td></tr>}
            {!users && <tr><td colSpan="8" className="empty">লোড হচ্ছে…</td></tr>}
          </tbody>
        </table>
      </div>
      {tmp && (
        <Modal title="নতুন পাসওয়ার্ড তৈরি হয়েছে" onClose={() => setTmp(null)}>
          <p style={{ lineHeight: 1.8 }}>{tmp.name} ({tmp.email}) কে এই পাসওয়ার্ডটি জানান। এটি আর দেখানো হবে না:</p>
          <div className="sumline" style={{ fontSize: 22, textAlign: 'center', letterSpacing: 2, userSelect: 'all' }}><b>{tmp.password}</b></div>
          <p className="hint">গ্রাহক লগইন করার পর “আমার অ্যাকাউন্ট → পাসওয়ার্ড” থেকে নিজের পছন্দের পাসওয়ার্ড দিতে পারবেন।</p>
          <div className="modalfoot"><button className="btn" onClick={() => setTmp(null)}>ঠিক আছে</button></div>
        </Modal>
      )}
    </>
  )
}

export function Backup() {
  const { db, replaceAll, notify } = useStore()
  const [busy, setBusy] = useState(false)
  const size = (JSON.stringify(db).length / 1024).toFixed(0)
  const restore = (e) => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    const r = new FileReader()
    r.onload = async () => {
      let data
      try { data = normalizeBackup(JSON.parse(r.result)) } catch { return notify('ব্যাকআপ ফাইলটি পড়া যায়নি', 'error') }
      if (!confirm(`ব্যাকআপ রিস্টোর করবেন? বর্তমান সব ডেটা বদলে যাবে।\n(পণ্য: ${data.products.length}, বিক্রি: ${data.sales.length})`)) return
      setBusy(true)
      if (await replaceAll(data)) notify('রিস্টোর সম্পন্ন ✓')
      setBusy(false)
    }
    r.readAsText(f)
  }
  const removeDemo = async () => {
    if (!confirm('ডেমো পণ্য, ক্যাটাগরি, ব্যানার ও কুপন মুছে ফেলবেন? (আপনার নিজের যোগ করা ডেটা থাকবে)')) return
    const next = structuredClone(db)
    ;['products', 'categories', 'banners', 'coupons'].forEach((k) => (next[k] = next[k].filter((x) => !x.demo)))
    if (await replaceAll(next)) notify('ডেমো ডেটা মুছে ফেলা হয়েছে')
  }
  const reset = async () => {
    if (!confirm('⚠ সব ডেটা (পণ্য, বিক্রি, অর্ডার সহ) মুছে যাবে! আগে ব্যাকআপ নিয়েছেন তো?')) return
    if (prompt('নিশ্চিত করতে RESET লিখুন') !== 'RESET') return
    if (await replaceAll({ settings: db.settings, units: db.units, expenseCats: db.expenseCats })) notify('সব ডেটা মুছে ফেলা হয়েছে')
  }
  const demoCount = ['products', 'categories', 'banners', 'coupons'].reduce((s, k) => s + db[k].filter((x) => x.demo).length, 0)
  return (
    <>
      <div className="pagehead"><h2>Backup & Restore</h2></div>
      <div className="tablecard">
        <div className="toolbar" style={{ flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => downloadBackup(db)}>Download Backup (JSON)</button>
          <label className="btn secondary">{busy ? 'অপেক্ষা করুন…' : 'Restore Backup'}<input type="file" accept="application/json,.json" hidden onChange={restore} disabled={busy} /></label>
        </div>
        <p className="notice">
          ব্যাকআপে পণ্য, বিক্রি, ক্রয়, খরচ, অর্ডার, কাস্টমার, সরবরাহকারী, ব্যানার ও সেটিংস থাকে (প্রায় {size} KB)। পুরনো <b>swapner_ghor_bazar_inventory_v2</b> এর ব্যাকআপ ফাইলও এখান থেকে রিস্টোর করা যাবে।
        </p>
        <p className="notice">
          📌 ডেটা আপনার সার্ভারের <code>data/</code> ফোল্ডারে থাকে এবং সার্ভার প্রতিদিন নিজে থেকে <code>data/backups/</code> এ কপি রাখে (শেষ ১৪ দিন)। ছবিগুলো <code>data/uploads/</code> এ থাকে — তাই মাঝে মাঝে পুরো <code>data</code> ফোল্ডারটি আলাদা জায়গায় কপি করে রাখুন।
        </p>
      </div>
      <div className="tablecard setcard" style={{ marginTop: 14 }}>
        <h3>ডেটা পরিষ্কার</h3>
        <div className="toolbar" style={{ flexWrap: 'wrap', padding: 0 }}>
          <button className="btn secondary" onClick={removeDemo} disabled={!demoCount}>ডেমো ডেটা মুছুন ({demoCount})</button>
          <button className="btn danger" onClick={reset}>সব ডেটা রিসেট</button>
        </div>
      </div>
    </>
  )
}

export function About() {
  return (
    <>
      <div className="pagehead"><h2>About</h2></div>
      <div className="tablecard setcard">
        <img src="logo.png" alt="" style={{ height: 120 }} />
        <p className="notice" style={{ padding: 0 }}>স্বপ্নের ঘর বাজার — E-commerce + Inventory & POS, version 4.0 (সার্ভার সংস্করণ)</p>
        <p className="notice" style={{ padding: 0 }}>লগইন: <code>/#/login</code> (কাস্টমার ও অ্যাডমিন একই পেজ)</p>
      </div>
    </>
  )
}
