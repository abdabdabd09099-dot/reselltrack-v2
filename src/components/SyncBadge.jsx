// ─── SyncBadge.jsx ────────────────────────────────────────────────────────────
// Shows a floating badge when there are pending offline records.
// Taps to trigger manual sync.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { countPending, syncToSupabase } from '../utils/offlineQueue.js'
import { Icon } from './UI.jsx'

const CSS = `
@keyframes sb-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
@keyframes sb-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.sb-badge { animation: sb-pulse 2s ease-in-out infinite; }
.sb-spin  { animation: sb-spin 1s linear infinite; display:inline-flex; }
`

export default function SyncBadge({ userId, onSynced, T }) {
  const [count,    setCount]    = useState(0)
  const [syncing,  setSyncing]  = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [showDone, setShowDone] = useState(false)

  // Poll pending count every 15s
  useEffect(() => {
    const check = async () => {
      try { setCount(await countPending()) } catch {}
    }
    check()
    const id = setInterval(check, 15000)
    return () => clearInterval(id)
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    const handler = async () => {
      if (!userId || !navigator.onLine) return
      const pending = await countPending()
      if (pending > 0) handleSync()
    }
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [userId])

  const handleSync = async () => {
    if (syncing || !userId) return
    setSyncing(true)
    try {
      const result = await syncToSupabase(userId)
      setCount(await countPending())
      setLastSync(new Date())
      if (result.synced > 0) {
        onSynced?.(result)
        setShowDone(true)
        setTimeout(() => setShowDone(false), 3000)
      }
    } catch {}
    setSyncing(false)
  }

  // Nothing pending and no "done" message — hide badge
  if (count === 0 && !showDone) return null

  return (
    <>
      <style>{CSS}</style>
      <button
        onClick={handleSync}
        disabled={syncing}
        className={count > 0 && !syncing ? 'sb-badge' : ''}
        style={{
          position: 'fixed', bottom: 90, right: 16, zIndex: 200,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 12,
          background: showDone
            ? 'linear-gradient(135deg, #22C55E, #16A34A)'
            : 'linear-gradient(135deg, #F5A623, #E8920F)',
          border: 'none',
          color: showDone ? '#fff' : '#0D0F14',
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: showDone
            ? '0 4px 20px #22C55E44'
            : '0 4px 20px #F5A62344',
          transition: 'background .3s, box-shadow .3s',
        }}
      >
        {syncing ? (
          <>
            <span className="sb-spin">
              <Icon name="refresh" size={14} color="#0D0F14" />
            </span>
            Syncing…
          </>
        ) : showDone ? (
          <>
            <Icon name="check" size={14} color="#fff" strokeWidth={2.5} />
            Synced!
          </>
        ) : (
          <>
            <Icon name="wifi-off" size={14} color="#0D0F14" />
            {count} pending — tap to sync
          </>
        )}
      </button>
    </>
  )
}
