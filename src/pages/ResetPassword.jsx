// ─── ResetPassword.jsx ────────────────────────────────────────────────────────
// Users land here after clicking the "Reset Password" link in their email.
// Supabase puts the recovery token in the URL hash — we read it automatically
// via onAuthStateChange (Supabase handles the token exchange internally).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { sb } from '../utils/supabase.js'
import { RED, GRN } from '../data/constants.js'
import { buildCss } from '../utils/buildCss.js'

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(p) {
  const checks = {
    length:    p.length >= 6,
    number:    /\d/.test(p),
    symbol:    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p),
    uppercase: /[A-Z]/.test(p),
  }
  const score  = Object.values(checks).filter(Boolean).length
  const colors = ['', '#F87171', '#FBBF24', '#FBBF24', '#34D399']
  const labels = ['', 'Too weak', 'Fair', 'Strong', 'Very strong']
  return { score, checks, color: colors[score] || '', label: labels[score] || '' }
}

// ── Eye icon ──────────────────────────────────────────────────────────────────
const EyeIcon = ({ visible }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {visible ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    )}
  </svg>
)

function PasswordInput({ value, onChange, placeholder, borderColor }) {
  const [visible, setVisible] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: '100%', background: '#0F1117', color: '#F0F2F8', border: `1px solid ${borderColor || '#2E3344'}`, borderRadius: 8, padding: '10px 40px 10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
      />
      <button type="button" onClick={() => setVisible(v => !v)}
        style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4B5268', display: 'flex', alignItems: 'center', padding: 2 }}>
        <EyeIcon visible={visible} />
      </button>
    </div>
  )
}

function Tip({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: ok ? GRN : '#2E3344', transition: 'background .2s' }}/>
      <span style={{ fontSize: 11, color: ok ? GRN : '#4B5268', transition: 'color .2s' }}>{label}</span>
    </div>
  )
}

export default function ResetPassword({ T }) {
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [ready,    setReady]    = useState(false)

  const strength       = getStrength(password)
  const passwordsMatch = password === confirm && confirm.length > 0
  const canSubmit      = strength.score >= 2 && passwordsMatch && !loading

  // Supabase exchanges the token from the URL hash automatically
  // and fires PASSWORD_RECOVERY via onAuthStateChange
  useEffect(() => {
    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const submit = async e => {
    e.preventDefault()
    if (!passwordsMatch)    return setError('Passwords do not match.')
    if (strength.score < 2) return setError('Password is too weak.')
    setError(''); setLoading(true)
    try {
      const { error: err } = await sb.auth.updateUser({ password })
      if (err) throw err
      setSuccess(true)
      // Redirect to home after 2.5 seconds
      setTimeout(() => { window.location.href = '/' }, 2500)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const labelStyle = { fontSize: 12, color: '#8B92A8', display: 'block', marginBottom: 5, fontWeight: 500 }

  return (
    <>
      <style>{buildCss(T)}</style>
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 400, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32 }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/icons/icon-128.png" alt="ResellTrack" style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 12 }} />
            <h1 className="dm" style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, margin: '0 0 4px' }}>Set New Password</h1>
            <p style={{ color: T.textSecondary, fontSize: 13, margin: 0 }}>ResellTrack</p>
          </div>

          {/* Success state */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ color: GRN, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Password updated!</div>
              <div style={{ color: T.textSecondary, fontSize: 13 }}>Redirecting you to the app…</div>
            </div>
          ) : !ready ? (
            /* Waiting for token */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
              <div style={{ color: T.textSecondary, fontSize: 14 }}>Validating your reset link…</div>
              <div style={{ color: T.textMuted, fontSize: 12, marginTop: 8 }}>
                If nothing happens, your link may have expired.{' '}
                <a href="/" style={{ color: T.accent }}>Go back</a> and request a new one.
              </div>
            </div>
          ) : (
            /* Reset form */
            <form onSubmit={submit}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>New Password</label>
                <PasswordInput
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  borderColor={password ? strength.color || '#2E3344' : '#2E3344'}
                />
                {password.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, transition: 'background .3s', background: i < strength.score ? strength.color : '#2E3344' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: strength.color, marginBottom: 8 }}>{strength.label}</div>
                    <Tip ok={strength.checks.length}    label="At least 6 characters" />
                    <Tip ok={strength.checks.number}    label="Contains a number" />
                    <Tip ok={strength.checks.uppercase} label="Contains an uppercase letter" />
                    <Tip ok={strength.checks.symbol}    label="Contains a symbol (!@#$...)" />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Confirm New Password</label>
                <PasswordInput
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  borderColor={confirm ? (passwordsMatch ? GRN : RED) : '#2E3344'}
                />
                {confirm.length > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 5, color: passwordsMatch ? GRN : RED }}>
                    {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </div>

              {error && (
                <div style={{ background: RED + '22', border: `1px solid ${RED}44`, borderRadius: 8, padding: '10px 14px', color: RED, fontSize: 13, marginBottom: 14 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={!canSubmit}
                style={{ width: '100%', padding: '12px', background: T.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: canSubmit ? 1 : 0.45, transition: 'opacity .15s' }}>
                {loading ? 'Updating…' : 'Update Password →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
