// ─── Loader.jsx ───────────────────────────────────────────────────────────────
// Branded loading and error screens.
// The loader uses the ResellTrack logo icon with the circular arrow animated.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'

const CSS = `
@keyframes rt-arrow-spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes rt-logo-float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50%       { transform: translateY(-10px) scale(1.03); }
}
@keyframes rt-glow-pulse {
  0%, 100% { opacity: .4; transform: scale(1);   }
  50%       { opacity: .9; transform: scale(1.15); }
}
@keyframes rt-bar-fill {
  0%   { width: 0%; }
  20%  { width: 25%; }
  50%  { width: 58%; }
  80%  { width: 80%; }
  100% { width: 95%; }
}
@keyframes rt-fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes rt-dot-bounce {
  0%, 80%, 100% { transform: scale(.6); opacity: .3; }
  40%            { transform: scale(1.2); opacity: 1; }
}
@keyframes rt-shake {
  0%,100% { transform: translateX(0) rotate(0deg); }
  20%      { transform: translateX(-6px) rotate(-3deg); }
  40%      { transform: translateX(6px) rotate(3deg); }
  60%      { transform: translateX(-4px) rotate(-2deg); }
  80%      { transform: translateX(4px) rotate(2deg); }
}
@keyframes rt-ring-expand {
  0%   { transform: scale(.8); opacity: .8; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes rt-orbit {
  0%   { transform: rotate(0deg) translateX(52px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
}

/* Rotating arrow overlay on the icon */
.rt-icon-wrap {
  position: relative;
  width: 96px; height: 96px;
  display: flex; align-items: center; justify-content: center;
  animation: rt-logo-float 3s ease-in-out infinite;
}
.rt-icon-img {
  width: 80px; height: 80px;
  border-radius: 22px;
  object-fit: cover;
  position: relative; z-index: 2;
  box-shadow: 0 8px 32px #00000066;
}
.rt-spin-ring {
  position: absolute; inset: -10px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  border-top-color: #F5A623;
  border-right-color: #F5A62388;
  animation: rt-arrow-spin 1.2s linear infinite;
  z-index: 3;
}
.rt-spin-ring-2 {
  position: absolute; inset: -18px;
  border-radius: 50%;
  border: 1.5px solid transparent;
  border-top-color: #F5A62344;
  border-left-color: #F5A62322;
  animation: rt-arrow-spin 2s linear infinite reverse;
  z-index: 1;
}
.rt-glow {
  position: absolute; inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, #F5A62322 0%, transparent 70%);
  animation: rt-glow-pulse 2s ease-in-out infinite;
  z-index: 0;
}

/* Orbiting dot */
.rt-orbit-dot {
  position: absolute; top: 50%; left: 50%;
  width: 8px; height: 8px; margin: -4px;
  border-radius: 50%;
  background: #F5A623;
  animation: rt-orbit 2s linear infinite;
  box-shadow: 0 0 8px #F5A623;
}

.rt-bar-track {
  width: 200px; height: 3px; border-radius: 3px;
  background: #1E2333; overflow: hidden;
  margin: 22px auto 0;
}
.rt-bar-fill {
  height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, #F5A62355, #F5A623);
  animation: rt-bar-fill 4s ease-out forwards;
}
.rt-dot {
  display: inline-block;
  width: 8px; height: 8px; border-radius: 50%;
  background: #F5A623; margin: 0 3px;
}
.rt-dot:nth-child(1) { animation: rt-dot-bounce 1.3s ease-in-out infinite; }
.rt-dot:nth-child(2) { animation: rt-dot-bounce 1.3s ease-in-out .18s infinite; }
.rt-dot:nth-child(3) { animation: rt-dot-bounce 1.3s ease-in-out .36s infinite; }
.rt-fade-up { animation: rt-fade-up .5s ease both; }
`

const TIPS = [
  'Syncing your sales data…',
  'Loading product catalog…',
  'Fetching your reports…',
  'Setting up your workspace…',
  'Almost ready…',
]

// ── Branded Loading Screen ────────────────────────────────────────────────────
export function LoadingScreen({ message, submessage }) {
  const [tip, setTip] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTip(t => (t + 1) % TIPS.length), 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(160deg, #0D0F14 60%, #161A24 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: 24,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>

        {/* ── Animated logo ── */}
        <div className="rt-icon-wrap" style={{ marginBottom: 32 }}>
          <div className="rt-glow" />
          <div className="rt-spin-ring-2" />
          <img
            className="rt-icon-img"
            src="/icons/icon-192.png"
            alt="ResellTrack"
          />
          <div className="rt-spin-ring" />
          <div className="rt-orbit-dot" />
        </div>

        {/* App name */}
        <div className="rt-fade-up" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.5px', marginBottom: 6 }}>
            Resell<span style={{ color: '#F5A623' }}>Track</span>
          </div>
        </div>

        {/* Rotating tip */}
        <div key={tip} className="rt-fade-up" style={{ fontSize: 13, color: '#64748B', marginBottom: 4, textAlign: 'center', minHeight: 20 }}>
          {submessage || TIPS[tip]}
        </div>

        {/* Progress bar */}
        <div className="rt-bar-track">
          <div className="rt-bar-fill" />
        </div>

        {/* Bouncing dots */}
        <div style={{ marginTop: 24 }}>
          <span className="rt-dot" />
          <span className="rt-dot" />
          <span className="rt-dot" />
        </div>
      </div>
    </>
  )
}

// ── Network Error Screen ──────────────────────────────────────────────────────
export function NetworkErrorScreen({ onRetry, message }) {
  const [retrying, setRetrying] = useState(false)
  const [dots,     setDots]     = useState('')
  const [rings,    setRings]    = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRings(true), 200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!retrying) return
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(id)
  }, [retrying])

  const handleRetry = async () => {
    setRetrying(true)
    await new Promise(r => setTimeout(r, 1800))
    setRetrying(false)
    onRetry?.()
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(160deg, #0D0F14 60%, #1a0f0f 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: 24,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>

        {/* Error icon — logo with shaking red ring */}
        <div style={{ position: 'relative', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          {rings && <>
            <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '2px solid #EF444455', animation: 'rt-ring-expand 2s ease-out infinite' }} />
            <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '2px solid #EF444433', animation: 'rt-ring-expand 2s ease-out .7s infinite' }} />
          </>}
          <div style={{ animation: 'rt-shake 0.7s ease-in-out, rt-logo-float 3s ease-in-out 0.7s infinite' }}>
            <img
              src="/icons/icon-192.png" alt="ResellTrack"
              style={{ width: 80, height: 80, borderRadius: 22, objectFit: 'cover', boxShadow: '0 0 0 3px #EF444444, 0 8px 32px #00000066' }}
            />
          </div>
          {/* Red spin ring */}
          <div style={{
            position: 'absolute', inset: -12, borderRadius: '50%',
            border: '2.5px solid transparent',
            borderTopColor: '#EF4444', borderRightColor: '#EF444466',
            animation: 'rt-arrow-spin 1.5s linear infinite',
          }} />
        </div>

        {/* Text */}
        <div className="rt-fade-up" style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, fontWeight: 800, color: '#F1F5F9', marginBottom: 10, letterSpacing: '-0.5px' }}>
            Connection lost
          </div>
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, marginBottom: 28 }}>
            {message || "ResellTrack can't reach the server. Check your internet connection and try again."}
          </div>
        </div>

        {/* Retry button */}
        <button onClick={handleRetry} disabled={retrying}
          style={{
            padding: '13px 36px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: retrying ? '#1E2333' : 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: 'inherit',
            opacity: retrying ? .7 : 1, transition: 'all .2s',
            boxShadow: retrying ? 'none' : '0 4px 20px #EF444433',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
          <span style={{ fontSize: 16, display: 'inline-block', animation: retrying ? 'rt-arrow-spin 1s linear infinite' : 'none', opacity: retrying ? 1 : 0 }}>↻</span>
          {retrying ? `Reconnecting${dots}` : '↺  Try Again'}
        </button>

        <div style={{ marginTop: 16, fontSize: 12, color: '#334155' }}>
          Your cached data is still available offline
        </div>
      </div>
    </>
  )
}

// ── Offline Banner ────────────────────────────────────────────────────────────
export function OfflineBanner() {
  const [online,   setOnline]   = useState(navigator.onLine)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    const off = () => setOnline(false)
    const on  = () => { setOnline(true); setShowBack(true); setTimeout(() => setShowBack(false), 3500) }
    window.addEventListener('offline', off)
    window.addEventListener('online',  on)
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on) }
  }, [])

  if (online && !showBack) return null

  return (
    <>
      <style>{CSS}</style>
      <div className="rt-fade-up" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
        background: online ? '#22C55E' : '#EF4444',
        color: '#fff', textAlign: 'center', padding: '9px 16px',
        fontSize: 13, fontWeight: 600, letterSpacing: 0.2,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {online
          ? <><span style={{ fontSize: 15 }}>✅</span> Back online — syncing your data</>
          : <><span style={{ fontSize: 15 }}>📡</span> You're offline — viewing cached data</>}
      </div>
    </>
  )
}
