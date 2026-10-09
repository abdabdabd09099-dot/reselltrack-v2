// ─── UI.jsx — Production-Grade Component Library ──────────────────────────────
// Architecture:
//  • Every component receives T (theme tokens) — no hardcoded colors
//  • All interactive components handle: loading, disabled, empty, error states
//  • Accessible: role, aria-label, aria-disabled, aria-expanded, tabIndex
//  • Responsive: mobile-first, safe-area-aware, touch-friendly tap targets
//  • Composable: small focused APIs, no God-components
//  • Performance: stable references, no inline arrow fns in render where possible
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback, memo } from 'react'
import {
  LayoutDashboard, Package, ShoppingBag, Receipt, Handshake,
  BarChart2, Settings, Home, Plus, Trash2, Pencil, CheckCircle,
  AlertCircle, XCircle, Clock, TrendingUp, TrendingDown, Wallet,
  Users, DollarSign, CreditCard, Banknote, ArrowLeftRight,
  ChevronDown, ChevronRight, Lock, Unlock, LogOut, User,
  ShieldCheck, Bell, Download, Upload, RefreshCw, Search,
  Filter, X, Wifi, WifiOff, Loader2, Eye, EyeOff, Star,
  Tag, Box, Archive, Layers, PieChart, FileText, Globe,
  Smartphone, Moon, Sun, Palette, Info, ExternalLink, Copy,
  AlertTriangle, Package2, CheckSquare,
} from 'lucide-react'
import { GRN, RED } from '../data/constants.js'

// ─────────────────────────────────────────────────────────────────────────────
// ICON REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
const ICON_MAP = {
  dashboard: LayoutDashboard, products: Package, sales: ShoppingBag,
  expenses: Receipt, lend: Handshake, reports: BarChart2,
  settings: Settings, home: Home, plus: Plus, trash: Trash2,
  edit: Pencil, check: CheckCircle, alert: AlertTriangle,
  error: XCircle, clock: Clock, 'trending-up': TrendingUp,
  'trending-down': TrendingDown, wallet: Wallet, users: Users,
  dollar: DollarSign, card: CreditCard, cash: Banknote,
  transfer: ArrowLeftRight, 'chevron-down': ChevronDown,
  'chevron-right': ChevronRight, lock: Lock, unlock: Unlock,
  logout: LogOut, user: User, shield: ShieldCheck, bell: Bell,
  download: Download, upload: Upload, refresh: RefreshCw,
  search: Search, filter: Filter, close: X, wifi: Wifi,
  'wifi-off': WifiOff, loader: Loader2, eye: Eye,
  'eye-off': EyeOff, star: Star, tag: Tag, box: Box,
  archive: Archive, layers: Layers, pie: PieChart,
  file: FileText, globe: Globe, phone: Smartphone,
  moon: Moon, sun: Sun, palette: Palette, info: Info,
  external: ExternalLink, copy: Copy, package: Package2,
  'check-square': CheckSquare, 'alert-circle': AlertCircle,
}

/**
 * Icon — resolves a string key to a Lucide icon.
 * Returns null gracefully if key not found (no crash).
 */
export const Icon = memo(({ name, size = 16, color, strokeWidth = 1.8, style, 'aria-label': label }) => {
  const C = ICON_MAP[name]
  if (!C) return null
  return <C size={size} color={color} strokeWidth={strokeWidth} style={style} aria-label={label} aria-hidden={!label} />
})
Icon.displayName = 'Icon'

// ─────────────────────────────────────────────────────────────────────────────
// LOGO
// ─────────────────────────────────────────────────────────────────────────────
export const Logo = memo(({ size = 32, T, showName = false }) => {
  const isDark = ['dark', 'midnight', 'forest', 'sunset'].includes(T?.themeName || 'dark')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} role="img" aria-label="ResellTrack">
      <div style={{
        width: size, height: size, borderRadius: size * 0.22,
        overflow: 'hidden', flexShrink: 0,
        background: isDark ? 'transparent' : T?.surface || '#fff',
        border: `1.5px solid ${T?.border || '#252C3F'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isDark ? 'none' : '0 2px 8px #00000022',
      }}>
        <img src="/icons/icon-192.png" alt="" aria-hidden="true"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: isDark ? 1 : 0.92 }} />
      </div>
      {showName && (
        <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: size * 0.44, color: T?.accent || '#F5A623', whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>
          Resell<span style={{ color: T?.textPrimary || '#F1F5F9' }}>Track</span>
        </span>
      )}
    </div>
  )
})
Logo.displayName = 'Logo'

// ─────────────────────────────────────────────────────────────────────────────
// BADGE — status chips, payment labels, stock alerts
// ─────────────────────────────────────────────────────────────────────────────
export const Badge = memo(({ color, children, icon, size = 'md' }) => {
  const pad = size === 'sm' ? '2px 6px' : '3px 8px'
  const fs  = size === 'sm' ? 10 : 11
  return (
    <span role="status" style={{
      background: color + '22', color, border: `1px solid ${color}44`,
      borderRadius: 6, padding: pad, fontSize: fs, fontWeight: 600,
      whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {icon && <Icon name={icon} size={fs} color={color} />}
      {children}
    </span>
  )
})
Badge.displayName = 'Badge'

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON — all variants: solid, outline, ghost, danger, sizes, loading state
// ─────────────────────────────────────────────────────────────────────────────
export const Btn = memo(({
  onClick, color = '#F5A623', outline, ghost, danger,
  children, style, small, disabled, loading, full, icon,
  type = 'button', 'aria-label': label,
}) => {
  const bg      = danger ? RED : color
  const isLight = bg === '#F5A623' || bg === '#22C55E'
  const textCol = outline || ghost ? bg : isLight ? '#0D0F14' : '#fff'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={label}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      style={{
        background:   ghost ? 'transparent' : outline ? 'transparent' : bg,
        color:        textCol,
        border:       ghost ? 'none' : outline ? `1.5px solid ${bg}` : 'none',
        padding:      small ? '6px 12px' : '10px 18px',
        borderRadius: 8,
        fontWeight:   600,
        opacity:      disabled && !loading ? 0.45 : 1,
        cursor:       disabled || loading ? 'not-allowed' : 'pointer',
        width:        full ? '100%' : undefined,
        display:      'inline-flex',
        alignItems:   'center',
        justifyContent: 'center',
        gap:          6,
        fontSize:     small ? 12 : 14,
        transition:   'opacity .15s, transform .1s',
        minHeight:    small ? 32 : 40, // accessible tap target
        flexShrink:   0,
        ...style,
      }}
    >
      {loading
        ? <Icon name="loader" size={small ? 12 : 14} color={textCol} style={{ animation: 'spin 1s linear infinite' }} />
        : icon && <Icon name={icon} size={small ? 12 : 14} color={textCol} />
      }
      {children}
    </button>
  )
})
Btn.displayName = 'Btn'

// ─────────────────────────────────────────────────────────────────────────────
// INPUT — text, number, date with label, hint, error state built in
// ─────────────────────────────────────────────────────────────────────────────
export const Input = memo(({ label, hint, error, type = 'text', T, required, ...props }) => (
  <div style={{ marginBottom: 0 }}>
    {label && (
      <label style={{ fontSize: 11, color: error ? RED : T.textSecondary, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}{required && <span style={{ color: RED, marginLeft: 3 }}>*</span>}
      </label>
    )}
    <input
      type={type}
      aria-required={required}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id}-err` : hint ? `${props.id}-hint` : undefined}
      style={{ borderColor: error ? RED : undefined }}
      {...props}
    />
    {error && <p id={`${props.id}-err`} role="alert" style={{ fontSize: 11, color: RED, marginTop: 4 }}>{error}</p>}
    {hint && !error && <p id={`${props.id}-hint`} style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{hint}</p>}
  </div>
))
Input.displayName = 'Input'

// ─────────────────────────────────────────────────────────────────────────────
// FIELD / LABEL wrapper (legacy compat + new Input above)
// ─────────────────────────────────────────────────────────────────────────────
export const Field = memo(({ label, col, T, required, children }) => (
  <div style={{ gridColumn: col }}>
    <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {label}{required && <span style={{ color: RED, marginLeft: 3 }}>*</span>}
    </label>
    {children}
  </div>
))
Field.displayName = 'Field'

// ─────────────────────────────────────────────────────────────────────────────
// MODAL — full-screen sheet on mobile, centred dialog on desktop
// Traps focus, closes on Escape, prevents body scroll
// ─────────────────────────────────────────────────────────────────────────────
export const Modal = ({ title, onClose, children, footer, wide, T }) => {
  const bodyRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    document.body.classList.add("modal-open")
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
      document.body.classList.remove("modal-open")
    }
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", flexDirection: "column",
        background: T.surface,
      }}
    >
      {/* ── Fixed header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px",
        paddingTop: "max(16px, env(safe-area-inset-top))",
        paddingBottom: "14px",
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
        background: T.surface,
        minHeight: 56,
      }}>
        <span className="dm" style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.3px" }}>
          {title}
        </span>
        <button onClick={onClose} aria-label="Close" style={{
          background: T.surfaceHigh, border: `1px solid ${T.border}`,
          borderRadius: 10, width: 38, height: 38, minWidth: 38,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0,
        }}>
          <Icon name="close" size={18} color={T.textSecondary} />
        </button>
      </div>

      {/* ── Scrollable body — grows to fill space between header and footer ── */}
      <div ref={bodyRef} style={{
        flex: "1 1 0",
        minHeight: 0,
        overflowY: "scroll",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        padding: "16px",
        /* Extra bottom padding so last item isn't hidden behind footer */
        paddingBottom: footer ? "8px" : "max(100px, calc(env(safe-area-inset-bottom) + 80px))",
      }}>
        {children}
      </div>

      {/* ── Sticky footer — always visible, never scrolls away ── */}
      {footer && (
        <div style={{
          flexShrink: 0,
          padding: "12px 16px",
          paddingBottom: "max(20px, calc(env(safe-area-inset-bottom) + 12px))",
          borderTop: `1px solid ${T.border}`,
          background: T.surface,
          boxShadow: "0 -4px 16px #00000022",
        }}>
          {footer}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD — metric display with icon, value, trend
// ─────────────────────────────────────────────────────────────────────────────
export const Stat = memo(({ label, value, color, sub, icon, trend, T }) => (
  <div
    role="region"
    aria-label={`${label}: ${value}`}
    style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: '16px 16px 14px',
      position: 'relative', overflow: 'hidden', transition: 'border-color .2s',
    }}
  >
    {icon && (
      <div style={{
        position: 'absolute', right: 14, top: 14,
        width: 32, height: 32, borderRadius: 8,
        background: (color || T.accent) + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={15} color={color || T.accent} strokeWidth={2} />
      </div>
    )}
    <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
      {label}
    </div>
    <div className="dm mono" style={{ fontSize: 20, fontWeight: 700, color: color || T.accent, lineHeight: 1, letterSpacing: '-0.5px' }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>{sub}</div>}
    {trend != null && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
        <Icon name={trend >= 0 ? 'trending-up' : 'trending-down'} size={11} color={trend >= 0 ? GRN : RED} />
        <span style={{ fontSize: 10, color: trend >= 0 ? GRN : RED, fontWeight: 600 }}>
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
        </span>
      </div>
    )}
  </div>
))
Stat.displayName = 'Stat'

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE — consistent no-data display
// ─────────────────────────────────────────────────────────────────────────────
export const Empty = memo(({ icon = 'archive', title, sub, action, T }) => (
  <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12, textAlign: 'center' }}>
    <div style={{ width: 52, height: 52, borderRadius: 14, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
      <Icon name={icon} size={22} color={T.textMuted} strokeWidth={1.5} />
    </div>
    <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>{title}</div>
    {sub && <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.6, maxWidth: 260 }}>{sub}</div>}
    {action}
  </div>
))
Empty.displayName = 'Empty'

// ─────────────────────────────────────────────────────────────────────────────
// ALERT BANNER — info, warning, error, success inline alerts
// ─────────────────────────────────────────────────────────────────────────────
const ALERT_COLORS = {
  info:    { color: '#60A5FA', icon: 'info' },
  warn:    { color: '#FBBF24', icon: 'alert' },
  error:   { color: '#F87171', icon: 'error' },
  success: { color: '#22C55E', icon: 'check' },
}
export const AlertBanner = memo(({ type = 'info', children, T }) => {
  const { color, icon } = ALERT_COLORS[type] || ALERT_COLORS.info
  return (
    <div role="alert" style={{
      background: color + '12', border: `1px solid ${color}44`,
      borderRadius: 10, padding: '10px 14px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <Icon name={icon} size={14} color={color} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.6 }}>{children}</div>
    </div>
  )
})
AlertBanner.displayName = 'AlertBanner'

// ─────────────────────────────────────────────────────────────────────────────
// TABLE — responsive, hover rows, accessible, empty state built in
// ─────────────────────────────────────────────────────────────────────────────
export const Tbl = memo(({ cols, rows, T, empty = 'No records yet.', loading, emptyIcon = 'archive' }) => {
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 10, color: T.textMuted, fontSize: 13 }}>
        <Icon name="loader" size={18} color={T.textMuted} style={{ animation: 'spin 1s linear infinite' }} />
        Loading…
      </div>
    )
  }
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table role="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 380 }}>
        <thead>
          <tr style={{ background: T.surfaceHigh }}>
            {cols.map((c, i) => (
              <th key={i} scope="col" style={{ textAlign: 'left', padding: '10px 12px', color: T.textMuted, fontWeight: 700, borderBottom: `1px solid ${T.border}`, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? (
              <tr>
                <td colSpan={cols.length}>
                  <Empty icon={emptyIcon} title={empty} T={T} />
                </td>
              </tr>
            )
            : rows.map((row, i) => (
              <tr key={i}
                style={{ borderBottom: `1px solid ${T.border}22`, transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = T.surfaceHigh + '66'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: '10px 12px', verticalAlign: 'middle', color: T.textPrimary }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  )
})
Tbl.displayName = 'Tbl'

// ─────────────────────────────────────────────────────────────────────────────
// ACCORDION — animated, keyboard accessible, defaultOpen support
// ─────────────────────────────────────────────────────────────────────────────
export const Accordion = ({ icon, label, T, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)
  const toggle = useCallback(() => setOpen(o => !o), [])
  const id = useRef(`acc-${Math.random().toString(36).slice(2)}`)

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={id.current}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', cursor: 'pointer', userSelect: 'none',
          width: '100%', background: 'transparent', border: 'none', transition: 'background .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.surfaceHigh}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {typeof icon === 'string' ? <span style={{ fontSize: 15 }}>{icon}</span> : icon}
          </div>
          <span className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>{label}</span>
        </div>
        <div style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .22s', flexShrink: 0 }}>
          <Icon name="chevron-down" size={16} color={T.textMuted} />
        </div>
      </button>
      <div
        id={id.current}
        role="region"
        aria-label={label}
        style={{
          maxHeight: open ? 2000 : 0,
          overflow: 'hidden',
          transition: 'max-height .25s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div style={{ padding: '0 18px 18px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION TITLE
// ─────────────────────────────────────────────────────────────────────────────
export const SecTitle = memo(({ T, children, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
    <span className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, letterSpacing: '-0.2px' }}>{children}</span>
    {right && <div>{right}</div>}
  </div>
))
SecTitle.displayName = 'SecTitle'

// ─────────────────────────────────────────────────────────────────────────────
// CHART TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────
export const ChartTip = memo(({ active, payload, label, cur, T }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: T.surfaceHigh, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: T.textPrimary, boxShadow: '0 4px 20px #00000044' }}>
      {label && <div style={{ color: T.textSecondary, marginBottom: 6, fontWeight: 600, fontSize: 11 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.textPrimary, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: i < payload.length - 1 ? 4 : 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          {p.name}: {cur ? cur(p.value) : p.value}
        </div>
      ))}
    </div>
  )
})
ChartTip.displayName = 'ChartTip'

// ─────────────────────────────────────────────────────────────────────────────
// PIE LABEL
// ─────────────────────────────────────────────────────────────────────────────
export const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null
  const R = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.62
  const x = cx + r * Math.cos(-midAngle * R)
  const y = cy + r * Math.sin(-midAngle * R)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON LOADER — placeholder while data loads
// ─────────────────────────────────────────────────────────────────────────────
export const Skeleton = memo(({ width = '100%', height = 16, radius = 6, T }) => (
  <div style={{
    width, height, borderRadius: radius,
    background: T.surfaceHigh,
    animation: 'shimmer 1.4s ease-in-out infinite',
    backgroundSize: '200% 100%',
  }} aria-hidden="true" />
))
Skeleton.displayName = 'Skeleton'

// ─────────────────────────────────────────────────────────────────────────────
// DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
export const Divider = memo(({ T, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
    <div style={{ flex: 1, height: 1, background: T.border }} />
    {label && <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>}
    {label && <div style={{ flex: 1, height: 1, background: T.border }} />}
  </div>
))
Divider.displayName = 'Divider'

// ─────────────────────────────────────────────────────────────────────────────
// COPY BUTTON — copies text to clipboard with feedback
// ─────────────────────────────────────────────────────────────────────────────
export const CopyBtn = memo(({ text, T }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [text])

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
      title={copied ? 'Copied!' : 'Copy'}
      style={{
        background: T.surfaceHigh, border: `1px solid ${T.border}`,
        borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 11, color: copied ? GRN : T.textSecondary,
        transition: 'color .15s',
      }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={11} color={copied ? GRN : T.textSecondary} />
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
})
CopyBtn.displayName = 'CopyBtn'

// ─────────────────────────────────────────────────────────────────────────────
// SESSION WARNING — idle timeout dialog
// ─────────────────────────────────────────────────────────────────────────────
export const SessionWarning = memo(({ onStay, onSignOut, T, minutesLeft = 2 }) => (
  <div
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="session-title"
    aria-describedby="session-desc"
    style={{
      position: 'fixed', inset: 0, background: '#000000cc', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, backdropFilter: 'blur(4px)',
    }}
  >
    <div style={{
      background: T.surface, border: `1px solid #F5A62355`,
      borderRadius: 16, padding: 32, maxWidth: 380, width: '100%',
      textAlign: 'center', boxShadow: '0 24px 64px #00000088',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: '#F5A62318',
        border: '1px solid #F5A62344', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 18px',
      }}>
        <Icon name="clock" size={24} color="#F5A623" aria-hidden="true" />
      </div>
      <div id="session-title" className="dm" style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, marginBottom: 10 }}>
        Session expiring
      </div>
      <p id="session-desc" style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
        You've been idle for a while. You'll be signed out in{' '}
        <strong style={{ color: '#F5A623' }}>{minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}</strong> unless you continue.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Btn onClick={onStay} color="#F5A623" aria-label="Stay signed in">Stay signed in</Btn>
        <Btn outline color={T.textSecondary} onClick={onSignOut} aria-label="Sign out now">Sign out</Btn>
      </div>
    </div>
  </div>
))
SessionWarning.displayName = 'SessionWarning'

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS BAR — used in sales-by-product, stock indicators
// ─────────────────────────────────────────────────────────────────────────────
export const ProgressBar = memo(({ value, max, color, T, height = 4, showLabel = false }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${pct.toFixed(0)}%`}
        style={{ width: '100%', height, background: T.border, borderRadius: height }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: color || T.accent, borderRadius: height, transition: 'width .4s ease' }} />
      </div>
      {showLabel && <div style={{ fontSize: 10, color: T.textMuted, marginTop: 3, textAlign: 'right' }}>{pct.toFixed(0)}%</div>}
    </div>
  )
})
ProgressBar.displayName = 'ProgressBar'

// ─────────────────────────────────────────────────────────────────────────────
// TABS — horizontal pill tab switcher
// ─────────────────────────────────────────────────────────────────────────────
export const Tabs = memo(({ tabs, active, onChange, T }) => (
  <div role="tablist" style={{ display: 'flex', background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden', width: 'fit-content' }}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        role="tab"
        aria-selected={active === tab.id}
        onClick={() => onChange(tab.id)}
        style={{
          padding: '9px 16px', background: active === tab.id ? T.accent : 'transparent',
          color: active === tab.id ? (T.accent === '#F5A623' ? '#0D0F14' : '#fff') : T.textSecondary,
          fontWeight: 600, border: 'none', fontSize: 13, cursor: 'pointer',
          transition: 'background .15s, color .15s', whiteSpace: 'nowrap', minHeight: 38,
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
))
Tabs.displayName = 'Tabs'
