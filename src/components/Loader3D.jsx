// ─── Loader3D.jsx ─────────────────────────────────────────────────────────────
// 3D animated loading screen — shown during auth check, data fetch, network error.
// Pure CSS 3D — no libraries needed.
// ─────────────────────────────────────────────────────────────────────────────

const LOADER_CSS = `
  @keyframes rt-spin {
    0%   { transform: rotateX(0deg)   rotateY(0deg); }
    50%  { transform: rotateX(180deg) rotateY(90deg); }
    100% { transform: rotateX(360deg) rotateY(360deg); }
  }
  @keyframes rt-pulse {
    0%, 100% { opacity: .3; transform: scaleX(1); }
    50%       { opacity: .7; transform: scaleX(.6); }
  }
  @keyframes rt-fade-up {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes rt-dot {
    0%, 80%, 100% { transform: scale(0); opacity: .2; }
    40%            { transform: scale(1); opacity: 1; }
  }
  @keyframes rt-bar {
    0%, 100% { height: 8px; }
    50%       { height: 28px; }
  }
  @keyframes rt-orbit {
    from { transform: rotateZ(0deg) translateX(36px) rotateZ(0deg); }
    to   { transform: rotateZ(360deg) translateX(36px) rotateZ(-360deg); }
  }
  @keyframes rt-orbit2 {
    from { transform: rotateZ(120deg) translateX(36px) rotateZ(-120deg); }
    to   { transform: rotateZ(480deg) translateX(36px) rotateZ(-480deg); }
  }
  @keyframes rt-orbit3 {
    from { transform: rotateZ(240deg) translateX(36px) rotateZ(-240deg); }
    to   { transform: rotateZ(600deg) translateX(36px) rotateZ(-600deg); }
  }
  @keyframes rt-shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-8px); }
    40%       { transform: translateX(8px); }
    60%       { transform: translateX(-5px); }
    80%       { transform: translateX(5px); }
  }
  @keyframes rt-glow {
    0%, 100% { box-shadow: 0 0 20px #F5A62344; }
    50%       { box-shadow: 0 0 40px #F5A62388, 0 0 80px #F5A62322; }
  }
  .rt-scene {
    width: 72px; height: 72px;
    perspective: 300px;
    margin: 0 auto;
  }
  .rt-cube {
    width: 100%; height: 100%;
    position: relative;
    transform-style: preserve-3d;
    animation: rt-spin 3s cubic-bezier(.45,.05,.55,.95) infinite;
  }
  .rt-face {
    position: absolute; width: 72px; height: 72px;
    border: 2px solid;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px;
    backface-visibility: hidden;
  }
  .rt-front  { transform: translateZ(36px);  border-color: #F5A62388; background: #F5A62311; }
  .rt-back   { transform: rotateY(180deg) translateZ(36px); border-color: #22C55E88; background: #22C55E11; }
  .rt-left   { transform: rotateY(-90deg) translateZ(36px); border-color: #38BDF888; background: #38BDF811; }
  .rt-right  { transform: rotateY(90deg)  translateZ(36px); border-color: #F5A62366; background: #F5A62308; }
  .rt-top    { transform: rotateX(90deg)  translateZ(36px); border-color: #22C55E66; background: #22C55E08; }
  .rt-bottom { transform: rotateX(-90deg) translateZ(36px); border-color: #38BDF866; background: #38BDF808; }
  .rt-shadow {
    width: 60px; height: 10px; background: #F5A62322;
    border-radius: 50%; margin: 16px auto 0;
    animation: rt-pulse 3s ease-in-out infinite;
    filter: blur(4px);
  }
  .rt-dots span {
    display: inline-block; width: 8px; height: 8px;
    background: #F5A623; border-radius: 50%; margin: 0 3px;
  }
  .rt-dots span:nth-child(1) { animation: rt-dot 1.4s ease-in-out infinite; }
  .rt-dots span:nth-child(2) { animation: rt-dot 1.4s ease-in-out .2s infinite; }
  .rt-dots span:nth-child(3) { animation: rt-dot 1.4s ease-in-out .4s infinite; }
  .rt-bars {
    display: flex; align-items: flex-end; gap: 4px; height: 36px;
  }
  .rt-bars span {
    width: 5px; border-radius: 3px; background: #F5A623;
    animation: rt-bar 1s ease-in-out infinite;
  }
  .rt-bars span:nth-child(2) { animation-delay: .15s; background: #22C55E; }
  .rt-bars span:nth-child(3) { animation-delay: .3s;  background: #38BDF8; }
  .rt-bars span:nth-child(4) { animation-delay: .45s; background: #F5A623; }
  .rt-bars span:nth-child(5) { animation-delay: .6s;  background: #22C55E; }
  .rt-orbit-wrap {
    width: 90px; height: 90px; position: relative; margin: 0 auto;
  }
  .rt-core {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 24px; height: 24px; border-radius: 50%;
    background: #F5A623;
    animation: rt-glow 2s ease-in-out infinite;
  }
  .rt-orb {
    position: absolute; top: 50%; left: 50%;
    width: 10px; height: 10px; border-radius: 50%; margin: -5px;
  }
  .rt-orb1 { background: #22C55E; animation: rt-orbit  2s linear infinite; }
  .rt-orb2 { background: #38BDF8; animation: rt-orbit2 2s linear infinite; }
  .rt-orb3 { background: #F5A623; animation: rt-orbit3 2s linear infinite; opacity:.7; }
  .rt-error-icon {
    font-size: 52px;
    animation: rt-shake 0.6s ease-in-out 1;
  }
`

export default function Loader3D({ type = 'loading', message, onRetry }) {
  // type: 'loading' | 'data' | 'network-error' | 'offline'

  const isError = type === 'network-error' || type === 'offline'

  const accent  = '#F5A623'
  const green   = '#22C55E'
  const red     = '#EF4444'
  const bg      = '#0D0F14'
  const surface = '#161A24'
  const text    = '#F1F5F9'
  const muted   = '#64748B'

  return (
    <>
      <style>{LOADER_CSS}</style>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh',
        background: bg, gap: 0, padding: 24,
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}>

        {/* ── Animated visual ── */}
        <div style={{ marginBottom: 32, animation: 'rt-fade-up .4s ease both' }}>
          {type === 'loading' && (
            <>
              <div className="rt-scene">
                <div className="rt-cube">
                  <div className="rt-face rt-front">📈</div>
                  <div className="rt-face rt-back">💰</div>
                  <div className="rt-face rt-left">📦</div>
                  <div className="rt-face rt-right">🛍️</div>
                  <div className="rt-face rt-top">📊</div>
                  <div className="rt-face rt-bottom">💸</div>
                </div>
              </div>
              <div className="rt-shadow" />
            </>
          )}

          {type === 'data' && (
            <div className="rt-orbit-wrap">
              <div className="rt-core" />
              <div className="rt-orb rt-orb1" />
              <div className="rt-orb rt-orb2" />
              <div className="rt-orb rt-orb3" />
            </div>
          )}

          {type === 'network-error' && (
            <div style={{ textAlign: 'center' }}>
              <div className="rt-error-icon">📡</div>
              <div style={{ width: 60, height: 3, background: red, borderRadius: 2, margin: '12px auto 0', opacity: .6 }} />
            </div>
          )}

          {type === 'offline' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56 }}>🔌</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ width: 4, height: i*8, borderRadius: 2, background: i <= 1 ? red : muted + '44' }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── App logo + name ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, animation: 'rt-fade-up .4s .1s ease both', opacity: 0, animationFillMode: 'forwards' }}>
          <img src="/icons/icon-72.png" alt="" style={{ width: 36, height: 36, borderRadius: 9 }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: text, letterSpacing: -.3 }}>ResellTrack</span>
        </div>

        {/* ── Message ── */}
        <div style={{
          animation: 'rt-fade-up .4s .2s ease both', opacity: 0, animationFillMode: 'forwards',
          textAlign: 'center', maxWidth: 280,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: isError ? red : text, marginBottom: 6 }}>
            {message || (type === 'loading' ? 'Starting up…' : type === 'data' ? 'Fetching your data…' : type === 'network-error' ? 'Connection failed' : 'You\'re offline')}
          </div>
          <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
            {type === 'loading'        && 'Getting things ready for you'}
            {type === 'data'           && 'Loading your sales, products and reports'}
            {type === 'network-error'  && 'Check your internet connection and try again'}
            {type === 'offline'        && 'You can still view your recent data'}
          </div>
        </div>

        {/* ── Animated dots (loading states) ── */}
        {!isError && (
          <div className="rt-dots" style={{ marginTop: 28, animation: 'rt-fade-up .4s .3s ease both', opacity: 0, animationFillMode: 'forwards' }}>
            <span /><span /><span />
          </div>
        )}

        {/* ── Audio bars ── (data loading) */}
        {type === 'data' && (
          <div className="rt-bars" style={{ marginTop: 24, animation: 'rt-fade-up .4s .35s ease both', opacity: 0, animationFillMode: 'forwards' }}>
            <span /><span /><span /><span /><span />
          </div>
        )}

        {/* ── Retry button (errors) ── */}
        {isError && onRetry && (
          <button onClick={onRetry} style={{
            marginTop: 28, padding: '11px 28px',
            background: accent, color: '#000', border: 'none',
            borderRadius: 10, fontWeight: 700, fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit',
            animation: 'rt-fade-up .4s .3s ease both', opacity: 0, animationFillMode: 'forwards',
          }}>
            Try again
          </button>
        )}

        {/* ── Offline: still usable note ── */}
        {type === 'offline' && (
          <div style={{
            marginTop: 20, padding: '10px 18px',
            background: surface, border: `1px solid #252C3F`,
            borderRadius: 10, fontSize: 12, color: muted,
            animation: 'rt-fade-up .4s .35s ease both', opacity: 0, animationFillMode: 'forwards',
          }}>
            💡 Your last data is still available to view
          </div>
        )}
      </div>
    </>
  )
}
