// ─── Dashboard.jsx ────────────────────────────────────────────────────────────
// Main overview page — stat cards, 7-day chart, recent sales, pending debts,
// and stock alerts.
// To modify: add more stat cards, change chart type, add more sections.
// ─────────────────────────────────────────────────────────────────────────────
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { GRN, RED, AMB, BLU, PUR } from '../data/constants.js'
import { todayStr, fmtD, thisWeekRange, thisMonthRange, inRange } from '../utils/helpers.js'
import { Badge, Stat, SecTitle, ChartTip } from '../components/UI.jsx'

export default function Dashboard({ products, sales, expenses, lending, borrowing, T, L, cur }) {
  const td          = todayStr()
  const [wd, wd2]   = thisWeekRange()
  const [md]        = thisMonthRange()

  // ── Stat calculations ──────────────────────────────────────────────────────
  const todayRev  = sales.filter(s => s.date.slice(0, 10) === td).reduce((a, s) => a + s.amountPaid, 0)
  const todayExp  = expenses.filter(e => e.date === td).reduce((a, e) => a + e.amount, 0)
  const profit    = todayRev - todayExp
  const uncol     = lending.filter(l => l.status === 'Pending' && l.source === 'sale').reduce((a, l) => a + l.amount, 0)
  const weekRev   = sales.filter(s => inRange(s.date, [wd, wd2])).reduce((a, s) => a + s.amountPaid, 0)
  const monthRev  = sales.filter(s => s.date.slice(0, 7) === md.slice(0, 7)).reduce((a, s) => a + s.amountPaid, 0)

  // ── Last 7 days chart data ─────────────────────────────────────────────────
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i)
    const ds = d.toISOString().slice(0, 10)
    return {
      day:      d.toLocaleDateString('en-GB', { weekday: 'short' }),
      Revenue:  sales.filter(s => s.date.slice(0, 10) === ds).reduce((a, s) => a + s.amountPaid, 0),
      Expenses: expenses.filter(e => e.date === ds).reduce((a, e) => a + e.amount, 0),
    }
  })

  const recent  = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
  const plend   = lending.filter(l => l.status === 'Pending').slice(0, 4)
  const pborr   = borrowing.filter(b => b.status === 'Pending').slice(0, 4)
  const lowStk  = products.filter(p => p.stock <= 3 && p.stock > 0)
  const outStk  = products.filter(p => p.stock === 0)

  return (
    <div className="fade-in">

      {/* ── Page header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="dm" style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary }}>{L.dashboard}</h1>
        <p style={{ color: T.textSecondary, fontSize: 13, marginTop: 2 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="stat-grid">
        <Stat label={L.todayRevenue}  value={cur(todayRev)} color={GRN}                      icon="💰" T={T} />
        <Stat label={L.todayExpenses} value={cur(todayExp)} color={RED}                      icon="💸" T={T} />
        <Stat label={L.todayProfit}   value={cur(profit)}   color={profit >= 0 ? T.accent : RED} icon="📊" T={T} />
        <Stat label={L.uncollected}   value={cur(uncol)}    color={AMB}                      icon="⏳" T={T} />
        <Stat label={L.thisWeek}      value={cur(weekRev)}  color={BLU}                      icon="📅" T={T} />
        <Stat label={L.thisMonth}     value={cur(monthRev)} color={PUR}                      icon="🗓️" T={T} />
      </div>

      {/* ── 7-day chart ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <SecTitle T={T}>📊 {L.revenueVsExp} — Last 7 Days</SecTitle>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={last7} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis dataKey="day"    tick={{ fill: T.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: T.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} width={52} tickFormatter={v => cur(v, true)} />
            <Tooltip content={<ChartTip cur={cur} T={T} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: T.textSecondary }} />
            <Bar dataKey="Revenue"  fill={T.accent} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill={RED}       radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Recent sales + Pending collections ── */}
      <div className="two-col">
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
          <SecTitle T={T}>{L.recentSales}</SecTitle>
          {recent.length === 0
            ? <div style={{ color: T.textMuted, fontSize: 13 }}>{L.noSalesYet}</div>
            : recent.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}22` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.textPrimary }}>{s.customerName}</div>
                  <div style={{ fontSize: 11, color: T.textSecondary }}>{s.items.map(i => i.productName).join(', ')} · {fmtD(s.date)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                  <div className="mono" style={{ color: GRN, fontSize: 13, fontWeight: 600 }}>{cur(s.amountPaid)}</div>
                  {s.balance > 0 && <div className="mono" style={{ color: RED, fontSize: 11 }}>-{cur(s.balance)}</div>}
                </div>
              </div>
            ))}
        </div>

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
          <SecTitle T={T}>{L.pendingCollections}</SecTitle>
          {plend.length === 0 && pborr.length === 0
            ? <div style={{ color: T.textMuted, fontSize: 13 }}>{L.allClear}</div>
            : <>
              {plend.map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${T.border}22` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <Badge color={AMB}>{L.theyOwe}</Badge>
                    <span style={{ fontSize: 13, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.personName}</span>
                  </div>
                  <span className="mono" style={{ color: AMB, fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>{cur(l.amount)}</span>
                </div>
              ))}
              {pborr.map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${T.border}22` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <Badge color={RED}>{L.youOwe}</Badge>
                    <span style={{ fontSize: 13, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.personName}</span>
                  </div>
                  <span className="mono" style={{ color: RED, fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>{cur(b.amount)}</span>
                </div>
              ))}
            </>}
        </div>
      </div>

      {/* ── Stock alerts ── */}
      {(lowStk.length > 0 || outStk.length > 0) && (
        <div style={{ background: T.surface, border: `1px solid ${AMB}55`, borderRadius: 12, padding: 20 }}>
          <SecTitle T={T}>{L.stockAlerts}</SecTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {outStk.map(p => <Badge key={p.id} color={RED}>🔴 {p.name}</Badge>)}
            {lowStk.map(p => <Badge key={p.id} color={AMB}>🟡 {p.name} — {p.stock}</Badge>)}
          </div>
        </div>
      )}
    </div>
  )
}
