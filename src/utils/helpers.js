// ─── helpers.js ───────────────────────────────────────────────────────────────
// Pure utility functions — no side-effects, fully testable.
// All date helpers guard against null/invalid input.
// ─────────────────────────────────────────────────────────────────────────────

// ── Date strings ──────────────────────────────────────────────────────────────
export const todayStr = () => new Date().toISOString().slice(0, 10)
export const nowIso   = () => new Date().toISOString()

// ── Safe date parser — returns null instead of Invalid Date ───────────────────
const toDate = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmtD = (iso) => {
  const d = toDate(iso)
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

export const fmtDT = (iso) => {
  const d = toDate(iso)
  if (!d) return '—'
  return (
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

export const fmtShort = (iso) => {
  const d = toDate(iso)
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'
}

// ── Week / month ranges ───────────────────────────────────────────────────────
export const thisWeekRange = () => {
  const d   = new Date()
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)]
}

export const thisMonthRange = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth()
  const last = new Date(y, m + 1, 0).getDate()
  const pad  = (n) => String(n).padStart(2, '0')
  return [`${y}-${pad(m + 1)}-01`, `${y}-${pad(m + 1)}-${pad(last)}`]
}

// ── Date range check — null-safe ──────────────────────────────────────────────
export const inRange = (iso, [start, end]) => {
  if (!iso || !start || !end) return false
  const d = (typeof iso === 'string' ? iso : new Date(iso).toISOString()).slice(0, 10)
  return d >= start && d <= end
}

// ── Settings persistence ──────────────────────────────────────────────────────
const SETTINGS_KEY = 'rt_settings'
export const saveSettings = (s) => {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch {}
}
export const loadSettings = () => {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') } catch { return null }
}

// ── Number formatting ─────────────────────────────────────────────────────────
/** Formats a number as currency. Pass abbreviated=true for chart axis labels. */
export const formatCurrency = (n, symbol = '₱', abbreviated = false) => {
  const num = Number(n) || 0
  if (abbreviated) {
    if (Math.abs(num) >= 1_000_000) return symbol + (num / 1_000_000).toFixed(1) + 'M'
    if (Math.abs(num) >= 1_000)     return symbol + (num / 1_000).toFixed(1) + 'K'
    return symbol + num.toFixed(0)
  }
  return symbol + num.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
