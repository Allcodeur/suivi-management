'use client'
import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, PieChart, Pie, Cell, ReferenceLine,
} from 'recharts'
import { Card, MetricCard, Badge, PageHeader } from '@/components/ui'
import { CATEGORY_COLORS, QUADRANTS, getLoadStatus, type SprintSummary, type Task, type Quadrant } from '@/types'

const TT = { background: '#111E35', border: '1px solid #1B2E54', borderRadius: 8, color: '#E2E8F0', fontSize: 12 }

export default function AnalyticsPage() {
  const [sprints, setSprints] = useState<SprintSummary[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sprints').then(r => r.json()).then(async (data: SprintSummary[]) => {
      setSprints(data)
      // Fetch tasks for all sprints to power analytics
      const taskArrays = await Promise.all(
        data.slice(0, 8).map(s => fetch(`/api/tasks?sprint_id=${s.id}`).then(r => r.json()))
      )
      setAllTasks(taskArrays.flat())
    }).finally(() => setLoading(false))
  }, [])

  const history = useMemo(() => [...sprints].sort((a, b) => a.start_date.localeCompare(b.start_date)), [sprints])

  // Velocity data
  const velocityData = history.map(s => ({
    name: s.name,
    Planifié: s.capacity_days,
    Réalisé: s.actual_days ?? s.planned_days,
    Charge: s.load_pct,
  }))

  // Variance (estimation accuracy)
  const varianceData = history.map(s => ({
    name: s.name,
    variance: parseFloat(((s.actual_days ?? s.planned_days) - s.capacity_days).toFixed(1)),
    load_pct: s.load_pct,
  }))

  // Category breakdown across all sprints
  const catData = useMemo(() => {
    const m: Record<string, number> = {}
    allTasks.forEach(t => { m[t.category] = (m[t.category] || 0) + t.days })
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value: Math.round(value * 10) / 10, color: CATEGORY_COLORS[name as keyof typeof CATEGORY_COLORS] || '#A78BFA' }))
  }, [allTasks])

  // Pareto: cumulate to 80%
  const totalTaskDays = catData.reduce((s, c) => s + c.value, 0)
  let cumPct = 0
  const paretoData = catData.map(c => {
    cumPct += c.value / totalTaskDays * 100
    return { ...c, cumPct: Math.round(cumPct) }
  })
  const paretoThreshold = catData.filter((_, i) => {
    const cum = catData.slice(0, i + 1).reduce((s, c) => s + c.value, 0)
    return cum / totalTaskDays <= 0.8
  })

  // Quadrant distribution
  const quadData = useMemo(() => {
    const m: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
    allTasks.forEach(t => { m[t.quadrant] = (m[t.quadrant] || 0) + t.days })
    return Object.entries(m).map(([q, v]) => ({
      name: q, value: Math.round(v * 10) / 10, color: QUADRANTS[q as Quadrant].color,
      action: QUADRANTS[q as Quadrant].action,
    }))
  }, [allTasks])

  // KPIs
  const completedSprints = history.filter(s => !s.is_active)
  const avgVelocity = completedSprints.length ? Math.round(completedSprints.reduce((a, s) => a + (s.actual_days ?? s.planned_days), 0) / completedSprints.length * 10) / 10 : 0
  const overCount = completedSprints.filter(s => s.load_pct > 110).length
  const avgVariance = completedSprints.length ? Math.round(varianceData.slice(0, -1).reduce((a, v) => a + Math.abs(v.variance), 0) / completedSprints.length * 10) / 10 : 0
  const completionRate = allTasks.length ? Math.round(allTasks.filter(t => t.is_done).length / allTasks.length * 100) : 0

  if (loading) return <div style={{ padding: 28, color: 'var(--muted)' }}>Chargement des données...</div>

  return (
    <div style={{ padding: 28, maxWidth: 1200 }}>
      <PageHeader title="📈 Analytics" subtitle={`${history.length} sprint(s) analysés · Données historiques de charge`} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <MetricCard label="VÉLOCITÉ MOYENNE" value={avgVelocity} unit="j/sprint" color="var(--violet)" sub={`${completedSprints.length} sprints`} />
        <MetricCard label="TAUX DE COMPLÉTION" value={completionRate} unit="%" color="var(--success)" sub={`${allTasks.filter(t => t.is_done).length} / ${allTasks.length} tâches`} />
        <MetricCard label="SURCHARGES" value={overCount} unit={`/ ${completedSprints.length}`} color={overCount > 0 ? 'var(--danger)' : 'var(--success)'} sub="Sprints > 110%" />
        <MetricCard label="PRÉCISION ESTIM." value={`±${avgVariance}`} unit="j" color="var(--info)" sub="Écart moyen" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Velocity chart */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>Vélocité par sprint</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>Capacité planifiée vs. Réalisé</div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={velocityData} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1B2E54" />
              <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="Planifié" fill="#6366F1" opacity={0.5} radius={[3, 3, 0, 0]} />
              <Line dataKey="Réalisé" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#6366F1', opacity: 0.6, borderRadius: 2, marginRight: 4 }} />Planifié</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10B981', borderRadius: '50%', marginRight: 4 }} />Réalisé</span>
          </div>
        </Card>

        {/* Variance / accuracy chart */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>Précision des estimations</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>Variance réalisé − capacité (jours)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={varianceData} margin={{ top: 4, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1B2E54" vertical={false} />
              <XAxis dataKey="name" stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 10, fill: '#64748B' }} />
              <Tooltip contentStyle={TT} formatter={(v: number) => [`${v > 0 ? '+' : ''}${v}j`, 'Variance']} />
              <ReferenceLine y={0} stroke="#1B2E54" strokeWidth={1.5} />
              <Bar dataKey="variance" radius={[3, 3, 0, 0]} barSize={32}>
                {varianceData.map((e, i) => (
                  <Cell key={i} fill={e.variance > 0.5 ? '#EF4444' : e.variance < -0.5 ? '#F59E0B' : '#10B981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, display: 'flex', gap: 14 }}>
            <span><span style={{ color: 'var(--danger)' }}>■</span> Surchargé</span>
            <span><span style={{ color: 'var(--warn)' }}>■</span> Sous-chargé</span>
            <span><span style={{ color: 'var(--success)' }}>■</span> Optimal</span>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pareto / category breakdown */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>Répartition par catégorie</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>Analyse Pareto 80/20 — tous sprints</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={36} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v: number) => [v + 'j', '']} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {catData.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{c.value}j</span>
                </div>
              ))}
            </div>
          </div>
          {paretoThreshold.length > 0 && (
            <div style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '9px 12px', marginTop: 14, fontSize: 11, color: 'var(--muted)' }}>
              💡 Pareto 80/20 : <span style={{ color: '#E2E8F0', fontWeight: 600 }}>
                {paretoThreshold.map(c => c.name).join(' + ')}
              </span> représentent ~80% de la charge
            </div>
          )}
        </Card>

        {/* Eisenhower breakdown */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>Répartition Eisenhower</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>Distribution urgence × importance (tous sprints)</div>
          {quadData.map(q => {
            const pct = totalTaskDays > 0 ? Math.round(q.value / totalTaskDays * 100) : 0
            return (
              <div key={q.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>
                    <span style={{ color: q.color, fontWeight: 700 }}>{q.name}</span>
                    <span style={{ color: 'var(--muted)', marginLeft: 6 }}>— {q.action}</span>
                  </span>
                  <span style={{ fontWeight: 700 }}>{q.value}j <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({pct}%)</span></span>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: q.color, borderRadius: 4 }} />
                </div>
              </div>
            )
          })}

          {/* SEO insight */}
          {quadData.find(q => q.name === 'Q2')?.value !== undefined && (
            <div style={{ background: '#10B98118', border: '1px solid #10B98140', borderRadius: 8, padding: '9px 12px', marginTop: 14, fontSize: 11, color: 'var(--muted)' }}>
              {quadData.find(q => q.name === 'Q2')!.value > quadData.find(q => q.name === 'Q1')!.value
                ? '✓ Bonne hygiène : Q2 > Q1 — travail stratégique dominant'
                : '⚠ Attention : Q1 domine — risque de mode "pompier" chronique'
              }
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
