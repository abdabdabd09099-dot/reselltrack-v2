// ─── LendBorrow.jsx ───────────────────────────────────────────────────────────
// Two-tab ledger: money others owe you (Lending) and money you owe (Borrowing).
// Entries linked from sales appear automatically.
// To modify: add interest tracking, add reminder notifications, add notes.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { apiLending, apiBorrowing } from '../utils/supabase.js'
import { GRN, RED, AMB, BLU, PUR } from '../data/constants.js'
import { todayStr, fmtD } from '../utils/helpers.js'
import { Badge, Btn, Modal, Field, Stat } from '../components/UI.jsx'
import { Tbl } from '../components/UI.jsx'

const Lbl = Field

export default function LendBorrow({ lending, setLending, borrowing, setBorrowing, userId, T, L, cur }) {
  const [tab,    setTab]    = useState('lending')
  const [show,   setShow]   = useState(false)
  const [saving, setSaving] = useState(false)

  const blank = { personName: '', amount: '', date: todayStr(), dueDate: '', notes: '' }
  const [form, setForm] = useState(blank)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Save entry ─────────────────────────────────────────────────────────────
  const saveEntry = async () => {
    if (!form.personName || !form.amount) return
    setSaving(true)
    try {
      const entry = {
        personName: form.personName, contact: '', amount: +form.amount,
        date: form.date + 'T00:00:00', dueDate: form.dueDate,
        notes: form.notes, status: 'Pending', source: 'manual',
      }
      if (tab === 'lending') {
        const c = await apiLending.create(entry, userId)
        setLending(ls => [{ ...entry, id: c.id }, ...ls])
      } else {
        const c = await apiBorrowing.create(entry, userId)
        setBorrowing(bs => [{ ...entry, id: c.id }, ...bs])
      }
      setShow(false); setForm(blank)
    } catch (e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  // ── Settle ─────────────────────────────────────────────────────────────────
  const settle = async (id, t) => {
    try {
      if (t === 'lending') {
        await apiLending.settle(id)
        setLending(ls => ls.map(l => l.id === id ? { ...l, status: 'Settled' } : l))
      } else {
        await apiBorrowing.settle(id)
        setBorrowing(bs => bs.map(b => b.id === id ? { ...b, status: 'Settled' } : b))
      }
    } catch (e) { alert('Error: ' + e.message) }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const del = async (id, t) => {
    if (!confirm('Delete?')) return
    try {
      if (t === 'lending') { await apiLending.delete(id); setLending(ls => ls.filter(l => l.id !== id)) }
      else { await apiBorrowing.delete(id); setBorrowing(bs => bs.filter(b => b.id !== id)) }
    } catch (e) { alert('Error: ' + e.message) }
  }

  const lp   = lending.filter(l => l.status === 'Pending').reduce((a, l) => a + l.amount, 0)
  const bp   = borrowing.filter(b => b.status === 'Pending').reduce((a, b) => a + b.amount, 0)
  const net  = lp - bp
  const list = tab === 'lending' ? lending : borrowing

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 className="dm" style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary }}>{L.lendBorrow}</h1>
        <Btn onClick={() => setShow(true)}>{L.addEntry}</Btn>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid">
        <Stat label={L.theyOweYou}   value={cur(lp)}  color={GRN}                      icon="💚" T={T} />
        <Stat label={L.youOweOthers} value={cur(bp)}  color={RED}                      icon="🔴" T={T} />
        <Stat label={L.netPosition}  value={cur(net)} color={net >= 0 ? T.accent : RED} sub={net >= 0 ? L.youreAhead : L.youOweMore} icon="⚖️" T={T} />
      </div>

      {/* ── Tab toggle ── */}
      <div style={{ display: 'flex', marginBottom: 16, background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden', width: 'fit-content' }}>
        {[['lending', L.theyOweMe], ['borrowing', L.iOweThem]].map(([t, lbl]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 20px', background: tab === t ? T.accent : 'transparent', color: tab === t ? '#fff' : T.textSecondary, fontWeight: 600, border: 'none', fontSize: 13, cursor: 'pointer' }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Ledger table ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        <Tbl T={T} empty={L.noRecords}
          cols={[L.personName, L.expenseAmount, L.date, L.dueDate, L.source, L.status, L.actions]}
          rows={list.map(e => [
            <span style={{ fontWeight: 500, color: T.textPrimary }}>{e.personName}</span>,
            <span className="mono" style={{ color: tab === 'lending' ? GRN : RED, fontWeight: 600 }}>{cur(e.amount)}</span>,
            <span style={{ fontSize: 12, color: T.textSecondary }}>{fmtD(e.date)}</span>,
            <span style={{ fontSize: 12, color: e.dueDate && e.dueDate < todayStr() && e.status === 'Pending' ? RED : T.textSecondary }}>
              {e.dueDate ? fmtD(e.dueDate) : '—'}
            </span>,
            <Badge color={e.source === 'sale' ? BLU : PUR}>{e.source === 'sale' ? L.fromSale : L.manual}</Badge>,
            e.status === 'Pending' ? <Badge color={AMB}>{L.pending}</Badge> : <Badge color={GRN}>{L.settled}</Badge>,
            <div style={{ display: 'flex', gap: 6 }}>
              {e.status === 'Pending' && <Btn small color={GRN} onClick={() => settle(e.id, tab)}>{L.settle}</Btn>}
              <Btn small outline color={RED} onClick={() => del(e.id, tab)}>{L.delete}</Btn>
            </div>,
          ])}
        />
      </div>

      {/* ── Add entry modal ── */}
      {show && (
        <Modal title={tab === 'lending' ? L.addLendingEntry : L.addBorrowingEntry} onClose={() => setShow(false)} T={T}>
          <div style={{ display: 'grid', gap: 14 }}>
            <Lbl label={L.personName + ' *'} T={T}>
              <input value={form.personName} onChange={e => sf('personName', e.target.value)} />
            </Lbl>
            <Lbl label={L.expenseAmount + ' *'} T={T}>
              <input type="number" value={form.amount} onChange={e => sf('amount', e.target.value)} />
            </Lbl>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="g2">
              <Lbl label={L.date} T={T}>
                <input type="date" value={form.date} onChange={e => sf('date', e.target.value)} />
              </Lbl>
              <Lbl label={L.dueDate} T={T}>
                <input type="date" value={form.dueDate} onChange={e => sf('dueDate', e.target.value)} />
              </Lbl>
            </div>
            <Lbl label={L.notes} T={T}>
              <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
            </Lbl>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <Btn outline color={T.textSecondary} onClick={() => setShow(false)}>{L.cancel}</Btn>
            <Btn onClick={saveEntry} disabled={saving}>{saving ? 'Saving…' : L.save}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
