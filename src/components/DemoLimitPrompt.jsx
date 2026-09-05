// ─── DemoLimitPrompt.jsx ──────────────────────────────────────────────────────
// Modal shown when user hits the demo record limit (2 products or 2 sales).
// Prompts them to create a free account to continue.
// ─────────────────────────────────────────────────────────────────────────────
export default function DemoLimitPrompt({ onSignUp, onContinue, T }) {
  return (
    <div onClick={onContinue} style={{
      position: 'fixed', inset: 0, background: '#00000099',
      zIndex: 300, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20,
      backdropFilter: 'blur(4px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#161A24', border: '1px solid #F5A62355',
        borderRadius: 20, padding: 36, maxWidth: 400, width: '100%',
        textAlign: 'center', boxShadow: '0 24px 64px #00000099, 0 0 0 1px #F5A62322',
      }}>
        {/* Icon */}
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔓</div>

        {/* Heading */}
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, fontWeight: 800, color: '#F1F5F9', marginBottom: 10, letterSpacing: '-0.5px' }}>
          You've tested the app!
        </div>

        {/* Description */}
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 8 }}>
          You've used your <strong style={{ color: '#F5A623' }}>2 free demo records</strong>. Create a free account to unlock unlimited sales, products, reports, and cloud sync.
        </p>

        {/* What you get */}
        <div style={{ background: '#1E2333', border: '1px solid #252C3F', borderRadius: 12, padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
          {[
            '✅ Unlimited sales & products',
            '✅ Full reports & analytics',
            '✅ Lend & Borrow tracking',
            '✅ Cloud sync across devices',
            '✅ Works offline as a PWA',
          ].map((line, i) => (
            <div key={i} style={{ fontSize: 13, color: '#94A3B8', marginBottom: i < 4 ? 8 : 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {line}
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <button onClick={onSignUp} style={{
          width: '100%', padding: '13px', background: '#F5A623',
          color: '#0D0F14', border: 'none', borderRadius: 10,
          fontWeight: 700, fontSize: 15, cursor: 'pointer',
          fontFamily: 'inherit', marginBottom: 10,
          boxShadow: '0 4px 20px #F5A62333',
        }}>
          Create Free Account →
        </button>

        <button onClick={onContinue} style={{
          width: '100%', padding: '11px', background: 'transparent',
          color: '#475569', border: '1px solid #252C3F',
          borderRadius: 10, fontWeight: 500, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Keep browsing demo (read-only)
        </button>

        <p style={{ fontSize: 11, color: '#334155', marginTop: 12 }}>
          No credit card required · Free forever
        </p>
      </div>
    </div>
  )
}
