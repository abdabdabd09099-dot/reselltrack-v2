// ─── toast.js ─────────────────────────────────────────────────────────────────
// Lightweight toast notification system — replaces all alert() / confirm()
// calls with a non-blocking, accessible, theme-aware notification layer.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'

let _dispatch = null

// ── Public API ─────────────────────────────────────────────────────────────────
export const toast = {
  success: (msg, ms = 3500) => _dispatch?.({ type: 'success', msg, ms }),
  error:   (msg, ms = 5000) => _dispatch?.({ type: 'error',   msg, ms }),
  warn:    (msg, ms = 4000) => _dispatch?.({ type: 'warn',    msg, ms }),
  info:    (msg, ms = 3500) => _dispatch?.({ type: 'info',    msg, ms }),
  /** Returns a Promise<boolean> — replaces confirm() */
  confirm: (msg) => new Promise(resolve => {
    _dispatch?.({ type: 'confirm', msg, resolve })
  }),
}

// ── ToastProvider — mount once at app root ─────────────────────────────────────
export function ToastProvider({ T }) {
  const [items,   setItems]   = useState([])
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    _dispatch = ({ type, msg, ms, resolve }) => {
      if (type === 'confirm') {
        setConfirm({ msg, resolve })
        return
      }
      const id = Date.now() + Math.random()
      setItems(p => [...p, { id, type, msg }])
      setTimeout(() => setItems(p => p.filter(t => t.id !== id)), ms)
    }
    return () => { _dispatch = null }
  }, [])

  const COLORS = {
    success: { bg: '#22C55E22', border: '#22C55E66', icon: '✅', text: '#22C55E' },
    error:   { bg: '#F8717122', border: '#F8717166', icon: '❌', text: '#F87171' },
    warn:    { bg: '#FBBF2422', border: '#FBBF2466', icon: '⚠️', text: '#FBBF24' },
    info:    { bg: '#60A5FA22', border: '#60A5FA66', icon: 'ℹ️', text: '#60A5FA' },
  }

  return (
    <>
      {/* Toast stack */}
      <div style={{ position: 'fixed', top: 60, right: 16, zIndex: 9000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340, pointerEvents: 'none' }}>
        {items.map(t => {
          const c = COLORS[t.type]
          return (
            <div key={t.id} style={{ background: T?.surface || '#1A1D27', border: `1px solid ${c.border}`, borderLeft: `4px solid ${c.text}`, borderRadius: 10, padding: '11px 14px', fontSize: 13, color: T?.textPrimary || '#F0F2F8', boxShadow: '0 4px 20px #00000044', display: 'flex', alignItems: 'flex-start', gap: 10, animation: 'fadeIn .2s ease', pointerEvents: 'auto' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
              <span style={{ lineHeight: 1.5 }}>{t.msg}</span>
            </div>
          )
        })}
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <div onClick={() => { confirm.resolve(false); setConfirm(null) }}
          style={{ position: 'fixed', inset: 0, background: '#000000bb', zIndex: 9001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: T?.surface || '#1A1D27', border: `1px solid ${T?.border || '#2E3344'}`, borderRadius: 16, padding: 28, maxWidth: 360, width: '100%', boxShadow: '0 24px 64px #00000088' }}>
            <div style={{ fontSize: 22, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
            <p style={{ fontSize: 14, color: T?.textPrimary || '#F0F2F8', lineHeight: 1.7, marginBottom: 20, textAlign: 'center' }}>{confirm.msg}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { confirm.resolve(false); setConfirm(null) }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${T?.border || '#2E3344'}`, background: 'transparent', color: T?.textSecondary || '#8B92A8', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={() => { confirm.resolve(true); setConfirm(null) }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#F87171', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
