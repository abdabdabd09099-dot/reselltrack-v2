// ─── Expenses.jsx ─────────────────────────────────────────────────────────────
// Log and view business expenses by category.
// To modify: add edit capability, add receipt image upload, add export to CSV.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { apiExpenses } from '../utils/supabase.js'
import { RED, AMB, BLU, PUR, EXP_CATS } from '../data/constants.js'
import { todayStr, fmtD, thisMonthRange, inRange } from '../utils/helpers.js'
import { Badge, Btn, Modal, Field, Stat, Tbl } from '../components/UI.jsx'

const Lbl = Field

export default function Expenses({ expenses, setExpenses, userId, T, L, cur }) {
  const [show,   setShow]   = useState(false)
  const [saving, setSaving] = useState(false)

  const blank = { desc: '', category: '', amount: '', date: todayStr(), notes: '' }
  const [form, setForm] = useState(blank)
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Save expense ───────────────────────────────────────────────────────────
  const saveExp = async () => {
    if (!form.desc || !form.amount) return
    setSaving(true)
    try {
      const created = await apiExpenses.create(
        { description: form.desc, category: form.category, amount: +form.amount, date: form.date, notes: form.notes },
        userId
      )
      setExpenses(es => [created, ...es])
      setShow(false); setForm(blank)
    } catch (e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  // ── Delete expense ─────────────────────────────────────────────────────────
  const del = async id => {
    if (!confirm('Delete?')) return
    try { await apiExpenses.delete(id); setExpenses(es => es.filter(e => e.id !== id)) }
    catch (e) { alert('Delete failed: ' + e.message) }
  }

  const todayTot = expenses.filter(e => e.date === todayStr()).reduce((a, e) => a + e.amount, 0)
  const monthTot = expenses.filter(e => inRange(e.date, thisMonthRange())).reduce((a, e) => a + e.amount, 0)

  return (
    <div className="fade-in">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 className="dm" style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary }}>{L.expenses}</h1>
        <Btn onClick={() => setShow(true)}>{L.addExpense}</Btn>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid">
        <Stat label={L.today}        value={cur(todayTot)}   color={RED} icon="💸" T={T} />
        <Stat label={L.thisMonth}    value={cur(monthTot)}   color={AMB} icon="📆" T={T} />
        <Stat label={L.transactions} value={expenses.length} color={BLU} icon="📋" T={T} />
      </div>

      {/* ── Expenses table ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        <Tbl T={T} empty={L.noRecords}
          cols={[L.date, L.expDescription, L.expCategory, L.expenseAmount, L.notes, '']}
          rows={expenses.map(e => [
            <span style={{ fontSize: 12, color: T.textSecondary, whiteSpace: 'nowrap' }}>{fmtD(e.date)}</span>,
            <span style={{ fontWeight: 500, color: T.textPrimary }}>{e.description}</span>,
            e.category ? <Badge color={PUR}>{e.category}</Badge> : <span style={{ color: T.textMuted }}>—</span>,
            <span className="mono" style={{ color: RED, fontWeight: 600 }}>{cur(e.amount)}</span>,
            <span style={{ fontSize: 12, color: T.textSecondary }}>{e.notes || '—'}</span>,
            <Btn small outline color={RED} onClick={() => del(e.id)}>{L.delete}</Btn>,
          ])}
        />
      </div>

      {/* ── Add expense modal ── */}
      {show && (
        <Modal title={L.addExpenseTitle} onClose={() => setShow(false)} T={T}>
          <div style={{ display: 'grid', gap: 14 }}>
            <Lbl label={L.expDescription + ' *'} T={T}>
              <input value={form.desc} onChange={e => sf('desc', e.target.value)} />
            </Lbl>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="g2">
              <Lbl label={L.expCategory} T={T}>
                <select value={form.category} onChange={e => sf('category', e.target.value)}>
                  <option value="">{L.selectCategory}</option>
                  {EXP_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Lbl>
              <Lbl label={L.expenseAmount + ' *'} T={T}>
                <input type="number" value={form.amount} onChange={e => sf('amount', e.target.value)} />
              </Lbl>
            </div>
            <Lbl label={L.date} T={T}>
              <input type="date" value={form.date} onChange={e => sf('date', e.target.value)} />
            </Lbl>
            <Lbl label={L.notes} T={T}>
              <textarea value={form.notes} onChange={e => sf('notes', e.target.value)} rows={2} style={{ resize: 'vertical' }} />
            </Lbl>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
            <Btn outline color={T.textSecondary} onClick={() => setShow(false)}>{L.cancel}</Btn>
            <Btn onClick={saveExp} disabled={saving}>{saving ? 'Saving…' : L.save}</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
