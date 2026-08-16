// ─── Reports.jsx ──────────────────────────────────────────────────────────────
// Daily / Weekly / Monthly charts — revenue vs expenses, product pie,
// expense category pie, payment method donut, lending summary.
// To modify: add date range picker, add export to PDF, add more chart types.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CHART_PAL, GRN, RED, AMB, BLU } from '../data/constants.js'
import { todayStr, fmtShort, thisWeekRange, thisMonthRange, inRange } from '../utils/helpers.js'
import { Stat, SecTitle, ChartTip, PieLabel } from '../components/UI.jsx'

export default function Reports({ sales, expenses, lending, borrowing, T, L, cur }) {
  const [period, setPeriod] = useState('daily')
  const [cDate,  setCDate]  = useState(todayStr())
  const [cWeek,  setCWeek]  = useState(thisWeekRange()[0])
  const [cMonth, setCMonth] = useState(todayStr().slice(0, 7))

  // ── Date range ─────────────────────────────────────────────────────────────
  let range
  if (period === 'daily') {
    range = [cDate, cDate]
  } else if (period === 'weekly') {
    const s = new Date(cWeek), e = new Date(s); e.setDate(s.getDate() + 6)
    range = [cWeek, e.toISOString().slice(0, 10)]
  } else {
    const [yr, mo] = cMonth.split('-').map(Number)
    range = [`${cMonth}-01`, `${cMonth}-${String(new Date(yr, mo, 0).getDate()).padStart(2, '0')}`]
  }

  // ── Filtered sets ──────────────────────────────────────────────────────────
  const filtSales = sales.filter(s => inRange(s.date, range))
  const filtExp   = expenses.filter(e => inRange(e.date, range))
  const totalRev   = filtSales.reduce((a, s) => a + s.amountPaid, 0)
  const totalExp   = filtExp.reduce((a, e) => a + e.amount, 0)
  const netProfit  = totalRev - totalExp
  const totalUncol = filtSales.reduce((a, s) => a + s.balance, 0)
  const lendPend   = lending.filter(l => l.status === 'Pending').reduce((a, l) => a + l.amount, 0)
  const borrPend   = borrowing.filter(b => b.status === 'Pending').reduce((a, b) => a + b.amount, 0)
  const cashTotal  = filtSales.filter(s => s.paymentMethod === 'cash').reduce((a, s) => a + s.amountPaid, 0)
  const xferTotal  = filtSales.filter(s => s.paymentMethod === 'transfer').reduce((a, s) => a + s.amountPaid, 0)

  // ── Chart series ───────────────────────────────────────────────────────────
  const buildSeries = () => {
    const days = []; const start = new Date(range[0]); const end = new Date(range[1])
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds  = d.toISOString().slice(0, 10)
      const rev = sales.filter(s => s.date.slice(0, 10) === ds).reduce((a, s) => a + s.amountPaid, 0)
      const exp = expenses.filter(e => e.date === ds).reduce((a, e) => a + e.amount, 0)
      days.push({ date: fmtShort(ds), Revenue: rev, Expenses: exp, Profit: rev - exp })
    }
    return days
  }
  const series   = buildSeries()
  const multiDay = series.length > 1

  // ── Pie data ───────────────────────────────────────────────────────────────
  const prodMap = {}
  filtSales.flatMap(s => s.items).forEach(i => { prodMap[i.productName] = (prodMap[i.productName] || 0) + (i.qty * i.unitPrice) })
  const prodPie  = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([name, value]) => ({ name, value }))
  const expCatMap = {}
  filtExp.forEach(e => { const k = e.category || 'Others'; expCatMap[k] = (expCatMap[k] || 0) + e.amount })
  const expPie   = Object.entries(expCatMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  const payPie   = [{ name: 'Cash', value: cashTotal }, { name: 'Transfer', value: xferTotal }].filter(p => p.value > 0)
  const tipStyle = { background: T.surfaceHigh, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textPrimary }

  // ── Reusable pie card ──────────────────────────────────────────────────────
  const PieCard = ({ title, data, empty, valColor }) => (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
      <SecTitle T={T}>{title}</SecTitle>
      {data.length === 0
        ? <div style={{ color: T.textMuted, fontSize: 13, padding: '12px 0' }}>{empty}</div>
        : <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={76} dataKey="value" labelLine={false} label={PieLabel}>
                {data.map((_, i) => <Cell key={i} fill={CHART_PAL[i % CHART_PAL.length]} />)}
              </Pie>
              <Tooltip formatter={v => [cur(v), 'Amount']} contentStyle={tipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
            {data.map((p, i) => (
              <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: CHART_PAL[i % CHART_PAL.length], flexShrink: 0 }} />
                  <span style={{ color: T.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{p.name}</span>
                </div>
                <span className="mono" style={{ color: valColor || T.accent, fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>{cur(p.value)}</span>
              </div>
            ))}
          </div>
        </>}
    </div>
  )

  return (
    <div className="fade-in">
      <h1 className="dm" style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 16 }}>{L.reportTitle}</h1>

      {/* ── Period selector ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', marginBottom: 14, background: T.bg, borderRadius: 8, overflow: 'hidden', width: 'fit-content', border: `1px solid ${T.border}` }}>
          {[[L.daily, 'daily'], [L.weekly, 'weekly'], [L.monthly, 'monthly']].map(([lbl, p]) => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '9px 20px', background: period === p ? T.accent : 'transparent', color: period === p ? '#fff' : T.textSecondary, fontWeight: 600, border: 'none', fontSize: 13, minWidth: 80, cursor: 'pointer' }}>
              {lbl}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: T.textSecondary, fontSize: 13 }}>{L.period}:</span>
          {period === 'daily'   && <input type="date"  value={cDate}  onChange={e => setCDate(e.target.value)}  style={{ width: 180 }} />}
          {period === 'weekly'  && <input type="date"  value={cWeek}  onChange={e => setCWeek(e.target.value)}  style={{ width: 180 }} />}
          {period === 'monthly' && <input type="month" value={cMonth} onChange={e => setCMonth(e.target.value)} style={{ width: 180 }} />}
          <span style={{ color: T.textMuted, fontSize: 12, fontFamily: 'JetBrains Mono,monospace' }}>{range[0]} → {range[1]}</span>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="stat-grid">
        <Stat label={L.revenue}      value={cur(totalRev)}  color={GRN}                       icon="💰" T={T} />
        <Stat label={L.expenses}     value={cur(totalExp)}  color={RED}                       icon="💸" T={T} />
        <Stat label={L.profitLabel}  value={cur(netProfit)} color={netProfit >= 0 ? T.accent : RED} icon="📈" T={T} />
        <Stat label={L.uncollected}  value={cur(totalUncol)} color={AMB}                      icon="⏳" T={T} />
        <Stat label={L.transactions} value={filtSales.length} color={BLU}                     icon="🛍️" T={T} />
      </div>

      {/* ── Revenue vs Expenses chart ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <SecTitle T={T}>📊 {L.revenueVsExp}</SecTitle>
        {!multiDay ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[{ name: range[0], Revenue: totalRev, Expenses: totalExp, Profit: netProfit }]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fill: T.textSecondary, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} width={56} tickFormatter={v => cur(v, true)} />
              <Tooltip content={<ChartTip cur={cur} T={T} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: T.textSecondary }} />
              <Bar dataKey="Revenue"  fill={T.accent} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Expenses" fill={RED}       radius={[6, 6, 0, 0]} />
              <Bar dataKey="Profit"   fill={AMB}       radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : series.length <= 14 ? (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tick={{ fill: T.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} width={56} tickFormatter={v => cur(v, true)} />
              <Tooltip content={<ChartTip cur={cur} T={T} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: T.textSecondary }} />
              <Bar dataKey="Revenue"  fill={T.accent} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill={RED}       radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tick={{ fill: T.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} width={56} tickFormatter={v => cur(v, true)} />
              <Tooltip content={<ChartTip cur={cur} T={T} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: T.textSecondary }} />
              <Line type="monotone" dataKey="Revenue"  stroke={T.accent} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Expenses" stroke={RED}       strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Profit"   stroke={AMB}       strokeWidth={2}   dot={false} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Product & Expense pies ── */}
      <div className="two-col">
        <PieCard title={L.salesByProduct} data={prodPie} empty={L.noSalesInPeriod} valColor={GRN} />
        <PieCard title={L.expByCategory}  data={expPie}  empty={L.noExpInPeriod}   valColor={RED} />
      </div>

      {/* ── Payment method donut ── */}
      {payPie.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <SecTitle T={T}>{L.paymentMethods}</SecTitle>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <ResponsiveContainer width={150} height={110}>
              <PieChart>
                <Pie data={payPie} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" labelLine={false} label={PieLabel}>
                  <Cell fill={GRN} /><Cell fill={BLU} />
                </Pie>
                <Tooltip formatter={v => [cur(v)]} contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[{ l: 'Cash', v: cashTotal, c: GRN }, { l: 'Transfer', v: xferTotal, c: BLU }].map(x => (
                <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: x.c }} />
                  <span style={{ color: T.textSecondary, fontSize: 13 }}>{x.l}:</span>
                  <span className="mono" style={{ color: x.c, fontWeight: 700 }}>{cur(x.v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Lending summary ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        <SecTitle T={T}>{L.lendingSummary}</SecTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {[
            { l: L.pendingCollect,  v: lendPend,             c: GRN      },
            { l: L.youStillOwe,     v: borrPend,             c: RED      },
            { l: L.net,             v: lendPend - borrPend,  c: T.accent },
          ].map(x => (
            <div key={x.l}>
              <span style={{ color: T.textSecondary, fontSize: 13 }}>{x.l}: </span>
              <span className="mono" style={{ color: x.c, fontWeight: 700 }}>{cur(x.v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
