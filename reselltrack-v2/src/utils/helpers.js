export const todayStr  = () => new Date().toISOString().slice(0, 10)
export const nowIso    = () => new Date().toISOString()

export const fmtD = iso =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export const fmtDT = iso => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export const fmtShort = iso =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export const thisWeekRange = () => {
  const d = new Date(), day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return [mon.toISOString().slice(0, 10), sun.toISOString().slice(0, 10)]
}

export const thisMonthRange = () => {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return [`${d.getFullYear()}-${m}-01`, todayStr()]
}

export const inRange = (iso, [a, b]) => {
  const d = iso.slice(0, 10)
  return d >= a && d <= b
}

export const formatCurrency = (n, sym, compact = false) => {
  const v = Number(n || 0)
  if (compact && v >= 1000) return sym + (v / 1000).toFixed(1) + 'k'
  return sym + v.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Safe settings load — validates shape before using ────────────────────────
const ALLOWED_THEMES    = ['dark','midnight','forest','sunset','light','lavender']
const ALLOWED_LANGUAGES = ['en','am','fr','ar']

export const loadSettings = (defaults) => {
  try {
    const raw = localStorage.getItem('rt_settings')
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    // Validate it's a plain object — block prototype pollution
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) return defaults
    return {
      businessName: typeof parsed.businessName === 'string' ? parsed.businessName.slice(0, 100) : defaults.businessName,
      ownerName:    typeof parsed.ownerName    === 'string' ? parsed.ownerName.slice(0, 100)    : defaults.ownerName,
      currencyCode: typeof parsed.currencyCode === 'string' ? parsed.currencyCode.slice(0, 5)   : defaults.currencyCode,
      theme:        ALLOWED_THEMES.includes(parsed.theme)       ? parsed.theme    : defaults.theme,
      language:     ALLOWED_LANGUAGES.includes(parsed.language) ? parsed.language : defaults.language,
    }
  } catch {
    return defaults
  }
}

export const saveSettings = (v) => {
  try { localStorage.setItem('rt_settings', JSON.stringify(v)) }
  catch { /* storage full or blocked — fail silently */ }
}
