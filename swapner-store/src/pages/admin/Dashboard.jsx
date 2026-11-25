import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, saleProfit, returnProfitImpact } from '../../lib/store'
import { money, moneyShort, RANGES, rangeBounds, inRange, dayKey, fmtDateTime } from '../../lib/format'
import { StatusPill } from '../../components/ui'

const LABEL = { Today: 'Today', Yesterday: 'Yesterday', 'This Week': 'This-week', 'This Month': 'This-month', 'This Year': 'This-year', All: 'All-time' }

export default function Dashboard() {
  const { db } = useStore()
  const [range, setRange] = useState('This Month')
  const b = rangeBounds(range)

  const sales = db.sales.filter((s) => inRange(s.date, b))
  const purchases = db.purchases.filter((s) => inRange(s.date, b))
  const expenses = db.expenses.filter((s) => inRange(s.date, b))
  const returns = db.returns.filter((s) => inRange(s.date, b))
  const damages = db.damages.filter((s) => inRange(s.date, b))
  const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0)

  const saleTotal = sum(sales, (s) => s.total)
  const purchaseTotal = sum(purchases, (s) => s.total)
  const expenseTotal = sum(expenses, (s) => s.amount)
  const profit = sum(sales, saleProfit) + sum(returns, returnProfitImpact) - expenseTotal - sum(damages, (x) => x.cost * x.qty)

  const allPurchaseDue = sum(db.purchases, (p) => p.due) + sum(db.suppliers, (s) => s.openingDue)
  const allSalesDue = sum(db.sales, (s) => s.due) + sum(db.customers, (s) => s.openingDue)
  const stockValue = sum(db.products, (p) => p.stock * p.cost)
  const low = db.products.filter((p) => p.active !== false && p.stock <= db.settings.lowStock)
  const pendingOrders = db.orders.filter((o) => o.status === 'pending')

  // last 7 days chart
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d })
  const byDay = Object.fromEntries(days.map((d) => [dayKey(d), 0]))
  db.sales.forEach((s) => { const k = dayKey(new Date(s.date)); if (k in byDay) byDay[k] += s.total })
  const max = Math.max(1, ...Object.values(byDay))

  const L = LABEL[range]
  return (
    <>
      <div className="range">
        {RANGES.map((r) => (
          <button key={r} className={r === range ? 'selected' : ''} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>
      <div className="metrics">
        <Metric label={`${L} Sale`} value={money(saleTotal)} />
        <Metric label={`${L} Purchase`} value={money(purchaseTotal)} />
        <Metric label={`${L} Expense`} value={money(expenseTotal)} />
        <Metric label={`${L} Profit`} value={money(profit)} color={profit < 0 ? '#e74b5c' : undefined} />
      </div>
      <div className="panels">
        <div className="panel">
          <Stat label="Total Purchase Due" v={moneyShort(allPurchaseDue)} />
          <Stat label="Total Purchase Amount" v={moneyShort(sum(db.purchases, (p) => p.total))} color="#ff8132" />
          <Stat label="Total Product" v={db.products.length} last />
        </div>
        <div className="panel">
          <Stat label="Total Sales Due" v={moneyShort(allSalesDue)} color="#12b66c" />
          <Stat label="Total Sales Amount" v={moneyShort(sum(db.sales, (s) => s.total))} color="#00a8e8" />
          <Stat label="Total Customer" v={db.customers.length} last />
        </div>
        <div className="panel">
          <Stat label="Total Return Amount" v={moneyShort(sum(db.returns, (r) => r.amount))} />
          <Stat label="Available Stock Amount" v={moneyShort(stockValue)} color="#fa315b" />
          <Stat label="Total Invoice" v={db.sales.length} last />
        </div>
      </div>

      <div className="dash2">
        <div className="panel">
          <div className="ptitle">গত ৭ দিনের বিক্রি</div>
          <div className="bars">
            {days.map((d) => {
              const v = byDay[dayKey(d)]
              return (
                <div key={dayKey(d)} className="bar-col" title={money(v)}>
                  <div className="bar-val">{v ? Math.round(v).toLocaleString('en-BD') : ''}</div>
                  <div className="bar" style={{ height: Math.max(3, (v / max) * 110) }} />
                  <div className="bar-lbl">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="panel">
          <div className="ptitle">
            নতুন অনলাইন অর্ডার {pendingOrders.length > 0 && <span className="badge inline">{pendingOrders.length}</span>}
            <Link to="/admin/orders" className="plink">সব দেখুন →</Link>
          </div>
          {pendingOrders.slice(-4).reverse().map((o) => (
            <div className="rowline" key={o.id}>
              <span><b>{o.no}</b> · {o.customer.name}<small>{fmtDateTime(o.createdAt)}</small></span>
              <span>{money(o.total)} <StatusPill s={o.status} /></span>
            </div>
          ))}
          {!pendingOrders.length && <div className="empty small">কোনো পেন্ডিং অর্ডার নেই</div>}
        </div>
        <div className="panel">
          <div className="ptitle">
            স্টক কম ({low.length})<Link to="/admin/stock" className="plink">স্টক রিপোর্ট →</Link>
          </div>
          {low.slice(0, 5).map((p) => (
            <div className="rowline" key={p.id}>
              <span>{p.name}</span>
              <span style={{ color: p.stock <= 0 ? '#e74b5c' : '#b7791f', fontWeight: 700 }}>{p.stock} {p.unit}</span>
            </div>
          ))}
          {!low.length && <div className="empty small">সব পণ্যের স্টক ঠিক আছে ✓</div>}
        </div>
      </div>
    </>
  )
}

const Metric = ({ label, value, color }) => (
  <div className="metric">
    <div className="label">{label}</div>
    <div className="value" style={color ? { color } : undefined}>{value}</div>
    <div className="accent" />
  </div>
)
const Stat = ({ label, v, color, last }) => (
  <div className="stat">
    <label>{label}</label>
    <strong>{v}</strong>
    {!last && <div className="rule" style={color ? { background: color } : undefined} />}
  </div>
)
