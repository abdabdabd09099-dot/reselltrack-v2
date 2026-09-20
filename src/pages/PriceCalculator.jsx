// ─── PriceCalculator.jsx ──────────────────────────────────────────────────────
// Helps resellers determine:
//  1. Sell Price — given cost + desired profit margin or fixed profit amount
//  2. Break-Even Price — minimum price to cover cost + expenses
//  3. Profit Analysis — given sell price, what profit/margin you make
//  4. Bulk Calculator — how many units to sell to reach a revenue goal
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { GRN, RED, AMB, BLU } from '../data/constants.js'
import { Icon } from '../components/UI.jsx'

// ── Reusable input row ────────────────────────────────────────────────────────
const Row = ({ label, children, hint, T }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {label}
    </label>
    {children}
    {hint && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3 }}>{hint}</div>}
  </div>
)

// ── Result tile ───────────────────────────────────────────────────────────────
const ResultTile = ({ label, value, color, sub, big, icon, T }) => (
  <div style={{ background: color + '12', border: `1.5px solid ${color}44`, borderRadius: 12, padding: '12px 14px', flex: 1 }}>
    {icon && (
      <div style={{ width: 26, height: 26, borderRadius: 7, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
        <Icon name={icon} size={13} color={color} strokeWidth={2.5} />
      </div>
    )}
    <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
    <div className="mono dm" style={{ fontSize: big ? 26 : 20, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4, lineHeight: 1.4 }}>{sub}</div>}
  </div>
)

// ── Tab button ────────────────────────────────────────────────────────────────
const Tab = ({ id, active, label, icon, onClick, T }) => (
  <button onClick={() => onClick(id)} style={{
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '10px 14px', borderRadius: 10,
    background: active ? T.accent + '22' : 'transparent',
    border: `1.5px solid ${active ? T.accent : T.border}`,
    color: active ? T.accent : T.textSecondary,
    fontWeight: active ? 700 : 500, fontSize: 13,
    cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
  }}>
    <Icon name={icon} size={14} color={active ? T.accent : T.textSecondary} strokeWidth={active ? 2.5 : 1.8} />
    {label}
  </button>
)

// ── Number input ──────────────────────────────────────────────────────────────
const NumInput = ({ value, onChange, placeholder, prefix, suffix, T }) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    {prefix && <span style={{ position: 'absolute', left: 10, fontSize: 13, color: T.textMuted, pointerEvents: 'none', fontWeight: 600 }}>{prefix}</span>}
    <input
      type="number" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder || '0'}
      style={{ width: '100%', paddingLeft: prefix ? 24 : 12, paddingRight: suffix ? 32 : 12, fontSize: 15, fontWeight: 600 }}
    />
    {suffix && <span style={{ position: 'absolute', right: 10, fontSize: 11, color: T.textMuted, pointerEvents: 'none' }}>{suffix}</span>}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
export default function PriceCalculator({ T, cur, products }) {
  const [tab, setTab] = useState('sell')

  // ── 1. Sell Price Calculator ──────────────────────────────────────────────
  const [buyPrice,    setBuyPrice]    = useState('')
  const [extraCost,   setExtraCost]   = useState('')
  const [profitMode,  setProfitMode]  = useState('margin') // 'margin' | 'amount'
  const [marginPct,   setMarginPct]   = useState('')
  const [profitAmt,   setProfitAmt]   = useState('')
  const [taxPct,      setTaxPct]      = useState('')

  const totalCost  = (+buyPrice || 0) + (+extraCost || 0)
  const tax        = (+taxPct || 0) / 100
  let suggestedSell = 0
  let grossProfit   = 0
  let actualMargin  = 0

  if (profitMode === 'margin' && +marginPct > 0 && +marginPct < 100) {
    suggestedSell = totalCost / (1 - +marginPct / 100)
    grossProfit   = suggestedSell - totalCost
    actualMargin  = +marginPct
  } else if (profitMode === 'amount' && +profitAmt > 0) {
    grossProfit   = +profitAmt
    suggestedSell = totalCost + grossProfit
    actualMargin  = totalCost > 0 ? (grossProfit / suggestedSell) * 100 : 0
  }
  const afterTax      = suggestedSell * (1 + tax)
  const roi           = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0
  const breakEvenSell = totalCost

  // ── 2. Profit Analysis ────────────────────────────────────────────────────
  const [paCost,    setPaCost]    = useState('')
  const [paExtra,   setPaExtra]   = useState('')
  const [paSell,    setPaSell]    = useState('')
  const [paQty,     setPaQty]     = useState('1')
  const paTotalCost   = (+paCost || 0) + (+paExtra || 0)
  const paUnitProfit  = (+paSell || 0) - paTotalCost
  const paMargin      = +paSell > 0 ? (paUnitProfit / +paSell) * 100 : 0
  const paROI         = paTotalCost > 0 ? (paUnitProfit / paTotalCost) * 100 : 0
  const paTotalProfit = paUnitProfit * (+paQty || 1)
  const paTotalRev    = (+paSell || 0) * (+paQty || 1)
  const paStatus      = paUnitProfit > 0 ? 'profit' : paUnitProfit === 0 ? 'breakeven' : 'loss'

  // ── 3. Break-Even Calculator ───────────────────────────────────────────────
  const [beFixedCost,    setBeFixedCost]    = useState('')
  const [beUnitCost,     setBeUnitCost]     = useState('')
  const [beSellPrice,    setBeSellPrice]    = useState('')
  const beContribution   = (+beSellPrice || 0) - (+beUnitCost || 0)
  const beUnits          = beContribution > 0 ? Math.ceil(+beFixedCost / beContribution) : null
  const beRevenue        = beUnits ? beUnits * (+beSellPrice || 0) : 0

  // ── 4. Revenue Goal ───────────────────────────────────────────────────────
  const [rgGoal,     setRgGoal]     = useState('')
  const [rgSell,     setRgSell]     = useState('')
  const [rgCost,     setRgCost]     = useState('')
  const rgUnitsNeeded   = +rgSell > 0 ? Math.ceil(+rgGoal / +rgSell) : null
  const rgTotalCost     = rgUnitsNeeded ? rgUnitsNeeded * (+rgCost || 0) : 0
  const rgNetProfit     = rgUnitsNeeded ? +rgGoal - rgTotalCost : 0
  const rgUnitProfit    = (+rgSell || 0) - (+rgCost || 0)

  const fmt  = n => cur(n)
  const pct  = n => n.toFixed(1) + '%'

  const inputStyle = { width: '100%', fontSize: 15, fontWeight: 600 }

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="dm" style={{ fontSize: 24, fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.5px' }}>
          Price Calculator
        </h1>
        <p style={{ color: T.textSecondary, fontSize: 13, marginTop: 4 }}>
          Find the right price to sell, break even, or hit your revenue goal.
        </p>
      </div>

      {/* ── Tab navigation ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Tab id="sell"   active={tab==='sell'}   label="Sell Price"     icon="dollar"       onClick={setTab} T={T} />
        <Tab id="profit" active={tab==='profit'} label="Profit Check"   icon="trending-up"  onClick={setTab} T={T} />
        <Tab id="break"  active={tab==='break'}  label="Break-Even"     icon="trending-down" onClick={setTab} T={T} />
        <Tab id="goal"   active={tab==='goal'}   label="Revenue Goal"   icon="star"         onClick={setTab} T={T} />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 1: SELL PRICE CALCULATOR
          ════════════════════════════════════════════════════════════════ */}
      {tab === 'sell' && (
        <div style={{ display: 'grid', gap: 16 }}>

          {/* Inputs card */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
            <div className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="dollar" size={15} color={T.accent} />
              Cost Inputs
            </div>
            <Row label="Buy / Cost Price" hint="What you paid for the item" T={T}>
              <NumInput value={buyPrice} onChange={setBuyPrice} placeholder="e.g. 100" T={T} />
            </Row>
            <Row label="Extra Costs" hint="Shipping, packaging, platform fees, etc." T={T}>
              <NumInput value={extraCost} onChange={setExtraCost} placeholder="e.g. 15" T={T} />
            </Row>
            {/* Total cost display */}
            {totalCost > 0 && (
              <div style={{ background: T.bg, borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Total Cost</span>
                <span className="mono" style={{ fontWeight: 700, color: T.textPrimary }}>{fmt(totalCost)}</span>
              </div>
            )}
            <Row label="Tax Rate (optional)" T={T}>
              <NumInput value={taxPct} onChange={setTaxPct} placeholder="0" suffix="%" T={T} />
            </Row>
          </div>

          {/* Profit target card */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
            <div className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="trending-up" size={15} color={GRN} />
              Profit Target
            </div>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[['margin','By Margin %'],['amount','By Amount']].map(([m, l]) => (
                <button key={m} onClick={() => setProfitMode(m)} style={{
                  flex: 1, padding: '9px', borderRadius: 9,
                  border: `2px solid ${profitMode===m ? T.accent : T.border}`,
                  background: profitMode===m ? T.accent+'22' : 'transparent',
                  color: profitMode===m ? T.accent : T.textSecondary,
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}>{l}</button>
              ))}
            </div>
            {profitMode === 'margin' ? (
              <Row label="Desired Profit Margin" hint="% of the selling price you want to keep as profit" T={T}>
                <NumInput value={marginPct} onChange={setMarginPct} placeholder="e.g. 30" suffix="%" T={T} />
              </Row>
            ) : (
              <Row label="Fixed Profit Amount" hint="How much profit you want per unit" T={T}>
                <NumInput value={profitAmt} onChange={setProfitAmt} placeholder="e.g. 50" T={T} />
              </Row>
            )}
          </div>

          {/* Results */}
          {totalCost > 0 && suggestedSell > 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
              <div className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 14 }}>Results</div>

              {/* Main result */}
              <div style={{ background: T.accent+'18', border: `2px solid ${T.accent}44`, borderRadius: 12, padding: '16px 18px', marginBottom: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Suggested Sell Price</div>
                <div className="mono dm" style={{ fontSize: 36, fontWeight: 800, color: T.accent, letterSpacing: '-1px' }}>{fmt(suggestedSell)}</div>
                {tax > 0 && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>With tax: {fmt(afterTax)}</div>}
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <ResultTile label="Profit / Unit"  value={fmt(grossProfit)}   color={GRN} icon="trending-up"   T={T} />
                <ResultTile label="Margin"         value={pct(actualMargin)}  color={BLU} icon="pie"           T={T} />
                <ResultTile label="ROI"            value={pct(roi)}           color={AMB} icon="trending-up"   T={T} />
              </div>

              {/* Break even reminder */}
              <div style={{ background: AMB+'18', border: `1px solid ${AMB}33`, borderRadius: 9, padding: '9px 12px', fontSize: 12, color: AMB }}>
                <strong>Break-even price:</strong> {fmt(breakEvenSell)} — don't sell below this.
              </div>

              {/* Pricing tiers */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Pricing Tiers</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {[
                    { label: 'Minimum (Break-even)',   price: breakEvenSell,              color: RED, profit: 0 },
                    { label: 'Low (20% margin)',        price: totalCost / 0.80,           color: AMB, profit: totalCost/0.80 - totalCost },
                    { label: 'Suggested (' + pct(actualMargin) + ')', price: suggestedSell, color: T.accent, profit: grossProfit },
                    { label: 'Premium (50% margin)',    price: totalCost / 0.50,           color: GRN, profit: totalCost/0.50 - totalCost },
                  ].map((tier, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: T.bg, borderRadius: 8, border: `1px solid ${tier.price === suggestedSell ? T.accent : T.border}` }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: tier.price === suggestedSell ? T.accent : T.textPrimary }}>{tier.label}</div>
                        <div style={{ fontSize: 10, color: T.textMuted }}>Profit: {fmt(tier.profit)}</div>
                      </div>
                      <span className="mono" style={{ fontSize: 15, fontWeight: 800, color: tier.color }}>{fmt(tier.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 2: PROFIT ANALYSIS
          ════════════════════════════════════════════════════════════════ */}
      {tab === 'profit' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
            <div className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="trending-up" size={15} color={GRN} />
              Analyze Your Profit
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="g2">
              <Row label="Cost Price" T={T}><NumInput value={paCost}  onChange={setPaCost}  placeholder="e.g. 100" T={T} /></Row>
              <Row label="Extra Costs" T={T}><NumInput value={paExtra} onChange={setPaExtra} placeholder="e.g. 10"  T={T} /></Row>
              <Row label="Sell Price" T={T}><NumInput value={paSell}  onChange={setPaSell}  placeholder="e.g. 150" T={T} /></Row>
              <Row label="Quantity" T={T}><NumInput value={paQty}   onChange={setPaQty}   placeholder="1"        T={T} /></Row>
            </div>
          </div>

          {(+paSell > 0 || +paCost > 0) && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
              {/* Status banner */}
              <div style={{
                borderRadius: 12, padding: '14px 16px', marginBottom: 16, textAlign: 'center',
                background: paStatus==='profit' ? GRN+'18' : paStatus==='loss' ? RED+'18' : AMB+'18',
                border: `2px solid ${paStatus==='profit' ? GRN : paStatus==='loss' ? RED : AMB}44`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 4 }}>
                  {paStatus==='profit' ? '✅' : paStatus==='loss' ? '❌' : '⚖️'}
                </div>
                <div className="dm" style={{ fontSize: 16, fontWeight: 800, color: paStatus==='profit' ? GRN : paStatus==='loss' ? RED : AMB }}>
                  {paStatus==='profit' ? 'Profitable' : paStatus==='loss' ? 'Selling at a Loss!' : 'Break-Even'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <ResultTile label="Unit Profit"    value={fmt(paUnitProfit)}  color={paUnitProfit>=0?GRN:RED} icon="dollar"       T={T} />
                <ResultTile label="Margin"         value={pct(paMargin)}      color={paMargin>=0?BLU:RED}    icon="pie"           T={T} />
                <ResultTile label="ROI"            value={pct(paROI)}         color={paROI>=0?AMB:RED}       icon="trending-up"   T={T} />
              </div>

              {+paQty > 1 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <ResultTile label={`Total Revenue (×${paQty})`}  value={fmt(paTotalRev)}    color={T.accent} T={T} />
                  <ResultTile label={`Total Profit (×${paQty})`}   value={fmt(paTotalProfit)} color={paTotalProfit>=0?GRN:RED} T={T} />
                </div>
              )}

              {paStatus === 'loss' && (
                <div style={{ marginTop: 12, background: RED+'18', border: `1px solid ${RED}44`, borderRadius: 9, padding: '10px 12px', fontSize: 12, color: RED }}>
                  ⚠️ <strong>Minimum sell price to break even:</strong> {fmt(paTotalCost)}
                  <br />You need to raise your price by at least {fmt(Math.abs(paUnitProfit))}.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 3: BREAK-EVEN CALCULATOR
          ════════════════════════════════════════════════════════════════ */}
      {tab === 'break' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
            <div className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="trending-down" size={15} color={AMB} />
              Break-Even Analysis
            </div>
            <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
              How many units must you sell at your price to cover all costs?
            </p>
            <Row label="Fixed Costs" hint="Rent, staff, monthly fees — costs that don't change per unit" T={T}>
              <NumInput value={beFixedCost} onChange={setBeFixedCost} placeholder="e.g. 500" T={T} />
            </Row>
            <Row label="Cost Per Unit" hint="What each item costs you to source" T={T}>
              <NumInput value={beUnitCost} onChange={setBeUnitCost} placeholder="e.g. 80" T={T} />
            </Row>
            <Row label="Sell Price Per Unit" hint="What you charge customers" T={T}>
              <NumInput value={beSellPrice} onChange={setBeSellPrice} placeholder="e.g. 120" T={T} />
            </Row>
          </div>

          {beSellPrice && beUnitCost && beFixedCost && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
              {beContribution <= 0 ? (
                <div style={{ background: RED+'18', border: `1px solid ${RED}44`, borderRadius: 10, padding: 16, textAlign: 'center', color: RED }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>❌</div>
                  <strong>Sell price is too low!</strong> Your sell price must be higher than your unit cost ({fmt(+beUnitCost)}).
                </div>
              ) : (
                <>
                  <div style={{ background: AMB+'18', border: `2px solid ${AMB}44`, borderRadius: 12, padding: '16px 18px', marginBottom: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Units to Break Even</div>
                    <div className="mono dm" style={{ fontSize: 42, fontWeight: 800, color: AMB, letterSpacing: '-1px' }}>{beUnits}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>units at {fmt(+beSellPrice)} each</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <ResultTile label="Break-Even Revenue" value={fmt(beRevenue)}       color={BLU} T={T} />
                    <ResultTile label="Contribution/Unit"  value={fmt(beContribution)}  color={GRN} T={T} />
                  </div>
                  <div style={{ marginTop: 12, background: GRN+'18', border: `1px solid ${GRN}44`, borderRadius: 9, padding: '9px 12px', fontSize: 12, color: GRN }}>
                    Every unit sold <strong>above {beUnits}</strong> earns you {fmt(beContribution)} pure profit.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 4: REVENUE GOAL
          ════════════════════════════════════════════════════════════════ */}
      {tab === 'goal' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
            <div className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="star" size={15} color={T.accent} />
              Revenue Goal Planner
            </div>
            <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
              Set a revenue target and find out exactly how many units you need to sell.
            </p>
            <Row label="Revenue Goal" hint="How much total money you want to make" T={T}>
              <NumInput value={rgGoal} onChange={setRgGoal} placeholder="e.g. 10000" T={T} />
            </Row>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="g2">
              <Row label="Sell Price / Unit" T={T}><NumInput value={rgSell} onChange={setRgSell} placeholder="e.g. 150" T={T} /></Row>
              <Row label="Cost / Unit" T={T}><NumInput value={rgCost} onChange={setRgCost} placeholder="e.g. 100" T={T} /></Row>
            </div>
          </div>

          {rgGoal && rgSell && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ background: T.accent+'18', border: `2px solid ${T.accent}44`, borderRadius: 12, padding: '16px 18px', marginBottom: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Units You Need to Sell</div>
                <div className="mono dm" style={{ fontSize: 42, fontWeight: 800, color: T.accent, letterSpacing: '-1px' }}>{rgUnitsNeeded?.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>to reach {fmt(+rgGoal)}</div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <ResultTile label="Total Revenue"    value={fmt(+rgGoal)}    color={BLU} T={T} />
                <ResultTile label="Total Cost"       value={fmt(rgTotalCost)} color={RED} T={T} />
                <ResultTile label="Net Profit"       value={fmt(rgNetProfit)} color={GRN} T={T} />
              </div>

              {rgUnitProfit > 0 && (
                <>
                  <div style={{ background: GRN+'18', border: `1px solid ${GRN}44`, borderRadius: 9, padding: '9px 12px', fontSize: 12, color: GRN, marginBottom: 10 }}>
                    Profit per unit: <strong>{fmt(rgUnitProfit)}</strong> — you keep {+rgSell > 0 ? ((rgUnitProfit/+rgSell)*100).toFixed(0) : 0}% of each sale.
                  </div>
                  {/* Daily / weekly breakdown */}
                  <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>To reach your goal, sell:</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {[
                      { label: 'Per Day',   units: Math.ceil(rgUnitsNeeded / 30),  revenue: Math.ceil(rgUnitsNeeded/30) * +rgSell },
                      { label: 'Per Week',  units: Math.ceil(rgUnitsNeeded / 4.3), revenue: Math.ceil(rgUnitsNeeded/4.3) * +rgSell },
                      { label: 'Per Month', units: rgUnitsNeeded,                   revenue: +rgGoal },
                    ].map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 13, color: T.textSecondary, fontWeight: 500 }}>{r.label}</span>
                        <div style={{ textAlign: 'right' }}>
                          <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: T.accent }}>{r.units} units</span>
                          <div style={{ fontSize: 10, color: T.textMuted }}>{fmt(r.revenue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
