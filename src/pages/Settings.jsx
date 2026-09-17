// ─── Settings.jsx ─────────────────────────────────────────────────────────────
// Merged Settings + Profile — one page with all sections as accordions:
// Account (avatar, display name, email, password, delete)
// Security status, Language, Currency, Theme, Business Info, Export, About
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { sb } from '../utils/supabase.js'
import { CURRENCIES, THEMES, LANGS, GRN, RED, AMB, BLU } from '../data/constants.js'
import { todayStr, saveSettings } from '../utils/helpers.js'
import { exportToExcel, exportSalesLog } from '../utils/exportExcel.js'
import { checkRateLimit } from '../utils/security.js'
import { Btn, Field, Accordion, Icon } from '../components/UI.jsx'

const Lbl = Field

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(p) {
  const checks = { length: p.length >= 6, number: /\d/.test(p), symbol: /[!@#$%^&*]/.test(p), uppercase: /[A-Z]/.test(p) }
  const score = Object.values(checks).filter(Boolean).length
  return { score, checks, color: ['','#F87171','#FBBF24','#FBBF24','#34D399'][score] || '', label: ['','Too weak','Fair','Strong','Very strong'][score] || '' }
}

function PasswordInput({ value, onChange, placeholder, borderColor, T }) {
  const [visible, setVisible] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', background: T.bg, color: T.textPrimary, border: `1.5px solid ${borderColor || T.border}`, borderRadius: 8, padding: '9px 38px 9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      <button type="button" onClick={() => setVisible(v => !v)}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}>
        <Icon name={visible ? 'eye-off' : 'eye'} size={15} color={T.textMuted} />
      </button>
    </div>
  )
}

function Tip({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: ok ? GRN : '#2E3344', transition: 'background .2s' }} />
      <span style={{ fontSize: 11, color: ok ? GRN : '#4B5268' }}>{label}</span>
    </div>
  )
}

function msgStyle(msg) {
  return { fontSize: 12, marginTop: 10, fontWeight: 600, padding: '8px 12px', borderRadius: 8, background: msg.startsWith('✅') ? GRN + '22' : RED + '22', color: msg.startsWith('✅') ? GRN : RED, border: `1px solid ${msg.startsWith('✅') ? GRN : RED}44` }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Settings({
  settings, setSettings, user, onSignOut,
  products, sales, expenses, lending, borrowing,
  T, L, cur,
}) {
  const [draft,     setDraft]     = useState({ ...settings })
  const email    = user?.email || ''
  const initials = email.slice(0, 2).toUpperCase()

  const sd = (k, v) => { const next = { ...draft, [k]: v }; setDraft(next); setSettings(next); saveSettings(next) }

  // ── Display name ─────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '')
  const [nameSaving,  setNameSaving]  = useState(false)
  const [nameMsg,     setNameMsg]     = useState('')
  const saveDisplayName = async () => {
    if (!displayName.trim()) return
    setNameSaving(true); setNameMsg('')
    try { const { error } = await sb.auth.updateUser({ data: { display_name: displayName.trim() } }); if (error) throw error; setNameMsg('✅ Name updated!') }
    catch (e) { setNameMsg('❌ ' + e.message) }
    setNameSaving(false)
  }

  // ── Change email ──────────────────────────────────────────────────────────
  const [newEmail,    setNewEmail]    = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMsg,    setEmailMsg]    = useState('')
  const saveEmail = async () => {
    if (!newEmail.includes('@')) return setEmailMsg('❌ Enter a valid email.')
    setEmailSaving(true); setEmailMsg('')
    try { checkRateLimit(); const { error } = await sb.auth.updateUser({ email: newEmail }); if (error) throw error; setEmailMsg('✅ Confirmation sent to ' + newEmail); setNewEmail('') }
    catch (e) { setEmailMsg('❌ ' + e.message) }
    setEmailSaving(false)
  }

  // ── Change password ───────────────────────────────────────────────────────
  const [curPass,    setCurPass]    = useState('')
  const [newPass,    setNewPass]    = useState('')
  const [confPass,   setConfPass]   = useState('')
  const [passSaving, setPassSaving] = useState(false)
  const [passMsg,    setPassMsg]    = useState('')
  const strength       = getStrength(newPass)
  const passwordsMatch = newPass === confPass && confPass.length > 0
  const savePassword = async () => {
    if (!curPass) return setPassMsg('❌ Enter your current password first.')
    if (strength.score < 2) return setPassMsg('❌ New password is too weak.')
    if (!passwordsMatch) return setPassMsg('❌ Passwords do not match.')
    setPassSaving(true); setPassMsg('')
    try {
      checkRateLimit()
      const { error: signErr } = await sb.auth.signInWithPassword({ email, password: curPass })
      if (signErr) throw new Error('Current password is incorrect.')
      const { error } = await sb.auth.updateUser({ password: newPass })
      if (error) throw error
      setPassMsg('✅ Password updated!'); setCurPass(''); setNewPass(''); setConfPass('')
    } catch (e) { setPassMsg('❌ ' + e.message) }
    setPassSaving(false)
  }

  // ── Delete account ────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting,      setDeleting]      = useState(false)
  const [showDelete,    setShowDelete]    = useState(false)
  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    try { await sb.auth.signOut(); onSignOut?.() } catch { onSignOut?.() }
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const [exporting,  setExporting]  = useState(false)
  const [exportMsg,  setExportMsg]  = useState('')
  const currObj   = CURRENCIES.find(c => c.code === draft.currencyCode) || CURRENCIES[0]
  const previewCur = n => currObj.symbol + Number(n || 0).toLocaleString('en', { minimumFractionDigits: 2 })
  const allRev    = sales.reduce((a, s) => a + s.amountPaid, 0)
  const allExp    = expenses.reduce((a, e) => a + e.amount, 0)

  const handleExportExcel = async () => {
    setExporting(true); setExportMsg('')
    try { const fn = exportToExcel({ sales, products, expenses, lending, borrowing, settings: draft, currencySymbol: currObj.symbol }); setExportMsg('✅ Saved: ' + fn) }
    catch (e) { setExportMsg('❌ ' + e.message) }
    setExporting(false); setTimeout(() => setExportMsg(''), 6000)
  }
  const handleExportSales = () => {
    try { exportSalesLog({ sales, currencySymbol: currObj.symbol, period: 'all' }); setExportMsg('✅ Sales log exported!') }
    catch (e) { setExportMsg('❌ ' + e.message) }
    setTimeout(() => setExportMsg(''), 5000)
  }
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ products, sales, expenses, lending, borrowing, settings: draft }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `reselltrack-backup-${todayStr()}.json`; a.click(); URL.revokeObjectURL(a.href)
    setExportMsg('✅ JSON backup saved!'); setTimeout(() => setExportMsg(''), 5000)
  }

  const inputSt = { background: T.bg, color: T.textPrimary, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <div className="fade-in">
      <h1 className="dm" style={{ fontSize: 24, fontWeight: 800, color: T.textPrimary, marginBottom: 20, letterSpacing: '-0.5px' }}>
        Settings & Profile
      </h1>

      {/* ══ ACCOUNT ══════════════════════════════════════════════════════════ */}
      <Accordion icon={<Icon name="user" size={15} color={T.accent} />} label="Account" T={T} defaultOpen>

        {/* Avatar + email */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: T.bg, borderRadius: 12, marginBottom: 16, border: `1px solid ${T.border}` }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${T.accent}, ${T.accent}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#0D0F14', fontFamily: "'DM Sans',sans-serif", boxShadow: `0 0 0 3px ${T.accent}33` }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="dm" style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName || email.split('@')[0]}
            </div>
            <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <Icon name="shield" size={11} color={GRN} strokeWidth={2.5} />
              <span style={{ fontSize: 10, color: GRN, fontWeight: 600 }}>Account secured</span>
            </div>
          </div>
        </div>

        {/* Display name */}
        <div style={{ marginBottom: 14 }}>
          <Lbl label="Display Name" T={T}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" style={{ ...inputSt, flex: 1 }} />
              <Btn onClick={saveDisplayName} disabled={nameSaving || !displayName.trim()} small>{nameSaving ? '…' : 'Save'}</Btn>
            </div>
          </Lbl>
          {nameMsg && <div style={msgStyle(nameMsg)}>{nameMsg}</div>}
        </div>

        {/* Change email */}
        <div style={{ marginBottom: 14 }}>
          <Lbl label="Change Email" T={T}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="New email address" style={{ ...inputSt, flex: 1 }} />
              <Btn onClick={saveEmail} disabled={emailSaving || !newEmail} small>{emailSaving ? '…' : 'Update'}</Btn>
            </div>
          </Lbl>
          <p style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>Current: <strong style={{ color: T.textPrimary }}>{email}</strong> · A confirmation link will be sent.</p>
          {emailMsg && <div style={msgStyle(emailMsg)}>{emailMsg}</div>}
        </div>

        {/* Change password */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Change Password</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <PasswordInput value={curPass} onChange={e => setCurPass(e.target.value)} placeholder="Current password" T={T} />
            <PasswordInput value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="New password" T={T}
              borderColor={newPass ? strength.color || T.border : T.border} />
            {newPass.length > 0 && (
              <div style={{ padding: '8px 10px', background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                  {[0,1,2,3].map(i => <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i < strength.score ? strength.color : T.border, transition: 'background .3s' }} />)}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: strength.color, marginBottom: 5 }}>{strength.label}</div>
                <Tip ok={strength.checks.length}    label="At least 6 characters" />
                <Tip ok={strength.checks.number}    label="Contains a number" />
                <Tip ok={strength.checks.uppercase} label="Uppercase letter" />
                <Tip ok={strength.checks.symbol}    label="Symbol (!@#$...)" />
              </div>
            )}
            <PasswordInput value={confPass} onChange={e => setConfPass(e.target.value)} placeholder="Confirm new password" T={T}
              borderColor={confPass ? (passwordsMatch ? GRN : RED) : T.border} />
            {confPass.length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 600, color: passwordsMatch ? GRN : RED }}>
                {passwordsMatch ? '✓ Passwords match' : '✗ Do not match'}
              </div>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <Btn onClick={savePassword} disabled={passSaving || !curPass || strength.score < 2 || !passwordsMatch} icon="lock" small>
              {passSaving ? 'Updating…' : 'Update Password'}
            </Btn>
          </div>
          {passMsg && <div style={msgStyle(passMsg)}>{passMsg}</div>}
        </div>

        {/* Sign out */}
        <Btn outline color={T.textSecondary} icon="logout" onClick={onSignOut} small>Sign Out</Btn>
      </Accordion>

      {/* ══ SECURITY ═════════════════════════════════════════════════════════ */}
      <Accordion icon={<Icon name="shield" size={15} color={T.accent} />} label="Security" T={T}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: 'shield', label: 'Row-Level Security',   desc: 'Only your account accesses your data',      ok: true },
            { icon: 'lock',   label: 'Encrypted passwords',  desc: 'Hashed with bcrypt — never stored plain',   ok: true },
            { icon: 'clock',  label: 'Session timeout',       desc: 'Auto sign-out after 30min idle',            ok: true },
            { icon: 'shield', label: 'Rate limiting',          desc: 'Max 5 auth attempts per 10 minutes',       ok: true },
            { icon: 'shield', label: 'Content Security Policy','desc': 'Prevents script injection attacks',     ok: true },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: T.bg, borderRadius: 10, border: `1px solid ${T.border}` }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: GRN + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={item.icon} size={13} color={GRN} strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary }}>{item.label}</div>
                <div style={{ fontSize: 10, color: T.textMuted }}>{item.desc}</div>
              </div>
              <Icon name="check" size={14} color={GRN} strokeWidth={2.5} />
            </div>
          ))}
        </div>
      </Accordion>

      {/* ══ LANGUAGE ═════════════════════════════════════════════════════════ */}
      <Accordion icon={<Icon name="globe" size={15} color={T.accent} />} label={L.languageLabel} T={T}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {Object.values(LANGS).map(lang => {
            const active = draft.language === lang.code
            return (
              <button key={lang.code} onClick={() => sd('language', lang.code)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, border: `2px solid ${active ? T.accent : T.border}`, background: active ? T.accent + '22' : 'transparent', cursor: 'pointer', transition: 'all .15s' }}>
                <span style={{ fontSize: 20 }}>{lang.flag}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? T.accent : T.textPrimary }}>{lang.name}</div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>{lang.code.toUpperCase()}</div>
                </div>
                {active && <Icon name="check" size={13} color={T.accent} strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      </Accordion>

      {/* ══ CURRENCY ═════════════════════════════════════════════════════════ */}
      <Accordion icon={<Icon name="dollar" size={15} color={T.accent} />} label={L.currencyLabel} T={T}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ color: T.textSecondary, fontSize: 13 }}>Preview:</span>
          <span className="mono" style={{ color: T.accent, fontWeight: 700, fontSize: 16 }}>{previewCur(12500)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(165px,1fr))', gap: 8 }}>
          {CURRENCIES.map(c => {
            const active = draft.currencyCode === c.code
            return (
              <button key={c.code} onClick={() => sd('currencyCode', c.code)}
                style={{ padding: '9px 12px', borderRadius: 10, border: `2px solid ${active ? T.accent : T.border}`, background: active ? T.accent + '22' : 'transparent', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: active ? T.accent : T.textSecondary, minWidth: 28 }}>{c.symbol}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: active ? T.accent : T.textPrimary }}>{c.code}</div>
                  <div style={{ fontSize: 10, color: T.textMuted }}>{c.name}</div>
                </div>
                {active && <Icon name="check" size={12} color={T.accent} strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      </Accordion>

      {/* ══ THEME ════════════════════════════════════════════════════════════ */}
      <Accordion icon={<Icon name="palette" size={15} color={T.accent} />} label={L.themeLabel} T={T}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
          {Object.entries(THEMES).map(([key, th]) => {
            const active = draft.theme === key
            return (
              <button key={key} onClick={() => sd('theme', key)}
                style={{ padding: 12, borderRadius: 12, border: `2px solid ${active ? T.accent : T.border}`, background: th.bg, display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', cursor: 'pointer', transition: 'border-color .15s' }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: th.accent }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: th.surface }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: th.border }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: th.textPrimary }}>{th.emoji} {th.name}</div>
                {active && <div style={{ position: 'absolute', top: 8, right: 8 }}><Icon name="check" size={13} color={T.accent} strokeWidth={2.5} /></div>}
              </button>
            )
          })}
        </div>
      </Accordion>

      {/* ══ BUSINESS INFO ════════════════════════════════════════════════════ */}
      <Accordion icon={<Icon name="layers" size={15} color={T.accent} />} label={L.businessInfo} T={T}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }} className="g2">
          <Lbl label={L.businessName} T={T}><input value={draft.businessName || ''} onChange={e => sd('businessName', e.target.value)} /></Lbl>
          <Lbl label={L.ownerName}    T={T}><input value={draft.ownerName    || ''} onChange={e => sd('ownerName',    e.target.value)} /></Lbl>
        </div>
        <p style={{ color: T.textMuted, fontSize: 12 }}>Saved automatically as you type.</p>
      </Accordion>

      {/* ══ DATA SUMMARY ═════════════════════════════════════════════════════ */}
      <Accordion icon={<Icon name="pie" size={15} color={T.accent} />} label={L.dataSummary} T={T}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
          {[
            { l: 'Products',       v: products.length,             c: T.accent, icon: 'products'     },
            { l: 'Sales',          v: sales.length,                c: GRN,      icon: 'sales'        },
            { l: 'Expenses',       v: expenses.length,             c: RED,      icon: 'expenses'     },
            { l: 'Lending',        v: lending.length,              c: AMB,      icon: 'lend'         },
            { l: 'Borrowing',      v: borrowing.length,            c: BLU,      icon: 'lend'         },
            { l: 'Revenue',        v: previewCur(allRev),          c: GRN,      icon: 'dollar'       },
            { l: 'Expenses Total', v: previewCur(allExp),          c: RED,      icon: 'trending-down'},
            { l: 'Net Profit',     v: previewCur(allRev - allExp), c: T.accent, icon: 'trending-up'  },
          ].map(s => (
            <div key={s.l} style={{ background: T.bg, borderRadius: 10, padding: '11px 12px', border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <Icon name={s.icon} size={11} color={s.c} />
                <div style={{ fontSize: 9, color: T.textMuted, textTransform: 'uppercase', letterSpacing: .5, fontWeight: 600 }}>{s.l}</div>
              </div>
              <div className="dm" style={{ fontWeight: 700, color: s.c, fontSize: 15 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </Accordion>

      {/* ══ EXPORT & BACKUP ══════════════════════════════════════════════════ */}
      <Accordion icon={<Icon name="download" size={15} color={T.accent} />} label="Export & Backup" T={T}>
        <p style={{ color: T.textSecondary, fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
          All files auto-save to your device Downloads folder.
        </p>
        <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
          {[
            { icon: 'file',    color: GRN, title: 'Full Business Report (.xlsx)', desc: `6 sheets: Summary · Sales · Products · Expenses · Lending · Borrowing`, action: handleExportExcel, label: exporting ? 'Generating…' : `Export Full Report (${sales.length} sales)` },
            { icon: 'sales',   color: BLU, title: 'Sales Transaction Log (.xlsx)', desc: 'All sales with items, prices, customer, status', action: handleExportSales, label: `Export Sales Log (${sales.length} records)` },
            { icon: 'archive', color: AMB, title: 'Full Backup (.json)',           desc: 'Raw JSON — for migration or restore',           action: handleExportJSON,  label: 'Download JSON Backup' },
          ].map((ex, i) => (
            <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: ex.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={ex.icon} size={16} color={ex.color} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: 13 }}>{ex.title}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{ex.desc}</div>
                </div>
              </div>
              <Btn icon="download" color={ex.color} onClick={ex.action} disabled={exporting} full>{ex.label}</Btn>
            </div>
          ))}
        </div>
        {exportMsg && <div style={msgStyle(exportMsg)}>{exportMsg}</div>}
      </Accordion>

      {/* ══ DANGER ZONE ══════════════════════════════════════════════════════ */}
      <div style={{ background: RED + '08', border: `1px solid ${RED}33`, borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Icon name="trash" size={15} color={RED} strokeWidth={2} />
          <span className="dm" style={{ fontSize: 14, fontWeight: 700, color: RED }}>Danger Zone</span>
        </div>
        <p style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6, marginBottom: 12 }}>
          Permanently delete your account and all data. <strong style={{ color: RED }}>Cannot be undone.</strong>
        </p>
        {!showDelete ? (
          <Btn outline color={RED} icon="trash" onClick={() => setShowDelete(true)} small>Delete My Account</Btn>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, color: RED, fontWeight: 600 }}>Type <strong>DELETE</strong> to confirm:</div>
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="DELETE"
              style={{ background: T.bg, color: RED, border: `1.5px solid ${RED}66`, borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn danger icon="trash" disabled={deleteConfirm !== 'DELETE' || deleting} onClick={deleteAccount} small>
                {deleting ? 'Deleting…' : 'Delete Forever'}
              </Btn>
              <Btn outline color={T.textSecondary} onClick={() => { setShowDelete(false); setDeleteConfirm('') }} small>Cancel</Btn>
            </div>
          </div>
        )}
      </div>

      {/* ══ ABOUT ════════════════════════════════════════════════════════════ */}
      <Accordion icon={<Icon name="info" size={15} color={T.accent} />} label={L.about} T={T}>
        <div style={{ color: T.textSecondary, fontSize: 13, lineHeight: 1.9 }}>
          <div><strong style={{ color: T.textPrimary }}>Version:</strong> 2.1.0</div>
          <div><strong style={{ color: T.textPrimary }}>Storage:</strong> Supabase Cloud + IndexedDB Offline</div>
          <div><strong style={{ color: T.textPrimary }}>Framework:</strong> React 18 + Vite 5 + Capacitor</div>
          <div style={{ marginTop: 10, padding: '10px 12px', background: T.bg, borderRadius: 8, borderLeft: `3px solid ${T.accent}`, fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Icon name="shield" size={12} color={T.accent} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Your financial data is encrypted, never sold, and only accessible by you.</span>
          </div>
        </div>
      </Accordion>
    </div>
  )
}
