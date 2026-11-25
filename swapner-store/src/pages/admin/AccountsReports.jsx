import { useMemo, useState } from 'react'
import { useStore, saleProfit, returnProfitImpact } from '../../lib/store'
import { money, fmtDate, fmtDateTime, REPORT_RANGES, rangeBounds, dayKey, downloadCSV } from '../../lib/format'

const BASE_METHODS = ['Cash', 'bKash', 'Nagad', 'Card', 'Bank']
const sum = (a, f) => a.reduce((s, x) => s + (+f(x) || 0), 0)
// 'YYYY-MM-DD' strings (from date inputs) are local dates; everything else is an ISO timestamp
const dt = (x) => (/^\d{4}-\d{2}-\d{2}$/.test(String(x)) ? new Date(+x.slice(0, 4), +x.slice(5, 7) - 1, +x.slice(8, 10)) : new Date(x))
const within = (x, b) => !b || (dt(x) >= b[0] && dt(x) < b[1])

export function Accounts() {
  const { db } = useStore()
  const methods = [...new Set([...BASE_METHODS, ...db.sales.map((s) => s.method), ...db.payments.map((p) => p.method), ...db.purchases.map((p) => p.method || 'Cash'), ...db.expenses.map((e) => e.method || 'Cash')].filter(Boolean))]
  const rows = methods.map((m) => {
    const inc =
      sum(db.sales.filter((s) => s.method === m), (s) => s.paid0 ?? s.paid) +
      sum(db.payments.filter((p) => p.type === 'in' && p.method === m), (p) => p.amount)
    const out =
      sum(db.purchases.filter((p) => (p.method || 'Cash') === m), (p) => p.paid0 ?? p.paid) +
      sum(db.payments.filter((p) => p.type === 'out' && p.method === m), (p) => p.amount) +
      sum(db.expenses.filter((e) => (e.method || 'Cash') === m), (e) => e.amount) +
      (m === 'Cash' ? sum(db.returns, (r) => r.amount) : 0)
    return { m, inc, out, bal: inc - out }
  })
  const tot = (k) => sum(rows, (r) => r[k])
  return (
    <>
      <div className="pagehead"><h2>Accounts / হিসাব</h2></div>
      <div className="notice box">বিক্রি, ক্রয়, খরচ, রিটার্ন ও বাকি আদায়-পরিশোধ থেকে নিজে থেকেই মাধ্যম অনুযায়ী টাকার হিসাব তৈরি হয়। (শুরুর ব্যালেন্স ধরা নেই)</div>
      <div className="metrics">
        <div className="metric"><div className="label">মোট আয় (Cash In)</div><div className="value">{money(tot('inc'))}</div><div className="accent" /></div>
        <div className="metric"><div className="label">মোট ব্যয় (Cash Out)</div><div className="value">{money(tot('out'))}</div><div className="accent" /></div>
        <div className="metric"><div className="label">নিট ব্যালেন্স</div><div className="value">{money(tot('bal'))}</div><div className="accent" /></div>
        <div className="metric"><div className="label">হাতে নগদ (Cash)</div><div className="value">{money(rows[0].bal)}</div><div className="accent" /></div>
      </div>
      <div className="tablecard">
        <table>
          <thead><tr><th>Method</th><th>In</th><th>Out</th><th>Balance</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.m}><td><b>{r.m}</b></td><td>{money(r.inc)}</td><td>{money(r.out)}</td><td style={{ fontWeight: 700 }}>{money(r.bal)}</td></tr>)}</tbody>
        </table>
      </div>
      <h3 style={{ margin: '18px 2px 8px' }}>সাম্প্রতিক বাকি আদায় / পরিশোধ</h3>
      <div className="tablecard">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Party</th><th>Method</th><th>Amount</th><th>Note</th></tr></thead>
          <tbody>
            {db.payments.slice().reverse().slice(0, 30).map((p) => (
              <tr key={p.id}><td>{fmtDateTime(p.date)}</td><td>{p.type === 'in' ? '⬇ জমা' : '⬆ পরিশোধ'}</td><td>{p.party}</td><td>{p.method}</td><td>{money(p.amount)}</td><td>{p.note}</td></tr>
            ))}
            {!db.payments.length && <tr><td colSpan="6" className="empty">কিছু নেই</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function Reports() {
  const { db } = useStore()
  const [period, setPeriod] = useState('This Week')
  const [from, setFrom] = useState(dayKey(new Date(Date.now() - 6 * 864e5)))
  const [to, setTo] = useState(dayKey(new Date()))

  const bounds = useMemo(() => {
    if (period === 'Custom') {
      if (!from || !to) return [new Date(0), new Date(0)]
      const a = dt(from), b = dt(to)
      return [a, new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1)]
    }
    return rangeBounds(period)
  }, [period, from, to])

  const sales = db.sales.filter((s) => within(s.date, bounds))
  const purchases = db.purchases.filter((s) => within(s.date, bounds))
  const expenses = db.expenses.filter((s) => within(s.date, bounds))
  const returns = db.returns.filter((s) => within(s.date, bounds))
  const damages = db.damages.filter((s) => within(s.date, bounds))
  const orders = db.orders.filter((o) => within(o.createdAt, bounds))

  const salesTotal = sum(sales, (s) => s.total)
  const online = sales.filter((s) => s.source === 'online')
  const pos = sales.filter((s) => s.source !== 'online')
  const dmgLoss = sum(damages, (x) => x.cost * x.qty)
  const gross = sum(sales, saleProfit) + sum(returns, returnProfitImpact)
  const net = gross - sum(expenses, (e) => e.amount) - dmgLoss

  // breakdown rows: per day (≤ 62 days) or per month
  const spanDays = bounds ? Math.round((bounds[1] - bounds[0]) / 864e5) : Infinity
  const monthly = spanDays > 62
  const keyOf = (x) => { const d = dt(x); return monthly ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : dayKey(d) }
  const rowsMap = new Map()
  const bucket = (k) => { if (!rowsMap.has(k)) rowsMap.set(k, { k, n: 0, sale: 0, buy: 0, exp: 0, profit: 0 }); return rowsMap.get(k) }
  if (bounds && !monthly) for (let t = new Date(bounds[0]); t < bounds[1]; t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)) bucket(dayKey(t))
  sales.forEach((s) => { const r = bucket(keyOf(s.date)); r.n += 1; r.sale += s.total; r.profit += saleProfit(s) })
  purchases.forEach((p) => { bucket(keyOf(p.date)).buy += p.total })
  expenses.forEach((e) => { const r = bucket(keyOf(e.date)); r.exp += e.amount; r.profit -= e.amount })
  returns.forEach((x) => { bucket(keyOf(x.date)).profit += returnProfitImpact(x) })
  damages.forEach((x) => { bucket(keyOf(x.date)).profit -= x.cost * x.qty })
  const breakdown = [...rowsMap.values()].sort((a, b) => (a.k < b.k ? -1 : 1))

  const prod = {}
  sales.forEach((s) => s.items.forEach((i) => {
    prod[i.id] = prod[i.id] || { name: i.name, qty: 0, rev: 0, profit: 0 }
    prod[i.id].qty += i.qty; prod[i.id].rev += i.qty * i.price; prod[i.id].profit += i.qty * (i.price - (i.cost || 0))
  }))
  const top = Object.values(prod).sort((a, b) => b.rev - a.rev).slice(0, 10)
  const byMethod = {}
  sales.forEach((s) => { byMethod[s.method] = (byMethod[s.method] || 0) + s.total })
  const byExp = {}
  expenses.forEach((e) => { byExp[e.category] = (byExp[e.category] || 0) + e.amount })
  const low = db.products.filter((p) => p.stock <= db.settings.lowStock).sort((a, b) => a.stock - b.stock)
  const stockValue = sum(db.products, (p) => p.stock * p.cost)

  const label = period === 'Custom' ? 'নিজের তারিখ' : REPORT_RANGES.find(([k]) => k === period)[1]
  const periodText = bounds
    ? `${fmtDate(bounds[0])} — ${fmtDate(new Date(bounds[1].getTime() - 1))}`
    : 'শুরু থেকে আজ পর্যন্ত'
  const cnt = (st) => orders.filter((o) => o.status === st).length
  const colLabel = (k) => (monthly ? new Date(k + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : new Date(k).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }))

  const printIt = () => window.print()
  const csv = () =>
    downloadCSV(`report-${dayKey(new Date())}.csv`, [monthly ? 'Month' : 'Date', 'Invoices', 'Sales', 'Purchase', 'Expense', 'Profit'],
      breakdown.map((r) => [r.k, r.n, r.sale, r.buy, r.exp, r.profit]))

  return (
    <>
      <div className="pagehead no-print"><h2>Reports & Analysis / রিপোর্ট</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={csv}>⬇ CSV</button>
          <button className="btn" onClick={printIt}>🖨 প্রিন্ট / PDF</button>
        </div>
      </div>
      <div className="range no-print" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
        {REPORT_RANGES.map(([k, l]) => <button key={k} className={period === k ? 'selected' : ''} onClick={() => setPeriod(k)}>{l}</button>)}
      </div>
      {period === 'Custom' && (
        <div className="toolbar no-print" style={{ padding: '0 0 10px', gap: 6 }}>
          <span style={{ fontSize: 12 }}>শুরু</span><input type="date" className="cell" style={{ width: 150 }} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ fontSize: 12 }}>শেষ</span><input type="date" className="cell" style={{ width: 150 }} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
      )}
      <div className="notice box no-print">প্রিন্ট বাটন চাপলে ব্রাউজারের প্রিন্ট উইন্ডো খুলবে — সেখান থেকে প্রিন্টার বা “Save as PDF” বেছে নিতে পারবেন।</div>

      <div className="report-print">
        <div className="rp-head">
          <img src="logo.png" alt="" />
          <div>
            <h1>{db.settings.shopName}</h1>
            <div>{db.settings.address}{db.settings.phone ? ` · ফোন: ${db.settings.phone}` : ''}</div>
          </div>
          <div className="rp-title"><b>বিক্রয় ও লাভ-ক্ষতি রিপোর্ট</b><span>{label} — {periodText}</span><small>তৈরি: {fmtDateTime(new Date().toISOString())}</small></div>
        </div>

        <div className="metrics">
          <div className="metric"><div className="label">মোট বিক্রি ({sales.length} ইনভয়েস)</div><div className="value">{money(salesTotal)}</div><div className="accent" /></div>
          <div className="metric"><div className="label">মোট ক্রয়</div><div className="value">{money(sum(purchases, (p) => p.total))}</div><div className="accent" /></div>
          <div className="metric"><div className="label">মোট খরচ</div><div className="value">{money(sum(expenses, (e) => e.amount))}</div><div className="accent" /></div>
          <div className="metric"><div className="label">নিট প্রফিট</div><div className="value" style={{ color: net < 0 ? '#e74b5c' : undefined }}>{money(net)}</div><div className="accent" /></div>
        </div>

        <div className="rp-grid">
          <table className="rp-table">
            <thead><tr><th colSpan="2">সারসংক্ষেপ</th></tr></thead>
            <tbody>
              <tr><td>দোকানের বিক্রি (POS)</td><td>{money(sum(pos, (s) => s.total))} <small>({pos.length})</small></td></tr>
              <tr><td>অনলাইন বিক্রি</td><td>{money(sum(online, (s) => s.total))} <small>({online.length})</small></td></tr>
              <tr><td>বিক্রির ডেলিভারি চার্জ আদায়</td><td>{money(sum(sales, (s) => s.delivery))}</td></tr>
              <tr><td>ছাড় দেওয়া হয়েছে</td><td>{money(sum(sales, (s) => s.discount))}</td></tr>
              <tr><td>এই সময়ের বাকি (Due)</td><td>{money(sum(sales, (s) => s.due))}</td></tr>
              <tr><td>রিটার্ন (রিফান্ড)</td><td>{money(sum(returns, (r) => r.amount))}</td></tr>
              <tr><td>ড্যামেজ ক্ষতি</td><td>{money(dmgLoss)}</td></tr>
              <tr><td><b>গ্রস প্রফিট</b></td><td><b>{money(gross)}</b></td></tr>
              <tr><td><b>নিট প্রফিট (খরচ ও ক্ষতি বাদে)</b></td><td><b>{money(net)}</b></td></tr>
              <tr><td>বর্তমান স্টকের মূল্য (ক্রয়মূল্যে)</td><td>{money(stockValue)}</td></tr>
            </tbody>
          </table>
          <div>
            <table className="rp-table">
              <thead><tr><th colSpan="2">অনলাইন অর্ডার ({orders.length})</th></tr></thead>
              <tbody>
                {Object.entries({ pending: 'পেন্ডিং', confirmed: 'কনফার্মড', shipped: 'শিপড', delivered: 'ডেলিভারড', cancelled: 'বাতিল' }).map(([k, l]) => <tr key={k}><td>{l}</td><td>{cnt(k)}</td></tr>)}
              </tbody>
            </table>
            <table className="rp-table" style={{ marginTop: 10 }}>
              <thead><tr><th colSpan="2">পেমেন্ট মাধ্যম অনুযায়ী বিক্রি</th></tr></thead>
              <tbody>
                {Object.entries(byMethod).map(([k, v]) => <tr key={k}><td>{k}</td><td>{money(v)}</td></tr>)}
                {!Object.keys(byMethod).length && <tr><td colSpan="2" className="muted">ডেটা নেই</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <h3 className="rp-h">{monthly ? 'মাস অনুযায়ী হিসাব' : 'দিন অনুযায়ী হিসাব'}</h3>
        <table className="rp-table full">
          <thead><tr><th>{monthly ? 'মাস' : 'তারিখ'}</th><th>ইনভয়েস</th><th>বিক্রি</th><th>ক্রয়</th><th>খরচ</th><th>লাভ/ক্ষতি</th></tr></thead>
          <tbody>
            {breakdown.map((r) => (
              <tr key={r.k}><td>{colLabel(r.k)}</td><td>{r.n}</td><td>{money(r.sale)}</td><td>{money(r.buy)}</td><td>{money(r.exp)}</td><td style={{ color: r.profit < 0 ? '#c0392b' : undefined }}>{money(r.profit)}</td></tr>
            ))}
            {!breakdown.length && <tr><td colSpan="6" className="muted">ডেটা নেই</td></tr>}
          </tbody>
          {breakdown.length > 0 && (
            <tfoot><tr><td><b>মোট</b></td><td><b>{sales.length}</b></td><td><b>{money(salesTotal)}</b></td><td><b>{money(sum(purchases, (p) => p.total))}</b></td><td><b>{money(sum(expenses, (e) => e.amount))}</b></td><td><b>{money(net)}</b></td></tr></tfoot>
          )}
        </table>

        <div className="rp-grid">
          <div>
            <h3 className="rp-h">সেরা বিক্রিত পণ্য (Top 10)</h3>
            <table className="rp-table full">
              <thead><tr><th>#</th><th>পণ্য</th><th>পরিমাণ</th><th>বিক্রি</th><th>লাভ</th></tr></thead>
              <tbody>
                {top.map((p, i) => <tr key={i}><td>{i + 1}</td><td>{p.name}</td><td>{p.qty}</td><td>{money(p.rev)}</td><td>{money(p.profit)}</td></tr>)}
                {!top.length && <tr><td colSpan="5" className="muted">এই সময়ে কোনো বিক্রি নেই</td></tr>}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="rp-h">খরচের বিবরণ</h3>
            <table className="rp-table full">
              <thead><tr><th>খাত</th><th>টাকা</th></tr></thead>
              <tbody>
                {Object.entries(byExp).map(([k, v]) => <tr key={k}><td>{k}</td><td>{money(v)}</td></tr>)}
                {!Object.keys(byExp).length && <tr><td colSpan="2" className="muted">কোনো খরচ নেই</td></tr>}
              </tbody>
            </table>
            <h3 className="rp-h">স্টক কম / শেষ ({low.length})</h3>
            <table className="rp-table full">
              <thead><tr><th>পণ্য</th><th>স্টক</th></tr></thead>
              <tbody>
                {low.slice(0, 12).map((p) => <tr key={p.id}><td>{p.name}</td><td style={{ color: p.stock <= 0 ? '#c0392b' : undefined }}>{p.stock} {p.unit}</td></tr>)}
                {!low.length && <tr><td colSpan="2" className="muted">সব পণ্যের স্টক ঠিক আছে</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rp-sign"><span>প্রস্তুতকারক</span><span>অনুমোদনকারী (মালিক)</span></div>
      </div>

      <div className="no-print">
        <h3 style={{ margin: '18px 2px 8px' }}>Export (CSV)</h3>
        <div className="tablecard"><div className="toolbar" style={{ flexWrap: 'wrap' }}>
          <button className="btn secondary" onClick={() => downloadCSV('sales.csv', ['Invoice', 'Date', 'Customer', 'Source', 'Payment', 'Total', 'Paid', 'Due'], sales.map((s) => [s.invoice, s.date, s.customer, s.source, s.method, s.total, s.paid, s.due]))}>Sales</button>
          <button className="btn secondary" onClick={() => downloadCSV('purchases.csv', ['Date', 'Supplier', 'Items', 'Total', 'Paid', 'Due'], purchases.map((p) => [p.date, p.supplier, p.itemsCount, p.total, p.paid, p.due]))}>Purchases</button>
          <button className="btn secondary" onClick={() => downloadCSV('expenses.csv', ['Date', 'Category', 'Details', 'Amount'], expenses.map((e) => [e.date, e.category, e.details, e.amount]))}>Expenses</button>
          <button className="btn secondary" onClick={() => downloadCSV('orders.csv', ['Order', 'Date', 'Name', 'Phone', 'Address', 'Status', 'Payment', 'TrxID', 'Total'], orders.map((o) => [o.no, o.createdAt, o.customer.name, o.customer.phone, o.customer.address, o.status, o.payLabel || o.payMethod, o.trxId, o.total]))}>Online Orders</button>
        </div></div>
      </div>
    </>
  )
}
