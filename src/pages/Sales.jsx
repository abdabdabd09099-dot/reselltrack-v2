import { useState, useEffect } from 'react'
import { apiSales, apiLending, sb, insertSaleItems } from '../utils/supabase.js'
import { saveOffline } from '../utils/offlineQueue.js'
import { GRN, RED, AMB, BLU } from '../data/constants.js'
import { todayStr, fmtDT, thisWeekRange, thisMonthRange, inRange } from '../utils/helpers.js'
import { Badge, Btn, Modal, Field, Stat, Tbl, Icon } from '../components/UI.jsx'
import { toast } from '../utils/toast.jsx'
import { dailyCash } from '../utils/dailyCash.js'
import {
  applyStockChanges, netSaleChanges, hasTypes, variantsOf, stockOf, pricesFor,
} from '../utils/stock.js'

const Lbl = Field
const isOnline = () => typeof navigator === 'undefined' || navigator.onLine
const EDIT_WINDOW_MS = 2 * 60 * 60 * 1000
const PERIODS = [
  { id:'all', label:'All Time' }, { id:'today', label:'Today' },
  { id:'week', label:'This Week' }, { id:'month', label:'This Month' },
]

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
  return <span style={{ fontSize:10, background:AMB+'22', color:AMB, border:`1px solid ${AMB}44`, borderRadius:4, padding:'2px 6px', fontWeight:600, whiteSpace:'nowrap' }}>✏️ {remaining}</span>
}

export default function Sales({ products, setProducts, variants, setVariants, setMovements, stockReady, sales, setSales, lending, setLending, userId, T, L, cur, isDemo, demoApi, onDemoLimit }) {
  const [show,      setShow]      = useState(false)
  const [editSale,  setEditSale]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [now,       setNow]       = useState(Date.now())
  const [itemWarn,  setItemWarn]  = useState('')

  // ── Daily cash recording ────────────────────────────────────────────────────
  const [showCashModal, setShowCashModal] = useState(false)
  const [cashAmount,    setCashAmount]    = useState('')
  const [cashNote,      setCashNote]      = useState('')
  const [cashSaved,     setCashSaved]     = useState(false)

  // ── Save daily cash entry ──────────────────────────────────────────────────
  const saveDailyCash = () => {
    if (!cashAmount) return
    const entry = {
      date:   todayStr(),
      actual: parseFloat(cashAmount),
      note:   cashNote,
      savedAt: new Date().toISOString(),
    }
    dailyCash.save(todayStr(), cashAmount, cashNote)
    setCashSaved(true)
    setTimeout(() => { setShowCashModal(false); setCashSaved(false); setCashAmount(''); setCashNote('') }, 1200)
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  const [srch,          setSrch]          = useState('')
  const [filterSt,      setFilterSt]      = useState('all')
  const [filterPeriod,  setFilterPeriod]  = useState('all')
  const [filterProduct, setFilterProduct] = useState('')
  const [filterMethod,  setFilterMethod]  = useState('all')
  const [showFilters,   setShowFilters]   = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const isEditable = s => (now - new Date(s.date).getTime()) < EDIT_WINDOW_MS

  // ── Period range ───────────────────────────────────────────────────────────
  const getPeriodRange = () => {
    const td = todayStr()
    if (filterPeriod === 'today') return [td, td]
    if (filterPeriod === 'week')  return thisWeekRange()
    if (filterPeriod === 'month') return thisMonthRange()
    return null
  }

  // ── Blank form ─────────────────────────────────────────────────────────────
  const mkBlank = () => ({
    customerName:'', contact:'',
    date: todayStr(), time: new Date().toTimeString().slice(0,5),
    items: [{ productId:'', productName:'', qty:1, unitPrice:0, variant:'', variantId:'' }],
    paymentMethod:'cash', amountPaid:'', splitMethod:'transfer', splitAmount:'', dueDate:'', notes:'', sendToLend:true,
  })
  const [form, setForm] = useState(mkBlank())
  const sf = (k,v) => setForm(f => ({ ...f, [k]:v }))

  const rowTotal     = form.items.reduce((a,i) => a + (i.qty * i.unitPrice), 0)
  const rowPaid1     = +form.amountPaid  || 0
  const rowPaid2     = +form.splitAmount || 0
  const rowTotalPaid = rowPaid1 + rowPaid2
  const rowBal       = Math.max(0, rowTotal - rowTotalPaid)

  // ── Stock helpers for this form ────────────────────────────────────────────
  const stockCtx = () => ({
    products, variants, userId, isDemo, stockReady,
    offline: !isDemo && !isOnline(),
    setProducts, setVariants, setMovements,
  })
  // Units of a product/type held by the sale being edited (they return to stock first)
  const heldBy = (productId, variantId) => editSale
    ? (editSale.items || [])
        .filter(oi => oi.productId === productId && (oi.variantId || null) === (variantId || null))
        .reduce((a, oi) => a + oi.qty, 0)
    : 0
  const availableFor = (productId, variantId) => {
    const p = products.find(x => x.id === productId)
    if (!p) return 0
    const v = variantId ? variants.find(x => x.id === variantId) : null
    const base = v ? v.stock : (hasTypes(variants, productId) ? 0 : p.stock)
    return base + heldBy(productId, variantId)
  }

  // ── Update item (stock + type + duplicate checks) ──────────────────────────
  const updItem = (idx, key, val) => {
    setItemWarn('')
    setForm(f => {
      const items = [...f.items]
      items[idx] = { ...items[idx], [key]: val }
      const it = items[idx]

      if (key === 'productId') {
        const p = products.find(x => x.id === val)
        items[idx] = { ...it, variantId: '', variant: '', productName: p ? p.name : '', unitPrice: p ? p.sellPrice : 0 }
        if (!p) return { ...f, items }
        const typed = hasTypes(variants, p.id)
        const heldAny = editSale ? (editSale.items || []).filter(oi => oi.productId === p.id).reduce((a, oi) => a + oi.qty, 0) : 0
        if (stockOf(p, variants) + heldAny <= 0) {
          setItemWarn(`⛔ "${p.name}" is out of stock.`)
          items[idx] = { ...items[idx], productId: '', productName: '' }
          return { ...f, items }
        }
        if (!typed) {
          const dup = f.items.some((x, i) => i !== idx && x.productId === val && !x.variantId && !(x.variant || ''))
          if (dup) {
            setItemWarn(`⚠️ "${p.name}" already in list. Add a variant to use it again.`)
            items[idx] = { ...items[idx], productId: '', productName: '' }
            return { ...f, items }
          }
          const cap = availableFor(p.id, null)
          if (items[idx].qty > cap) items[idx].qty = cap
        }
        return { ...f, items }          // typed products wait for a type to be chosen
      }

      if (key === 'variantId') {
        const p = products.find(x => x.id === it.productId)
        const v = variants.find(x => x.id === val)
        if (!p || !v) { items[idx] = { ...it, variantId: '', variant: '' }; return { ...f, items } }
        if (availableFor(p.id, v.id) <= 0) {
          setItemWarn(`⛔ "${p.name} · ${v.name}" is out of stock.`)
          items[idx] = { ...it, variantId: '', variant: '' }
          return { ...f, items }
        }
        if (f.items.some((x, i) => i !== idx && x.productId === p.id && x.variantId === v.id)) {
          setItemWarn(`⚠️ "${p.name} · ${v.name}" is already in the list.`)
          items[idx] = { ...it, variantId: '', variant: '' }
          return { ...f, items }
        }
        items[idx] = {
          ...it, variantId: v.id, variant: v.name,
          unitPrice: pricesFor(p, v).sell,
          qty: Math.min(it.qty || 1, availableFor(p.id, v.id)),
        }
        return { ...f, items }
      }

      if (key === 'qty') {
        const needsType = it.productId && hasTypes(variants, it.productId) && !it.variantId
        if (it.productId && !needsType) {
          const cap = availableFor(it.productId, it.variantId || null)
          if (val > cap) { setItemWarn(`⚠️ Only ${cap} available.`); items[idx] = { ...it, qty: cap } }
        }
      }
      return { ...f, items }
    })
  }

  // ── Open edit ──────────────────────────────────────────────────────────────
  const openEdit = s => {
    const d = new Date(s.date)
    setEditSale(s)
    setForm({
      customerName: s.customerName, contact: s.contact || '',
      date: d.toISOString().slice(0,10), time: d.toTimeString().slice(0,5),
      items: (s.items || []).map(i => ({ ...i, variant: i.variant || '', variantId: i.variantId || '' })),
      paymentMethod: s.paymentMethod === 'split' ? (s.cashPaid > 0 ? 'cash' : 'transfer') : s.paymentMethod,
      amountPaid:    s.paymentMethod === 'split' ? String(s.cashPaid || s.amountPaid) : String(s.amountPaid),
      splitMethod:   s.paymentMethod === 'split' ? (s.cashPaid > 0 ? 'transfer' : 'cash') : 'transfer',
      splitAmount:   s.paymentMethod === 'split' ? String(s.transferPaid || s.cashPaid || '') : '',
      dueDate:'', notes: s.notes || '', sendToLend: false,
    })
    setShow(true)
  }

  // ── Delete sale ────────────────────────────────────────────────────────────
  const deleteSale = async s => {
    const ok = await toast.confirm(`Delete sale to ${s.customerName}?\nStock will be restored. This cannot be undone.`)
    if (!ok) return
    try {
      if (!isDemo) {
        await sb.from('sale_items').delete().eq('sale_id', s.id)
        await sb.from('sales').delete().eq('id', s.id)
      }
      // Every item goes back to the exact product / type it came from
      const res = await applyStockChanges(
        (s.items || []).filter(i => i.productId).map(i => ({
          productId: i.productId, variantId: i.variantId || null, delta: i.qty,
          type: 'sale_delete', reason: `Sale to ${s.customerName} deleted`,
          refId: isDemo ? null : s.id, unitCost: i.unitCost ?? null,
        })),
        stockCtx()
      )
      if (res.skipped.length) toast.warn('Some units could not be returned to a type. Use Stock → Adjust on the product.')
      setSales(ss => ss.filter(x => x.id !== s.id))
      setLending(ls => ls.filter(l => l.saleId !== s.id))
    } catch(e) { toast.error('Delete failed: ' + e.message) }
  }

  // ── Save sale ──────────────────────────────────────────────────────────────
  const saveSale = async () => {
    if (!form.customerName) return toast.error('Customer name is required.')
    const validItems = form.items.filter(i => i.productId)
    if (!validItems.length) return toast.error('Add at least one product.')
    for (const item of validItems) {
      const p = products.find(x => x.id === item.productId)
      if (!p) continue
      if (hasTypes(variants, p.id) && !item.variantId) return toast.error(`Choose a type for "${p.name}".`)
      if (!(item.qty > 0)) return toast.error('Quantity must be at least 1.')
      const avail = availableFor(item.productId, item.variantId || null)
      if (item.qty > avail) {
        return toast.error(`⛔ Not enough stock for "${p.name}${item.variant ? ' · ' + item.variant : ''}". Available: ${avail}`)
      }
    }
    if (editSale && !isDemo && !isOnline()) return toast.error('Go online to edit a sale.')
    setSaving(true)
    try {
      const dt     = form.date + 'T' + form.time + ':00'
      const total  = validItems.reduce((a,i) => a + i.qty * i.unitPrice, 0)
      const paid1       = +form.amountPaid  || 0
      const paid2       = +form.splitAmount || 0
      const totalPaid   = paid1 + paid2
      const sameMethods = form.splitMethod === form.paymentMethod
      const hasSplit    = paid2 > 0 && form.splitMethod
      // If same method both times — stays as single method, total combined
      // If different methods — becomes 'split'
      const cashPaid    = form.paymentMethod === 'cash'
        ? (sameMethods ? paid1 + paid2 : paid1)
        : (!sameMethods && form.splitMethod === 'cash' ? paid2 : 0)
      const xferPaid    = form.paymentMethod === 'transfer'
        ? (sameMethods ? paid1 + paid2 : paid1)
        : (!sameMethods && form.splitMethod === 'transfer' ? paid2 : 0)
      const bal         = Math.max(0, total - totalPaid)
      const payMethod   = hasSplit && !sameMethods ? 'split' : form.paymentMethod
      const status      = bal === 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid'

      // Buy price AT THE MOMENT OF SALE — this is what makes profit reports accurate.
      // An edited sale keeps the cost it was first sold with.
      const costOf = item => {
        const kept = editSale && (editSale.items || []).find(oi =>
          oi.productId === item.productId && (oi.variantId || null) === (item.variantId || null) && oi.unitCost != null)
        if (kept) return kept.unitCost
        const p = products.find(x => x.id === item.productId)
        const v = item.variantId ? variants.find(x => x.id === item.variantId) : null
        return pricesFor(p, v).buy
      }
      const saleItems = validItems.map(i => ({ ...i, unitCost: costOf(i) }))

      // A failed stock write must never undo a saved sale — warn and let the user adjust
      const applyStock = async changes => {
        try {
          const res = await applyStockChanges(changes, stockCtx())
          if (res.skipped.length) toast.warn('Some units could not be matched to a type. Use Stock → Adjust to correct them.')
        } catch (e) {
          toast.warn('Sale saved, but stock was not updated (' + e.message + '). Use Stock → Adjust.')
        }
      }

      if (editSale) {
        if (!isDemo) {
          const { error: uErr } = await sb.from('sales').update({ customer_name: form.customerName, contact: form.contact||null, sale_date: dt, total_amount: total, amount_paid: totalPaid, cash_paid: cashPaid||null, transfer_paid: xferPaid||null, balance: bal, payment_method: payMethod, status, notes: form.notes||null }).eq('id', editSale.id)
          if (uErr) throw uErr
          await sb.from('sale_items').delete().eq('sale_id', editSale.id)
          await insertSaleItems(editSale.id, saleItems)
        }
        await applyStock(netSaleChanges(editSale.items, saleItems).map(c => ({
          ...c, type: 'sale_edit', reason: `Sale to ${form.customerName} edited`,
          refId: isDemo ? null : editSale.id,
        })))
        setSales(ss => ss.map(s => s.id === editSale.id ? { ...s, customerName: form.customerName, contact: form.contact, date: dt, items: saleItems, totalAmount: total, amountPaid: totalPaid, cashPaid, transferPaid: xferPaid, balance: bal, paymentMethod: payMethod, status, notes: form.notes } : s))
        setEditSale(null)
      } else {
        const sale = { customerName: form.customerName, contact: form.contact, date: dt, items: saleItems, totalAmount: total, amountPaid: totalPaid, cashPaid, transferPaid: xferPaid, balance: bal, paymentMethod: payMethod, notes: form.notes, status }
        const offline = !isDemo && !isOnline()
        let created
        if (isDemo) {
          created = demoApi.sales.create(sale)
          if (!created) { onDemoLimit?.(); setSaving(false); return }
        } else if (offline) {
          created = await saveOffline('sales', { ...sale, userId })
          toast.info('📡 Offline — sale saved on this phone and will sync when reconnected.')
        } else {
          created = await apiSales.create(sale, userId)
        }
        // Stock leaves the exact product / type that was sold (queued if offline)
        await applyStock(saleItems.filter(i => i.productId).map(i => ({
          productId: i.productId, variantId: i.variantId || null, delta: -i.qty,
          type: 'sale', reason: `Sale to ${form.customerName}`,
          refId: created?.id || null, unitCost: i.unitCost,
        })))
        setSales(ss => [{ ...sale, id: created?.id }, ...ss])
        if (bal > 0 && form.sendToLend && !isDemo) {
          const lEntry = { personName: form.customerName, contact: form.contact, amount: bal, date: dt, dueDate: form.dueDate||'', notes: form.notes, status:'Pending', source:'sale', saleId: created?.id }
          if (offline) {
            await saveOffline('lending', { ...lEntry, saleId: null, userId })
            setLending(ls => [{ ...lEntry, id: 'offline-' + Date.now() }, ...ls])
          } else {
            const cl = await apiLending.create(lEntry, userId)
            setLending(ls => [{ ...lEntry, id: cl.id }, ...ls])
          }
        }
      }
      setShow(false); setForm(mkBlank()); setItemWarn('')
    } catch(e) { toast.error('Save failed: ' + e.message) }
    setSaving(false)
  }

  // ── Mark paid ──────────────────────────────────────────────────────────────
  const markPaid = async id => {
    try {
      isDemo ? demoApi.sales.markPaid(id) : await apiSales.markPaid(id)
      setSales(ss => ss.map(s => s.id === id ? { ...s, amountPaid: s.totalAmount, balance: 0, status:'Paid' } : s))
      if (!isDemo) {
        await apiLending.settleBySale(id).catch(() => {})
        setLending(ls => ls.map(l => l.saleId === id ? { ...l, status:'Settled' } : l))
      }
    } catch(e) { toast.error(e.message) }
  }

  // ── Filters ────────────────────────────────────────────────────────────────
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
          <Btn outline color={GRN} icon="dollar" onClick={() => setShowCashModal(true)}>
            {L.recordCash || 'Record Cash'}
          </Btn>
          <Btn onClick={() => { setEditSale(null); setForm(mkBlank()); setItemWarn(''); setShow(true) }}>
            {L.addSale}
          </Btn>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid">
        <Stat label={L.todayRevenue} value={cur(todayRev)}   color={GRN} icon="trending-up"  T={T} />
        <Stat label={L.uncollected}  value={cur(totalUncol)} color={AMB} icon="clock"         T={T} />
        <Stat label={L.transactions} value={sales.length}    color={BLU} icon="sales"         T={T} />
        <Stat label={L.paid}         value={sales.filter(s => s.status==='Paid').length} color={T.accent} icon="check" T={T} />
      </div>

      {/* ── Edit notice ── */}
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

      {/* ── Filters ── */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ display:'flex', gap:8, marginBottom:showFilters?12:0, flexWrap:'wrap' }}>
          <input placeholder="Search customer..." value={srch} onChange={e => setSrch(e.target.value)} style={{ flex:1, minWidth:140, fontSize:13 }} />
          <button onClick={() => setShowFilters(f => !f)}
            style={{ padding:'8px 12px', borderRadius:8, border:`1px solid ${hasFilter?T.accent:T.border}`, background:hasFilter?T.accent+'22':'transparent', color:hasFilter?T.accent:T.textSecondary, fontWeight:600, fontSize:12, cursor:'pointer' }}>
            <Icon name="filter" size={13} color={hasFilter?T.accent:T.textSecondary} />
          </button>
          {hasFilter && <button onClick={resetFilters} style={{ padding:'8px 10px', borderRadius:8, border:`1px solid ${RED}`, background:'transparent', color:RED, fontWeight:600, fontSize:12, cursor:'pointer' }}>✕</button>}
        </div>
        {showFilters && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:8 }}>
            {[
              { label:'Status', value:filterSt, setter:setFilterSt, opts:[['all','All'],['paid','✅ Paid'],['partial','⚠️ Partial'],['unpaid','🔴 Unpaid']] },
              { label:'Method', value:filterMethod, setter:setFilterMethod, opts:[['all','All'],['cash','💵 Cash'],['transfer','📲 Transfer'],['split','💵📲 Split']] },
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
          cols={[L.dateTime, L.customer, L.items, L.total, L.paid||'Paid', L.balance, L.method, L.status, 'Actions']}
          rows={filtered.map(s => [
            <span style={{ fontSize:11, color:T.textSecondary, whiteSpace:'nowrap' }}>{fmtDT(s.date)}</span>,
            <div>
              <div style={{ fontWeight:500, color:T.textPrimary }}>{s.customerName}</div>
              {s.contact && <div style={{ fontSize:11, color:T.textSecondary }}>{s.contact}</div>}
            </div>,
            <div>{s.items.map((i,x) => <div key={x} style={{ fontSize:11, color:T.textSecondary }}>{i.productName} ×{i.qty}{i.variant?` (${i.variant})`:''}</div>)}</div>,
            <span className="mono" style={{ fontWeight:600, color:T.textPrimary }}>{cur(s.totalAmount)}</span>,
            <span className="mono" style={{ color:GRN }}>{cur(s.amountPaid)}</span>,
            <span className="mono" style={{ color:s.balance>0?RED:T.textMuted }}>{s.balance>0?cur(s.balance):'—'}</span>,
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {s.paymentMethod==='split' ? (
                <>
                  <Badge color={GRN}>💵 {cur(s.cashPaid||0)}</Badge>
                  <Badge color={BLU}>📲 {cur(s.transferPaid||0)}</Badge>
                </>
              ) : (
                <Badge color={s.paymentMethod==='cash'?GRN:BLU}>
                  {s.paymentMethod==='cash'?'💵 Cash':'📲 Transfer'}
                </Badge>
              )}
            </div>,
            s.status==='Paid' ? <Badge color={GRN}>✅ {L.paid}</Badge> : s.status==='Partial' ? <Badge color={AMB}>{L.partial}</Badge> : <Badge color={RED}>{L.unpaid}</Badge>,
            <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-start' }}>
              {isEditable(s) && (
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <Btn small outline color={AMB} icon="edit" onClick={() => openEdit(s)}>Edit</Btn>
                  <EditTimer saleDate={s.date} />
                </div>
              )}
              <Btn small outline color={RED} icon="trash"
                onClick={() => isEditable(s) ? deleteSale(s) : null}
                disabled={!isEditable(s)}
                style={{ opacity: isEditable(s) ? 1 : 0.38, cursor: isEditable(s) ? 'pointer' : 'not-allowed' }}>
                {isEditable(s) ? 'Delete' : '🔒 Locked'}
              </Btn>
              {s.status !== 'Paid' && <Btn small color={GRN} icon="check" onClick={() => markPaid(s.id)}>{L.markPaid}</Btn>}
            </div>,
          ])}
        />
      </div>

      {/* ── Sale modal ── */}
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
          {/* Customer */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            <Lbl label={L.customerName+' *'} T={T}><input value={form.customerName} onChange={e => sf('customerName',e.target.value)} placeholder="Customer name" style={{ fontSize:13, padding:'7px 9px' }} /></Lbl>
            <Lbl label={L.contact} T={T}><input value={form.contact} onChange={e => sf('contact',e.target.value)} placeholder="Phone" style={{ fontSize:13, padding:'7px 9px' }} /></Lbl>
          </div>
          {/* Item warning */}
          {itemWarn && <div style={{ background:RED+'22', border:`1px solid ${RED}44`, borderRadius:8, padding:'8px 12px', marginBottom:8, fontSize:12, color:RED, fontWeight:600 }}>{itemWarn}</div>}
          {/* Items */}
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>Items</div>
          {form.items.map((item, idx) => (
            <div key={idx} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'9px 10px 7px', marginBottom:7 }}>
              <div style={{ marginBottom:6 }}>
                <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:2, fontWeight:600, textTransform:'uppercase' }}>{L.product} *</label>
                <select value={item.productId} onChange={e => updItem(idx,'productId',e.target.value)} style={{ fontSize:13, padding:'7px 9px' }}>
                  <option value="">{L.selectProduct}</option>
                  {products.map(p => {
                    const st = stockOf(p, variants)
                    const n  = variantsOf(variants, p.id).length
                    return <option key={p.id} value={p.id} disabled={st<=0 && p.id !== item.productId}>{p.name} — Stock: {st}{n ? ` (${n} types)` : ''}{st<=0?' (OUT)':''}</option>
                  })}
                </select>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 32px', gap:6, alignItems:'flex-end' }}>
                <div>
                  <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:2, fontWeight:600, textTransform:'uppercase' }}>{hasTypes(variants, item.productId) ? 'Type *' : 'Variant'}</label>
                  {hasTypes(variants, item.productId) ? (
                    <select value={item.variantId||''} onChange={e => updItem(idx,'variantId',e.target.value)} style={{ fontSize:12, padding:'6px 8px' }}>
                      <option value="">Choose type…</option>
                      {variantsOf(variants, item.productId).map(v => {
                        const left = availableFor(item.productId, v.id)
                        return <option key={v.id} value={v.id} disabled={left<=0 && v.id !== item.variantId}>{v.name} — {left} left</option>
                      })}
                    </select>
                  ) : (
                    <input value={item.variant||''} onChange={e => updItem(idx,'variant',e.target.value)} placeholder="Size, colour..." style={{ fontSize:12, padding:'6px 8px' }} />
                  )}
                </div>
                <div>
                  <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:2, fontWeight:600, textTransform:'uppercase' }}>Price</label>
                  <input type="number" value={item.unitPrice} onChange={e => updItem(idx,'unitPrice',+e.target.value)} style={{ fontSize:12, padding:'6px 8px' }} />
                </div>
                <div>
                  <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:2, fontWeight:600, textTransform:'uppercase' }}>Qty</label>
                  <input type="number" min="1" value={item.qty} onChange={e => updItem(idx,'qty',+e.target.value)} style={{ fontSize:12, padding:'6px 6px', textAlign:'center' }} />
                </div>
                <button onClick={() => setForm(f => ({ ...f, items:f.items.filter((_,i) => i!==idx) }))}
                  style={{ height:34, width:32, background:RED+'18', border:`1px solid ${RED}44`, borderRadius:7, color:RED, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
              </div>
              {item.productId && <div style={{ marginTop:4, fontSize:11, color:T.textMuted, textAlign:'right' }}>Subtotal: <span className="mono" style={{ color:T.accent, fontWeight:700 }}>{cur(item.qty*item.unitPrice)}</span></div>}
            </div>
          ))}
          <button onClick={() => setForm(f => ({ ...f, items:[...f.items,{productId:'',productName:'',qty:1,unitPrice:0,variant:'',variantId:''}] }))}
            style={{ width:'100%', padding:'7px', borderRadius:8, border:`1.5px dashed ${T.accent}66`, background:T.accent+'0a', color:T.accent, fontWeight:600, fontSize:12, cursor:'pointer', marginBottom:10 }}>
            + {L.addItem||'Add Another Item'}
          </button>
          {/* Total */}
          <div style={{ background:T.accent+'18', border:`1px solid ${T.accent}44`, borderRadius:10, padding:'9px 14px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ color:T.textSecondary, fontSize:13, fontWeight:600 }}>Total</span>
            <span className="mono" style={{ fontWeight:800, fontSize:20, color:T.accent }}>{cur(rowTotal)}</span>
          </div>
          {/* ── Payment ── */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:10, color:T.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:0.6, marginBottom:8 }}>Payment</div>

            {/* Primary payment method + amount */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <div>
                <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:4, fontWeight:600, textTransform:'uppercase' }}>Method</label>
                <div style={{ display:'flex', gap:6 }}>
                  {['cash','transfer'].map(m => (
                    <button key={m} onClick={() => sf('paymentMethod', m)}
                      style={{ flex:1, padding:'8px 4px', borderRadius:8, border:`2px solid ${form.paymentMethod===m?(m==='cash'?GRN:BLU):T.border}`, background:form.paymentMethod===m?(m==='cash'?GRN+'18':BLU+'18'):'transparent', color:form.paymentMethod===m?(m==='cash'?GRN:BLU):T.textSecondary, fontWeight:700, fontSize:11, cursor:'pointer', transition:'all .15s' }}>
                      {m==='cash'?'💵 Cash':'📲 Transfer'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:4, fontWeight:600, textTransform:'uppercase' }}>Amount Paid</label>
                <input type="number" value={form.amountPaid}
                  onChange={e => sf('amountPaid', e.target.value)}
                  placeholder={rowTotal>0 ? `Max ${cur(rowTotal)}` : '0.00'}
                  style={{ fontSize:14, fontWeight:600, padding:'8px 10px' }} />
              </div>
            </div>

            {/* Remaining after primary payment */}
            {rowPaid1 > 0 && rowPaid1 < rowTotal && (
              <div style={{ background: AMB+'0a', border:`1.5px solid ${AMB}44`, borderRadius:10, padding:'12px 14px', marginBottom:6 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <Icon name="clock" size={13} color={AMB} strokeWidth={2.5} />
                    <span style={{ fontSize:12, fontWeight:700, color:AMB }}>
                      Remaining: <span className="mono">{cur(rowTotal - rowPaid1)}</span>
                    </span>
                  </div>
                  <span style={{ fontSize:11, color:T.textMuted }}>Add second payment (optional)</span>
                </div>

                {/* Second payment method + amount */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div>
                    <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:4, fontWeight:600, textTransform:'uppercase' }}>2nd Method (same OK)</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {['cash','transfer'].map(m => (
                        <button key={m} onClick={() => sf('splitMethod', m)}
                          style={{ flex:1, padding:'7px 4px', borderRadius:8, border:`2px solid ${form.splitMethod===m?(m==='cash'?GRN:BLU):T.border}`, background:form.splitMethod===m?(m==='cash'?GRN+'18':BLU+'18'):'transparent', color:form.splitMethod===m?(m==='cash'?GRN:BLU):T.textSecondary, fontWeight:700, fontSize:11, cursor:'pointer' }}>
                          {m==='cash'?'💵 Cash':'📲 Transfer'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:10, color:T.textMuted, display:'block', marginBottom:4, fontWeight:600, textTransform:'uppercase' }}>2nd Amount</label>
                    <div style={{ position:'relative' }}>
                      <input type="number" value={form.splitAmount}
                        onChange={e => {
                          sf('splitAmount', e.target.value)
                          if (+e.target.value > 0) sf('sendToLend', true)
                        }}
                        placeholder={cur(rowTotal - rowPaid1)}
                        style={{ fontSize:13, padding:'7px 9px', borderColor: +form.splitAmount > 0 ? (form.splitMethod==='cash'?GRN:BLU) : T.border }} />
                      {/* Quick-fill remaining */}
                      <button onClick={() => { sf('splitAmount', String(+(rowTotal - rowPaid1).toFixed(2))); sf('sendToLend', true) }}
                        style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:AMB+'22', border:'none', borderRadius:5, padding:'2px 6px', fontSize:10, color:AMB, fontWeight:700, cursor:'pointer' }}>
                        Fill
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {rowPaid2 > 0 && (
                  <div style={{ marginTop:8, fontSize:12, color:T.textSecondary, display:'flex', gap:16, flexWrap:'wrap' }}>
                    <span>{form.paymentMethod==='cash'?'💵':'📲'} <strong style={{ color:form.paymentMethod==='cash'?GRN:BLU }}>{cur(rowPaid1)}</strong> now</span>
                    <span>+</span>
                    <span>{form.splitMethod==='cash'?'💵':'📲'} <strong style={{ color:form.splitMethod==='cash'?GRN:BLU }}>{cur(rowPaid2)}</strong> {form.splitMethod===form.paymentMethod ? 'later (same method)' : form.splitMethod==='transfer'?'via transfer':'in cash'}</span>
                    <span style={{ marginLeft:'auto', fontWeight:700, color: rowTotalPaid>=rowTotal ? GRN : AMB }}>
                      Total: {cur(rowTotalPaid)} {rowTotalPaid>=rowTotal ? '✅' : `(${cur(rowTotal-rowTotalPaid)} left)`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Balance — auto-shown when 2nd payment pending */}
          {!editSale && rowBal > 0 && (
            <div style={{ background:rowPaid2>0?AMB+'12':RED+'0e', border:`1px solid ${rowPaid2>0?AMB:RED}44`, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8, flexWrap:'wrap', gap:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Icon name={rowPaid2>0?'clock':'alert'} size={14} color={rowPaid2>0?AMB:RED} strokeWidth={2.5} />
                  <span style={{ color:rowPaid2>0?AMB:RED, fontWeight:700, fontSize:13 }}>
                    {rowPaid2>0?'Pending payment:':'Balance due:'}{' '}
                    <span className="mono">{cur(rowBal)}</span>
                  </span>
                </div>
                {rowPaid2>0 && (
                  <span style={{ background:AMB+'22', border:`1px solid ${AMB}44`, borderRadius:6, padding:'3px 8px', fontSize:11, color:AMB, fontWeight:700 }}>
                    ⏳ Will be marked Partial
                  </span>
                )}
              </div>
              {rowPaid2>0 && (
                <div style={{ background:T.bg, borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:12, color:T.textSecondary, lineHeight:1.6 }}>
                  Customer owes <strong style={{ color:AMB }}>{cur(rowBal)}</strong> via{' '}
                  <strong style={{ color:form.splitMethod==='cash'?GRN:BLU }}>
                    {form.splitMethod==='cash'?'💵 cash':'📲 transfer'}
                  </strong>.
                  Sale stays <strong style={{ color:AMB }}>Partial</strong> until fully paid.
                </div>
              )}
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', marginBottom:form.sendToLend?10:0 }}>
                <input type="checkbox" checked={form.sendToLend} onChange={e => sf('sendToLend',e.target.checked)} style={{ width:16, height:16, accentColor:AMB }} />
                <span style={{ color:AMB, fontWeight:600 }}>Add to lending tracker (monitor this debt)</span>
              </label>
              {form.sendToLend && (
                <Lbl label="Due Date" T={T}>
                  <input type="date" value={form.dueDate} onChange={e => sf('dueDate',e.target.value)} style={{ fontSize:13, padding:'7px 9px' }} />
                </Lbl>
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

      {/* ── Daily Cash Recording Modal ── */}
      {showCashModal && (
        <Modal title={L.recordCash || 'Record Daily Cash'} onClose={() => { setShowCashModal(false); setCashAmount(''); setCashNote(''); setCashSaved(false) }} T={T}>
          <p style={{ fontSize:13, color:T.textSecondary, marginBottom:16, lineHeight:1.6 }}>
            Count your physical cash at end of day and record the total. It will be compared with your calculated sales in Reports.
          </p>

          {/* Today's calculated sales */}
          <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
            <div style={{ fontSize:10, color:T.textMuted, fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>Today's Recorded Sales ({todayStr()})</div>
            <div className="mono" style={{ fontSize:22, fontWeight:800, color:T.accent }}>
              {cur(sales.filter(s => s.date.slice(0,10) === todayStr()).reduce((a,s) => a + s.amountPaid, 0))}
            </div>
            <div style={{ fontSize:11, color:T.textMuted, marginTop:3 }}>
              {sales.filter(s => s.date.slice(0,10) === todayStr()).length} sale(s) recorded today
            </div>
          </div>

          <div style={{ display:'grid', gap:12, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:11, color:T.textSecondary, display:'block', marginBottom:5, fontWeight:700, textTransform:'uppercase', letterSpacing:.4 }}>
                {L.actualCashLabel || 'Actual Cash in Hand'}
              </label>
              <input
                type="number"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                placeholder="Enter total cash you counted..."
                style={{ width:'100%', fontSize:20, fontWeight:800, padding:'12px 14px', boxSizing:'border-box',
                  borderColor: cashAmount ? (
                    parseFloat(cashAmount) === sales.filter(s => s.date.slice(0,10) === todayStr()).reduce((a,s) => a + s.amountPaid, 0)
                    ? GRN : parseFloat(cashAmount) > sales.filter(s => s.date.slice(0,10) === todayStr()).reduce((a,s) => a + s.amountPaid, 0)
                    ? BLU : RED
                  ) : T.border }}
              />
            </div>

            {/* Live difference preview */}
            {cashAmount && (() => {
              const daySales = sales.filter(s => s.date.slice(0,10) === todayStr())
              const calc     = daySales.reduce((a,s) => a + s.amountPaid, 0)
              const actual   = parseFloat(cashAmount) || 0
              const diff     = actual - calc
              return (
                <div style={{
                  borderRadius:10, padding:'12px 14px',
                  background: diff===0 ? GRN+'18' : diff>0 ? BLU+'18' : RED+'18',
                  border:`1.5px solid ${diff===0?GRN:diff>0?BLU:RED}55`,
                  display:'flex', alignItems:'center', gap:12,
                }}>
                  <span style={{ fontSize:24 }}>{diff===0 ? '✅' : diff>0 ? '💰' : '⚠️'}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:diff===0?GRN:diff>0?BLU:RED }}>
                      {diff===0
                        ? 'Perfect match!'
                        : diff>0
                          ? `Over by ${cur(diff)}`
                          : `Short by ${cur(Math.abs(diff))}`}
                    </div>
                    <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>
                      Recorded: {cur(calc)} · Actual: {cur(actual)}
                    </div>
                  </div>
                </div>
              )
            })()}

            <div>
              <label style={{ fontSize:11, color:T.textSecondary, display:'block', marginBottom:5, fontWeight:700, textTransform:'uppercase', letterSpacing:.4 }}>
                Note (optional)
              </label>
              <input
                value={cashNote}
                onChange={e => setCashNote(e.target.value)}
                placeholder="e.g. End of day cash count"
                style={{ width:'100%', fontSize:13, boxSizing:'border-box' }}
              />
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <Btn outline color={T.textSecondary} onClick={() => { setShowCashModal(false); setCashAmount(''); setCashNote('') }} style={{ flex:1, justifyContent:'center' }}>
              Cancel
            </Btn>
            <Btn onClick={saveDailyCash} disabled={!cashAmount || cashSaved} color={GRN} icon="check" style={{ flex:2, justifyContent:'center' }}>
              {cashSaved ? '✅ Saved!' : 'Save Cash Record'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
