// ─── security.js ─────────────────────────────────────────────────────────────
// Security utilities:
//   - Session timeout (auto sign-out after 30min idle)
//   - Rate limiter (prevent auth brute force)
//   - Input sanitiser (strip HTML/script tags)
//   - Secure storage wrapper (encrypts sensitive localStorage values)
// ─────────────────────────────────────────────────────────────────────────────
import { sb } from './supabase.js'

// ── 1. Session timeout ────────────────────────────────────────────────────────
// Auto signs out after IDLE_MS of no interaction.
const IDLE_MS    = 30 * 60 * 1000   // 30 minutes
const WARN_MS    = 2  * 60 * 1000   // warn 2 minutes before
let   idleTimer  = null
let   warnTimer  = null
let   onWarnCb   = null
let   onExpireCb = null

const resetTimers = () => {
  clearTimeout(idleTimer)
  clearTimeout(warnTimer)
  warnTimer = setTimeout(() => onWarnCb?.(), IDLE_MS - WARN_MS)
  idleTimer = setTimeout(async () => {
    onExpireCb?.()
    await sb.auth.signOut()
    window.location.reload()
  }, IDLE_MS)
}

export const startSessionWatcher = ({ onWarn, onExpire } = {}) => {
  onWarnCb   = onWarn
  onExpireCb = onExpire
  const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
  events.forEach(e => window.addEventListener(e, resetTimers, { passive: true }))
  resetTimers()
  return () => events.forEach(e => window.removeEventListener(e, resetTimers))
}

export const stopSessionWatcher = () => {
  clearTimeout(idleTimer)
  clearTimeout(warnTimer)
}

// ── 2. Auth rate limiter ──────────────────────────────────────────────────────
// Max 5 auth attempts per 10 minutes — stored in memory (resets on page refresh)
const AUTH_MAX      = 5
const AUTH_WINDOW   = 10 * 60 * 1000
const authAttempts  = []

export const checkRateLimit = () => {
  const now  = Date.now()
  // Remove attempts older than the window
  while (authAttempts.length && authAttempts[0] < now - AUTH_WINDOW) authAttempts.shift()
  if (authAttempts.length >= AUTH_MAX) {
    const waitSec = Math.ceil((authAttempts[0] + AUTH_WINDOW - now) / 1000)
    const mins    = Math.floor(waitSec / 60)
    const secs    = waitSec % 60
    throw new Error(`Too many attempts. Try again in ${mins}m ${secs}s.`)
  }
  authAttempts.push(now)
}

export const resetRateLimit = () => authAttempts.length = 0

// ── 3. Input sanitiser ────────────────────────────────────────────────────────
// Strips HTML tags and script injection from user input before storing.
export const sanitise = (str) => {
  if (str == null) return null
  return String(str)
    .trim()
    .replace(/<[^>]*>/g, '')            // strip HTML tags
    .replace(/javascript:/gi, '')       // strip JS protocol
    .replace(/on\w+\s*=/gi, '')         // strip event handlers
    .replace(/[<>"'`]/g, c => ({        // encode remaining specials
      '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;', '`': '&#96;',
    }[c]))
    .slice(0, 500)                       // max length guard
}

export const sanitiseNum = (v, min = 0, max = 9_999_999) => {
  const n = Number(v)
  if (!isFinite(n)) return min
  return Math.min(Math.max(n, min), max)
}

// ── 4. Secure localStorage wrapper ───────────────────────────────────────────
// Obfuscates sensitive settings values (not true encryption — for that
// use server-side encryption, but this prevents trivial data exposure).
const SALT = 'rt_s3cur3_2024'

const xor = (str) =>
  str.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length))).join('')

const b64e = (str) => { try { return btoa(unescape(encodeURIComponent(xor(str)))) } catch { return str } }
const b64d = (str) => { try { return xor(decodeURIComponent(escape(atob(str)))) } catch { return str } }

export const secureSet = (key, value) => {
  try { localStorage.setItem(key, b64e(JSON.stringify(value))) } catch {}
}

export const secureGet = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(b64d(raw))
  } catch { return fallback }
}

export const secureRemove = (key) => {
  try { localStorage.removeItem(key) } catch {}
}

// ── 5. Content Security Policy meta tag ──────────────────────────────────────
// Injected into <head> at runtime as a secondary CSP layer (primary is vercel.json)
export const injectCSP = () => {
  if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return
  const meta  = document.createElement('meta')
  meta['httpEquiv'] = 'Content-Security-Policy'
  meta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
  document.head.prepend(meta)
}

// ── 6. Session activity logger ────────────────────────────────────────────────
// Logs auth events to console in dev — silent in production
export const logEvent = (event, detail = '') => {
  if (import.meta.env.DEV) console.info(`[ResellTrack] ${event}`, detail)
}
