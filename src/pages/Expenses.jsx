// ─── Expenses.jsx ─────────────────────────────────────────────────────────────
// Fix 2: When "Restocking" category is chosen, auto-fetch products,
//         select quantity + price, then auto-update that product's stock.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { apiExpenses, apiProducts } from '../utils/supabase.js'
import { saveOffline } from '../utils/offlineQueue.js'
import { RED, AMB, BLU, PUR, GRN, EXP_CATS } from '../data/constants.js'
import { todayStr, fmtD, thisMonthRange, inRange } from '../utils/helpers.js'
import { Badge, Btn, Modal, Field, Stat, Tbl, Icon } from '../components/UI.jsx'

const Lbl = Field

export default function Expenses({ expenses, setExpenses, products, setProducts, userId, T, L, cur, isDemo, demoApi }) {
  const [show,   setShow]   = useState(false)
  const [saving, setSaving] = useState(false)

  const blank = { desc:'', category:'', amount:'', date:todayStr(), notes:'', restockProductId:'', restockQty:1, restockPrice:0 }
  const [form, setForm] = useState(blank)
  const sf = (k,v) => setForm(f => ({ ...f, [k]:v }))

  const isRestocking = form.category === 'Restocking'

  // When restocking product is selected — auto-fill desc and price
  const selectRestockProduct = (productId) => {
    const p = products.find(p => p.id === productId)
    sf('restockProductId', productId)
    if (p) {
      sf('desc',        `Restocking: ${p.name}`)
      sf('restockPrice', p.buyPrice || 0)
      // Auto-calc amount
      setForm(f => ({
        ...f,
        restockProductId: productId,
        desc:        `Restocking: ${p.name}`,
        restockPrice: p.buyPrice || 0,
        amount:       String((f.restockQty || 1) * (p.buyPrice || 0)),
      }))
    }
  }

  // Recalc total when qty or price changes
  const updateRestockCalc = (field, val) => {
    setForm(f => {
      const qty   = field==='restockQty'   ? +val : +f.restockQty
      const price = field==='restockPrice' ? +val : +f.restockPrice
      return { ...f, [field]: field==='restockQty' ? +val : +val, amount: String(qty * price) }
    })
  }

  // ── Save expense ──────────────────────────────────────────────────────────
  const saveExp = async () => {
    if (!form.desc || !form.amount) return alert('Description and amount are required.')
    setSaving(true)
    try {
      const payload = { description: form.desc, category: form.category, amount: +form.amount, date: form.date, notes: form.notes }
      let created
      if (isDemo) {
        created = demoApi.expenses.create(payload)
      } else if (!navigator.onLine) {
        created = await saveOffline('expenses', { ...payload, userId })
        alert('📡 Offline. Expense saved and will sync when reconnected.')
      } else {
        created = await apiExpenses.create(payload, userId)
      }

      // ── Fix 2: Update product stock on restock ──────────────────────────
      if (isRestocking && form.restockProductId && form.restockQty > 0 && !isDemo) {
        const prod = products.find(p => p.id === form.restockProductId)
        if (prod) {
          const newStock = prod.stock + +form.restockQty
          await apiProducts.update(form.restockProductId, { ...prod, stock: newStock })
          setProducts(ps => ps.map(p => p.id === form.restockProductId ? { ...p, stock: newStock } : p))
        }
      }

      setExpenses(es => [created, ...es])
      setShow(false); setForm(blank)
    } catch(e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  const del = async id => {
    if (!confirm('Delete this expense?')) return
    try {
      isDemo ? demoApi.expenses.delete(id) : await apiExpenses.delete(id)
      setExpenses(es => es.filter(e => e.id !== id))
    } catch(e) { alert('Delete failed: ' + e.message) }
  }

  const todayTot = expenses.filter(e => e.date === todayStr()).reduce((a,e) => a + e.amount, 0)
  const monthTot = expenses.filter(e => inRange(e.date, thisMonthRange())).reduce((a,e) => a + e.amount, 0)
  const selectedRestockProduct = products.find(p => p.id === form.restockProductId)

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h1 className="dm" style={{ fontSize:24, fontWeight:700, color:T.textPrimary }}>{L.expenses}</h1>
        <Btn onClick={() => setShow(true)}>{L.addExpense}</Btn>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid">
        <Stat label={L.today}        value={cur(todayTot)}   color={RED} icon="trending-down" T={T} />
        <Stat label={L.thisMonth}    value={cur(monthTot)}   color={AMB} icon="clock"         T={T} />
        <Stat label={L.transactions} value={expenses.length} color={BLU} icon="file"          T={T} />
      </div>

      {/* ── Expenses table ── */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:16 }}>
        <Tbl T={T} empty={L.noRecords}
          cols={[L.date, L.expDescription, L.expCategory, L.expenseAmount, L.notes, '']}
          rows={expenses.map(e => [
            <span style={{ fontSize:12, color:T.textSecondary, whiteSpace:'nowrap' }}>{fmtD(e.date)}</span>,
            <span style={{ fontWeight:500, color:T.textPrimary }}>{e.description}</span>,
            e.category ? <Badge color={e.category==='Restocking' ? GRN : PUR}>{e.category}</Badge> : <span style={{ color:T.textMuted }}>—</span>,
            <span className="mono" style={{ color:RED, fontWeight:600 }}>{cur(e.amount)}</span>,
            <span style={{ fontSize:12, color:T.textSecondary }}>{e.notes || '—'}</span>,
            <Btn small outline color={RED} icon="trash" onClick={() => del(e.id)}>{L.delete}</Btn>,
          ])}
        />
      </div>

      {/* ── Add expense modal ── */}
      {show && (
        <Modal title={L.addExpenseTitle || 'Add Expense'} onClose={() => { setShow(false); setForm(blank) }} T={T}>
          <div style={{ display:'grid', gap:12 }}>

            {/* Category — first so restocking panel appears early */}
            <Lbl label={L.expCategory} T={T}>
              <select value={form.category} onChange={e => sf('category', e.target.value)} style={{ fontSize:13 }}>
                <option value="">{L.selectCategory || 'Select category...'}</option>
                {EXP_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Lbl>

            {/* ── Restocking panel ── */}
            {isRestocking && (
              <div style={{ background: GRN+'0d', border:`1px solid ${GRN}44`, borderRadius:12, padding:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <Icon name="package" size={15} color={GRN} />
                  <span style={{ fontWeight:700, fontSize:13, color:GRN }}>Restocking — updates product stock automatically</span>
                </div>

                {/* Select product */}
                <Lbl label={L.restockingProduct || 'Select product to restock'} T={T}>
                  <select value={form.restockProductId} onChange={e => selectRestockProduct(e.target.value)} style={{ fontSize:13 }}>
                    <option value="">-- Choose product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Current stock: {p.stock})</option>
                    ))}
                  </select>
                </Lbl>

                {/* Show current stock info */}
                {selectedRestockProduct && (
                  <div style={{ display:'flex', gap:8, marginTop:10, marginBottom:10, flexWrap:'wrap' }}>
                    {[
                      { label:'Current Stock', value:selectedRestockProduct.stock, color:T.textPrimary },
                      { label:'Buy Price',     value:cur(selectedRestockProduct.buyPrice),  color:AMB },
                      { label:'Sell Price',    value:cur(selectedRestockProduct.sellPrice), color:GRN },
                    ].map((s,i) => (
                      <div key={i} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:'7px 12px', flex:1 }}>
                        <div style={{ fontSize:10, color:T.textMuted, fontWeight:600, textTransform:'uppercase' }}>{s.label}</div>
                        <div className="mono" style={{ fontSize:14, fontWeight:700, color:s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Qty + Price */}
                {form.restockProductId && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
                    <Lbl label={L.restockingQty || 'Restock quantity'} T={T}>
                      <input type="number" min="1" value={form.restockQty}
                        onChange={e => updateRestockCalc('restockQty', e.target.value)}
                        style={{ fontSize:13 }} />
                    </Lbl>
                    <Lbl label={L.restockingPrice || 'Price per unit'} T={T}>
                      <input type="number" value={form.restockPrice}
                        onChange={e => updateRestockCalc('restockPrice', e.target.value)}
                        style={{ fontSize:13 }} />
                    </Lbl>
                  </div>
                )}

                {/* Stock preview */}
                {selectedRestockProduct && form.restockQty > 0 && (
                  <div style={{ marginTop:10, background:GRN+'18', border:`1px solid ${GRN}44`, borderRadius:8, padding:'8px 12px', fontSize:12, color:GRN, fontWeight:600 }}>
                    ✅ After restock: {selectedRestockProduct.name} will have <strong>{selectedRestockProduct.stock + +form.restockQty}</strong> units
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <Lbl label={L.expDescription+' *'} T={T}>
              <input value={form.desc} onChange={e => sf('desc', e.target.value)} placeholder="e.g. Bought 10 shoes from supplier" />
            </Lbl>

            {/* Amount + Date */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="g2">
              <Lbl label={L.expenseAmount+' *'} T={T}>
                <input type="number" value={form.amount} onChange={e => sf('amount',e.target.value)} placeholder="Total cost" style={{ fontSize:isRestocking?15:14, fontWeight:isRestocking?700:400, color:isRestocking?T.accent:T.textPrimary }} />
              </Lbl>
              <Lbl label={L.date} T={T}>
                <input type="date" value={form.date} onChange={e => sf('date',e.target.value)} />
              </Lbl>
            </div>

            {isRestocking && form.restockQty > 0 && form.restockPrice > 0 && (
              <div style={{ fontSize:12, color:T.textMuted, marginTop:-4 }}>
                Auto-calculated: {form.restockQty} × {cur(form.restockPrice)} = <strong style={{ color:T.accent }}>{cur(+form.restockQty * +form.restockPrice)}</strong>
              </div>
            )}

            <Lbl label={L.notes} T={T}>
              <textarea value={form.notes} onChange={e => sf('notes',e.target.value)} rows={2} style={{ resize:'vertical' }} />
            </Lbl>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
            <Btn outline color={T.textSecondary} onClick={() => { setShow(false); setForm(blank) }}>{L.cancel}</Btn>
            <Btn onClick={saveExp} disabled={saving} icon="download">
              {saving ? 'Saving…' : isRestocking && form.restockProductId ? `✅ Save & Restock` : L.save}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
