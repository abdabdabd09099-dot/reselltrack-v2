// ─── Reports.jsx ──────────────────────────────────────────────────────────────
// Added:
//  • Cash verification panel — actual vs calculated, over/gap indicator
//  • Sales by product table — units sold, revenue, % of total
//  • Transaction log — improved with cash column
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { CHART_PAL, GRN, RED, AMB, BLU } from '../data/constants.js'
import { todayStr, fmtShort, thisWeekRange, thisMonthRange, inRange } from '../utils/helpers.js'
import { Stat, SecTitle, ChartTip, PieLabel, Icon } from '../components/UI.jsx'

export default function Reports({ sales, expenses, lending, borrowing, T, L, cur }) {
  const [period, setPeriod] = useState('daily')
  const [cDate,  setCDate]  = useState(todayStr())
  const [cWeek,  setCWeek]  = useState(thisWeekRange()[0])
  const [cMonth, setCMonth] = useState(todayStr().slice(0, 7))

  // ── Daily cash flow state ──────────────────────────────────────────────────
  const [cashFlowDate,   setCashFlowDate]   = useState(todayStr())
  const [cashFlowActual, setCashFlowActual] = useState('')
  const [cashFlowResult, setCashFlowResult] = useState(null)

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

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filtSales   = sales.filter(s => inRange(s.date, range))
  const filtExp     = expenses.filter(e => inRange(e.date, range))
  const totalRev    = filtSales.reduce((a, s) => a + s.amountPaid, 0)
  const totalCalc   = filtSales.reduce((a, s) => a + s.totalAmount, 0)  // calculated total
  const totalExp    = filtExp.reduce((a, e) => a + e.amount, 0)
  const netProfit   = totalRev - totalExp
  const totalUncol  = filtSales.reduce((a, s) => a + s.balance, 0)
  const lendPend    = lending.filter(l => l.status === 'Pending').reduce((a, l) => a + l.amount, 0)
  const borrPend    = borrowing.filter(b => b.status === 'Pending').reduce((a, b) => a + b.amount, 0)
  const cashTotal       = filtSales.filter(s => s.paymentMethod === 'cash').reduce((a, s) => a + s.amountPaid, 0)
  const xferTotal       = filtSales.filter(s => s.paymentMethod === 'transfer').reduce((a, s) => a + s.amountPaid, 0)
  const totalUnits      = filtSales.flatMap(s => s.items).reduce((a, i) => a + i.qty, 0)



  // ── Products performance table ─────────────────────────────────────────────
  const prodStats = {}
  filtSales.forEach(s => {
    s.items.forEach(item => {
      if (!prodStats[item.productName]) {
        prodStats[item.productName] = { name: item.productName, units: 0, revenue: 0, txCount: 0 }
      }
      prodStats[item.productName].units   += item.qty
      prodStats[item.productName].revenue += item.qty * item.unitPrice
      prodStats[item.productName].txCount += 1
    })
  })
  const prodList = Object.values(prodStats).sort((a, b) => b.revenue - a.revenue)

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
  const prodPie  = prodList.slice(0, 7).map(p => ({ name: p.name, value: p.revenue }))
  const expCatMap = {}
  filtExp.forEach(e => { const k = e.category || 'Others'; expCatMap[k] = (expCatMap[k] || 0) + e.amount })
  const expPie  = Object.entries(expCatMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  const payPie  = [{ name: 'Cash', value: cashTotal }, { name: 'Transfer', value: xferTotal }].filter(p => p.value > 0)
  const tipStyle = { background: T.surfaceHigh, border: `1px solid ${T.border}`, borderRadius: 8, color: T.textPrimary }

  // ── Record and compare daily cash flow ────────────────────────────────────
  const recordCashFlow = () => {
    const daySales   = sales.filter(s => s.date.slice(0,10) === cashFlowDate)
    const calculated = daySales.reduce((a,s) => a + s.amountPaid, 0)
    const actual     = parseFloat(cashFlowActual) || 0
    const diff       = actual - calculated
    const cashSales  = daySales.filter(s => s.paymentMethod==='cash').reduce((a,s) => a + s.amountPaid, 0)
    const xferSales  = daySales.filter(s => s.paymentMethod==='transfer').reduce((a,s) => a + s.amountPaid, 0)
    const cashCount  = daySales.filter(s => s.paymentMethod==='cash').length
    const xferCount  = daySales.filter(s => s.paymentMethod==='transfer').length
    setCashFlowResult({ calculated, actual, diff, txCount: daySales.length, date: cashFlowDate, cashSales, xferSales, cashCount, xferCount })
  }

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
        <Stat label={L.revenue}      value={cur(totalRev)}   color={GRN}                       icon="trending-up"   T={T} />
        <Stat label={L.expenses}     value={cur(totalExp)}   color={RED}                       icon="trending-down" T={T} />
        <Stat label={L.profitLabel}  value={cur(netProfit)}  color={netProfit >= 0 ? T.accent : RED} icon="dollar"   T={T} />
        <Stat label={L.uncollected}  value={cur(totalUncol)} color={AMB}                       icon="clock"         T={T} />
        <Stat label={L.transactions} value={filtSales.length} color={BLU}                      icon="sales"         T={T} />
        <Stat label="Units Sold"     value={totalUnits}      color={T.accent}                  icon="package"       T={T} />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          DAILY CASH FLOW — record actual cash & compare with calculated
          ════════════════════════════════════════════════════════════════ */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <SecTitle T={T} right={
          <span style={{ fontSize: 11, color: T.textMuted }}>
            {filtSales.filter(s=>s.paymentMethod==='cash').length} cash · {filtSales.filter(s=>s.paymentMethod==='transfer').length} transfer
          </span>
        }>
          💰 Cash Flow — {range[0] === range[1] ? range[0] : `${range[0]} → ${range[1]}`}
        </SecTitle>

        {/* Summary tiles */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10, marginBottom:16 }}>
          {[
            { label:'Calculated Total', value:totalCalc,  color:T.textPrimary, hint:'Sum of all sales' },
            { label:'Amount Collected', value:totalRev,   color:GRN,           hint:'Payments received' },
            { label:'Still Owed',       value:totalUncol, color:totalUncol>0?RED:T.textMuted, hint:'Unpaid balances' },
            { label:'Cash 💵',          value:cashTotal,  color:GRN,           hint:'Cash payments' },
            { label:'Transfer 📲',      value:xferTotal,  color:BLU,           hint:'Transfer payments' },
          ].map((s,i) => (
            <div key={i} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>{s.label}</div>
              <div className="mono" style={{ fontSize:16, fontWeight:800, color:s.color }}>{cur(s.value)}</div>
              <div style={{ fontSize:9, color:T.textMuted, marginTop:3 }}>{s.hint}</div>
            </div>
          ))}
        </div>

        {/* Daily cash recorder */}
        <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:12, padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <Icon name="dollar" size={14} color={T.accent} strokeWidth={2.5} />
            <span style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>Record Actual Cash Collected</span>
          </div>
          <p style={{ fontSize:12, color:T.textMuted, marginBottom:14, lineHeight:1.5 }}>
            Count your physical cash and enter the total below. We'll compare it with your recorded sales automatically.
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }} className="g2">
            <div>
              <label style={{ fontSize:10, color:T.textSecondary, display:'block', marginBottom:5, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>Date</label>
              <input type="date" value={cashFlowDate} onChange={e => { setCashFlowDate(e.target.value); setCashFlowResult(null) }}
                style={{ width:'100%', fontSize:13 }} />
            </div>
            <div>
              <label style={{ fontSize:10, color:T.textSecondary, display:'block', marginBottom:5, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 }}>Actual Cash in Hand</label>
              <input type="number" value={cashFlowActual} onChange={e => { setCashFlowActual(e.target.value); setCashFlowResult(null) }}
                placeholder="Enter total cash counted..." style={{ width:'100%', fontSize:15, fontWeight:700 }} />
            </div>
          </div>

          <Btn onClick={recordCashFlow} disabled={!cashFlowActual} icon="check" full>
            Compare Cash
          </Btn>

          {/* Result */}
          {cashFlowResult && (
            <div style={{ marginTop:16 }}>
              {/* 3 tiles */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
                <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Calculated</div>
                  <div className="mono" style={{ fontSize:20, fontWeight:800, color:T.textPrimary }}>{cur(cashFlowResult.calculated)}</div>
                  <div style={{ fontSize:10, color:T.textMuted, marginTop:3 }}>{cashFlowResult.txCount} sale{cashFlowResult.txCount!==1?'s':''}</div>
                </div>
                <div style={{ background:GRN+'18', border:`1px solid ${GRN}33`, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:GRN, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Actual Cash</div>
                  <div className="mono" style={{ fontSize:20, fontWeight:800, color:GRN }}>{cur(cashFlowResult.actual)}</div>
                  <div style={{ fontSize:10, color:T.textMuted, marginTop:3 }}>physically counted</div>
                </div>
                <div style={{
                  background: cashFlowResult.diff===0 ? GRN+'18' : cashFlowResult.diff>0 ? BLU+'18' : RED+'18',
                  border:`2px solid ${cashFlowResult.diff===0?GRN:cashFlowResult.diff>0?BLU:RED}55`,
                  borderRadius:10, padding:'12px 14px', textAlign:'center',
                }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:6, color:T.textMuted }}>Difference</div>
                  <div className="mono" style={{ fontSize:20, fontWeight:800, color:cashFlowResult.diff===0?GRN:cashFlowResult.diff>0?BLU:RED }}>
                    {cashFlowResult.diff===0 ? '±0' : cashFlowResult.diff>0 ? `+${cur(cashFlowResult.diff)}` : `-${cur(Math.abs(cashFlowResult.diff))}`}
                  </div>
                  <div style={{ fontSize:10, color:T.textMuted, marginTop:3 }}>
                    {cashFlowResult.diff===0 ? 'perfect match' : cashFlowResult.diff>0 ? 'over' : 'short'}
                  </div>
                </div>
              </div>

              {/* Status message */}
              <div style={{
                borderRadius:10, padding:'14px 16px',
                background: cashFlowResult.diff===0 ? GRN+'18' : cashFlowResult.diff>0 ? BLU+'18' : RED+'18',
                border:`1.5px solid ${cashFlowResult.diff===0?GRN:cashFlowResult.diff>0?BLU:RED}44`,
                display:'flex', alignItems:'flex-start', gap:12,
              }}>
                <span style={{ fontSize:26, flexShrink:0 }}>
                  {cashFlowResult.diff===0 ? '✅' : cashFlowResult.diff>0 ? '💰' : '⚠️'}
                </span>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:cashFlowResult.diff===0?GRN:cashFlowResult.diff>0?BLU:RED, marginBottom:5 }}>
                    {cashFlowResult.diff===0
                      ? 'Perfect — your cash matches the recorded sales!'
                      : cashFlowResult.diff>0
                        ? `Over by ${cur(cashFlowResult.diff)} — you have extra cash`
                        : `Short by ${cur(Math.abs(cashFlowResult.diff))} — cash is less than expected`}
                  </div>
                  <div style={{ fontSize:12, color:T.textSecondary, lineHeight:1.6 }}>
                    {cashFlowResult.diff===0
                      ? `All ${cashFlowResult.txCount} sales for ${cashFlowResult.date} add up perfectly. Books are balanced.`
                      : cashFlowResult.diff>0
                        ? 'Possible causes: unrecorded sale, customer overpaid, or change not given back.'
                        : 'Possible causes: cash expense not recorded, missing sale entry, or theft/loss.'}
                  </div>
                  {cashFlowResult.txCount === 0 && (
                    <div style={{ marginTop:8, fontSize:12, color:AMB, fontWeight:600 }}>
                      ⚠️ No sales recorded for this date — make sure you selected the right date.
                    </div>
                  )}
                </div>
              </div>

              {/* Cash breakdown by method for the day */}
              {cashFlowResult.txCount > 0 && (
                <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:9, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>Cash Sales ({cashFlowResult.cashCount})</div>
                    <div className="mono" style={{ fontSize:15, fontWeight:800, color:GRN }}>{cur(cashFlowResult.cashSales)}</div>
                  </div>
                  <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:9, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:T.textMuted, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>Transfer Sales ({cashFlowResult.xferCount})</div>
                    <div className="mono" style={{ fontSize:15, fontWeight:800, color:BLU }}>{cur(cashFlowResult.xferSales)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
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

      {/* ════════════════════════════════════════════════════════════════════
          SALES BY PRODUCT — units + revenue
          ════════════════════════════════════════════════════════════════ */}
      {prodList.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <SecTitle T={T} right={
            <span style={{ fontSize: 11, color: T.textMuted }}>{prodList.length} product{prodList.length !== 1 ? 's' : ''}</span>
          }>
            📦 Sales by Product
          </SecTitle>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.surfaceHigh }}>
                  {['Product', 'Units Sold', 'Transactions', 'Revenue', '% of Total'].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '9px 12px', fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prodList.map((p, idx) => {
                  const pct = totalRev > 0 ? ((p.revenue / totalCalc) * 100) : 0
                  const barW = totalCalc > 0 ? (p.revenue / totalCalc) * 100 : 0
                  return (
                    <tr key={p.name} style={{ borderBottom: `1px solid ${T.border}22`, background: idx % 2 === 0 ? 'transparent' : T.surfaceHigh + '44' }}>
                      <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: CHART_PAL[idx % CHART_PAL.length], flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: T.textPrimary, fontSize: 13 }}>{p.name}</div>
                            {/* Mini progress bar */}
                            <div style={{ width: 80, height: 3, background: T.border, borderRadius: 2, marginTop: 4 }}>
                              <div style={{ width: `${barW}%`, height: '100%', background: CHART_PAL[idx % CHART_PAL.length], borderRadius: 2 }} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <span style={{ background: T.accent+'22', color: T.accent, border: `1px solid ${T.accent}44`, borderRadius: 6, padding: '3px 10px', fontWeight: 800, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
                          {p.units}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <span className="mono" style={{ color: T.textSecondary, fontSize: 12 }}>{p.txCount}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <span className="mono" style={{ color: GRN, fontWeight: 700, fontSize: 13 }}>{cur(p.revenue)}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <span className="mono" style={{ color: T.textMuted, fontSize: 12 }}>{pct.toFixed(1)}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${T.border}`, background: T.surfaceHigh }}>
                  <td style={{ padding: '9px 12px', fontWeight: 700, color: T.textPrimary, fontSize: 12 }}>TOTAL</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <span className="mono" style={{ color: T.accent, fontWeight: 800 }}>{totalUnits} units</span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <span className="mono" style={{ color: T.textSecondary, fontSize: 12 }}>{filtSales.length}</span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <span className="mono" style={{ color: GRN, fontWeight: 800 }}>{cur(totalCalc)}</span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                    <span className="mono" style={{ color: T.textMuted, fontSize: 12 }}>100%</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Product & Expense pies ── */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <PieCard title={L.salesByProduct} data={prodPie} empty={L.noSalesInPeriod} valColor={GRN} />
        <PieCard title={L.expByCategory}  data={expPie}  empty={L.noExpInPeriod}   valColor={RED} />
      </div>

      {/* ── Payment method ── */}
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
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <SecTitle T={T}>{L.lendingSummary}</SecTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {[
            { l: L.pendingCollect, v: lendPend,            c: GRN      },
            { l: L.youStillOwe,   v: borrPend,            c: RED      },
            { l: L.net,           v: lendPend - borrPend, c: T.accent },
          ].map(x => (
            <div key={x.l}>
              <span style={{ color: T.textSecondary, fontSize: 13 }}>{x.l}: </span>
              <span className="mono" style={{ color: x.c, fontWeight: 700 }}>{cur(x.v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SALES TRANSACTION LOG
          ════════════════════════════════════════════════════════════════ */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <span className="dm" style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary }}>🧾 Sales Transaction Log</span>
          <span className="mono" style={{ fontSize: 11, color: T.textMuted, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '3px 8px' }}>
            {filtSales.length} sale{filtSales.length !== 1 ? 's' : ''} · {range[0]} → {range[1]}
          </span>
        </div>

        {filtSales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: T.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13 }}>No sales in this period.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
              <thead>
                <tr style={{ background: T.surfaceHigh }}>
                  {['Time', 'Customer', 'Items & Units', 'Method', 'Calculated', 'Paid / Actual', 'Balance', 'Status'].map((h, i) => (
                    <th key={i} style={{ textAlign: i >= 4 ? 'right' : 'left', padding: '10px 12px', color: T.textSecondary, fontWeight: 700, borderBottom: `2px solid ${T.border}`, fontSize: 10, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...filtSales].sort((a, b) => new Date(b.date) - new Date(a.date)).map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}22`, background: idx % 2 === 0 ? 'transparent' : T.surfaceHigh + '44' }}>

                    {/* Time */}
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                      <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
                        {new Date(s.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>
                        {new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: T.textPrimary }}>{s.customerName}</div>
                      {s.contact && <div style={{ fontSize: 11, color: T.textMuted }}>{s.contact}</div>}
                    </td>

                    {/* Items & units */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', maxWidth: 200 }}>
                      {s.items.map((item, x) => (
                        <div key={x} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: x < s.items.length - 1 ? 4 : 0 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: CHART_PAL[x % CHART_PAL.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: T.textPrimary }}>{item.productName}</span>
                          {/* Units badge */}
                          <span style={{ fontSize: 10, background: T.accent+'22', color: T.accent, border: `1px solid ${T.accent}33`, borderRadius: 4, padding: '1px 5px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>
                            ×{item.qty}
                          </span>
                          <span className="mono" style={{ fontSize: 10, color: T.textMuted, flexShrink: 0 }}>{cur(item.unitPrice)}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 5, paddingTop: 4, borderTop: `1px dashed ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600 }}>
                          {s.items.reduce((a, i) => a + i.qty, 0)} unit{s.items.reduce((a, i) => a + i.qty, 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>

                    {/* Method */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: s.paymentMethod === 'cash' ? GRN+'22' : BLU+'22', border: `1px solid ${s.paymentMethod === 'cash' ? GRN : BLU}44`, borderRadius: 6, padding: '3px 7px' }}>
                        <span style={{ fontSize: 11 }}>{s.paymentMethod === 'cash' ? '💵' : '📲'}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: s.paymentMethod === 'cash' ? GRN : BLU, textTransform: 'capitalize' }}>{s.paymentMethod}</span>
                      </div>
                    </td>

                    {/* Calculated total */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'top' }}>
                      <span className="mono" style={{ color: T.textSecondary, fontSize: 12 }}>{cur(s.totalAmount)}</span>
                    </td>

                    {/* Paid / actual — highlight if different from total */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'top' }}>
                      <span className="mono" style={{ color: GRN, fontWeight: 700, fontSize: 13 }}>{cur(s.amountPaid)}</span>
                      {s.amountPaid !== s.totalAmount && (
                        <div style={{ fontSize: 9, color: AMB, marginTop: 2, fontWeight: 600 }}>
                          of {cur(s.totalAmount)}
                        </div>
                      )}
                    </td>

                    {/* Balance */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'top' }}>
                      {s.balance > 0
                        ? <span className="mono" style={{ color: RED, fontWeight: 700 }}>-{cur(s.balance)}</span>
                        : <span style={{ color: T.textMuted, fontSize: 12 }}>—</span>}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'top' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
                        background: s.status==='Paid' ? GRN+'22' : s.status==='Partial' ? AMB+'22' : RED+'22',
                        color:      s.status==='Paid' ? GRN      : s.status==='Partial' ? AMB      : RED,
                        border: `1px solid ${s.status==='Paid' ? GRN : s.status==='Partial' ? AMB : RED}44`,
                      }}>
                        {s.status==='Paid' ? '✅ Paid' : s.status==='Partial' ? '⚠️ Partial' : '🔴 Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${T.border}`, background: T.surfaceHigh }}>
                  <td colSpan={2} style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 11, color: T.textSecondary, fontWeight: 600 }}>
                      {filtSales.length} sales · {totalUnits} units
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: 11, color: T.textMuted }}>
                      {filtSales.filter(s => s.paymentMethod==='cash').length} cash · {filtSales.filter(s => s.paymentMethod==='transfer').length} transfer
                    </span>
                  </td>
                  <td />
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: T.textMuted, marginBottom: 2, fontWeight: 700 }}>TOTAL CALC</div>
                    <span className="mono" style={{ color: T.textSecondary, fontWeight: 700 }}>{cur(totalCalc)}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: T.textMuted, marginBottom: 2, fontWeight: 700 }}>COLLECTED</div>
                    <span className="mono" style={{ color: GRN, fontWeight: 800 }}>{cur(totalRev)}</span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ fontSize: 9, color: T.textMuted, marginBottom: 2, fontWeight: 700 }}>OUTSTANDING</div>
                    <span className="mono" style={{ color: totalUncol > 0 ? RED : T.textMuted, fontWeight: 700 }}>{cur(totalUncol)}</span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
