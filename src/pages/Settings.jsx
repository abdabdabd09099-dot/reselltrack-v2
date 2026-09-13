// ─── Settings.jsx ─────────────────────────────────────────────────────────────
// App settings — language, currency, theme, business info, export data.
// Export: full Excel workbook (.xlsx) auto-saved to device Downloads.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { CURRENCIES, THEMES, LANGS, GRN, RED, AMB, BLU } from '../data/constants.js'
import { todayStr, saveSettings } from '../utils/helpers.js'
import { exportToExcel, exportSalesLog } from '../utils/exportExcel.js'
import { Btn, Field, Accordion, Icon } from '../components/UI.jsx'

const Lbl = Field

export default function Settings({
  settings, setSettings,
  products, sales, expenses, lending, borrowing,
  T, L, cur,
}) {
  const [draft,     setDraft]     = useState({ ...settings })
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState('')

  const sd = (k, v) => {
    const next = { ...draft, [k]: v }
    setDraft(next); setSettings(next); saveSettings(next)
  }

  const allRev    = sales.reduce((a, s) => a + s.amountPaid, 0)
  const allExp    = expenses.reduce((a, e) => a + e.amount, 0)
  const currObj   = CURRENCIES.find(c => c.code === draft.currencyCode) || CURRENCIES[0]
  const previewCur = n => currObj.symbol + Number(n || 0).toLocaleString('en', { minimumFractionDigits: 2 })

  // ── Export full Excel workbook ─────────────────────────────────────────────
  const handleExportExcel = async () => {
    setExporting(true); setExportMsg('')
    try {
      const filename = exportToExcel({
        sales, products, expenses, lending, borrowing,
        settings: draft,
        currencySymbol: currObj.symbol,
      })
      setExportMsg(`✅ Saved: ${filename}`)
    } catch (e) {
      setExportMsg(`❌ Export failed: ${e.message}`)
    }
    setExporting(false)
    setTimeout(() => setExportMsg(''), 6000)
  }

  // ── Export sales log only ─────────────────────────────────────────────────
  const handleExportSales = () => {
    try {
      exportSalesLog({ sales, currencySymbol: currObj.symbol, period: 'all' })
      setExportMsg('✅ Sales log exported!')
    } catch (e) {
      setExportMsg(`❌ ${e.message}`)
    }
    setTimeout(() => setExportMsg(''), 5000)
  }

  // ── Export raw JSON backup ─────────────────────────────────────────────────
  const handleExportJSON = () => {
    const blob = new Blob(
      [JSON.stringify({ products, sales, expenses, lending, borrowing, settings: draft }, null, 2)],
      { type: 'application/json' }
    )
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `reselltrack-backup-${todayStr()}.json`
    a.click(); URL.revokeObjectURL(a.href)
    setExportMsg('✅ JSON backup saved!')
    setTimeout(() => setExportMsg(''), 5000)
  }

  return (
    <div className="fade-in">
      <h1 className="dm" style={{ fontSize: 24, fontWeight: 800, color: T.textPrimary, marginBottom: 20, letterSpacing: '-0.5px' }}>
        {L.settingsTitle}
      </h1>

      {/* ── Language ── */}
      <Accordion icon={<Icon name="globe" size={15} color={T.accent} />} label={L.languageLabel} T={T} defaultOpen>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {Object.values(LANGS).map(lang => {
            const active = draft.language === lang.code
            return (
              <button key={lang.code} onClick={() => sd('language', lang.code)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: `2px solid ${active ? T.accent : T.border}`, background: active ? T.accent + '22' : 'transparent', cursor: 'pointer', transition: 'all .15s' }}>
                <span style={{ fontSize: 22 }}>{lang.flag}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: active ? 700 : 500, color: active ? T.accent : T.textPrimary }}>{lang.name}</div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>{lang.code.toUpperCase()}</div>
                </div>
                {active && <Icon name="check" size={14} color={T.accent} strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      </Accordion>

      {/* ── Currency ── */}
      <Accordion icon={<Icon name="dollar" size={15} color={T.accent} />} label={L.currencyLabel} T={T}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ color: T.textSecondary, fontSize: 13 }}>Preview:</span>
          <span className="mono" style={{ color: T.accent, fontWeight: 700, fontSize: 16 }}>{previewCur(12500)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 8 }}>
          {CURRENCIES.map(c => {
            const active = draft.currencyCode === c.code
            return (
              <button key={c.code} onClick={() => sd('currencyCode', c.code)}
                style={{ padding: '10px 14px', borderRadius: 10, border: `2px solid ${active ? T.accent : T.border}`, background: active ? T.accent + '22' : 'transparent', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                <span className="mono" style={{ fontSize: 17, fontWeight: 700, color: active ? T.accent : T.textSecondary, minWidth: 32 }}>{c.symbol}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: active ? T.accent : T.textPrimary }}>{c.code}</div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>{c.name}</div>
                </div>
                {active && <Icon name="check" size={13} color={T.accent} strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      </Accordion>

      {/* ── Theme ── */}
      <Accordion icon={<Icon name="palette" size={15} color={T.accent} />} label={L.themeLabel} T={T}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', gap: 10 }}>
          {Object.entries(THEMES).map(([key, th]) => {
            const active = draft.theme === key
            return (
              <button key={key} onClick={() => sd('theme', key)}
                style={{ padding: 14, borderRadius: 12, border: `2px solid ${active ? T.accent : T.border}`, background: th.bg, display: 'flex', flexDirection: 'column', gap: 7, position: 'relative', cursor: 'pointer', transition: 'border-color .15s' }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: th.accent }} />
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: th.surface }} />
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: th.border }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: th.textPrimary }}>{th.emoji} {th.name}</div>
                {active && <div style={{ position: 'absolute', top: 8, right: 10 }}><Icon name="check" size={14} color={T.accent} strokeWidth={2.5} /></div>}
              </button>
            )
          })}
        </div>
      </Accordion>

      {/* ── Business Info ── */}
      <Accordion icon={<Icon name="layers" size={15} color={T.accent} />} label={L.businessInfo} T={T}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }} className="g2">
          <Lbl label={L.businessName} T={T}>
            <input value={draft.businessName || ''} onChange={e => sd('businessName', e.target.value)} />
          </Lbl>
          <Lbl label={L.ownerName} T={T}>
            <input value={draft.ownerName || ''} onChange={e => sd('ownerName', e.target.value)} />
          </Lbl>
        </div>
        <p style={{ color: T.textMuted, fontSize: 12 }}>Changes are saved automatically as you type.</p>
      </Accordion>

      {/* ── Data Summary ── */}
      <Accordion icon={<Icon name="pie" size={15} color={T.accent} />} label={L.dataSummary} T={T}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
          {[
            { l: 'Products',       v: products.length,                c: T.accent, icon: 'products'  },
            { l: 'Sales',          v: sales.length,                   c: GRN,      icon: 'sales'     },
            { l: 'Expenses',       v: expenses.length,                c: RED,      icon: 'expenses'  },
            { l: 'Lending',        v: lending.length,                 c: AMB,      icon: 'lend'      },
            { l: 'Borrowing',      v: borrowing.length,               c: BLU,      icon: 'lend'      },
            { l: 'Total Revenue',  v: previewCur(allRev),             c: GRN,      icon: 'dollar'    },
            { l: 'Total Expenses', v: previewCur(allExp),             c: RED,      icon: 'expenses'  },
            { l: 'Net Profit',     v: previewCur(allRev - allExp),    c: T.accent, icon: 'trending-up'},
          ].map(s => (
            <div key={s.l} style={{ background: T.bg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Icon name={s.icon} size={12} color={s.c} />
                <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: .5 }}>{s.l}</div>
              </div>
              <div className="dm" style={{ fontWeight: 700, color: s.c, fontSize: 16 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </Accordion>

      {/* ── Export Data ── */}
      <Accordion icon={<Icon name="download" size={15} color={T.accent} />} label="Export & Backup" T={T} defaultOpen>
        <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
          Export your business data to Excel or JSON. Files are automatically saved to your device's Downloads folder.
        </p>

        {/* Excel export options */}
        <div style={{ display: 'grid', gap: 12, marginBottom: 14 }}>

          {/* Full workbook */}
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: GRN + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="file" size={18} color={GRN} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: 14, marginBottom: 3 }}>
                  Full Business Report (.xlsx)
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
                  6 sheets: Summary · Sales · Products · Expenses · Lending · Borrowing.
                  Auto-saved to Downloads.
                </div>
              </div>
            </div>
            <Btn
              icon="download"
              color={GRN}
              onClick={handleExportExcel}
              disabled={exporting}
              full
            >
              {exporting ? 'Generating Excel…' : `Export Full Report — ${sales.length} sales, ${products.length} products`}
            </Btn>
          </div>

          {/* Sales log only */}
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: BLU + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="sales" size={18} color={BLU} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: 14, marginBottom: 3 }}>
                  Sales Transaction Log (.xlsx)
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
                  All sales with items, prices, customer, payment method and status.
                </div>
              </div>
            </div>
            <Btn icon="download" color={BLU} onClick={handleExportSales} full>
              Export Sales Log — {sales.length} transactions
            </Btn>
          </div>

          {/* JSON backup */}
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: AMB + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="archive" size={18} color={AMB} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: 14, marginBottom: 3 }}>
                  Full Backup (.json)
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5 }}>
                  Raw JSON backup of all your data. Can be used to restore or migrate.
                </div>
              </div>
            </div>
            <Btn icon="download" color={AMB} onClick={handleExportJSON} full>
              Download JSON Backup
            </Btn>
          </div>
        </div>

        {/* Export message */}
        {exportMsg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: exportMsg.startsWith('✅') ? GRN + '22' : RED + '22',
            color:      exportMsg.startsWith('✅') ? GRN      : RED,
            border:     `1px solid ${exportMsg.startsWith('✅') ? GRN : RED}44`,
          }}>
            {exportMsg}
          </div>
        )}
      </Accordion>

      {/* ── About ── */}
      <Accordion icon={<Icon name="info" size={15} color={T.accent} />} label={L.about} T={T}>
        <div style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.9 }}>
          <div><strong style={{ color: T.textPrimary }}>{L.version}:</strong> 2.1.0</div>
          <div><strong style={{ color: T.textPrimary }}>{L.storageLbl}:</strong> Supabase Cloud + IndexedDB Offline</div>
          <div style={{ marginTop: 12, padding: 12, background: T.bg, borderRadius: 8, borderLeft: `3px solid ${T.accent}`, fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Icon name="shield" size={13} color={T.accent} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{L.tip}</span>
          </div>
        </div>
      </Accordion>
    </div>
  )
}
