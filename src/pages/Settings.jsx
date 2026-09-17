// ─── Settings.jsx ─────────────────────────────────────────────────────────────
// App settings — language, currency, theme, business info, data export.
// To modify: add more languages, add notification settings, add cloud backup.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { CURRENCIES, THEMES, LANGS, GRN, RED, AMB, BLU } from '../data/constants.js'
import { todayStr, saveSettings } from '../utils/helpers.js'
import { Btn, Field, Accordion } from '../components/UI.jsx'

const Lbl = Field

export default function Settings({
  settings, setSettings,
  products, sales, expenses, lending, borrowing,
  T, L, cur,
}) {
  const [draft, setDraft] = useState({ ...settings })
  const sd = (k, v) => {
    const next = { ...draft, [k]: v }
    setDraft(next); setSettings(next); saveSettings(next)
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ products, sales, expenses, lending, borrowing, settings }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `reselltrack-backup-${todayStr()}.json`
    a.click(); URL.revokeObjectURL(a.href)
  }

  const allRev     = sales.reduce((a, s) => a + s.amountPaid, 0)
  const allExp     = expenses.reduce((a, e) => a + e.amount, 0)
  const currObj    = CURRENCIES.find(c => c.code === draft.currencyCode) || CURRENCIES[0]
  const previewCur = n => currObj.symbol + Number(n || 0).toLocaleString('en', { minimumFractionDigits: 2 })

  return (
    <div className="fade-in">
      <h1 className="dm" style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, marginBottom: 20 }}>{L.settingsTitle}</h1>

      <Accordion icon="🌍" label={L.languageLabel} T={T} defaultOpen>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {Object.values(LANGS).map(lang => {
            const active = draft.language === lang.code
            return (
              <button key={lang.code} onClick={() => sd('language', lang.code)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: `2px solid ${active ? T.accent : T.border}`, background: active ? T.accent + '22' : 'transparent', cursor: 'pointer' }}>
                <span style={{ fontSize: 22 }}>{lang.flag}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? T.accent : T.textPrimary }}>{lang.name}</div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>{lang.code.toUpperCase()}</div>
                </div>
                {active && <span style={{ color: T.accent, marginLeft: 4 }}>✓</span>}
              </button>
            )
          })}
        </div>
      </Accordion>

      <Accordion icon="💱" label={L.currencyLabel} T={T}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ color: T.textSecondary, fontSize: 13 }}>Preview:</span>
          <span className="mono" style={{ color: T.accent, fontWeight: 700, fontSize: 16 }}>{previewCur(12500)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 8 }}>
          {CURRENCIES.map(c => {
            const active = draft.currencyCode === c.code
            return (
              <button key={c.code} onClick={() => sd('currencyCode', c.code)}
                style={{ padding: '10px 14px', borderRadius: 10, border: `2px solid ${active ? T.accent : T.border}`, background: active ? T.accent + '22' : 'transparent', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }}>
                <span className="mono" style={{ fontSize: 17, fontWeight: 700, color: active ? T.accent : T.textSecondary, minWidth: 32 }}>{c.symbol}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? T.accent : T.textPrimary }}>{c.code}</div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>{c.name}</div>
                </div>
                {active && <span style={{ color: T.accent, marginLeft: 'auto', fontSize: 14 }}>✓</span>}
              </button>
            )
          })}
        </div>
      </Accordion>

      <Accordion icon="🎨" label={L.themeLabel} T={T}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', gap: 10 }}>
          {Object.entries(THEMES).map(([key, th]) => {
            const active = draft.theme === key
            return (
              <button key={key} onClick={() => sd('theme', key)}
                style={{ padding: 14, borderRadius: 12, border: `2px solid ${active ? T.accent : T.border}`, background: th.bg, display: 'flex', flexDirection: 'column', gap: 7, position: 'relative', cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: th.accent }} />
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: th.surface }} />
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: th.border }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: th.textPrimary }}>{th.emoji} {th.name}</div>
                {active && <div style={{ position: 'absolute', top: 8, right: 10, color: T.accent, fontSize: 14, fontWeight: 700 }}>✓</div>}
              </button>
            )
          })}
        </div>
      </Accordion>

      <Accordion icon="🏪" label={L.businessInfo} T={T}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }} className="g2">
          <Lbl label={L.businessName} T={T}><input value={draft.businessName || ''} onChange={e => sd('businessName', e.target.value)} /></Lbl>
          <Lbl label={L.ownerName}    T={T}><input value={draft.ownerName    || ''} onChange={e => sd('ownerName',    e.target.value)} /></Lbl>
        </div>
        <p style={{ color: T.textMuted, fontSize: 12 }}>Changes are saved automatically as you type.</p>
      </Accordion>

      <Accordion icon="📊" label={L.dataSummary} T={T}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
          {[
            { l: L.products,         v: products.length,             c: T.accent },
            { l: L.salesRecords,     v: sales.length,                c: GRN      },
            { l: L.expenseRecords,   v: expenses.length,             c: RED      },
            { l: L.lendingEntries,   v: lending.length,              c: AMB      },
            { l: L.borrowingEntries, v: borrowing.length,            c: BLU      },
            { l: L.allTimeRevenue,   v: previewCur(allRev),          c: GRN      },
            { l: L.allTimeExpenses,  v: previewCur(allExp),          c: RED      },
            { l: L.allTimeProfit,    v: previewCur(allRev - allExp), c: T.accent },
          ].map(s => (
            <div key={s.l} style={{ background: T.bg, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{s.l}</div>
              <div className="dm" style={{ fontWeight: 700, color: s.c, fontSize: 15 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </Accordion>

      <Accordion icon="💾" label={L.dataManagement} T={T}>
        <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 14 }}>{L.dataInfo}</p>
        <Btn color={BLU} onClick={exportData}>{L.exportBackup}</Btn>
      </Accordion>

      <Accordion icon="ℹ️" label={L.about} T={T}>
        <div style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.9 }}>
          <div><strong style={{ color: T.textPrimary }}>{L.version}:</strong> 2.0.0</div>
          <div><strong style={{ color: T.textPrimary }}>{L.storageLbl}:</strong> Supabase Cloud (PostgreSQL)</div>
          <div style={{ marginTop: 10, padding: 12, background: T.bg, borderRadius: 8, borderLeft: `3px solid ${T.accent}`, fontSize: 12 }}>💡 {L.tip}</div>
        </div>
      </Accordion>
    </div>
  )
}
