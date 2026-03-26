'use client'
import { useState, useEffect, useMemo } from 'react'
import { Card, Badge, Btn, PageHeader } from '@/components/ui'
import { QUADRANTS, CATEGORY_COLORS, getLoadStatus, type Task, type SprintSummary, type Quadrant } from '@/types'

export default function EisenhowerPage() {
  const [sprints, setSprints] = useState<SprintSummary[]>([])
  const [activeSprint, setActiveSprint] = useState<SprintSummary | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sprints').then(r => r.json()).then(data => {
      setSprints(data)
      const active = data.find((s: SprintSummary) => s.is_active) || data[0]
      if (active) setActiveSprint(active)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!activeSprint) return
    fetch(`/api/tasks?sprint_id=${activeSprint.id}`)
      .then(r => r.json()).then(setTasks)
  }, [activeSprint?.id])

  const moveTask = async (taskId: string, newQ: Quadrant) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.quadrant === newQ) return
    setTasks(p => p.map(t => t.id === taskId ? { ...t, quadrant: newQ } : t))
    await fetch('/api/tasks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, quadrant: newQ, sprint_id: task.sprint_id }),
    })
  }

  const quadrantTasks = useMemo(() => {
    const m: Record<Quadrant, Task[]> = { Q1: [], Q2: [], Q3: [], Q4: [] }
    tasks.forEach(t => m[t.quadrant].push(t))
    return m
  }, [tasks])

  if (loading) return <div style={{ padding: 28, color: 'var(--muted)' }}>Chargement...</div>

  return (
    <div style={{ padding: 28, maxWidth: 1200 }}>
      <PageHeader
        title="🗺 Matrice d'Eisenhower"
        subtitle="Priorisez par urgence × importance — Glissez-déposez les tâches entre quadrants"
        action={
          <select value={activeSprint?.id || ''} onChange={e => {
            const s = sprints.find(s => s.id === e.target.value)
            if (s) { setActiveSprint(s); setTasks([]) }
          }} style={{ minWidth: 180 }}>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name} {s.is_active ? '★' : ''}</option>)}
          </select>
        }
      />

      {/* Axis labels */}
      <div style={{ position: 'relative', marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          <span style={{ fontWeight: 600 }}>URGENT →</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>Non urgent</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {(Object.entries(QUADRANTS) as [Quadrant, typeof QUADRANTS[Quadrant]][]).map(([qk, qi]) => {
          const qTasks = quadrantTasks[qk]
          const qDays = qTasks.reduce((s, t) => s + t.days, 0)
          const isOver = qk === 'Q1' && qDays > 3

          return (
            <div
              key={qk}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const id = e.dataTransfer.getData('taskId')
                if (id) moveTask(id, qk)
                setDragging(null)
              }}
              style={{
                background: 'var(--surf)', border: `1px solid ${dragging ? qi.color + '60' : 'var(--border)'}`,
                borderRadius: 14, overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Quadrant header */}
              <div style={{
                background: qi.color + '16', borderBottom: `1px solid ${qi.color}30`,
                padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: qi.color, marginBottom: 2 }}>
                    {qk} — {qi.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{qi.description}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ background: qi.color + '22', color: qi.color, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 10 }}>
                      {qi.action}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: qi.color }}>{Math.round(qDays * 10) / 10}j</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{qTasks.length} tâche{qTasks.length !== 1 ? 's' : ''}</div>
                </div>
              </div>

              {/* Tasks */}
              <div style={{ padding: '10px 12px', minHeight: 120 }}>
                {isOver && (
                  <div style={{ background: '#EF444418', border: '1px solid #EF444440', borderRadius: 8, padding: '7px 11px', fontSize: 11, color: 'var(--danger)', marginBottom: 8 }}>
                    ⚠ Q1 dépasse 3j — risque de surcharge critique
                  </div>
                )}
                {qTasks.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, padding: '24px 0', opacity: 0.5 }}>
                    Glissez une tâche ici
                  </div>
                )}
                {qTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData('taskId', task.id); setDragging(task.id) }}
                    onDragEnd={() => setDragging(null)}
                    style={{
                      background: dragging === task.id ? 'var(--surf3)' : 'var(--surf2)',
                      border: '1px solid var(--border)', borderRadius: 9,
                      padding: '9px 13px', marginBottom: 7, cursor: 'grab',
                      opacity: dragging === task.id ? 0.5 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1, paddingRight: 8 }}>{task.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS], flexShrink: 0 }}>
                        {task.days}j
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Badge text={task.category} color={CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS] || 'var(--muted)'} />
                      {/* Quick move buttons */}
                      <div style={{ display: 'flex', gap: 3 }}>
                        {(Object.keys(QUADRANTS) as Quadrant[]).filter(k => k !== qk).map(k => (
                          <button
                            key={k} onClick={() => moveTask(task.id, k)}
                            title={`Déplacer vers ${k}`}
                            style={{
                              background: QUADRANTS[k].color + '20', border: 'none',
                              color: QUADRANTS[k].color, borderRadius: 5, padding: '2px 6px',
                              fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            →{k}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 20, background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--muted)' }}>GUIDE DE PRIORISATION SEO</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { q: 'Q1', examples: 'Pénalité Google, bug critique, deadline client imminente' },
            { q: 'Q2', examples: 'Stratégie contenu, audit planifié, amélioration technique' },
            { q: 'Q3', examples: 'Réunion non préparée, rapport automatisable, demande ad hoc' },
            { q: 'Q4', examples: 'Réseaux sociaux passifs, réunions sans agenda, admin répétitif' },
          ].map(({ q, examples }) => (
            <div key={q} style={{ fontSize: 11, color: 'var(--muted)' }}>
              <span style={{ color: QUADRANTS[q as Quadrant].color, fontWeight: 700 }}>{q} ·</span> {examples}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
