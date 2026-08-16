import { useState, useEffect } from 'react'

// Shows a subtle banner when the user goes offline / comes back online
export default function OfflineBar({ T }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [showBack, setShowBack] = useState(false)

  useEffect(() => {
    const goOffline = () => setOnline(false)
    const goOnline  = () => {
      setOnline(true)
      setShowBack(true)
      setTimeout(() => setShowBack(false), 3000)
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online',  goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online',  goOnline)
    }
  }, [])

  if (online && !showBack) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      background: online ? '#34D399' : '#F87171',
      color: '#fff', textAlign: 'center',
      padding: '8px 16px', fontSize: 13, fontWeight: 600,
      animation: 'fadeIn .2s ease',
    }}>
      {online
        ? '✅ Back online — your data is syncing'
        : '📡 You\'re offline — you can still view your data'}
    </div>
  )
}
