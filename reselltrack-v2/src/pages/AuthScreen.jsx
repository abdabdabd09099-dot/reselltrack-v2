// ─── AuthScreen.jsx ───────────────────────────────────────────────────────────
// Login and Register screen shown when user is not authenticated.
// Features: sign in, create account with live password strength meter,
// password confirmation, show/hide password toggle, Google OAuth button.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { signIn, signUp } from '../utils/supabase.js'
import { RED, GRN, AMB } from '../data/constants.js'
import { buildCss } from '../utils/buildCss.js'

// ── Password strength scorer ──────────────────────────────────────────────────
function getStrength(password) {
  const checks = {
    length:    password.length >= 6,
    number:    /\d/.test(password),
    symbol:    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    uppercase: /[A-Z]/.test(password),
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

// ── Google Icon ───────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

// ── Password input with show/hide toggle ──────────────────────────────────────
function PasswordInput({ value, onChange, placeholder, borderColor, id }) {
  const [visible, setVisible] = useState(false)
  const T_muted = '#4B5268'
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id} type={visible ? 'text' : 'password'}
        value={value} onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%', background: '#0F1117', color: '#F0F2F8',
          border: `1px solid ${borderColor || '#2E3344'}`,
          borderRadius: 8, padding: '10px 40px 10px 12px',
          fontSize: 14, outline: 'none', boxSizing: 'border-box',
          fontFamily: 'inherit', transition: 'border-color .2s',
        }}
      />
      <button
        type="button" onClick={() => setVisible(v => !v)}
        style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T_muted, display: 'flex', alignItems: 'center', padding: 2 }}>
        <EyeIcon visible={visible} />
      </button>
    </div>
  )
}

// ── Strength requirement tip ──────────────────────────────────────────────────
function Tip({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: ok ? GRN : '#2E3344', transition: 'background .2s' }}/>
      <span style={{ fontSize: 11, color: ok ? GRN : '#4B5268', transition: 'color .2s' }}>{label}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AuthScreen({ T }) {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const strength = getStrength(password)
  const passwordsMatch = password === confirm && confirm.length > 0
  const canRegister    = strength.score >= 2 && passwordsMatch && name && email

  const switchMode = (m) => {
    setMode(m); setError('')
    setPassword(''); setConfirm('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (mode === 'register') {
      if (!passwordsMatch) return setError('Passwords do not match.')
      if (strength.score < 2) return setError('Password is too weak.')
    }
    setError(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password)
        if (err) throw err
      } else {
        const { error: err } = await signUp(email, password)
        if (err) throw err
        else setError('CHECK_EMAIL')
      }
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  // ── Shared input style ──────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', background: '#0F1117', color: '#F0F2F8',
    border: `1px solid #2E3344`, borderRadius: 8, padding: '10px 12px',
    fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const labelStyle = { fontSize: 12, color: '#8B92A8', display: 'block', marginBottom: 5, fontWeight: 500 }

  return (
    <>
      <style>{buildCss(T)}</style>
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: T.bg, padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 400, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32 }}>

          {/* ── Logo ── */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <img src="/icons/icon-128.png" alt="ResellTrack" style={{ width: 80, height: 80, borderRadius: 20, marginBottom: 12 }} />
            <h1 className="dm" style={{ fontSize: 24, fontWeight: 700, color: T.textPrimary, margin: '0 0 4px' }}>ResellTrack</h1>
            <p style={{ color: T.textSecondary, fontSize: 13, margin: 0 }}>Your reselling business, organized.</p>
          </div>

          {/* ── Tab toggle ── */}
          <div style={{ display: 'flex', background: T.bg, borderRadius: 10, padding: 4, marginBottom: 20, border: `1px solid ${T.border}` }}>
            {[['login', 'Sign In'], ['register', 'Create Account']].map(([m, lbl]) => (
              <button key={m} type="button" onClick={() => switchMode(m)} style={{
                flex: 1, padding: '9px', borderRadius: 7, border: 'none', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                background: mode === m ? T.accent : 'transparent',
                color:      mode === m ? '#fff' : T.textSecondary,
              }}>{lbl}</button>
            ))}
          </div>

          <form onSubmit={submit}>

            {/* ── Register only: Name ── */}
            {mode === 'register' && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Your Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Juan dela Cruz" required style={inputStyle} />
              </div>
            )}

            {/* ── Email ── */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
            </div>

            {/* ── Password ── */}
            <div style={{ marginBottom: mode === 'register' ? 0 : 8 }}>
              <label style={labelStyle}>Password</label>
              <PasswordInput
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                borderColor={password && mode === 'register' ? strength.color || '#2E3344' : '#2E3344'}
              />

              {/* ── Live strength meter (register only) ── */}
              {mode === 'register' && password.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {/* Bar */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, transition: 'background .3s', background: i < strength.score ? strength.color : '#2E3344' }} />
                    ))}
                  </div>
                  {/* Label */}
                  <div style={{ fontSize: 11, fontWeight: 600, color: strength.color, marginBottom: 8 }}>
                    {strength.label}
                  </div>
                  {/* Tips */}
                  <Tip ok={strength.checks.length}    label="At least 6 characters" />
                  <Tip ok={strength.checks.number}    label="Contains a number" />
                  <Tip ok={strength.checks.uppercase} label="Contains an uppercase letter" />
                  <Tip ok={strength.checks.symbol}    label="Contains a symbol (!@#$...)" />
                </div>
              )}
            </div>

            {/* ── Confirm password (register only) ── */}
            {mode === 'register' && (
              <div style={{ marginTop: 14, marginBottom: 16 }}>
                <label style={labelStyle}>Confirm Password</label>
                <PasswordInput
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  borderColor={confirm ? (passwordsMatch ? GRN : RED) : '#2E3344'}
                />
                {confirm.length > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 5, color: passwordsMatch ? GRN : RED }}>
                    {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </div>
            )}

            {/* ── Forgot password (login only) ── */}
            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: 16 }}>
                <a href="#" style={{ fontSize: 12, color: T.accent, textDecoration: 'none' }}>Forgot password?</a>
              </div>
            )}

            {/* ── Error / success message ── */}
            {error && error !== 'CHECK_EMAIL' && (
              <div style={{ background: RED + '22', border: `1px solid ${RED}44`, borderRadius: 8, padding: '10px 14px', color: RED, fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}
            {error === 'CHECK_EMAIL' && (
              <div style={{ background: AMB + '22', border: `1px solid ${AMB}44`, borderRadius: 8, padding: '10px 14px', color: AMB, fontSize: 13, marginBottom: 16 }}>
                Check your email to confirm your account, then sign in.
              </div>
            )}

            {/* ── Submit button ── */}
            <button type="submit"
              disabled={loading || (mode === 'register' && !canRegister)}
              style={{ width: '100%', padding: '12px', background: T.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', opacity: (loading || (mode === 'register' && !canRegister)) ? 0.45 : 1, transition: 'opacity .15s' }}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>

            {/* ── Divider + Google ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <hr style={{ flex: 1, border: 'none', borderTop: `1px solid ${T.border}` }} />
              <span style={{ fontSize: 12, color: T.textMuted }}>or</span>
              <hr style={{ flex: 1, border: 'none', borderTop: `1px solid ${T.border}` }} />
            </div>
            <button type="button" style={{ width: '100%', padding: '10px', background: 'transparent', color: T.textSecondary, border: `1px solid ${T.border}`, borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
              <GoogleIcon /> Continue with Google
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
