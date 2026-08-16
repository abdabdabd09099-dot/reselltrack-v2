import { useState, useEffect } from 'react'

// ─── PWA Install Prompt ───────────────────────────────────────────────────────
// Shows a native-feeling install banner when the browser fires
// the beforeinstallprompt event (Chrome/Android).
// On iOS it shows manual instructions since iOS doesn't support the event.

export default function InstallPrompt({ T }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow]                     = useState(false)
  const [isIOS, setIsIOS]                   = useState(false)
  const [isInstalled, setIsInstalled]       = useState(false)

  useEffect(() => {
    // Already installed as PWA?
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    // Android / Chrome — capture install prompt
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS — show manual tip after 3 seconds if not already installed
    if (ios) {
      const t = setTimeout(() => {
        const dismissed = localStorage.getItem('pwa_ios_dismissed')
        if (!dismissed) setShow(true)
      }, 3000)
      return () => clearTimeout(t)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setDeferredPrompt(null)
    setShow(false)
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('pwa_ios_dismissed', '1')
  }

  if (!show || isInstalled) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 12, right: 12, zIndex: 300,
      background: T.surface, border: `1px solid ${T.accent}66`,
      borderRadius: 16, padding: '16px 18px',
      boxShadow: `0 8px 32px #00000055, 0 0 0 1px ${T.accent}22`,
      display: 'flex', alignItems: 'flex-start', gap: 14,
      animation: 'fadeIn .3s ease',
    }}>
      {/* Icon */}
      <img src="/icons/icon-72.png" alt="ResellTrack" style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 3 }}>
          Install ResellTrack
        </div>

        {isIOS ? (
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
            Tap <strong style={{ color: T.textPrimary }}>Share</strong> then{' '}
            <strong style={{ color: T.textPrimary }}>"Add to Home Screen"</strong>{' '}
            to install the app on your phone.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 10 }}>
            Add to your home screen for the best experience — works offline too.
          </div>
        )}

        {!isIOS && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={handleInstall}
              style={{
                background: T.accent, color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 16px', fontWeight: 700,
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Install App
            </button>
            <button
              onClick={dismiss}
              style={{
                background: 'transparent', color: T.textSecondary,
                border: `1px solid ${T.border}`, borderRadius: 8,
                padding: '8px 14px', fontSize: 13, cursor: 'pointer',
              }}
            >
              Not now
            </button>
          </div>
        )}
      </div>

      {/* Dismiss */}
      <button onClick={dismiss} style={{
        background: 'none', border: 'none', color: T.textMuted,
        fontSize: 20, lineHeight: 1, cursor: 'pointer', flexShrink: 0, padding: 2,
      }}>×</button>
    </div>
  )
}
