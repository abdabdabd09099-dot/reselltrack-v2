// ─── Sales.jsx ────────────────────────────────────────────────────────────────
// Record sales, filter by period/product/status/method, mark as paid.
// Editable within 2 hours of creation — shows countdown timer badge.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { apiSales, apiProducts, apiLending, sb } from '../utils/supabase.js'
import { GRN, RED, AMB, BLU } from '../data/constants.js'
import { todayStr, fmtDT, thisWeekRange, thisMonthRange, inRange } from '../utils/helpers.js'
import { Badge, Btn, Modal, Field, Stat, Tbl } from '../components/UI.jsx'

const Lbl = Field

// ── Edit window: 2 hours in milliseconds ─────────────────────────────────────
const EDIT_WINDOW_MS = 2 * 60 * 60 * 1000

const PERIOD_TABS = [
  { id: 'all',   label: 'All Time'  },
  { id: 'today', label: 'Today'     },
  { id: 'week',  label: 'This Week' },
  { id: 'month', label: 'This Month'},
]

// ── Time remaining badge ──────────────────────────────────────────────────────
function EditTimer({ saleDate, T }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - new Date(saleDate).getTime()
      const left    = EDIT_WINDOW_MS - elapsed
      if (left <= 0) { setRemaining(''); return }
      const m = Math.floor(left / 60000)
      const s = Math.floor((left % 60000) / 1000)
      setRemaining(`${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [saleDate])

  if (!remaining) return null
  return (
    <span style={{ fontSize: 10, background: AMB + '22', color: AMB, border: `1px solid ${AMB}44`, borderRadius: 4, padding: '2px 6px', fontWeight: 600, whiteSpace: 'nowrap' }}>
      ✏️ {remaining}
    </span>
  )
}

export default function Sales({ products, setProducts, sales, setSales, lending, setLending, userId, T, L, cur }) {
  const [show,    setShow]    = useState(false)
  const [editSale,setEditSale]= useState(null)   // sale being edited
  const [saving,  setSaving]  = useState(false)
  const [now,     setNow]     = useState(Date.now())

  // Tick every 30s to re-evaluate which sales are still editable
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const isEditable = s => (now - new Date(s.date).getTime()) < EDIT_WINDOW_MS

  // ── Filters ────────────────────────────────────────────────────────────────
  const [srch,          setSrch]          = useState('')
  const [filterSt,      setFilterSt]      = useState('all')
  const [filterPeriod,  setFilterPeriod]  = useState('all')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterMethod,  setFilterMethod]  = useState('all')
  const [showFilters,   setShowFilters]   = useState(false)

  const getPeriodRange = () => {
    const td = todayStr()
    if (filterPeriod === 'today') return [td, td]
    if (filterPeriod === 'week')  return thisWeekRange()
    if (filterPeriod === 'month') return thisMonthRange()
    return null
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  const mkBlank = () => ({
    customerName: '', contact: '',
    date: todayStr(), time: new Date().toTimeString().slice(0, 5),
    items: [{ productId: '', productName: '', qty: 1, unitPrice: 0 }],
    paymentMethod: 'cash', amountPaid: '', dueDate: '', notes: '', sendToLend: true,
  })
  const [form, setForm] = useState(mkBlank())
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const rowTotal = form.items.reduce((a, i) => a + (i.qty * i.unitPrice), 0)
  const rowBal   = Math.max(0, rowTotal - (+form.amountPaid || 0))

  const updItem = (idx, key, val) => setForm(f => {
    const items = [...f.items]; items[idx] = { ...items[idx], [key]: val }
    if (key === 'productId') {
      const p = products.find(p => p.id === val)
      if (p) { items[idx].productName = p.name; items[idx].unitPrice = p.sellPrice }
    }
    return { ...f, items }
  })

  // ── Open edit modal ────────────────────────────────────────────────────────
  const openEdit = s => {
    const d = new Date(s.date)
    setEditSale(s)
    setForm({
      customerName:  s.customerName,
      contact:       s.contact || '',
      date:          d.toISOString().slice(0, 10),
      time:          d.toTimeString().slice(0, 5),
      items:         s.items.map(i => ({ ...i })),
      paymentMethod: s.paymentMethod,
      amountPaid:    s.amountPaid,
      dueDate:       '',
      notes:         s.notes || '',
      sendToLend:    false,
    })
    setShow(true)
  }

  // ── Save (new or edit) ─────────────────────────────────────────────────────
  const saveSale = async () => {
    if (!form.customerName || form.items.some(i => !i.productId)) return alert('Fill required fields.')
    setSaving(true)
    try {
      const dt   = form.date + 'T' + form.time + ':00'

      if (editSale) {
        // ── EDIT existing sale ─────────────────────────────────────────────
        const newTotal  = form.items.reduce((a, i) => a + i.qty * i.unitPrice, 0)
        const newBal    = Math.max(0, newTotal - (+form.amountPaid || 0))
        const newStatus = newBal === 0 ? 'Paid' : +form.amountPaid > 0 ? 'Partial' : 'Unpaid'

        // Restore old stock, apply new stock
        const oldItems = editSale.items
        const newItems = form.items

        // Restore old qty back to products
        await Promise.all(oldItems.map(oi => {
          const p = products.find(p => p.id === oi.productId)
          if (!p) return Promise.resolve()
          return apiProducts.update(oi.productId, { ...p, stock: p.stock + oi.qty })
        }))
        // Deduct new qty
        await Promise.all(newItems.map(ni => {
          const p = products.find(p => p.id === ni.productId)
          if (!p) return Promise.resolve()
          return apiProducts.update(ni.productId, { ...p, stock: Math.max(0, p.stock - ni.qty) })
        }))

        // Update local product state
        setProducts(ps => ps.map(p => {
          const old = oldItems.find(i => i.productId === p.id)
          const nw  = newItems.find(i => i.productId === p.id)
          let stock = p.stock
          if (old) stock += old.qty
          if (nw)  stock = Math.max(0, stock - nw.qty)
          return { ...p, stock }
        }))

        // Update sale in DB via Supabase directly
        await sb.from('sales').update({
          customer_name:  form.customerName,
          contact:        form.contact || null,
          sale_date:      dt,
          total_amount:   newTotal,
          amount_paid:    +form.amountPaid || 0,
          balance:        newBal,
          payment_method: form.paymentMethod,
          status:         newStatus,
          notes:          form.notes || null,
        }).eq('id', editSale.id)

        // Delete old items and insert new ones
        await sb.from('sale_items').delete().eq('sale_id', editSale.id)
        await sb.from('sale_items').insert(
          newItems.map(i => ({
            sale_id:      editSale.id,
            product_id:   i.productId,
            product_name: i.productName,
            qty:          i.qty,
            unit_price:   i.unitPrice,
          }))
        )

        setSales(ss => ss.map(s => s.id === editSale.id ? {
          ...s,
          customerName: form.customerName, contact: form.contact, date: dt,
          items: newItems, totalAmount: newTotal,
          amountPaid: +form.amountPaid || 0, balance: newBal,
          paymentMethod: form.paymentMethod, status: newStatus, notes: form.notes,
        } : s))

        setEditSale(null)
      } else {
        // ── NEW sale ──────────────────────────────────────────────────────
        const sale = {
          customerName: form.customerName, contact: form.contact, date: dt,
          items: form.items, totalAmount: rowTotal, amountPaid: +form.amountPaid || 0,
          balance: rowBal, paymentMethod: form.paymentMethod, notes: form.notes,
          status: rowBal === 0 ? 'Paid' : +form.amountPaid > 0 ? 'Partial' : 'Unpaid',
        }
        await Promise.all(form.items.map(i => {
          const prod = products.find(p => p.id === i.productId)
          return apiProducts.update(i.productId, { ...prod, stock: Math.max(0, (prod?.stock || 0) - i.qty) })
        }))
        setProducts(ps => ps.map(p => {
          const it = form.items.find(i => i.productId === p.id)
          return it ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p
        }))
        const created = await apiSales.create(sale, userId)
        setSales(ss => [{ ...sale, id: created.id }, ...ss])
        if (rowBal > 0 && form.sendToLend) {
          const lEntry = { personName: form.customerName, contact: form.contact, amount: rowBal, date: dt, dueDate: form.dueDate || '', notes: form.notes, status: 'Pending', source: 'sale', saleId: created.id }
          const cl     = await apiLending.create(lEntry, userId)
          setLending(ls => [{ ...lEntry, id: cl.id }, ...ls])
        }
      }

      setShow(false); setForm(mkBlank())
    } catch (e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  // ── Mark paid ──────────────────────────────────────────────────────────────
  const markPaid = async id => {
    try {
      await apiSales.markPaid(id)
      setSales(ss => ss.map(s => s.id === id ? { ...s, amountPaid: s.totalAmount, balance: 0, status: 'Paid' } : s))
      await apiLending.settleBySale(id).catch(() => {})
      setLending(ls => ls.map(l => l.saleId === id ? { ...l, status: 'Settled' } : l))
    } catch (e) { alert('Error: ' + e.message) }
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  const resetFilters = () => { setSrch(''); setFilterSt('all'); setFilterPeriod('all'); setFilterProduct(''); setFilterMethod('all') }
  const hasFilter    = srch || filterSt !== 'all' || filterPeriod !== 'all' || filterProduct || filterMethod !== 'all'
  const range        = getPeriodRange()

  const filtered = sales.filter(s => {
    if (filterSt !== 'all' && s.status.toLowerCase() !== filterSt) return false
    if (filterMethod !== 'all' && s.paymentMethod !== filterMethod) return false
    if (range && !inRange(s.date, range)) return false
    if (filterProduct && !s.items.some(i => i.productName === filterProduct)) return false
    if (srch) {
      const q = srch.toLowerCase()
      if (!s.customerName.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) return false
    }
    return true
  })

  const productNames = [...new Set(sales.flatMap(s => s.items.map(i => i.productName)))].filter(Boolean).sort()
  const todayRev     = sales.filter(s => s.date.slice(0, 10) === todayStr()).reduce((a, s) => a + s.amountPaid, 0)
  const totalUncol   = sales.reduce((a, s) => a + s.balance, 0)

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 className="dm" style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary }}>{L.sales}</h1>
        <Btn onClick={() => { setEditSale(null); setForm(mkBlank()); setShow(true) }}>{L.addSale}</Btn>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid">
        <Stat label={L.todayRevenue} value={cur(todayRev)}   color={GRN}      icon="💰" T={T} />
        <Stat label={L.uncollected}  value={cur(totalUncol)} color={AMB}      icon="⏳" T={T} />
        <Stat label={L.transactions} value={sales.length}    color={BLU}      icon="🛍️" T={T} />
        <Stat label={L.paid}         value={sales.filter(s => s.status === 'Paid').length} color={T.accent} icon="✅" T={T} />
      </div>

      {/* ── Edit window notice ── */}
      <div style={{ background: AMB + '11', border: `1px solid ${AMB}33`, borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontSize: 12, color: AMB, display: 'flex', alignItems: 'center', gap: 8 }}>
        ✏️ <span>Sale records can be edited within <strong>2 hours</strong> of creation. After that they are locked.</span>
      </div>

      {/* ── Period tabs ── */}
      <div style={{ display: 'flex', marginBottom: 14, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden', width: 'fit-content' }}>
        {PERIOD_TABS.map(tab => (
          <button key={tab.id} onClick={() => setFilterPeriod(tab.id)}
            style={{ padding: '9px 16px', background: filterPeriod === tab.id ? T.accent : 'transparent', color: filterPeriod === tab.id ? '#fff' : T.textSecondary, fontWeight: 600, border: 'none', fontSize: 13, cursor: 'pointer' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Filter panel ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: showFilters ? 14 : 0, flexWrap: 'wrap' }}>
          <input placeholder="Search customer or sale ID..." value={srch} onChange={e => setSrch(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <button onClick={() => setShowFilters(f => !f)}
            style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${hasFilter ? T.accent : T.border}`, background: hasFilter ? T.accent + '22' : 'transparent', color: hasFilter ? T.accent : T.textSecondary, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            🔽 Filters{hasFilter ? ' •' : ''}
          </button>
          {hasFilter && (
            <button onClick={resetFilters}
              style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${RED}`, background: 'transparent', color: RED, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              ✕ Clear
            </button>
          )}
        </div>
        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 4 }}>Status</label>
              <select value={filterSt} onChange={e => setFilterSt(e.target.value)}>
                <option value="all">All</option>
                <option value="paid">✅ Paid</option>
                <option value="partial">⚠️ Partial</option>
                <option value="unpaid">🔴 Unpaid</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 4 }}>Method</label>
              <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                <option value="all">All</option>
                <option value="cash">💵 Cash</option>
                <option value="transfer">📲 Transfer</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 4 }}>Product</label>
              <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
                <option value="">All Products</option>
                {productNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Sales table ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        <div className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 12 }}>
          Sales Records
          {filtered.length !== sales.length && (
            <span style={{ fontWeight: 400, color: T.textSecondary, fontSize: 12, marginLeft: 8 }}>
              ({filtered.length} of {sales.length})
            </span>
          )}
        </div>
        <Tbl T={T} empty={L.noRecords}
          cols={[L.saleId, L.dateTime, L.customer, L.items, L.total, L.paid, L.balance, L.method, L.status, 'Actions']}
          rows={filtered.map(s => [
            <span className="mono" style={{ fontSize: 10, color: T.textMuted }}>{s.id}</span>,
            <span style={{ fontSize: 11, color: T.textSecondary, whiteSpace: 'nowrap' }}>{fmtDT(s.date)}</span>,
            <div>
              <div style={{ fontWeight: 500, color: T.textPrimary }}>{s.customerName}</div>
              {s.contact && <div style={{ fontSize: 11, color: T.textSecondary }}>{s.contact}</div>}
            </div>,
            <div>{s.items.map((i, x) => <div key={x} style={{ fontSize: 11, color: T.textSecondary }}>{i.productName} ×{i.qty}</div>)}</div>,
            <span className="mono" style={{ fontWeight: 600, color: T.textPrimary }}>{cur(s.totalAmount)}</span>,
            <span className="mono" style={{ color: GRN }}>{cur(s.amountPaid)}</span>,
            <span className="mono" style={{ color: s.balance > 0 ? RED : T.textMuted }}>{s.balance > 0 ? cur(s.balance) : '—'}</span>,
            <Badge color={s.paymentMethod === 'cash' ? GRN : BLU}>{s.paymentMethod === 'cash' ? '💵' : '📲'}</Badge>,
            s.status === 'Paid'
              ? <Badge color={GRN}>✅ {L.paid}</Badge>
              : s.status === 'Partial'
                ? <Badge color={AMB}>{L.partial}</Badge>
                : <Badge color={RED}>{L.unpaid}</Badge>,
            // Actions column — edit timer + mark paid
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
              {isEditable(s) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Btn small outline color={AMB} onClick={() => openEdit(s)}>✏️ Edit</Btn>
                  <EditTimer saleDate={s.date} T={T} />
                </div>
              )}
              {s.status !== 'Paid' && (
                <Btn small color={GRN} onClick={() => markPaid(s.id)}>{L.markPaid}</Btn>
              )}
              {s.status === 'Paid' && !isEditable(s) && (
                <span style={{ color: T.textMuted, fontSize: 12 }}>🔒 Locked</span>
              )}
            </div>,
          ])}
        />
      </div>

      {/* ── New / Edit sale modal ── */}
      {show && (
        <Modal title={editSale ? '✏️ Edit Sale Record' : L.recordNewSale} onClose={() => { setShow(false); setEditSale(null) }} wide T={T}>

          {/* Edit warning banner */}
          {editSale && (
            <div style={{ background: AMB + '22', border: `1px solid ${AMB}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: AMB }}>
              ⚠️ Editing an existing sale. Stock will be recalculated automatically.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }} className="g2">
            <Lbl label={L.date} T={T}><input type="date" value={form.date} onChange={e => sf('date', e.target.value)} /></Lbl>
            <Lbl label={L.time} T={T}><input type="time" value={form.time} onChange={e => sf('time', e.target.value)} /></Lbl>
            <Lbl label={L.customerName + ' *'} T={T}><input value={form.customerName} onChange={e => sf('customerName', e.target.value)} /></Lbl>
            <Lbl label={L.contact} T={T}><input value={form.contact} onChange={e => sf('contact', e.target.value)} /></Lbl>
          </div>

          <div className="dm" style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: T.textPrimary }}>{L.items}</div>
          {form.items.map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 3 }}>{L.product} *</label>
                <select value={item.productId} onChange={e => updItem(idx, 'productId', e.target.value)}>
                  <option value="">{L.selectProduct}</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({L.stock}:{p.stock})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 3 }}>{L.unitPrice}</label>
                <input type="number" value={item.unitPrice} onChange={e => updItem(idx, 'unitPrice', +e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 3 }}>{L.qty}</label>
                <input type="number" min="1" value={item.qty} onChange={e => updItem(idx, 'qty', +e.target.value)} />
              </div>
              <button onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                style={{ height: 40, background: 'none', border: 'none', color: RED, fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
          ))}
          <Btn small outline color={T.accent} style={{ marginBottom: 14 }}
            onClick={() => setForm(f => ({ ...f, items: [...f.items, { productId: '', productName: '', qty: 1, unitPrice: 0 }] }))}>
            {L.addItem}
          </Btn>

          <div style={{ background: T.bg, borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: T.textSecondary }}>{L.totalAmount}</span>
            <span className="mono" style={{ fontWeight: 700, fontSize: 18, color: T.textPrimary }}>{cur(rowTotal)}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }} className="g2">
            <Lbl label={L.paymentMethod} T={T}>
              <div style={{ display: 'flex', gap: 8 }}>
                {['cash', 'transfer'].map(m => (
                  <button key={m} onClick={() => sf('paymentMethod', m)}
                    style={{ flex: 1, padding: '9px 4px', borderRadius: 8, border: `2px solid ${form.paymentMethod === m ? (m === 'cash' ? GRN : BLU) : T.border}`, background: form.paymentMethod === m ? (m === 'cash' ? GRN + '22' : BLU + '22') : 'transparent', color: form.paymentMethod === m ? (m === 'cash' ? GRN : BLU) : T.textSecondary, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    {m === 'cash' ? L.cash : L.transfer}
                  </button>
                ))}
              </div>
            </Lbl>
            <Lbl label={L.amountPaid} T={T}>
              <input type="number" value={form.amountPaid} onChange={e => sf('amountPaid', e.target.value)} placeholder={`0 – ${rowTotal}`} />
            </Lbl>
          </div>

          {/* Balance / auto-lend (new sales only) */}
          {!editSale && rowBal > 0 && (
            <div style={{ background: RED + '11', border: `1px solid ${RED}44`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ color: RED, fontWeight: 600 }}>{L.balanceDue}: <span className="mono">{cur(rowBal)}</span></span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.sendToLend} onChange={e => sf('sendToLend', e.target.checked)} />
                  <span style={{ color: AMB }}>{L.autoAddLending}</span>
                </label>
              </div>
              {form.sendToLend && (
                <Lbl label={L.dueDate} T={T}>
                  <input type="date" value={form.dueDate} onChange={e => sf('dueDate', e.target.value)} />
                </Lbl>
              )}
            </div>
          )}

          <Lbl label={L.notes} T={T}>
            <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          </Lbl>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <Btn outline color={T.textSecondary} onClick={() => { setShow(false); setEditSale(null) }}>{L.cancel}</Btn>
            <Btn onClick={saveSale} disabled={saving}>{saving ? 'Saving…' : editSale ? 'Save Changes' : L.save}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
