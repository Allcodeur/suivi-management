'use client'
import { getLoadStatus } from '@/types'

// ── Card ─────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--surf)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 20, ...style,
    }}>
      {children}
    </div>
  )
}

// ── MetricCard ────────────────────────────────────────────────
export function MetricCard({ label, value, unit, color, sub }: {
  label: string; value: string | number; unit?: string; color?: string; sub?: string
}) {
  return (
    <div style={{
      background: 'var(--surf)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '14px 16px', flex: 1, minWidth: 0,
    }}>
      <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 5, letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ color: color || '#E2E8F0', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4, color: 'var(--muted)' }}>{unit}</span>}
      </div>
      {sub && <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 10,
      background: color + '22', color, fontWeight: 600,
    }}>
      {text}
    </span>
  )
}

// ── Alert ─────────────────────────────────────────────────────
export function Alert({ type, text }: { type: 'over' | 'under' | 'ok'; text: string }) {
  const clr = type === 'over' ? 'var(--danger)' : type === 'under' ? 'var(--warn)' : 'var(--success)'
  const icon = type === 'over' ? '⚠' : type === 'under' ? '↓' : '✓'
  return (
    <div className="animate-slide-up" style={{
      background: clr + '18', border: `1px solid ${clr}40`,
      borderRadius: 8, padding: '9px 13px', fontSize: 12, color: clr,
      marginTop: 10, display: 'flex', gap: 6, alignItems: 'flex-start',
    }}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  )
}

// ── LoadGauge SVG ────────────────────────────────────────────
export function LoadGauge({ value, max }: { value: number; max: number }) {
  const ratio = Math.min(value / (max || 1), 1.5)
  const { color, label } = getLoadStatus(ratio * 100)

  const pt = (r: number, deg: number): [number, number] => {
    const rad = ((deg - 90) * Math.PI) / 180
    return [120 + r * Math.cos(rad), 115 + r * Math.sin(rad)]
  }
  const arc = (r: number, a1: number, a2: number) => {
    const [x1, y1] = pt(r, a1), [x2, y2] = pt(r, a2)
    const lg = a2 - a1 > 180 ? 1 : 0
    return `M${x1},${y1}A${r},${r}0,${lg},1,${x2},${y2}`
  }

  const START = -135, SWEEP = 270
  const fillEnd = START + ratio * SWEEP
  const capEnd = Math.min(fillEnd, 135)
  const [nx, ny] = pt(70, Math.min(fillEnd, 135))

  return (
    <svg viewBox="0 0 240 175" width="100%" style={{ maxWidth: 240 }}>
      {/* Track */}
      <path d={arc(86, -135, 135)} fill="none" stroke="var(--border)" strokeWidth={14} strokeLinecap="round" />
      {/* Fill */}
      {ratio > 0 && (
        <path d={arc(86, -135, capEnd)} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" opacity={0.9} />
      )}
      {/* Ticks */}
      {[0, 0.5, 1, 1.25].map((t, i) => {
        const deg = -135 + t * 270
        const [ax, ay] = pt(94, deg), [bx, by] = pt(104, deg)
        return <line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke={t === 1 ? 'var(--danger)' : 'var(--dim)'} strokeWidth={t === 1 ? 2.5 : 1} />
      })}
      {/* Needle */}
      <line x1={120} y1={115} x2={nx} y2={ny} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={120} cy={115} r={5} fill={color} />
      {/* Labels */}
      <text x={120} y={100} textAnchor="middle" fill={color} fontSize={28} fontWeight={700} fontFamily="system-ui">
        {Math.round(ratio * 100)}%
      </text>
      <text x={120} y={120} textAnchor="middle" fill="var(--muted)" fontSize={11} fontFamily="system-ui">saturation</text>
      <text x={120} y={138} textAnchor="middle" fill="#E2E8F0" fontSize={12} fontFamily="system-ui">
        {Math.round(value * 10) / 10} / {Math.round(max * 10) / 10} jours
      </text>
      <text x={120} y={158} textAnchor="middle" fill={color} fontSize={12} fontWeight={600} fontFamily="system-ui">
        {label}
      </text>
    </svg>
  )
}

// ── Page header ───────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ── Btn ───────────────────────────────────────────────────────
export function Btn({
  children, onClick, variant = 'primary', size = 'md', disabled, type = 'button', style,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'success' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  disabled?: boolean
  type?: 'button' | 'submit'
  style?: React.CSSProperties
}) {
  const bg = { primary: 'var(--primary)', success: 'var(--success)', danger: 'var(--danger)', ghost: 'var(--surf3)' }[variant]
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: bg, color: '#fff', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      borderRadius: 8, padding: size === 'sm' ? '5px 10px' : '8px 16px',
      fontSize: size === 'sm' ? 11 : 13, fontWeight: 600, fontFamily: 'inherit',
      opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s', ...style,
    }}>
      {children}
    </button>
  )
}
