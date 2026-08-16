import { useState } from 'react'
import { GRN, RED } from '../data/constants.js'

export const Badge = ({ color, children }) => (
  <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block' }}>{children}</span>
)

export const Btn = ({ onClick, color = '#00C9A7', outline, danger, children, style, small, disabled, full }) => {
  const bg = danger ? RED : color
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: outline ? 'transparent' : bg, color: outline ? bg : '#fff',
      border: outline ? `1px solid ${bg}` : 'none', padding: small ? '6px 12px' : '10px 18px',
      borderRadius: 8, fontWeight: 600, opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer', width: full ? '100%' : undefined, ...style,
    }}>{children}</button>
  )
}

export const Modal = ({ title, onClose, children, wide, T }) => (
  <div onClick={onClose} className="fade-in" style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, width: '100%', maxWidth: wide ? 680 : 500, maxHeight: '88vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <span className="dm" style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary }}>{title}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, lineHeight: 1, padding: '0 4px', color: T.textSecondary, cursor: 'pointer' }}>×</button>
      </div>
      {children}
    </div>
  </div>
)

export const Field = ({ label, col, T, children }) => (
  <div style={{ gridColumn: col }}>
    <label style={{ fontSize: 12, color: T.textSecondary, display: 'block', marginBottom: 4, fontWeight: 500 }}>{label}</label>
    {children}
  </div>
)

export const SecTitle = ({ T, children, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
    <span className="dm" style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{children}</span>
    {right}
  </div>
)

export const Stat = ({ label, value, color, sub, icon, T }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
    <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 6 }}>{label}</div>
    <div className="dm mono" style={{ fontSize: 19, fontWeight: 700, color: color || T.accent, lineHeight: 1.2 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{sub}</div>}
    {icon && <div style={{ position: 'absolute', right: 12, top: 12, fontSize: 20, opacity: .14 }}>{icon}</div>}
  </div>
)

export const Tbl = ({ cols, rows, T, empty = 'No records yet.' }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 380 }}>
      <thead>
        <tr>{cols.map((c, i) => <th key={i} style={{ textAlign: 'left', padding: '9px 12px', color: T.textSecondary, fontWeight: 500, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap', fontSize: 12 }}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <tr><td colSpan={cols.length} style={{ padding: 32, textAlign: 'center', color: T.textMuted }}><div style={{ fontSize: 28, marginBottom: 6 }}>📭</div>{empty}</td></tr>
          : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.border}22` }}>
              {row.map((cell, j) => <td key={j} style={{ padding: '9px 12px', verticalAlign: 'middle', color: T.textPrimary }}>{cell}</td>)}
            </tr>
          ))}
      </tbody>
    </table>
  </div>
)

export const Accordion = ({ icon, label, T, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      <div className="acc-hdr" onClick={() => setOpen(o => !o)}>
        <span className="dm" style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{icon} {label}</span>
        <span style={{ color: T.textSecondary, fontSize: 18, display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>⌄</span>
      </div>
      {open && <div style={{ padding: '0 18px 18px' }}>{children}</div>}
    </div>
  )
}

export const ChartTip = ({ active, payload, label, cur, T }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: T.surfaceHigh, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: T.textPrimary }}>
      {label && <div style={{ color: T.textSecondary, marginBottom: 6, fontWeight: 600 }}>{label}</div>}
      {payload.map((p, i) => <div key={i} style={{ color: p.color || T.textPrimary, fontWeight: 600 }}>{p.name}: {cur(p.value)}</div>)}
    </div>
  )
}

export const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null
  const R = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.62
  const x = cx + r * Math.cos(-midAngle * R)
  const y = cy + r * Math.sin(-midAngle * R)
  return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{(percent * 100).toFixed(0)}%</text>
}
