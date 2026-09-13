// ─── UI.jsx ───────────────────────────────────────────────────────────────────
// Reusable UI atoms — Badge, Btn, Modal, Field, Stat, Tbl, Accordion, Icons
// Uses Lucide React for modern consistent iconography
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
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
} from 'lucide-react'

// ── Icon registry — maps string keys to Lucide components ────────────────────
// Use these throughout the app instead of emojis
export const Icon = ({ name, size = 16, color, strokeWidth = 1.8, style }) => {
  const map = {
    dashboard: LayoutDashboard, products: Package, sales: ShoppingBag,
    expenses: Receipt, lend: Handshake, reports: BarChart2,
    settings: Settings, home: Home, plus: Plus, trash: Trash2,
    edit: Pencil, check: CheckCircle, alert: AlertCircle,
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
    external: ExternalLink, copy: Copy,
  }
  const C = map[name]
  if (!C) return null
  return <C size={size} color={color} strokeWidth={strokeWidth} style={style} />
}

// ── Logo — theme-aware so it blends on all themes ────────────────────────────
export const Logo = ({ size = 32, T, showName = false, slim = false }) => {
  const isDark = ['dark','midnight','forest','sunset'].includes(T?.themeName || 'dark')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.22,
        overflow: 'hidden', flexShrink: 0,
        // Theme-aware container — matches surface on light, transparent on dark
        background: isDark ? 'transparent' : T?.surface || '#fff',
        border: `1.5px solid ${T?.border || '#252C3F'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isDark ? 'none' : '0 2px 8px #00000022',
      }}>
        <img
          src="/icons/icon-192.png"
          alt="ResellTrack"
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: 'block',
            // On light themes, slightly reduce opacity to blend better
            opacity: isDark ? 1 : 0.92,
          }}
        />
      </div>
      {showName && !slim && (
        <span style={{
          fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: size * 0.44,
          color: T?.accent || '#F5A623', whiteSpace: 'nowrap',
          letterSpacing: '-0.3px',
        }}>
          Resell<span style={{ color: T?.textPrimary || '#F1F5F9' }}>Track</span>
        </span>
      )}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export const Badge = ({ color, children, icon }) => (
  <span style={{
    background: color + '22', color, border: `1px solid ${color}44`,
    borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600,
    whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4,
  }}>
    {icon && <Icon name={icon} size={11} color={color} />}
    {children}
  </span>
)

// ── Button ────────────────────────────────────────────────────────────────────
export const Btn = ({ onClick, color = '#F5A623', outline, danger, children, style, small, disabled, full, icon }) => {
  const RED = '#EF4444'
  const bg  = danger ? RED : color
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:    outline ? 'transparent' : bg,
      color:         outline ? bg : (bg === '#F5A623' ? '#0D0F14' : '#fff'),
      border:        outline ? `1px solid ${bg}` : 'none',
      padding:       small ? '6px 12px' : '10px 18px',
      borderRadius:  8, fontWeight: 600,
      opacity:       disabled ? 0.45 : 1,
      cursor:        disabled ? 'not-allowed' : 'pointer',
      width:         full ? '100%' : undefined,
      display:       'inline-flex', alignItems: 'center', gap: 6,
      fontSize:      small ? 12 : 14,
      transition:    'all .15s',
      ...style,
    }}>
      {icon && <Icon name={icon} size={small ? 12 : 14} color={outline ? bg : (bg === '#F5A623' ? '#0D0F14' : '#fff')} />}
      {children}
    </button>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export const Modal = ({ title, onClose, children, wide, T }) => (
  <div onClick={onClose} className="fade-in" style={{
    position: 'fixed', inset: 0, background: '#000000bb',
    zIndex: 200, display: 'flex', alignItems: 'flex-end',
    justifyContent: 'center', backdropFilter: 'blur(4px)',
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: '20px 20px 0 0',
      width: '100%', maxWidth: wide ? 720 : 540,
      maxHeight: '94vh',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 -8px 48px #00000088',
    }}>
      {/* Drag handle */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border }} />
      </div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 12px', borderBottom: '1px solid ' + T.border, flexShrink: 0 }}>
        <span className="dm" style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary }}>{title}</span>
        <button onClick={onClose} style={{
          background: T.surfaceHigh, border: 'none', borderRadius: 8,
          width: 32, height: 32, display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer',
        }}>
          <Icon name="close" size={16} color={T.textSecondary} />
        </button>
      </div>
      {/* Scrollable body */}
      <div style={{ overflowY: 'auto', padding: '16px 20px 32px', flex: 1, WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    </div>
  </div>
)

// ── Field / Label ─────────────────────────────────────────────────────────────
export const Field = ({ label, col, T, children }) => (
  <div style={{ gridColumn: col }}>
    <label style={{ fontSize: 11, color: T.textSecondary, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</label>
    {children}
  </div>
)

// ── Section Title ─────────────────────────────────────────────────────────────
export const SecTitle = ({ T, children, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
    <span className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary, letterSpacing: '-0.2px' }}>{children}</span>
    {right}
  </div>
)

// ── Stat card ─────────────────────────────────────────────────────────────────
export const Stat = ({ label, value, color, sub, icon, T }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 12, padding: '16px 16px 14px',
    position: 'relative', overflow: 'hidden',
    transition: 'border-color .2s',
  }}>
    {/* Icon in corner */}
    {icon && (
      <div style={{
        position: 'absolute', right: 14, top: 14,
        width: 32, height: 32, borderRadius: 8,
        background: color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={15} color={color} strokeWidth={2} />
      </div>
    )}
    <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
    <div className="dm mono" style={{ fontSize: 20, fontWeight: 700, color: color || T.accent, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>{sub}</div>}
  </div>
)

// ── Table ─────────────────────────────────────────────────────────────────────
export const Tbl = ({ cols, rows, T, empty = 'No records yet.' }) => (
  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 380 }}>
      <thead>
        <tr style={{ background: T.surfaceHigh }}>
          {cols.map((c, i) => (
            <th key={i} style={{
              textAlign: 'left', padding: '10px 12px',
              color: T.textMuted, fontWeight: 700,
              borderBottom: `1px solid ${T.border}`,
              fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6,
              whiteSpace: 'nowrap',
            }}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? (
            <tr>
              <td colSpan={cols.length} style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="archive" size={20} color={T.textMuted} />
                  </div>
                  <span style={{ color: T.textMuted, fontSize: 13 }}>{empty}</span>
                </div>
              </td>
            </tr>
          )
          : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.border}22`, transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = T.surfaceHigh + '66'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '10px 12px', verticalAlign: 'middle', color: T.textPrimary }}>{cell}</td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
  </div>
)

// ── Accordion ──────────────────────────────────────────────────────────────────
export const Accordion = ({ icon, label, T, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 18px', cursor: 'pointer', userSelect: 'none',
        transition: 'background .15s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = T.surfaceHigh}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {typeof icon === 'string' && icon.startsWith('<') ? null : (
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.surfaceHigh, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {typeof icon === 'string' ? <span style={{ fontSize: 15 }}>{icon}</span> : icon}
            </div>
          )}
          <span className="dm" style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>{label}</span>
        </div>
        <div style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: T.textMuted }}>
          <Icon name="chevron-down" size={16} color={T.textMuted} />
        </div>
      </div>
      {open && <div style={{ padding: '0 18px 18px' }}>{children}</div>}
    </div>
  )
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
export const ChartTip = ({ active, payload, label, cur, T }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: T.surfaceHigh, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      color: T.textPrimary, boxShadow: '0 4px 20px #00000044',
    }}>
      {label && <div style={{ color: T.textSecondary, marginBottom: 6, fontWeight: 600, fontSize: 11 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.textPrimary, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          {p.name}: {cur(p.value)}
        </div>
      ))}
    </div>
  )
}

// ── Pie label ─────────────────────────────────────────────────────────────────
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

// ── Session timeout warning modal ─────────────────────────────────────────────
export function SessionWarning({ onStay, onSignOut, T }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: T.surface, border: `1px solid #F5A62355`, borderRadius: 16, padding: 32, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px #00000088' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#F5A62318', border: '1px solid #F5A62344', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <Icon name="clock" size={24} color="#F5A623" />
        </div>
        <div className="dm" style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, marginBottom: 10 }}>Session expiring</div>
        <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
          You've been idle for 28 minutes. For your security, you'll be signed out in <strong style={{ color: '#F5A623' }}>2 minutes</strong> unless you continue.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Btn onClick={onStay} color="#F5A623">Stay signed in</Btn>
          <Btn outline color={T.textSecondary} onClick={onSignOut}>Sign out</Btn>
        </div>
      </div>
    </div>
  )
}

// Export Icon names for reference
export const NAV_ICONS = {
  dashboard: 'dashboard', products: 'products', sales: 'sales',
  expenses: 'expenses', lend: 'lend', reports: 'reports', settings: 'settings',
}
