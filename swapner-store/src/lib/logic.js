// Pure business logic — runs both in the browser (admin panel) and on the server (orders, public data).
// No React, no DOM access in here.
import { nowISO } from './format.js'

export const uid = () =>
  (globalThis.crypto && globalThis.crypto.randomUUID && globalThis.crypto.randomUUID()) ||
  Math.random().toString(36).slice(2) + Date.now().toString(36)

export const COLLECTIONS = [
  'products', 'categories', 'brands', 'units', 'banners', 'coupons',
  'sales', 'purchases', 'returns', 'damages', 'expenses', 'expenseCats',
  'customers', 'suppliers', 'orders', 'payments',
]

export const defaultPaymentMethods = () => [
  { id: 'cod', label: 'ক্যাশ অন ডেলিভারি', enabled: true, number: '', note: 'পণ্য হাতে পেয়ে টাকা দিন', needsTrx: false },
  { id: 'bKash', label: 'bKash', enabled: true, number: '', note: 'Send Money করে TrxID দিন', needsTrx: true },
  { id: 'Nagad', label: 'Nagad', enabled: true, number: '', note: 'Send Money করে TrxID দিন', needsTrx: true },
]
export const defaultDeliveryZones = () => [
  { id: 'z-local', name: 'ভুরুঙ্গামারী (শহর ও আশপাশ)', charge: 40, active: true },
  { id: 'z-district', name: 'কুড়িগ্রাম জেলার অন্যান্য এলাকা', charge: 80, active: true },
  { id: 'z-country', name: 'সারাদেশ (কুরিয়ার)', charge: 130, active: true },
]

export const defaultSettings = {
  shopName: 'স্বপ্নের ঘর বাজার',
  tagline: 'সুন্দর ঘর, সুখের সংসার!',
  address: 'সাদ্দাম মোড় সংলগ্ন, বাজার রোড, ভুরুঙ্গামারী',
  phone: '',
  whatsapp: '',
  email: '',
  facebook: '',
  announcement: 'ভুরুঙ্গামারীতে হোম ডেলিভারি • ক্যাশ অন ডেলিভারি সুবিধা আছে',
  freeDeliveryOver: 2000,
  lowStock: 5,
  receiptWidth: '80',
  receiptFooter: '',
  receiptLogo: true,
  autoPrint: false,
  aboutText: 'স্বপ্নের ঘর বাজার — আপনার ঘরকে সাজাতে ও সংসারকে সহজ করতে প্রয়োজনীয় সব পণ্য এক জায়গায়। সুন্দর ঘর, সুখের সংসার!',
  deliveryZones: defaultDeliveryZones(),
  paymentMethods: defaultPaymentMethods(),
}

// Settings that visitors are allowed to see (whitelist — nothing secret can leak by accident)
export const PUBLIC_SETTINGS = [
  'shopName', 'tagline', 'address', 'phone', 'whatsapp', 'email', 'facebook', 'announcement',
  'freeDeliveryOver', 'lowStock', 'aboutText',
]

export function seed() {
  const cats = [], products = [], banners = []
  return {
    settings: { ...defaultSettings, deliveryZones: defaultDeliveryZones(), paymentMethods: defaultPaymentMethods() },
    products, categories: cats, banners,
    brands: [],
    units: ['pcs', 'set', 'box', 'kg', 'liter', 'pair', 'dozen'].map((n) => ({ id: 'u-' + n, name: n })),
    coupons: [],
    expenseCats: ['দোকান ভাড়া', 'বিদ্যুৎ বিল', 'কর্মচারী বেতন', 'পরিবহন', 'মার্কেটিং', 'অন্যান্য'].map((n, i) => ({ id: 'ec' + i, name: n })),
    sales: [], purchases: [], returns: [], damages: [], expenses: [], customers: [], suppliers: [], orders: [], payments: [],
  }
}

export function withDefaults(d) {
  const s = seed()
  const st = { ...defaultSettings, ...(d.settings || {}) }
  // legacy fields from the browser-only version
  const legacy = { bkash: st.bkash, nagad: st.nagad }
  ;['adminUser', 'adminPass', 'bkash', 'nagad', 'deliveryCharge'].forEach((k) => delete st[k])
  if (!Array.isArray(st.deliveryZones) || !st.deliveryZones.length) st.deliveryZones = defaultDeliveryZones()
  if (!Array.isArray(st.paymentMethods) || !st.paymentMethods.length) {
    st.paymentMethods = defaultPaymentMethods()
    if (legacy.bkash) st.paymentMethods.find((m) => m.id === 'bKash').number = legacy.bkash
    if (legacy.nagad) st.paymentMethods.find((m) => m.id === 'Nagad').number = legacy.nagad
  }
  const out = { settings: st }
  COLLECTIONS.forEach((k) => (out[k] = Array.isArray(d[k]) ? d[k] : []))
  if (!out.units.length) out.units = s.units
  if (!out.expenseCats.length) out.expenseCats = s.expenseCats
  return out
}

// Converts the old single-file inventory backup (v2) into the new format
export function normalizeBackup(d) {
  if (!d || typeof d !== 'object' || !d.products || !d.sales) throw new Error('invalid')
  const out = withDefaults(d)
  const isOld = d.products[0] && (typeof d.products[0].category === 'string' || !('categoryId' in d.products[0]))
  if (isOld) {
    const catMap = new Map(out.categories.map((c) => [c.name, c.id]))
    out.products = d.products.map((p) => {
      let cid = ''
      if (p.category) {
        if (!catMap.has(p.category)) {
          const c = { id: uid(), name: p.category, icon: '📦', image: '', active: true }
          out.categories.push(c)
          catMap.set(p.category, c.id)
        }
        cid = catMap.get(p.category)
      }
      return {
        id: p.id || uid(), code: p.code || '', barcode: '', name: p.name, categoryId: cid, brandId: '',
        unit: p.unit || 'pcs', cost: +p.cost || 0, price: +p.price || 0, oldPrice: 0, stock: +p.stock || 0,
        description: '', images: [], featured: false, active: true, createdAt: nowISO(),
      }
    })
    out.sales = d.sales.map((s) => ({
      id: s.id || uid(), invoice: s.invoice, date: s.date, customerId: null, customer: s.customer || '',
      method: s.method === 'Mobile Banking' ? 'bKash' : s.method || 'Cash',
      items: s.items || [], subtotal: s.total, discount: 0, delivery: 0, total: s.total,
      paid: (s.total || 0) - (s.due || 0), due: s.due || 0, source: 'pos', note: '',
    }))
    out.customers = (d.customers || []).map((c) => ({ id: c.id || uid(), name: c.name, phone: c.phone || '', address: c.address || '', openingDue: +c.due || 0 }))
    out.suppliers = (d.suppliers || []).map((c) => ({ id: c.id || uid(), name: c.name, phone: c.phone || '', address: c.address || '', openingDue: +c.due || 0 }))
    out.purchases = (d.purchases || []).map((p) => ({
      id: p.id || uid(), date: p.date, supplierId: '', supplier: p.supplier || '', items: [], itemsCount: p.items || 0,
      total: p.total, paid: p.paid, due: p.due, method: 'Cash', note: '',
    }))
    out.expenses = (d.expenses || []).map((e) => ({ id: e.id || uid(), date: e.date, category: e.category, details: e.details, amount: e.amount, method: 'Cash' }))
  }
  return out
}

// What visitors may see: no costs, no sales / customers / suppliers / orders, no secrets.
export function buildPublicData(db) {
  const settings = {}
  PUBLIC_SETTINGS.forEach((k) => (settings[k] = db.settings[k]))
  settings.deliveryZones = (db.settings.deliveryZones || []).filter((z) => z.active !== false)
  settings.paymentMethods = (db.settings.paymentMethods || []).filter((m) => m.enabled)
  return {
    products: db.products.filter((p) => p.active !== false).map(({ cost, barcode, demo, ...p }) => p),
    categories: db.categories.filter((c) => c.active !== false).map(({ demo, ...c }) => c),
    brands: db.brands,
    banners: db.banners.filter((b) => b.active !== false).map(({ demo, ...b }) => b),
    settings,
  }
}

/* ======================= helpers ======================= */

export const nextNo = (list, field, prefix, pad = 5, start = 0) => {
  let max = start
  list.forEach((x) => {
    const m = String(x[field] || '').match(/(\d+)$/)
    if (m) max = Math.max(max, +m[1])
  })
  return prefix + String(max + 1).padStart(pad, '0')
}

export const saleProfit = (s) => (s.items || []).reduce((a, i) => a + (i.price - (i.cost || 0)) * i.qty, 0) - (s.discount || 0)
export const returnProfitImpact = (r) => -(r.amount || 0) + (r.restock ? (r.cost || 0) * r.qty : 0)
export const customerDue = (d, c) => (c.openingDue || 0) + d.sales.filter((s) => s.customerId === c.id).reduce((a, s) => a + (s.due || 0), 0)
export const supplierDue = (d, c) => (c.openingDue || 0) + d.purchases.filter((s) => s.supplierId === c.id).reduce((a, s) => a + (s.due || 0), 0)

export function recordSale(d, { items, customerId, customerName = '', method = 'Cash', discount = 0, delivery = 0, paid, source = 'pos', skipStock = false, note = '' }) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const total = Math.max(0, subtotal - discount + delivery)
  const pd = method === 'Due' ? 0 : paid == null || paid === '' ? total : Math.min(Math.max(+paid, 0), total)
  const due = +(total - pd).toFixed(2)
  if (!skipStock) items.forEach((i) => { const p = d.products.find((x) => x.id === i.id); if (p) p.stock -= i.qty })
  let cid = customerId || null
  let cname = customerName
  if (cid) cname = (d.customers.find((c) => c.id === cid) || {}).name || cname
  else if (cname) {
    let c = d.customers.find((x) => x.name.toLowerCase() === cname.toLowerCase())
    if (!c) { c = { id: uid(), name: cname, phone: '', address: '', openingDue: 0, createdAt: nowISO() }; d.customers.push(c) }
    cid = c.id
  }
  const sale = {
    id: uid(), invoice: nextNo(d.sales, 'invoice', 'SG-'), date: nowISO(), customerId: cid, customer: cname, method,
    items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, cost: i.cost || 0, qty: i.qty })),
    subtotal, discount, delivery, total, paid: pd, paid0: pd, due, source, note,
  }
  d.sales.push(sale)
  return sale
}

export function deleteSale(d, id) {
  const s = d.sales.find((x) => x.id === id)
  if (!s) return
  if (!(s.source === 'online' && s.orderId)) s.items.forEach((i) => { const p = d.products.find((x) => x.id === i.id); if (p) p.stock += i.qty })
  d.sales = d.sales.filter((x) => x.id !== id)
}

function payFifo(list, amount, ownerKey, ownerId) {
  let left = amount
  list.filter((x) => x[ownerKey] === ownerId && x.due > 0).sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((x) => {
    const t = Math.min(left, x.due)
    x.due = +(x.due - t).toFixed(2)
    x.paid = +((x.paid || 0) + t).toFixed(2)
    left -= t
  })
  return left
}
export function collectCustomerDue(d, customerId, amount, method = 'Cash') {
  const c = d.customers.find((x) => x.id === customerId)
  if (!c) return
  const left = payFifo(d.sales, amount, 'customerId', customerId)
  if (left > 0) { const t = Math.min(left, c.openingDue || 0); c.openingDue = +((c.openingDue || 0) - t).toFixed(2) }
  d.payments.push({ id: uid(), date: nowISO(), type: 'in', party: c.name, amount, method, note: 'বাকি আদায়' })
}
export function collectSaleDue(d, saleId, amount, method = 'Cash') {
  const s = d.sales.find((x) => x.id === saleId)
  if (!s) return
  const t = Math.min(amount, s.due)
  s.due = +(s.due - t).toFixed(2)
  s.paid = +((s.paid || 0) + t).toFixed(2)
  d.payments.push({ id: uid(), date: nowISO(), type: 'in', party: s.customer || 'Walk-in', amount: t, method, note: 'ইনভয়েস ' + s.invoice })
}
export function paySupplierDue(d, supplierId, amount, method = 'Cash') {
  const c = d.suppliers.find((x) => x.id === supplierId)
  if (!c) return
  const left = payFifo(d.purchases, amount, 'supplierId', supplierId)
  if (left > 0) { const t = Math.min(left, c.openingDue || 0); c.openingDue = +((c.openingDue || 0) - t).toFixed(2) }
  d.payments.push({ id: uid(), date: nowISO(), type: 'out', party: c.name, amount, method, note: 'সরবরাহকারী পেমেন্ট' })
}

export function recordPurchase(d, { supplierId, supplierName, items, paid, method = 'Cash', note = '' }) {
  const total = items.reduce((s, i) => s + i.cost * i.qty, 0)
  const pd = Math.min(Math.max(+paid || 0, 0), total)
  const sid = supplierId || ''
  let sname = supplierName || ''
  if (sid) sname = (d.suppliers.find((x) => x.id === sid) || {}).name || sname
  items.forEach((i) => {
    const p = d.products.find((x) => x.id === i.id)
    if (p) { p.stock += i.qty; if (i.cost > 0) p.cost = i.cost }
  })
  d.purchases.push({
    id: uid(), date: nowISO(), supplierId: sid, supplier: sname, items: items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, cost: i.cost })),
    itemsCount: items.reduce((s, i) => s + i.qty, 0), total, paid: pd, paid0: pd, due: +(total - pd).toFixed(2), method, note,
  })
}

export function couponDiscount(d, code, subtotal) {
  const c = d.coupons.find((x) => x.active && x.code.toLowerCase() === String(code || '').trim().toLowerCase())
  if (!c) return { ok: false, msg: 'কুপন কোডটি সঠিক নয়', discount: 0 }
  if (c.expires && new Date(c.expires) < new Date(new Date().toDateString())) return { ok: false, msg: 'কুপনের মেয়াদ শেষ', discount: 0 }
  if (subtotal < (c.minOrder || 0)) return { ok: false, msg: `এই কুপনের জন্য সর্বনিম্ন অর্ডার ৳${c.minOrder}`, discount: 0 }
  let disc = c.type === 'percent' ? (subtotal * c.value) / 100 : c.value
  if (c.type === 'percent' && c.maxDiscount) disc = Math.min(disc, c.maxDiscount)
  return { ok: true, discount: Math.round(Math.min(disc, subtotal)), code: c.code, msg: 'কুপন প্রয়োগ হয়েছে' }
}

/* ---------- delivery & payment (configured by the admin) ---------- */
export const activeZones = (settings) => (settings.deliveryZones || []).filter((z) => z.active !== false)
export const activePayments = (settings) => (settings.paymentMethods || []).filter((m) => m.enabled)
export const payLabel = (settings, id) => (settings.paymentMethods || []).find((m) => m.id === id)?.label || id

// returns null when the zone does not exist / is switched off
export function deliveryFor(settings, subtotal, zoneId) {
  const z = activeZones(settings).find((x) => x.id === zoneId)
  if (!z) return null
  const free = +settings.freeDeliveryOver || 0
  return free > 0 && subtotal >= free ? 0 : Math.max(0, +z.charge || 0)
}

const cleanStr = (v, max) => String(v ?? '').trim().slice(0, max)

export function placeOrder(d, { customer, userId, items, couponCode, zoneId, payMethod, trxId, note }) {
  const lines = []
  const seen = new Set()
  for (const it of items || []) {
    const qty = Math.floor(+it.qty)
    if (!(qty > 0) || qty > 999 || seen.has(it.id)) return { ok: false, msg: 'কার্টে সমস্যা আছে, আবার চেষ্টা করুন' }
    seen.add(it.id)
    const p = d.products.find((x) => x.id === it.id && x.active !== false)
    if (!p) return { ok: false, msg: 'একটি পণ্য আর পাওয়া যাচ্ছে না, কার্ট আপডেট করুন' }
    if (p.stock < qty) return { ok: false, msg: `"${p.name}" এর স্টকে মাত্র ${p.stock}টি আছে` }
    lines.push({ id: p.id, name: p.name, price: p.price, cost: p.cost || 0, qty })
  }
  if (!lines.length) return { ok: false, msg: 'কার্ট খালি' }
  const pm = activePayments(d.settings).find((m) => m.id === payMethod)
  if (!pm) return { ok: false, msg: 'এই পেমেন্ট পদ্ধতিটি এখন চালু নেই' }
  const trx = cleanStr(trxId, 40)
  if (pm.needsTrx && trx.length < 6) return { ok: false, msg: 'পেমেন্টের TrxID দিন' }
  const subtotal = lines.reduce((s, i) => s + i.price * i.qty, 0)
  let discount = 0, coupon = ''
  if (couponCode) {
    const r = couponDiscount(d, couponCode, subtotal)
    if (r.ok) { discount = r.discount; coupon = r.code }
  }
  const delivery = deliveryFor(d.settings, subtotal - discount, zoneId)
  if (delivery === null) return { ok: false, msg: 'ডেলিভারি এলাকা নির্বাচন করুন' }
  const zone = activeZones(d.settings).find((z) => z.id === zoneId)
  const total = subtotal - discount + delivery
  const cust = { name: cleanStr(customer.name, 80), phone: cleanStr(customer.phone, 20), address: cleanStr(customer.address, 300) }
  let c = cust.phone && d.customers.find((x) => x.phone === cust.phone)
  if (!c) { c = { id: uid(), name: cust.name, phone: cust.phone, address: cust.address, openingDue: 0, createdAt: nowISO() }; d.customers.push(c) }
  const order = {
    id: uid(), no: nextNo(d.orders, 'no', 'SO-', 4, 1000), createdAt: nowISO(), status: 'pending', customerId: c.id, userId: userId || null,
    customer: cust, items: lines, subtotal, discount, coupon, zoneId, zoneName: zone.name, delivery, total,
    payMethod, payLabel: pm.label, trxId: trx, note: cleanStr(note, 300),
    stockDeducted: false, saleId: null, history: [{ status: 'pending', at: nowISO() }],
  }
  d.orders.push(order)
  return { ok: true, order }
}

export const ORDER_FLOW = ['pending', 'confirmed', 'shipped', 'delivered']
export function setOrderStatus(d, id, status) {
  const o = d.orders.find((x) => x.id === id)
  if (!o) return { ok: false, msg: 'অর্ডার পাওয়া যায়নি' }
  if (o.status === status) return { ok: true }
  if (['delivered', 'cancelled'].includes(o.status)) return { ok: false, msg: 'এই অর্ডারের স্ট্যাটাস আর বদলানো যাবে না' }
  const needStock = ['confirmed', 'shipped', 'delivered'].includes(status)
  if (needStock && !o.stockDeducted) {
    for (const it of o.items) {
      const p = d.products.find((x) => x.id === it.id)
      if (p && p.stock < it.qty) return { ok: false, msg: `"${it.name}" এর স্টক কম (আছে ${p.stock})` }
    }
    o.items.forEach((it) => { const p = d.products.find((x) => x.id === it.id); if (p) p.stock -= it.qty })
    o.stockDeducted = true
  }
  if (status === 'cancelled' && o.stockDeducted) {
    o.items.forEach((it) => { const p = d.products.find((x) => x.id === it.id); if (p) p.stock += it.qty })
    o.stockDeducted = false
  }
  if (status === 'delivered' && !o.saleId) {
    const s = recordSale(d, {
      items: o.items, customerId: o.customerId, customerName: o.customer.name, method: o.payMethod === 'cod' ? 'Cash' : (o.payLabel || o.payMethod),
      discount: o.discount, delivery: o.delivery, paid: o.total, source: 'online', skipStock: true, note: 'অনলাইন অর্ডার ' + o.no,
    })
    s.orderId = o.id
    o.saleId = s.id
  }
  o.status = status
  o.history.push({ status, at: nowISO() })
  return { ok: true }
}

// Admin changes the delivery charge of one order (before it is shipped)
export function setOrderDelivery(d, id, delivery) {
  const o = d.orders.find((x) => x.id === id)
  if (!o) return { ok: false, msg: 'অর্ডার পাওয়া যায়নি' }
  if (!['pending', 'confirmed'].includes(o.status)) return { ok: false, msg: 'এই অর্ডারের ডেলিভারি চার্জ আর বদলানো যাবে না' }
  const v = Math.max(0, +delivery || 0)
  o.delivery = v
  o.total = Math.max(0, o.subtotal - (o.discount || 0) + v)
  return { ok: true }
}

// Customer cancels their own order — only while it is still pending (stock is not reserved yet)
export function customerCancel(d, no, userId) {
  const o = d.orders.find((x) => x.no === no && x.userId === userId)
  if (!o) return { ok: false, msg: 'অর্ডার পাওয়া যায়নি' }
  if (o.status !== 'pending') return { ok: false, msg: 'অর্ডার কনফার্ম হয়ে গেছে, বাতিল করতে আমাদের কল করুন' }
  return setOrderStatus(d, o.id, 'cancelled')
}

export function addReturn(d, { productId, qty, amount, reason, restock, invoice }) {
  const p = d.products.find((x) => x.id === productId)
  if (!p) return
  if (restock) p.stock += qty
  d.returns.push({ id: uid(), date: nowISO(), productId, name: p.name, qty, amount, cost: p.cost || 0, restock, reason, invoice })
}
export function addDamage(d, { productId, qty, reason }) {
  const p = d.products.find((x) => x.id === productId)
  if (!p) return
  p.stock -= qty
  d.damages.push({ id: uid(), date: nowISO(), productId, name: p.name, qty, cost: p.cost || 0, reason })
}

// Merge changes that arrived on the server while the admin was editing an older copy.
// `server` = newer copy, `incoming` = the admin's copy (returned, mutated). New orders / customers are kept.
export function mergeStale(server, incoming, baseAt) {
  const out = incoming
  server.orders.forEach((so) => {
    const mine = out.orders.find((o) => o.id === so.id)
    if (!mine) { out.orders.push(so); return }
    if ((so.history?.length || 0) > (mine.history?.length || 0)) out.orders[out.orders.indexOf(mine)] = so // e.g. customer cancelled
  })
  const cIds = new Set(out.customers.map((c) => c.id))
  server.customers.forEach((c) => { if (!cIds.has(c.id) && c.createdAt && c.createdAt > baseAt) out.customers.push(c) })
  return out
}
