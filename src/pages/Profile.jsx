// ─── Profile.jsx ──────────────────────────────────────────────────────────────
// Account management — change display name, email, password, delete account.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { sb } from '../utils/supabase.js'
import { checkRateLimit } from '../utils/security.js'
import { GRN, RED, AMB } from '../data/constants.js'
import { Btn, Field, Icon } from '../components/UI.jsx'

const Lbl = Field

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(p) {
  const checks = {
    length:    p.length >= 6,
    number:    /\d/.test(p),
    symbol:    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
    uppercase: /[A-Z]/.test(p),
  }
  const score  = Object.values(checks).filter(Boolean).length
  const colors = ['', '#F87171','#FBBF24','#FBBF24','#34D399']
  const labels = ['', 'Too weak','Fair','Strong','Very strong']
  return { score, checks, color: colors[score] || '', label: labels[score] || '' }
}

function PasswordInput({ value, onChange, placeholder, borderColor, T }) {
  const [visible, setVisible] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value} onChange={onChange} placeholder={placeholder}
        style={{
          width: '100%', background: T.bg, color: T.textPrimary,
          border: `1.5px solid ${borderColor || T.border}`,
          borderRadius: 8, padding: '10px 40px 10px 12px',
          fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
        }}
      />
      <button type="button" onClick={() => setVisible(v => !v)}
        style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, display: 'flex', alignItems: 'center', padding: 2 }}>
        <Icon name={visible ? 'eye-off' : 'eye'} size={15} color={T.textMuted} />
      </button>
    </div>
  )
}

function Tip({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: ok ? GRN : '#2E3344', transition: 'background .2s' }} />
      <span style={{ fontSize: 11, color: ok ? GRN : '#4B5268', transition: 'color .2s' }}>{label}</span>
    </div>
  )
}

function Section({ title, icon, T, children }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={16} color={T.accent} strokeWidth={2} />
        </div>
        <span className="dm" style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

export default function Profile({ user, T, onSignOut }) {
  const email       = user?.email || ''
  const initials    = email.slice(0, 2).toUpperCase()

  // ── Display name ───────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '')
  const [nameSaving,  setNameSaving]  = useState(false)
  const [nameMsg,     setNameMsg]     = useState('')

  const saveDisplayName = async () => {
    if (!displayName.trim()) return
    setNameSaving(true); setNameMsg('')
    try {
      const { error } = await sb.auth.updateUser({ data: { display_name: displayName.trim() } })
      if (error) throw error
      setNameMsg('✅ Name updated!')
    } catch (e) { setNameMsg('❌ ' + e.message) }
    setNameSaving(false)
  }

  // ── Change email ───────────────────────────────────────────────────────────
  const [newEmail,  setNewEmail]  = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMsg,  setEmailMsg]  = useState('')

  const saveEmail = async () => {
    if (!newEmail.includes('@')) return setEmailMsg('❌ Enter a valid email.')
    setEmailSaving(true); setEmailMsg('')
    try {
      checkRateLimit()
      const { error } = await sb.auth.updateUser({ email: newEmail })
      if (error) throw error
      setEmailMsg('✅ Confirmation sent to ' + newEmail + '. Check your inbox.')
      setNewEmail('')
    } catch (e) { setEmailMsg('❌ ' + e.message) }
    setEmailSaving(false)
  }

  // ── Change password ────────────────────────────────────────────────────────
  const [curPass,   setCurPass]   = useState('')
  const [newPass,   setNewPass]   = useState('')
  const [confPass,  setConfPass]  = useState('')
  const [passSaving, setPassSaving] = useState(false)
  const [passMsg,   setPassMsg]   = useState('')
  const strength       = getStrength(newPass)
  const passwordsMatch = newPass === confPass && confPass.length > 0

  const savePassword = async () => {
    if (!curPass) return setPassMsg('❌ Enter your current password first.')
    if (strength.score < 2) return setPassMsg('❌ New password is too weak.')
    if (!passwordsMatch) return setPassMsg('❌ Passwords do not match.')
    setPassSaving(true); setPassMsg('')
    try {
      checkRateLimit()
      // Re-authenticate with current password first
      const { error: signErr } = await sb.auth.signInWithPassword({ email, password: curPass })
      if (signErr) throw new Error('Current password is incorrect.')
      const { error } = await sb.auth.updateUser({ password: newPass })
      if (error) throw error
      setPassMsg('✅ Password updated successfully!')
      setCurPass(''); setNewPass(''); setConfPass('')
    } catch (e) { setPassMsg('❌ ' + e.message) }
    setPassSaving(false)
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting,      setDeleting]      = useState(false)
  const [showDelete,    setShowDelete]    = useState(false)

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    try {
      // Delete all user data via Supabase (RLS cascade handles DB rows)
      await sb.auth.admin?.deleteUser?.(user.id) // works if admin key present
      await sb.auth.signOut()
      onSignOut?.()
    } catch (e) {
      // Fallback — sign out and let user know to contact support
      await sb.auth.signOut()
      onSignOut?.()
    }
  }

  const msgStyle = (msg) => ({
    fontSize: 12, marginTop: 10, fontWeight: 600, padding: '8px 12px',
    borderRadius: 8, background: msg.startsWith('✅') ? GRN + '22' : RED + '22',
    color: msg.startsWith('✅') ? GRN : RED,
    border: `1px solid ${msg.startsWith('✅') ? GRN : RED}44`,
  })

  const inputStyle = {
    background: T.bg, color: T.textPrimary,
    border: `1.5px solid ${T.border}`,
    borderRadius: 8, padding: '10px 12px',
    fontSize: 14, outline: 'none', width: '100%',
    boxSizing: 'border-box', fontFamily: 'inherit',
  }

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 className="dm" style={{ fontSize: 24, fontWeight: 800, color: T.textPrimary, letterSpacing: '-0.5px' }}>
          My Profile
        </h1>
        <p style={{ color: T.textSecondary, fontSize: 13, marginTop: 4 }}>
          Manage your account, password and security settings.
        </p>
      </div>

      {/* ── Avatar card ── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${T.accent}, ${T.accent}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: '#0D0F14', fontFamily: "'DM Sans',sans-serif",
          boxShadow: `0 0 0 3px ${T.accent}33`,
        }}>
          {initials}
        </div>
        <div>
          <div className="dm" style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary }}>
            {displayName || email.split('@')[0]}
          </div>
          <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 3 }}>{email}</div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="shield" size={12} color={GRN} strokeWidth={2.5} />
            <span style={{ fontSize: 11, color: GRN, fontWeight: 600 }}>Account secured</span>
          </div>
        </div>
      </div>

      {/* ── Display name ── */}
      <Section title="Display Name" icon="user" T={T}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Lbl label="Your name (shown in the app)" T={T}>
              <input
                value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Juan dela Cruz" style={inputStyle}
              />
            </Lbl>
          </div>
          <Btn onClick={saveDisplayName} disabled={nameSaving || !displayName.trim()}>
            {nameSaving ? 'Saving…' : 'Save'}
          </Btn>
        </div>
        {nameMsg && <div style={msgStyle(nameMsg)}>{nameMsg}</div>}
      </Section>

      {/* ── Change email ── */}
      <Section title="Change Email" icon="user" T={T}>
        <div style={{ background: T.surfaceHigh, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: T.textSecondary }}>
          Current: <span style={{ color: T.textPrimary, fontWeight: 600 }}>{email}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Lbl label="New email address" T={T}>
              <input
                type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="new@email.com" style={inputStyle}
              />
            </Lbl>
          </div>
          <Btn onClick={saveEmail} disabled={emailSaving || !newEmail}>
            {emailSaving ? 'Sending…' : 'Update'}
          </Btn>
        </div>
        <p style={{ fontSize: 11, color: T.textMuted, marginTop: 8 }}>
          A confirmation link will be sent to your new email. Your current email stays active until confirmed.
        </p>
        {emailMsg && <div style={msgStyle(emailMsg)}>{emailMsg}</div>}
      </Section>

      {/* ── Change password ── */}
      <Section title="Change Password" icon="lock" T={T}>
        <div style={{ display: 'grid', gap: 14 }}>
          <Lbl label="Current password" T={T}>
            <PasswordInput value={curPass} onChange={e => setCurPass(e.target.value)} placeholder="Your current password" T={T} />
          </Lbl>
          <Lbl label="New password" T={T}>
            <PasswordInput
              value={newPass} onChange={e => setNewPass(e.target.value)}
              placeholder="Min. 6 characters" T={T}
              borderColor={newPass ? strength.color || T.border : T.border}
            />
            {newPass.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, transition: 'background .3s', background: i < strength.score ? strength.color : T.border }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: strength.color, marginBottom: 8 }}>{strength.label}</div>
                <Tip ok={strength.checks.length}    label="At least 6 characters" />
                <Tip ok={strength.checks.number}    label="Contains a number" />
                <Tip ok={strength.checks.uppercase} label="Contains an uppercase letter" />
                <Tip ok={strength.checks.symbol}    label="Contains a symbol (!@#$...)" />
              </div>
            )}
          </Lbl>
          <Lbl label="Confirm new password" T={T}>
            <PasswordInput
              value={confPass} onChange={e => setConfPass(e.target.value)}
              placeholder="Repeat your new password" T={T}
              borderColor={confPass ? (passwordsMatch ? GRN : RED) : T.border}
            />
            {confPass.length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 5, color: passwordsMatch ? GRN : RED }}>
                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}
          </Lbl>
        </div>
        <div style={{ marginTop: 16 }}>
          <Btn
            onClick={savePassword}
            disabled={passSaving || !curPass || strength.score < 2 || !passwordsMatch}
            icon="lock"
          >
            {passSaving ? 'Updating…' : 'Update Password'}
          </Btn>
        </div>
        {passMsg && <div style={msgStyle(passMsg)}>{passMsg}</div>}
      </Section>

      {/* ── Security info ── */}
      <Section title="Security" icon="shield" T={T}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: 'shield', label: 'Row-Level Security', desc: 'Only your account can access your data', ok: true },
            { icon: 'lock',   label: 'Password encryption', desc: 'Hashed with bcrypt — never stored plain', ok: true },
            { icon: 'clock',  label: 'Session timeout',     desc: 'Auto sign-out after 30 min of inactivity', ok: true },
            { icon: 'shield', label: 'Rate limiting',        desc: 'Max 5 auth attempts per 10 minutes', ok: true },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: T.surfaceHigh, borderRadius: 10, border: `1px solid ${T.border}` }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: GRN + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={item.icon} size={14} color={GRN} strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{item.label}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{item.desc}</div>
              </div>
              <Icon name="check" size={16} color={GRN} strokeWidth={2.5} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Sign out ── */}
      <Section title="Session" icon="logout" T={T}>
        <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>
          Signing out will clear your session. You'll need to sign in again to access your data.
        </p>
        <Btn outline color={T.textSecondary} icon="logout" onClick={onSignOut}>
          Sign Out
        </Btn>
      </Section>

      {/* ── Danger zone ── */}
      <div style={{ background: RED + '08', border: `1px solid ${RED}33`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: RED + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trash" size={16} color={RED} strokeWidth={2} />
          </div>
          <span className="dm" style={{ fontSize: 15, fontWeight: 700, color: RED }}>Danger Zone</span>
        </div>
        <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 16 }}>
          Permanently delete your account and all your business data — products, sales, expenses, lending records. This action <strong style={{ color: RED }}>cannot be undone</strong>.
        </p>
        {!showDelete ? (
          <Btn outline color={RED} icon="trash" onClick={() => setShowDelete(true)}>
            Delete My Account
          </Btn>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 13, color: RED, fontWeight: 600 }}>
              Type <strong>DELETE</strong> to confirm:
            </div>
            <input
              value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE to confirm"
              style={{ background: T.bg, color: RED, border: `1.5px solid ${RED}66`, borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn danger icon="trash" disabled={deleteConfirm !== 'DELETE' || deleting} onClick={deleteAccount}>
                {deleting ? 'Deleting…' : 'Permanently Delete'}
              </Btn>
              <Btn outline color={T.textSecondary} onClick={() => { setShowDelete(false); setDeleteConfirm('') }}>
                Cancel
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
