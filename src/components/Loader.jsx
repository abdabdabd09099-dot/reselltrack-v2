// ─── Loader.jsx ───────────────────────────────────────────────────────────────
// 3D animated screens for: loading, network error, offline states.
// Uses CSS 3D transforms — no external libraries needed.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'

const LOADER_CSS = `
@keyframes rt-spin {
  0%   { transform: rotateX(0deg)   rotateY(0deg); }
  50%  { transform: rotateX(180deg) rotateY(90deg); }
  100% { transform: rotateX(360deg) rotateY(360deg); }
}
@keyframes rt-float {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-14px); }
}
@keyframes rt-pulse-ring {
  0%   { transform: scale(0.8); opacity: .8; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes rt-dots {
  0%,80%,100% { transform: scale(0.6); opacity:.3; }
  40%          { transform: scale(1.1); opacity:1; }
}
@keyframes rt-shake {
  0%,100% { transform: translateX(0); }
  20%      { transform: translateX(-8px); }
  40%      { transform: translateX(8px); }
  60%      { transform: translateX(-5px); }
  80%      { transform: translateX(5px); }
}
@keyframes rt-bar {
  0%   { width: 0%; }
  30%  { width: 45%; }
  60%  { width: 72%; }
  85%  { width: 88%; }
  100% { width: 95%; }
}
@keyframes rt-fade-up {
  from { opacity:0; transform: translateY(16px); }
  to   { opacity:1; transform: translateY(0); }
}
.rt-cube-scene {
  width: 72px; height: 72px;
  perspective: 200px;
  margin: 0 auto 28px;
}
.rt-cube {
  width: 72px; height: 72px;
  position: relative;
  transform-style: preserve-3d;
  animation: rt-spin 2.4s ease-in-out infinite, rt-float 3s ease-in-out infinite;
}
.rt-cube-face {
  position: absolute;
  width: 72px; height: 72px;
  border: 2px solid;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px;
  font-size: 26px;
  font-weight: 700;
  backdrop-filter: blur(2px);
}
.rt-face-front  { transform: rotateY(  0deg) translateZ(36px); }
.rt-face-back   { transform: rotateY(180deg) translateZ(36px); }
.rt-face-right  { transform: rotateY( 90deg) translateZ(36px); }
.rt-face-left   { transform: rotateY(-90deg) translateZ(36px); }
.rt-face-top    { transform: rotateX( 90deg) translateZ(36px); }
.rt-face-bottom { transform: rotateX(-90deg) translateZ(36px); }
.rt-dot {
  width: 10px; height: 10px; border-radius: 50%;
  display: inline-block; margin: 0 4px;
}
.rt-dot:nth-child(1) { animation: rt-dots 1.2s ease-in-out infinite; }
.rt-dot:nth-child(2) { animation: rt-dots 1.2s ease-in-out .2s infinite; }
.rt-dot:nth-child(3) { animation: rt-dots 1.2s ease-in-out .4s infinite; }
.rt-bar-track {
  width: 220px; height: 4px; border-radius: 4px;
  margin: 20px auto 0; overflow: hidden;
}
.rt-bar-fill {
  height: 100%; border-radius: 4px;
  animation: rt-bar 3.5s ease-out forwards;
}
.rt-pulse-ring {
  position: absolute; inset: -16px;
  border-radius: 50%; border: 2px solid;
  animation: rt-pulse-ring 1.8s ease-out infinite;
}
.rt-error-icon {
  animation: rt-shake 0.6s ease-in-out, rt-float 3s ease-in-out 0.6s infinite;
}
.rt-fade-up { animation: rt-fade-up 0.5s ease both; }
`

// ── 3D Cube Loading Screen ─────────────────────────────────────────────────────
export function LoadingScreen({ message = 'Loading ResellTrack…', submessage, accent = '#F5A623' }) {
  const [tip, setTip] = useState(0)
  const tips = [
    'Fetching your sales data…',
    'Loading your product catalog…',
    'Syncing with the cloud…',
    'Almost ready…',
  ]
  useEffect(() => {
    const id = setInterval(() => setTip(t => (t + 1) % tips.length), 2200)
    return () => clearInterval(id)
  }, [])

  const faceStyle = {
    borderColor: accent + '55',
    background: `linear-gradient(135deg, #161A2488, #1E233388)`,
    color: accent,
  }

  return (
    <>
      <style>{LOADER_CSS}</style>
      <div style={{
        position: 'fixed', inset: 0, background: '#0D0F14',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: 24,
      }}>
        {/* 3D spinning cube */}
        <div className="rt-cube-scene">
          <div className="rt-cube">
            <div className="rt-cube-face rt-face-front"  style={faceStyle}>₱</div>
            <div className="rt-cube-face rt-face-back"   style={faceStyle}>📦</div>
            <div className="rt-cube-face rt-face-right"  style={faceStyle}>📈</div>
            <div className="rt-cube-face rt-face-left"   style={faceStyle}>🛍️</div>
            <div className="rt-cube-face rt-face-top"    style={faceStyle}>💰</div>
            <div className="rt-cube-face rt-face-bottom" style={faceStyle}>✅</div>
          </div>
        </div>

        {/* App name */}
        <div className="rt-fade-up" style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.5px' }}>
            Resell<span style={{ color: accent }}>Track</span>
          </div>
        </div>

        {/* Rotating tip */}
        <div key={tip} className="rt-fade-up" style={{ fontSize: 13, color: '#64748B', marginBottom: 4, textAlign: 'center' }}>
          {submessage || tips[tip]}
        </div>

        {/* Progress bar */}
        <div className="rt-bar-track" style={{ background: '#1E2333' }}>
          <div className="rt-bar-fill" style={{ background: `linear-gradient(90deg, ${accent}88, ${accent})` }} />
        </div>

        {/* Bouncing dots */}
        <div style={{ marginTop: 28 }}>
          <span className="rt-dot" style={{ background: accent }} />
          <span className="rt-dot" style={{ background: accent + 'aa' }} />
          <span className="rt-dot" style={{ background: accent + '55' }} />
        </div>
      </div>
    </>
  )
}

// ── Network Error Screen ───────────────────────────────────────────────────────
export function NetworkErrorScreen({ onRetry, message }) {
  const [retrying, setRetrying] = useState(false)
  const [dots, setDots]         = useState('')

  useEffect(() => {
    if (!retrying) return
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(id)
  }, [retrying])

  const handleRetry = async () => {
    setRetrying(true)
    setDots('.')
    await new Promise(r => setTimeout(r, 1500))
    setRetrying(false)
    onRetry?.()
  }

  return (
    <>
      <style>{LOADER_CSS}</style>
      <div style={{
        position: 'fixed', inset: 0, background: '#0D0F14',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: 24,
      }}>
        {/* Pulsing error icon */}
        <div style={{ position: 'relative', width: 88, height: 88, marginBottom: 32 }}>
          <div className="rt-pulse-ring" style={{ borderColor: '#EF444455' }} />
          <div className="rt-pulse-ring" style={{ borderColor: '#EF444433', animationDelay: '.6s' }} />
          <div className="rt-error-icon" style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1E2333, #161A24)',
            border: '2px solid #EF444455',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, position: 'relative',
          }}>
            📡
          </div>
        </div>

        {/* Text */}
        <div className="rt-fade-up" style={{ textAlign: 'center', maxWidth: 300 }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 20, fontWeight: 700, color: '#F1F5F9', marginBottom: 10 }}>
            Connection lost
          </div>
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 28 }}>
            {message || "Can't reach Supabase. Check your internet connection and try again."}
          </div>
        </div>

        {/* Retry button */}
        <button onClick={handleRetry} disabled={retrying}
          style={{
            padding: '12px 32px', borderRadius: 10, border: 'none',
            background: retrying ? '#1E2333' : 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: '#fff', fontWeight: 700, fontSize: 15,
            cursor: retrying ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'all .2s',
            boxShadow: retrying ? 'none' : '0 4px 24px #EF444433',
          }}>
          {retrying ? `Reconnecting${dots}` : '↺ Try Again'}
        </button>

        {/* Offline hint */}
        <div style={{ marginTop: 20, fontSize: 12, color: '#475569', textAlign: 'center' }}>
          Your cached data is still available offline
        </div>
      </div>
    </>
  )
}

// ── Offline Banner ─────────────────────────────────────────────────────────────
export function OfflineBanner({ accent = '#F5A623' }) {
  const [online, setOnline]   = useState(navigator.onLine)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    const off = () => setOnline(false)
    const on  = () => { setOnline(true); setShowBack(true); setTimeout(() => setShowBack(false), 3500) }
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on) }
  }, [])

  if (online && !showBack) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      background: online ? '#22C55E' : '#EF4444',
      color: '#fff', textAlign: 'center', padding: '8px 16px',
      fontSize: 13, fontWeight: 600, letterSpacing: 0.2,
      animation: 'rt-fade-up .3s ease',
    }}>
      {online ? '✅ Back online — syncing your data' : '📡 You\'re offline — viewing cached data'}
    </div>
  )
}
