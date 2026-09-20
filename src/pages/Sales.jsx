// ─── Sales.jsx ────────────────────────────────────────────────────────────────
// Fixes applied:
//  1. Out-of-stock items blocked + notified
//  2. Duplicate product blocked (unless variant differs)
//  5. Actual cash verification — compare real vs calculated, notify difference
//  6. Edit window + delete within 2 hours
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { apiSales, apiProducts, apiLending, sb } from '../utils/supabase.js'
import { saveOffline } from '../utils/offlineQueue.js'
import { GRN, RED, AMB, BLU } from '../data/constants.js'
import { todayStr, fmtDT, thisWeekRange, thisMonthRange, inRange } from '../utils/helpers.js'
import { Badge, Btn, Modal, Field, Stat, Tbl, Icon } from '../components/UI.jsx'

const Lbl = Field
const EDIT_WINDOW_MS = 2 * 60 * 60 * 1000

// ── Edit countdown timer badge ────────────────────────────────────────────────
function EditTimer({ saleDate }) {
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    const tick = () => {
      const left = EDIT_WINDOW_MS - (Date.now() - new Date(saleDate).getTime())
      if (left <= 0) { setRemaining(''); return }
      setRemaining(`${Math.floor(left/60000)}m ${Math.floor((left%60000)/1000)}s`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [saleDate])
  if (!remaining) return null
  return <span style={{ fontSize: 10, background: AMB+'22', color: AMB, border:`1px solid ${AMB}44`, borderRadius:4, padding:'2px 6px', fontWeight:600, whiteSpace:'nowrap' }}>✏️ {remaining}</span>
}

// ── Period tabs ───────────────────────────────────────────────────────────────
const PERIODS = [
  { id:'all',   label:'All Time'   },
  { id:'today', label:'Today'      },
  { id:'week',  label:'This Week'  },
  { id:'month', label:'This Month' },
]

export default function Sales({ products, setProducts, sales, setSales, lending, setLending, userId, T, L, cur, isDemo, demoApi, onDemoLimit }) {
  const [show,     setShow]     = useState(false)
  const [editSale, setEditSale] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [now,      setNow]      = useState(Date.now())
  const [itemWarn, setItemWarn] = useState('')

  // ── Cash verification state ───────────────────────────────────────────────
  const [showCash,    setShowCash]    = useState(false)
  const [actualCash,  setActualCash]  = useState('')
  const [cashDate,    setCashDate]    = useState(todayStr())
  const [cashResult,  setCashResult]  = useState(null)

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id) }, [])
  const isEditable = s => (now - new Date(s.date).getTime()) < EDIT_WINDOW_MS

  // ── Filters ───────────────────────────────────────────────────────────────
  const [srch,          setSrch]          = useState('')
  const [filterSt,      setFilterSt]      = useState('all')
  const [filterPeriod,  setFilterPeriod]  = useState('all')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterMethod,  setFilterMethod]  = useState('all')
  const [showFilters,   setShowFilters]   = useState(false)

  const getPeriodRange = () => {
    const td = todayStr()
    if (filterPeriod==='today') return [td, td]
    if (filterPeriod==='week')  return thisWeekRange()
    if (filterPeriod==='month') return thisMonthRange()
    return null
  }

  // ── Blank form ────────────────────────────────────────────────────────────
  const mkBlank = () => ({
    customerName:'', contact:'',
    date: todayStr(), time: new Date().toTimeString().slice(0,5),
    items: [{ productId:'', productName:'', qty:1, unitPrice:0, variant:'' }],
    paymentMethod:'cash', amountPaid:'', dueDate:'', notes:'', sendToLend:true,
  })
  const [form, setForm] = useState(mkBlank())
  const sf = (k,v) => setForm(f => ({ ...f, [k]:v }))

  const rowTotal = form.items.reduce((a,i) => a + (i.qty * i.unitPrice), 0)
  const rowBal   = Math.max(0, rowTotal - (+form.amountPaid || 0))

  // ── Update item — Fix 1 (stock) + Fix 6 (duplicate) ──────────────────────
  const updItem = (idx, key, val) => {
    setItemWarn('')
    setForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [key]: val }

      if (key === 'productId') {
        const p = products.find(p => p.id === val)
        if (p) {
          // Fix 1: block out-of-stock
          if (p.stock <= 0) {
            setItemWarn(`⛔ "${p.name}" ${L.outOfStockWarn || 'is out of stock.'}`)
            items[idx].productId = ''
            return { ...f, items }
          }
          // Fix 6: block duplicate product (unless variant differs)
          const alreadyUsed = f.items.some((it, i) =>
            i !== idx && it.productId === val && it.variant === items[idx].variant
          )
          if (alreadyUsed) {
            setItemWarn(`⚠️ ${L.duplicateItemWarn || '"' + p.name + '" is already in the list. Add a variant to use it again.'}`)
            items[idx].productId = ''
            return { ...f, items }
          }
          items[idx].productName = p.name
          items[idx].unitPrice   = p.sellPrice
          // Cap qty to available stock
          if (items[idx].qty > p.stock) items[idx].qty = p.stock
        }
      }

      // Fix 1: enforce stock cap on qty change
      if (key === 'qty') {
        const p = products.find(p => p.id === items[idx].productId)
        if (p && val > p.stock) {
          setItemWarn(`⚠️ Only ${p.stock} units of "${p.name}" available.`)
          items[idx].qty = p.stock
        }
      }
      return { ...f, items }
    })
  }

  // ── Open edit modal ───────────────────────────────────────────────────────
  const openEdit = s => {
    const d = new Date(s.date)
    setEditSale(s)
    setForm({
      customerName: s.customerName, contact: s.contact || '',
      date: d.toISOString().slice(0,10), time: d.toTimeString().slice(0,5),
      items: s.items.map(i => ({ ...i, variant: i.variant || '' })),
      paymentMethod: s.paymentMethod, amountPaid: s.amountPaid,
      dueDate:'', notes: s.notes || '', sendToLend: false,
    })
    setShow(true)
  }

  // ── Delete sale ───────────────────────────────────────────────────────────
  const deleteSale = async s => {
    if (!confirm(`Delete sale to ${s.customerName}?\n\nThis will restore stock for all items. This cannot be undone.`)) return
    try {
      if (isDemo) {
        setSales(ss => ss.filter(x => x.id !== s.id))
      } else {
        await sb.from('sale_items').delete().eq('sale_id', s.id)
        await sb.from('sales').delete().eq('id', s.id)
        for (const item of s.items) {
          const prod = products.find(p => p.id === item.productId)
          if (prod) await apiProducts.update(item.productId, { ...prod, stock: prod.stock + item.qty })
        }
        setProducts(ps => ps.map(p => {
          const it = s.items.find(i => i.productId === p.id)
          return it ? { ...p, stock: p.stock + it.qty } : p
        }))
        setSales(ss => ss.filter(x => x.id !== s.id))
        setLending(ls => ls.filter(l => l.saleId !== s.id))
      }
    } catch(e) { alert('Delete failed: ' + e.message) }
  }

  // ── Save sale ─────────────────────────────────────────────────────────────
  const saveSale = async () => {
    if (!form.customerName) return alert('Customer name is required.')
    const validItems = form.items.filter(i => i.productId)
    if (!validItems.length) return alert('Add at least one product.')

    // Fix 1: final stock check
    for (const item of validItems) {
      const p = products.find(p => p.id === item.productId)
      if (!p) continue
      const alreadyHeld = editSale ? (editSale.items.find(oi => oi.productId === item.productId)?.qty || 0) : 0
      const available   = p.stock + alreadyHeld
      if (item.qty > available) {
        return alert(`⛔ Not enough stock for "${p.name}". Available: ${available}, Requested: ${item.qty}`)
      }
    }

    setSaving(true)
    try {
      const dt   = form.date + 'T' + form.time + ':00'
      const total = validItems.reduce((a,i) => a + i.qty * i.unitPrice, 0)
      const bal   = Math.max(0, total - (+form.amountPaid || 0))
      const status = bal === 0 ? 'Paid' : +form.amountPaid > 0 ? 'Partial' : 'Unpaid'

      if (editSale) {
        // Restore old stock, deduct new
        for (const oi of editSale.items) {
          const p = products.find(p => p.id === oi.productId)
          if (p) await apiProducts.update(oi.productId, { ...p, stock: p.stock + oi.qty })
        }
        for (const ni of validItems) {
          const p = products.find(p => p.id === ni.productId)
          if (p) await apiProducts.update(ni.productId, { ...p, stock: Math.max(0, p.stock - ni.qty) })
        }
        setProducts(ps => ps.map(p => {
          let stock = p.stock
          const old = editSale.items.find(i => i.productId === p.id)
          const nw  = validItems.find(i => i.productId === p.id)
          if (old) stock += old.qty
          if (nw)  stock  = Math.max(0, stock - nw.qty)
          return { ...p, stock }
        }))
        await sb.from('sales').update({ customer_name: form.customerName, contact: form.contact||null, sale_date: dt, total_amount: total, amount_paid: +form.amountPaid||0, balance: bal, payment_method: form.paymentMethod, status, notes: form.notes||null }).eq('id', editSale.id)
        await sb.from('sale_items').delete().eq('sale_id', editSale.id)
        await sb.from('sale_items').insert(validItems.map(i => ({ sale_id: editSale.id, product_id: i.productId, product_name: i.productName, qty: i.qty, unit_price: i.unitPrice })))
        setSales(ss => ss.map(s => s.id === editSale.id ? { ...s, customerName: form.customerName, contact: form.contact, date: dt, items: validItems, totalAmount: total, amountPaid: +form.amountPaid||0, balance: bal, paymentMethod: form.paymentMethod, status, notes: form.notes } : s))
        setEditSale(null)
      } else {
        const sale = { customerName: form.customerName, contact: form.contact, date: dt, items: validItems, totalAmount: total, amountPaid: +form.amountPaid||0, balance: bal, paymentMethod: form.paymentMethod, notes: form.notes, status }
        let created
        if (isDemo) {
          created = demoApi.sales.create(sale)
          if (!created) { onDemoLimit?.(); setSaving(false); return }
        } else if (!navigator.onLine) {
          created = await saveOffline('sales', { ...sale, userId })
          alert('📡 Offline. Sale saved and will sync when reconnected.')
        } else {
          created = await apiSales.create(sale, userId)
        }
        // Deduct stock
        for (const item of validItems) {
          const prod = products.find(p => p.id === item.productId)
          if (prod) await apiProducts.update(item.productId, { ...prod, stock: Math.max(0, prod.stock - item.qty) })
        }
        setProducts(ps => ps.map(p => { const it = validItems.find(i => i.productId === p.id); return it ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p }))
        setSales(ss => [{ ...sale, id: created.id }, ...ss])
        // Auto-add to lending if balance due
        if (bal > 0 && form.sendToLend && !isDemo) {
          const lEntry = { personName: form.customerName, contact: form.contact, amount: bal, date: dt, dueDate: form.dueDate||'', notes: form.notes, status:'Pending', source:'sale', saleId: created.id }
          const cl = await apiLending.create(lEntry, userId)
          setLending(ls => [{ ...lEntry, id: cl.id }, ...ls])
        }
      }
      setShow(false); setForm(mkBlank()); setItemWarn('')
    } catch(e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  // ── Mark paid ─────────────────────────────────────────────────────────────
  const markPaid = async id => {
    try {
      await apiSales.markPaid(id)
      setSales(ss => ss.map(s => s.id === id ? { ...s, amountPaid: s.totalAmount, balance: 0, status:'Paid' } : s))
      await apiLending.settleBySale(id).catch(() => {})
      setLending(ls => ls.map(l => l.saleId === id ? { ...l, status:'Settled' } : l))
    } catch(e) { alert('Error: ' + e.message) }
  }

  // ── Fix 5: Cash verification ───────────────────────────────────────────────
  const verifyCash = () => {
    const range   = cashDate ? [cashDate, cashDate] : [todayStr(), todayStr()]
    const dayS    = sales.filter(s => inRange(s.date, range))
    const calcTotal = dayS.reduce((a,s) => a + s.amountPaid, 0)
    const actual    = +actualCash
    const diff      = actual - calcTotal
    setCashResult({ calcTotal, actual, diff, count: dayS.length, date: cashDate })
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  const resetFilters = () => { setSrch(''); setFilterSt('all'); setFilterPeriod('all'); setFilterProduct(''); setFilterMethod('all') }
  const hasFilter    = srch || filterSt !== 'all' || filterPeriod !== 'all' || filterProduct || filterMethod !== 'all'
  const range        = getPeriodRange()
  const filtered     = sales.filter(s => {
    if (filterSt !== 'all' && s.status.toLowerCase() !== filterSt) return false
    if (filterMethod !== 'all' && s.paymentMethod !== filterMethod) return false
    if (range && !inRange(s.date, range)) return false
    if (filterProduct && !s.items.some(i => i.productName === filterProduct)) return false
    if (srch) { const q = srch.toLowerCase(); if (!s.customerName.toLowerCase().includes(q)) return false }
    return true
  })
  const productNames = [...new Set(sales.flatMap(s => s.items.map(i => i.productName)))].filter(Boolean).sort()
  const todayRev     = sales.filter(s => s.date.slice(0,10) === todayStr()).reduce((a,s) => a + s.amountPaid, 0)
  const totalUncol   = sales.reduce((a,s) => a + s.balance, 0)

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h1 className="dm" style={{ fontSize:24, fontWeight:700, color:T.textPrimary }}>{L.sales}</h1>
        <div style={{ display:'flex', gap:8 }}>
          <Btn outline color={AMB} small icon="dollar" onClick={() => setShowCash(true)}>{L.cashVerification || 'Cash Check'}</Btn>
          <Btn onClick={() => { setEditSale(null); setForm(mkBlank()); setItemWarn(''); setShow(true) }}>{L.addSale}</Btn>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid">
        <Stat label={L.todayRevenue}  value={cur(todayRev)}   color={GRN}      icon="trending-up"   T={T} />
        <Stat label={L.uncollected}   value={cur(totalUncol)} color={AMB}      icon="clock"         T={T} />
        <Stat label={L.transactions}  value={sales.length}    color={BLU}      icon="sales"         T={T} />
        <Stat label={L.paid}          value={sales.filter(s => s.status==='Paid').length} color={T.accent} icon="check" T={T} />
      </div>

      {/* ── Edit window notice ── */}
      <div style={{ background:AMB+'11', border:`1px solid ${AMB}33`, borderRadius:10, padding:'8px 14px', marginBottom:14, fontSize:12, color:AMB, display:'flex', alignItems:'center', gap:8 }}>
        <Icon name="clock" size={13} color={AMB} />
        <span>Sales can be <strong>edited</strong> within 2 hours. <strong>Delete</strong> is always available — restores stock automatically.</span>
      </div>

      {/* ── Period tabs ── */}
      <div style={{ display:'flex', marginBottom:14, background:T.surface, borderRadius:10, border:`1px solid ${T.border}`, overflow:'hidden', width:'fit-content' }}>
        {PERIODS.map(tab => (
          <button key={tab.id} onClick={() => setFilterPeriod(tab.id)}
            style={{ padding:'8px 14px', background:filterPeriod===tab.id ? T.accent : 'transparent', color:filterPeriod===tab.id ? '#fff' : T.textSecondary, fontWeight:600, border:'none', fontSize:12, cursor:'pointer' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Filter panel ── */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ display:'flex', gap:8, marginBottom:showFilters?12:0, flexWrap:'wrap' }}>
          <input placeholder="Search customer..." value={srch} onChange={e => setSrch(e.target.value)} style={{ flex:1, minWidth:140, fontSize:13 }} />
          <button onClick={() => setShowFilters(f => !f)}
            style={{ padding:'8px 12px', borderRadius:8, border:`1px solid ${hasFilter ? T.accent : T.border}`, background:hasFilter ? T.accent+'22' : 'transparent', color:hasFilter ? T.accent : T.textSecondary, fontWeight:600, fontSize:12, cursor:'pointer' }}>
            <Icon name="filter" size={13} color={hasFilter ? T.accent : T.textSecondary} />
          </button>
          {hasFilter && <button onClick={resetFilters} style={{ padding:'8px 10px', borderRadius:8, border:`1px solid ${RED}`, background:'transparent', color:RED, fontWeight:600, fontSize:12, cursor:'pointer' }}>✕</button>}
        </div>
        {showFilters && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8 }}>
            {[
              { label:'Status', value:filterSt, setter:setFilterSt, opts:[['all','All'],['paid','✅ Paid'],['partial','⚠️ Partial'],['unpaid','🔴 Unpaid']] },
              { label:'Method', value:filterMethod, setter:setFilterMethod, opts:[['all','All'],['cash','💵 Cash'],['transfer','📲 Transfer']] },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontSize:10, color:T.textSecondary, display:'block', marginBottom:3, fontWeight:600, textTransform:'uppercase' }}>{f.label}</label>
                <select value={f.value} onChange={e => f.setter(e.target.value)}>
                  {f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label style={{ fontSize:10, color:T.textSecondary, display:'block', marginBottom:3, fontWeight:600, textTransform:'uppercase' }}>Product</label>
              <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
                <option value="">All Products</option>
                {productNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Sales table ── */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:16 }}>
        <div className="dm" style={{ fontWeight:700, fontSize:14, color:T.textPrimary, marginBottom:12 }}>
          Sales Records
          {filtered.length !== sales.length && <span style={{ fontWeight:400, color:T.textSecondary, fontSize:12, marginLeft:8 }}>({filtered.length} of {sales.length})</span>}
        </div>
        <Tbl T={T} empty={L.noRecords}
          cols={[L.dateTime, L.customer, L.items, L.total, L.paid || 'Paid', L.balance, L.method, L.status, 'Actions']}
          rows={filtered.map(s => [
            <span style={{ fontSize:11, color:T.textSecondary, whiteSpace:'nowrap' }}>{fmtDT(s.date)}</span>,
            <div>
              <div style={{ fontWeight:500, color:T.textPrimary }}>{s.customerName}</div>
              {s.contact && <div style={{ fontSize:11, color:T.textSecondary }}>{s.contact}</div>}
            </div>,
            <div>{s.items.map((i,x) => <div key={x} style={{ fontSize:11, color:T.textSecondary }}>{i.productName} ×{i.qty}{i.variant ? ` (${i.variant})`:''}</div>)}</div>,
            <span className="mono" style={{ fontWeight:600, color:T.textPrimary }}>{cur(s.totalAmount)}</span>,
            <span className="mono" style={{ color:GRN }}>{cur(s.amountPaid)}</span>,
            <span className="mono" style={{ color:s.balance>0?RED:T.textMuted }}>{s.balance>0 ? cur(s.balance) : '—'}</span>,
            <Badge color={s.paymentMethod==='cash'?GRN:BLU}>{s.paymentMethod==='cash'?'💵':'📲'}</Badge>,
            s.status==='Paid' ? <Badge color={GRN}>✅ {L.paid}</Badge> : s.status==='Partial' ? <Badge color={AMB}>{L.partial}</Badge> : <Badge color={RED}>{L.unpaid}</Badge>,
            <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-start' }}>
              {/* Edit — only within 2hr window */}
              {isEditable(s) && (
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <Btn small outline color={AMB} icon="edit" onClick={() => openEdit(s)}>Edit</Btn>
                  <EditTimer saleDate={s.date} />
                </div>
              )}
              {/* Delete — always visible */}
              <Btn small outline color={RED} icon="trash" onClick={() => deleteSale(s)}>Delete</Btn>
              {/* Mark paid */}
              {s.status !== 'Paid' && (
                <Btn small color={GRN} icon="check" onClick={() => markPaid(s.id)}>{L.markPaid}</Btn>
              )}
            </div>,
          ])}
        />
      </div>

      {/* ── Record / Edit Sale Modal ── */}
      {show && (
        <Modal title={editSale ? '✏️ Edit Sale' : L.recordNewSale} onClose={() => { setShow(false); setEditSale(null); setItemWarn('') }} wide T={T}>

          {editSale && (
            <div style={{ background:AMB+'22', border:`1px solid ${AMB}44`, borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:12, color:AMB }}>
              ⚠️ Editing sale — stock will be recalculated.
            </div>
          )}

          {/* Date + Time */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
            <Lbl label={L.date} T={T}><input type="date" value={form.date} onChange={e => sf('date',e.target.value)} style={{ fontSize:13, padding:'7px 9px' }} /></Lbl>
            <Lbl label={L.time} T={T}><input type="time" value={form.time} onChange={e => sf('time',e.target.value)} style={{ fontSize:13, padding:'7px 9px' }} /></Lbl>
          </div>

          {/* Customer + Contact */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            <Lbl label={L.customerName+' *'} T={T}><input value={form.customerName} onChange={e => sf('customerName',e.target.value)} placeholder="Customer name" style={{ fontSize:13, padding:'7px 9px' }} /></Lbl>
            <Lbl label={L.contact} T={T}><input value={form.contact} onChange={e => sf('contact',e.target.value)} placeholder="Phone / etc" style={{ fontSize:13, padding:'7px 9px' }} /></Lbl>
          </div>

          {/* Item warning */}
          {itemWarn && (
            <div style={{ background:RED+'22', border:`1px solid ${RED}44`, borderRadius:8, padding:'8px 12px', marginBottom:8, fontSize:12, color:RED, fontWeight:600 }}>
              {itemWarn}
            </div>
          )}

          {/* Items */}
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>Items</div>
          {form.items.map((item, idx) => (
            <div key={idx} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'9px 10px 7px', marginBottom:7 }}>
              {/* Product select */}
              <div style={{ marginBottom:6 }}>
                <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:2, fontWeight:600, textTransform:'uppercase' }}>{L.product} *</label>
                <select value={item.productId} onChange={e => updItem(idx,'productId',e.target.value)} style={{ fontSize:13, padding:'7px 9px' }}>
                  <option value="">{L.selectProduct}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                      {p.name} — Stock: {p.stock}{p.stock<=0?' (OUT)':''}
                    </option>
                  ))}
                </select>
              </div>
              {/* Variant (optional) — Fix 6: allows same product twice if variant differs */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 32px', gap:6, alignItems:'flex-end' }}>
                <div>
                  <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:2, fontWeight:600, textTransform:'uppercase' }}>Variant / Size</label>
                  <input value={item.variant||''} onChange={e => updItem(idx,'variant',e.target.value)} placeholder="e.g. L, Red..." style={{ fontSize:12, padding:'6px 8px' }} />
                </div>
                <div>
                  <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:2, fontWeight:600, textTransform:'uppercase' }}>Price</label>
                  <input type="number" value={item.unitPrice} onChange={e => updItem(idx,'unitPrice',+e.target.value)} style={{ fontSize:12, padding:'6px 8px' }} />
                </div>
                <div>
                  <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:2, fontWeight:600, textTransform:'uppercase' }}>Qty</label>
                  <input type="number" min="1" value={item.qty} onChange={e => updItem(idx,'qty',+e.target.value)} style={{ fontSize:12, padding:'6px 6px', textAlign:'center' }} />
                </div>
                <button onClick={() => setForm(f => ({ ...f, items: f.items.filter((_,i) => i!==idx) }))}
                  style={{ height:34, width:32, background:RED+'18', border:`1px solid ${RED}44`, borderRadius:7, color:RED, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              </div>
              {item.productId && <div style={{ marginTop:4, fontSize:11, color:T.textMuted, textAlign:'right' }}>Subtotal: <span className="mono" style={{ color:T.accent, fontWeight:700 }}>{cur(item.qty*item.unitPrice)}</span></div>}
            </div>
          ))}
          <button onClick={() => setForm(f => ({ ...f, items:[...f.items,{productId:'',productName:'',qty:1,unitPrice:0,variant:''}] }))}
            style={{ width:'100%', padding:'7px', borderRadius:8, border:`1.5px dashed ${T.accent}66`, background:T.accent+'0a', color:T.accent, fontWeight:600, fontSize:12, cursor:'pointer', marginBottom:10 }}>
            + {L.addItem || 'Add Another Item'}
          </button>

          {/* Total */}
          <div style={{ background:T.accent+'18', border:`1px solid ${T.accent}44`, borderRadius:10, padding:'9px 14px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color:T.textSecondary, fontSize:13, fontWeight:600 }}>Total</span>
            <span className="mono" style={{ fontWeight:800, fontSize:20, color:T.accent }}>{cur(rowTotal)}</span>
          </div>

          {/* Payment */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:10, color:T.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:0.6, marginBottom:5 }}>Payment</div>
              <div style={{ display:'flex', gap:6 }}>
                {['cash','transfer'].map(m => (
                  <button key={m} onClick={() => sf('paymentMethod',m)}
                    style={{ flex:1, padding:'8px 4px', borderRadius:8, border:`2px solid ${form.paymentMethod===m?(m==='cash'?GRN:BLU):T.border}`, background:form.paymentMethod===m?(m==='cash'?GRN+'18':BLU+'18'):'transparent', color:form.paymentMethod===m?(m==='cash'?GRN:BLU):T.textSecondary, fontWeight:700, fontSize:11, cursor:'pointer' }}>
                    {m==='cash'?'💵 Cash':'📲 Transfer'}
                  </button>
                ))}
              </div>
            </div>
            <Lbl label={L.amountPaid} T={T}>
              <input type="number" value={form.amountPaid} onChange={e => sf('amountPaid',e.target.value)} placeholder={rowTotal>0?`Max ${cur(rowTotal)}`:'0.00'} style={{ fontSize:13, padding:'7px 9px' }} />
            </Lbl>
          </div>

          {/* Balance */}
          {!editSale && rowBal > 0 && (
            <div style={{ background:RED+'0e', border:`1px solid ${RED}44`, borderRadius:10, padding:'9px 12px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7, flexWrap:'wrap', gap:6 }}>
                <span style={{ color:RED, fontWeight:700, fontSize:13 }}>Balance: <span className="mono">{cur(rowBal)}</span></span>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.sendToLend} onChange={e => sf('sendToLend',e.target.checked)} />
                  <span style={{ color:AMB, fontWeight:600 }}>Track as debt</span>
                </label>
              </div>
              {form.sendToLend && (
                <Lbl label="Due Date" T={T}><input type="date" value={form.dueDate} onChange={e => sf('dueDate',e.target.value)} style={{ fontSize:13, padding:'7px 9px' }} /></Lbl>
              )}
            </div>
          )}

          {/* Notes */}
          <Lbl label={L.notes+' (optional)'} T={T}>
            <textarea value={form.notes} onChange={e => sf('notes',e.target.value)} rows={2} placeholder="Any notes..." style={{ fontSize:13, padding:'7px 9px', resize:'none' }} />
          </Lbl>

          {/* Buttons */}
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <Btn outline color={T.textSecondary} onClick={() => { setShow(false); setEditSale(null); setItemWarn('') }} style={{ flex:1, justifyContent:'center' }}>Cancel</Btn>
            <Btn onClick={saveSale} disabled={saving} style={{ flex:2, justifyContent:'center' }}>
              {saving ? 'Saving…' : editSale ? '💾 Save Changes' : '✅ Record Sale'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* ── Fix 5: Cash Verification Modal ── */}
      {showCash && (
        <Modal title={L.cashVerification || 'Cash Verification'} onClose={() => { setShowCash(false); setCashResult(null); setActualCash('') }} T={T}>
          <p style={{ fontSize:13, color:T.textSecondary, lineHeight:1.6, marginBottom:16 }}>
            Count your physical cash, enter the amount, and compare it with your recorded sales to spot any difference.
          </p>

          <div style={{ display:'grid', gap:10, marginBottom:14 }}>
            <Lbl label="Date to verify" T={T}>
              <input type="date" value={cashDate} onChange={e => setCashDate(e.target.value)} />
            </Lbl>
            <Lbl label={L.actualCashLabel || 'Actual cash in hand'} T={T}>
              <input type="number" value={actualCash} onChange={e => setActualCash(e.target.value)} placeholder="Enter total cash you have" style={{ fontSize:15 }} />
            </Lbl>
          </div>

          <Btn onClick={verifyCash} disabled={!actualCash} full icon="check">Verify Now</Btn>

          {cashResult && (
            <div style={{ marginTop:16 }}>
              <div style={{ display:'grid', gap:8 }}>
                {/* Calculated */}
                <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>Recorded Sales ({cashResult.count} transactions)</div>
                  <div className="mono" style={{ fontSize:22, fontWeight:800, color:T.textPrimary }}>{cur(cashResult.calcTotal)}</div>
                </div>
                {/* Actual */}
                <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px' }}>
                  <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>Actual Cash Counted</div>
                  <div className="mono" style={{ fontSize:22, fontWeight:800, color:T.textPrimary }}>{cur(cashResult.actual)}</div>
                </div>
                {/* Result */}
                <div style={{
                  borderRadius:12, padding:'14px 16px',
                  background: cashResult.diff===0 ? GRN+'22' : cashResult.diff>0 ? BLU+'22' : RED+'22',
                  border: `2px solid ${cashResult.diff===0 ? GRN : cashResult.diff>0 ? BLU : RED}44`,
                }}>
                  <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', color:T.textMuted, marginBottom:6 }}>Result</div>
                  <div className="mono" style={{ fontSize:24, fontWeight:800, color: cashResult.diff===0 ? GRN : cashResult.diff>0 ? BLU : RED }}>
                    {cashResult.diff===0 ? '±0' : cashResult.diff>0 ? `+${cur(cashResult.diff)}` : `-${cur(Math.abs(cashResult.diff))}`}
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, marginTop:6, color: cashResult.diff===0 ? GRN : cashResult.diff>0 ? BLU : RED }}>
                    {cashResult.diff===0
                      ? (L.cashMatch || '✅ Cash matches recorded sales perfectly!')
                      : cashResult.diff>0
                        ? (L.cashOver || '💰 You have extra cash — check for unrecorded sales')
                        : (L.cashShort || `⚠️ Cash is short — check for missing records or expenses`)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
