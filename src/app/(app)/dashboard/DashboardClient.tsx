'use client'
import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Cell } from 'recharts'
import type { Profile, SprintSummary } from '@/types'
import { getLoadStatus, CATEGORY_COLORS, QUADRANTS } from '@/types'
import { Card, MetricCard, LoadGauge, Badge, Alert, PageHeader } from '@/components/ui'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const TT_STYLE = { background: '#111E35', border: '1px solid #1B2E54', borderRadius: 8, color: '#E2E8F0', fontSize: 12 }

interface Props {
  profile: Profile
  activeSprints: SprintSummary[]
  history: SprintSummary[]
}

function SprintCard({ sprint }: { sprint: SprintSummary }) {
  const { color, type, label } = getLoadStatus(sprint.load_pct)
  const catBreakdown = useMemo(() => {
    // We'll fetch tasks on the client side for breakdown — for now show load bar
    return null
  }, [])

  return (
    <div style={{ background: 'var(--surf)', border: `1px solid var(--border)`, borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: color + '14', borderBottom: `1px solid ${color}30`, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{sprint.name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
            {sprint.colleague_name} · {sprint.start_date} → {sprint.end_date}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color }}>{sprint.load_pct}%</div>
          <div style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</div>
        </div>
      </div>

      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'start' }}>
        <LoadGauge value={sprint.planned_days} max={sprint.capacity_days} />
        <div>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Capacité', value: sprint.capacity_days + 'j', color: 'var(--info)' },
              { label: 'Planifié', value: sprint.planned_days + 'j', color },
              { label: 'Tâches', value: sprint.task_count.toString(), color: 'var(--violet)' },
              { label: 'Complété', value: sprint.completed_days + 'j', color: 'var(--success)' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--surf2)', borderRadius: 8, padding: '9px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Load bar */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
              <span>Charge</span>
              <span>{sprint.planned_days}j / {sprint.capacity_days}j</span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: 4, height: 7, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(sprint.load_pct, 100)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
          </div>

          {/* Alert */}
          {type !== 'ok' && (
            <Alert
              type={type}
              text={type === 'over'
                ? `Surchargé de ${Math.round((sprint.planned_days - sprint.capacity_days) * 10) / 10}j — révision nécessaire`
                : `${Math.round((sprint.capacity_days - sprint.planned_days) * 10) / 10}j non assignés — capacité disponible`}
            />
          )}
          {type === 'ok' && (
            <Alert type="ok" text="Charge optimale — bonne planification !" />
          )}

          <a href="/sprint" style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            Gérer ce sprint →
          </a>
        </div>
      </div>
    </div>
  )
}

export default function DashboardClient({ profile, activeSprints, history }: Props) {
  const isManager = profile.role === 'manager'

  const histData = history.map(s => ({
    name: s.name,
    planifié: s.capacity_days,
    réalisé: s.actual_days ?? s.planned_days,
    charge: s.load_pct,
  }))

  const avgVelocity = history.length
    ? Math.round((history.reduce((a, s) => a + (s.actual_days ?? s.planned_days), 0) / history.length) * 10) / 10
    : '—'

  const overloadCount = history.filter(s => s.load_pct > 110).length

  return (
    <div style={{ padding: 28, maxWidth: 1200 }}>
      <PageHeader
        title={isManager ? '⚡ Vue Manager — Tableau de bord' : '⚡ Mon tableau de bord'}
        subtitle={isManager ? `${activeSprints.length} sprint(s) actif(s) en cours` : `Sprint actif · Semaine ${new Date().getWeek?.() ?? ''}`}
      />

      {/* Global KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <MetricCard label="SPRINTS ACTIFS" value={activeSprints.length} color="var(--info)" />
        <MetricCard label="VÉLOCITÉ MOY." value={avgVelocity} unit="j/sprint" color="var(--violet)" sub={`${history.length} derniers sprints`} />
        <MetricCard
          label="CHARGE GLOBALE"
          value={activeSprints.length ? Math.round(activeSprints.reduce((a, s) => a + s.load_pct, 0) / activeSprints.length) : '—'}
          unit="%"
          color={activeSprints.length ? getLoadStatus(activeSprints.reduce((a, s) => a + s.load_pct, 0) / activeSprints.length).color : 'var(--muted)'}
        />
        <MetricCard label="SURCHARGES" value={overloadCount} unit={`/ ${history.length}`} color={overloadCount > 0 ? 'var(--danger)' : 'var(--success)'} sub="Sprints historiques" />
      </div>

      {/* Active sprints */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--muted)', letterSpacing: 0.5 }}>
          SPRINT(S) EN COURS
        </h2>
        {activeSprints.length === 0 ? (
          <Card style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 20px' }}>
            Aucun sprint actif. <a href="/sprint" style={{ color: 'var(--primary)' }}>Créer un sprint →</a>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: activeSprints.length > 1 ? '1fr 1fr' : '1fr', gap: 14 }}>
            {activeSprints.map(s => <SprintCard key={s.id} sprint={s} />)}
          </div>
        )}
      </div>

      {/* Velocity chart */}
      {history.length > 0 && (
        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Vélocité historique</div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16 }}>Capacité planifiée vs. jours réalisés</div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={histData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted)" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
              <YAxis stroke="var(--muted)" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
              <Tooltip contentStyle={TT_STYLE} />
              <Bar dataKey="planifié" fill="var(--primary)" opacity={0.5} radius={[3, 3, 0, 0]} />
              <Line dataKey="réalisé" stroke="var(--success)" strokeWidth={2.5} dot={{ fill: 'var(--success)', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
