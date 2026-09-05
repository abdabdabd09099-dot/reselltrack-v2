// ─── Landing.jsx ──────────────────────────────────────────────────────────────
// Public landing page shown before sign-up.
// Showcases features, has CTA to sign up or try demo.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'

const LANDING_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  .lp * { box-sizing: border-box; margin: 0; padding: 0; }
  .lp { font-family: 'Plus Jakarta Sans', sans-serif; background: #0D0F14; color: #F1F5F9; min-height: 100vh; }
  .lp-nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 32px; position: sticky; top: 0; z-index: 50; background: #0D0F1499; backdrop-filter: blur(16px); border-bottom: 1px solid #252C3F44; }
  .lp-hero { padding: 80px 32px 60px; text-align: center; max-width: 780px; margin: 0 auto; }
  .lp-display { font-family: 'DM Sans', sans-serif; font-size: clamp(36px, 6vw, 68px); font-weight: 800; line-height: 1.08; letter-spacing: -2px; color: #F1F5F9; }
  .lp-gold { color: #F5A623; }
  .lp-sub { font-size: clamp(15px, 2vw, 18px); color: #94A3B8; line-height: 1.7; max-width: 520px; margin: 20px auto 0; }
  .lp-ctas { display: flex; gap: 12px; justify-content: center; margin-top: 36px; flex-wrap: wrap; }
  .lp-btn-primary { padding: 14px 32px; background: #F5A623; color: #0D0F14; border: none; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer; font-family: inherit; transition: all .2s; box-shadow: 0 4px 24px #F5A62333; }
  .lp-btn-primary:hover { background: #F0B429; transform: translateY(-1px); box-shadow: 0 8px 32px #F5A62344; }
  .lp-btn-ghost { padding: 14px 28px; background: transparent; color: #F1F5F9; border: 1px solid #252C3F; border-radius: 10px; font-weight: 600; font-size: 15px; cursor: pointer; font-family: inherit; transition: all .2s; }
  .lp-btn-ghost:hover { border-color: #F5A623; color: #F5A623; }
  .lp-mockup { max-width: 860px; margin: 0 auto; padding: 0 24px 60px; }
  .lp-screen { background: #161A24; border: 1px solid #252C3F; border-radius: 20px; overflow: hidden; box-shadow: 0 32px 80px #00000088, 0 0 0 1px #252C3F; }
  .lp-screen-bar { background: #1E2333; padding: 12px 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #252C3F; }
  .lp-dot { width: 10px; height: 10px; border-radius: 50%; }
  .lp-screen-body { padding: 20px; }
  .lp-stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
  .lp-stat-card { background: #1E2333; border: 1px solid #252C3F; border-radius: 12px; padding: 14px; }
  .lp-stat-label { font-size: 10px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
  .lp-stat-val { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; }
  .lp-chart-bar { display: flex; align-items: flex-end; gap: 6px; height: 80px; padding: 0 4px; }
  .lp-bar { flex: 1; border-radius: 4px 4px 0 0; transition: height .3s; }
  .lp-features { max-width: 960px; margin: 0 auto; padding: 0 24px 80px; }
  .lp-features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  .lp-feature-card { background: #161A24; border: 1px solid #252C3F; border-radius: 16px; padding: 24px; transition: border-color .2s, transform .2s; }
  .lp-feature-card:hover { border-color: #F5A62355; transform: translateY(-3px); }
  .lp-feature-icon { font-size: 28px; margin-bottom: 14px; }
  .lp-feature-title { font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 700; color: #F1F5F9; margin-bottom: 8px; }
  .lp-feature-desc { font-size: 13px; color: #64748B; line-height: 1.6; }
  .lp-demo-banner { max-width: 680px; margin: 0 auto 80px; padding: 0 24px; }
  .lp-demo-card { background: linear-gradient(135deg, #1E2333, #161A24); border: 1px solid #F5A62344; border-radius: 20px; padding: 40px 36px; text-align: center; position: relative; overflow: hidden; }
  .lp-demo-glow { position: absolute; top: -60px; left: 50%; transform: translateX(-50%); width: 300px; height: 300px; background: radial-gradient(circle, #F5A62318 0%, transparent 70%); pointer-events: none; }
  .lp-divider { border: none; border-top: 1px solid #252C3F; margin: 0 24px; }
  @keyframes lp-count { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .lp-count { animation: lp-count .6s ease both; }
  @media (max-width: 600px) {
    .lp-nav { padding: 16px 20px; }
    .lp-hero { padding: 60px 20px 40px; }
    .lp-stat-row { grid-template-columns: 1fr 1fr; }
    .lp-demo-card { padding: 28px 20px; }
  }
`

// Animated counter
function Counter({ target, prefix = '', dur = 1200 }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = null
    const step = ts => {
      if (!start) start = ts
      const p = Math.min((ts - start) / dur, 1)
      setVal(Math.floor(p * p * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target])
  return <span>{prefix}{val.toLocaleString()}</span>
}

// Mini bar chart mock
const BAR_DATA = [40, 65, 30, 80, 55, 90, 72]
const BAR_COLORS = ['#F5A62366','#F5A62388','#F5A62366','#F5A623','#F5A62388','#F5A623cc','#F5A623bb']

export default function Landing({ onSignUp, onDemo }) {
  const [barAnim, setBarAnim] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setBarAnim(true), 400)
    return () => clearTimeout(t)
  }, [])

  const features = [
    { icon: '🛍️', title: 'Sales Recording',       desc: 'Record every sale instantly. Multi-item, auto stock deduction, partial payments — all in one tap.' },
    { icon: '📦', title: 'Product Catalog',        desc: 'Track your inventory, buying vs selling prices, SKUs, and get alerts when stock runs low.' },
    { icon: '📈', title: 'Smart Reports',           desc: 'Daily, weekly, monthly charts. See what sold, who bought it, when, and for how much.' },
    { icon: '🤝', title: 'Lend & Borrow',          desc: 'Unpaid sales auto-link to your lending ledger. Never forget who owes you money.' },
    { icon: '💸', title: 'Expense Tracking',       desc: 'Log restocking, shipping, packaging, and platform fees. Know your real profit.' },
    { icon: '🌍', title: '6 Themes · 14 Currencies', desc: 'Works in PHP, USD, ETB, NGN and 10 more. Switch themes from Dark to Lavender.' },
  ]

  return (
    <>
      <style>{LANDING_CSS}</style>
      <div className="lp">

        {/* ── Nav ── */}
        <nav className="lp-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icons/icon-72.png" alt="" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 16, color: '#F1F5F9' }}>
              Resell<span style={{ color: '#F5A623' }}>Track</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="lp-btn-ghost" onClick={onDemo} style={{ padding: '9px 20px', fontSize: 13 }}>
              Try Demo
            </button>
            <button className="lp-btn-primary" onClick={onSignUp} style={{ padding: '9px 20px', fontSize: 13 }}>
              Sign Up Free
            </button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="lp-hero">
          <div style={{ display: 'inline-block', background: '#F5A62318', border: '1px solid #F5A62344', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#F5A623', fontWeight: 600, marginBottom: 24, letterSpacing: .3 }}>
            ✦ Built for resellers, by resellers
          </div>
          <h1 className="lp-display">
            Your reselling business,<br />
            <span className="lp-gold">tracked & profitable.</span>
          </h1>
          <p className="lp-sub">
            Record sales, track stock, manage debts, and see your real profit — all in one app. Works offline. Installs on your phone.
          </p>
          <div className="lp-ctas">
            <button className="lp-btn-primary" onClick={onSignUp}>
              Start for Free →
            </button>
            <button className="lp-btn-ghost" onClick={onDemo}>
              👀 Try the Demo First
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 16 }}>No credit card. No commitment. 2 free records to test.</p>
        </section>

        {/* ── App Mockup ── */}
        <div className="lp-mockup">
          <div className="lp-screen">
            <div className="lp-screen-bar">
              <div className="lp-dot" style={{ background: '#EF4444' }} />
              <div className="lp-dot" style={{ background: '#F5A623' }} />
              <div className="lp-dot" style={{ background: '#22C55E' }} />
              <span style={{ fontSize: 12, color: '#475569', marginLeft: 8, fontFamily: 'JetBrains Mono, monospace' }}>reselltrack.app — Dashboard</span>
            </div>
            <div className="lp-screen-body">
              {/* Stat row */}
              <div className="lp-stat-row">
                {[
                  { label: "Today's Revenue", val: 12480, color: '#22C55E', prefix: '₱' },
                  { label: "Today's Expenses", val: 3200,  color: '#EF4444', prefix: '₱' },
                  { label: "Net Profit",       val: 9280,  color: '#F5A623', prefix: '₱' },
                ].map((s, i) => (
                  <div key={i} className="lp-stat-card">
                    <div className="lp-stat-label">{s.label}</div>
                    <div className="lp-stat-val lp-count" style={{ color: s.color }}>
                      <Counter target={s.val} prefix={s.prefix} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Mini chart */}
              <div style={{ background: '#1E2333', border: '1px solid #252C3F', borderRadius: 12, padding: '14px 14px 10px' }}>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, marginBottom: 10 }}>Revenue — Last 7 Days</div>
                <div className="lp-chart-bar">
                  {BAR_DATA.map((h, i) => (
                    <div key={i} className="lp-bar"
                      style={{ height: barAnim ? `${h}%` : '0%', background: BAR_COLORS[i], transition: `height ${0.4 + i * 0.08}s cubic-bezier(.34,1.56,.64,1)` }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                    <span key={d} style={{ fontSize: 9, color: '#475569', flex: 1, textAlign: 'center' }}>{d}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Features ── */}
        <section className="lp-features">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 30, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-1px', marginBottom: 10 }}>
              Everything a reseller needs
            </h2>
            <p style={{ fontSize: 14, color: '#64748B' }}>No spreadsheets. No manual counting. Just open the app and go.</p>
          </div>
          <div className="lp-features-grid">
            {features.map((f, i) => (
              <div key={i} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Demo CTA banner ── */}
        <div className="lp-demo-banner">
          <div className="lp-demo-card">
            <div className="lp-demo-glow" />
            <div style={{ fontSize: 36, marginBottom: 16 }}>🚀</div>
            <h3 style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, fontWeight: 800, color: '#F1F5F9', marginBottom: 12, letterSpacing: '-0.5px' }}>
              Try it before you commit
            </h3>
            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
              Enter Demo Mode — record up to 2 sales and 2 products right now, no account needed. When you're ready, create a free account and your data moves with you.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="lp-btn-primary" onClick={onDemo}>
                👀 Enter Demo Mode
              </button>
              <button className="lp-btn-ghost" onClick={onSignUp}>
                Create Free Account
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#334155', marginTop: 16 }}>Demo data lives in your browser. Nothing is saved to a server.</p>
          </div>
        </div>

        {/* ── Footer ── */}
        <hr className="lp-divider" />
        <div style={{ textAlign: 'center', padding: '24px', fontSize: 12, color: '#334155' }}>
          ResellTrack © {new Date().getFullYear()} · Built for resellers worldwide
        </div>
      </div>
    </>
  )
}
