// ─── dailyCash.js ─────────────────────────────────────────────────────────────
// Encapsulates all daily cash storage — no raw localStorage in page components.
// ─────────────────────────────────────────────────────────────────────────────
const KEY = 'rt_daily_cash'

export const dailyCash = {
  getAll: () => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
    catch { return [] }
  },
  getForDate: (date) => dailyCash.getAll().find(e => e.date === date) || null,
  save: (date, actual, note = '') => {
    try {
      const all     = dailyCash.getAll().filter(e => e.date !== date)
      all.push({ date, actual: parseFloat(actual), note, savedAt: new Date().toISOString() })
      localStorage.setItem(KEY, JSON.stringify(all))
      return true
    } catch { return false }
  },
  remove: (date) => {
    try {
      const all = dailyCash.getAll().filter(e => e.date !== date)
      localStorage.setItem(KEY, JSON.stringify(all))
      return true
    } catch { return false }
  },
}
