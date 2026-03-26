'use client'
import { useState, useEffect, useMemo } from 'react'
import { Card, MetricCard, LoadGauge, Badge, Alert, Btn, PageHeader } from '@/components/ui'
import { CATEGORIES, CATEGORY_COLORS, QUADRANTS, getLoadStatus, type Task, type SprintSummary, type Category, type Quadrant } from '@/types'

const EMPTY_TASK = { name: '', days: '1', category: 'Contenu' as Category, quadrant: 'Q2' as Quadrant }

export default function SprintPage() {
  const [sprints, setSprints] = useState<SprintSummary[]>([])
  const [activeSprint, setActiveSprint] = useState<SprintSummary | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewSprint, setShowNewSprint] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState(EMPTY_TASK)
  const [saving, setSaving] = useState(false)

  const [newSprint, setNewSprint] = useState({
    name: '', start_date: '', end_date: '', capacity_days: '8',
  })

  // Load sprints
  useEffect(() => {
    fetch('/api/sprints').then(r => r.json()).then(data => {
      setSprints(data)
      const active = data.find((s: SprintSummary) => s.is_active) || data[0]
      if (active) setActiveSprint(active)
    }).finally(() => setLoading(false))
  }, [])

  // Load tasks when sprint changes
  useEffect(() => {
    if (!activeSprint) return
    fetch(`/api/tasks?sprint_id=${activeSprint.id}`)
      .then(r => r.json()).then(setTasks)
  }, [activeSprint?.id])

  const totalDays = useMemo(() => tasks.reduce((s, t) => s + t.days, 0), [tasks])
  const capacity = activeSprint?.capacity_days ?? 8
  const loadPct = capacity > 0 ? Math.round((totalDays / capacity) * 100 * 10) / 10 : 0
  const { type: loadType } = getLoadStatus(loadPct)

  const createSprint = async () => {
    setSaving(true)
    const res = await fetch('/api/sprints', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newSprint, capacity_days: parseFloat(newSprint.capacity_days) }),
    })
    const sprint = await res.json()
    setSprints(p => [sprint, ...p.map(s => ({ ...s, is_active: false }))])
    setActiveSprint(sprint)
    setTasks([])
    setShowNewSprint(false)
    setNewSprint({ name: '', start_date: '', end_date: '', capacity_days: '8' })
    setSaving(false)
  }

  const addTask = async () => {
    if (!newTask.name.trim() || !activeSprint) return
    setSaving(true)
    const res = await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTask, sprint_id: activeSprint.id, days: parseFloat(newTask.days) || 1 }),
    })
    const task = await res.json()
    setTasks(p => [...p, task])
    setNewTask(EMPTY_TASK)
    setShowAddTask(false)
    setSaving(false)
  }

  const deleteTask = async (id: string) => {
    if (!activeSprint) return
    await fetch('/api/tasks', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, sprint_id: activeSprint.id }),
    })
    setTasks(p => p.filter(t => t.id !== id))
  }

  const toggleDone = async (task: Task) => {
    const updated = { ...task, is_done: !task.is_done }
    setTasks(p => p.map(t => t.id === task.id ? updated : t))
    await fetch('/api/tasks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, is_done: !task.is_done, sprint_id: task.sprint_id }),
    })
  }

  const updateCapacity = async (val: number) => {
    if (!activeSprint) return
    setActiveSprint(p => p ? { ...p, capacity_days: val } : p)
    await fetch('/api/sprints', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeSprint.id, capacity_days: val }),
    })
  }

  if (loading) return <div style={{ padding: 28, color: 'var(--muted)' }}>Chargement...</div>

  return (
    <div style={{ padding: 28, maxWidth: 1200 }}>
      <PageHeader
        title="🗓 Sprint Planning"
        subtitle="Planifiez votre charge sur 2 semaines · Détection automatique sur/sous-charge"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={activeSprint?.id || ''}
              onChange={e => {
                const s = sprints.find(s => s.id === e.target.value)
                if (s) { setActiveSprint(s); setTasks([]) }
              }}
              style={{ minWidth: 180 }}
            >
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.is_active ? '★' : ''}</option>
              ))}
            </select>
            <Btn onClick={() => setShowNewSprint(!showNewSprint)} variant="ghost">
              {showNewSprint ? 'Annuler' : '+ Nouveau sprint'}
            </Btn>
          </div>
        }
      />

      {/* New sprint form */}
      {showNewSprint && (
        <Card style={{ marginBottom: 20 }} >
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Nouveau sprint</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Nom</label>
              <input value={newSprint.name} onChange={e => setNewSprint(p => ({ ...p, name: e.target.value }))} placeholder="Sprint 6" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Début</label>
              <input type="date" value={newSprint.start_date} onChange={e => setNewSprint(p => ({ ...p, start_date: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Fin</label>
              <input type="date" value={newSprint.end_date} onChange={e => setNewSprint(p => ({ ...p, end_date: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Capacité (j)</label>
              <input type="number" min={1} max={10} step={0.5} value={newSprint.capacity_days} onChange={e => setNewSprint(p => ({ ...p, capacity_days: e.target.value }))} style={{ width: '100%' }} />
            </div>
          </div>
          <Btn onClick={createSprint} disabled={saving || !newSprint.name || !newSprint.start_date}>
            {saving ? 'Création...' : 'Créer le sprint'}
          </Btn>
        </Card>
      )}

      {activeSprint ? (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18 }}>
          {/* Left: gauge + capacity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 13, alignSelf: 'flex-start', marginBottom: 10 }}>Charge du sprint</div>
              <LoadGauge value={totalDays} max={capacity} />

              {/* Capacity slider */}
              <div style={{ width: '100%', marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
                  <span>Jours disponibles</span>
                  <span style={{ fontWeight: 700, color: 'var(--info)' }}>{capacity}j</span>
                </div>
                <input
                  type="range" min={1} max={10} step={0.5} value={capacity}
                  onChange={e => updateCapacity(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              {loadType === 'over' && <Alert type="over" text={`Surchargé de ${Math.round((totalDays - capacity) * 10) / 10}j`} />}
              {loadType === 'under' && <Alert type="under" text={`${Math.round((capacity - totalDays) * 10) / 10}j disponibles`} />}
              {loadType === 'ok' && <Alert type="ok" text="Charge optimale !" />}
            </Card>

            {/* KPIs */}
            <Card>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Résumé</div>
              {[
                { label: 'Capacité', value: capacity + 'j', color: 'var(--info)' },
                { label: 'Planifié', value: Math.round(totalDays * 10) / 10 + 'j', color: getLoadStatus(loadPct).color },
                { label: 'Complété', value: Math.round(tasks.filter(t => t.is_done).reduce((s, t) => s + t.days, 0) * 10) / 10 + 'j', color: 'var(--success)' },
                { label: 'Tâches', value: tasks.length.toString(), color: 'var(--violet)' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </Card>
          </div>

          {/* Right: task list */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Tâches du sprint</div>
              <Btn onClick={() => setShowAddTask(!showAddTask)}>
                {showAddTask ? 'Annuler' : '+ Ajouter une tâche'}
              </Btn>
            </div>

            {/* Add task form */}
            {showAddTask && (
              <Card style={{ marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder="Nom de la tâche"
                    value={newTask.name} onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addTask()}
                    style={{ width: '100%' }} autoFocus
                  />
                  <input
                    type="number" min={0.25} max={10} step={0.25} value={newTask.days}
                    onChange={e => setNewTask(p => ({ ...p, days: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <select value={newTask.category} onChange={e => setNewTask(p => ({ ...p, category: e.target.value as Category }))} style={{ width: '100%' }}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <select value={newTask.quadrant} onChange={e => setNewTask(p => ({ ...p, quadrant: e.target.value as Quadrant }))} style={{ width: '100%' }}>
                    {Object.entries(QUADRANTS).map(([k, v]) => (
                      <option key={k} value={k}>{k} — {v.action}</option>
                    ))}
                  </select>
                </div>
                <Btn onClick={addTask} disabled={saving || !newTask.name.trim()}>
                  {saving ? '...' : 'Ajouter'}
                </Btn>
              </Card>
            )}

            {/* Task table */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px 120px 55px 28px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: 0.5 }}>
                <span></span><span>TÂCHE</span><span>CATÉGORIE</span><span>PRIORITÉ</span><span style={{ textAlign: 'right' }}>JOURS</span><span></span>
              </div>
              {tasks.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  Aucune tâche — ajoutez-en une pour commencer
                </div>
              )}
              {tasks.map((task, i) => (
                <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px 120px 55px 28px', gap: 8, padding: '10px 16px', borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
                  <input type="checkbox" checked={task.is_done} onChange={() => toggleDone(task)} style={{ width: 14, height: 14, accentColor: 'var(--success)', cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, textDecoration: task.is_done ? 'line-through' : 'none', color: task.is_done ? 'var(--muted)' : undefined }}>{task.name}</span>
                  <Badge text={task.category} color={CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS] || 'var(--muted)'} />
                  <span style={{ fontSize: 11, color: QUADRANTS[task.quadrant].color, fontWeight: 500 }}>{QUADRANTS[task.quadrant].action}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'right', color: CATEGORY_COLORS[task.category as keyof typeof CATEGORY_COLORS] }}>{task.days}j</span>
                  <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                </div>
              ))}
              {/* Footer total */}
              {tasks.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 110px 120px 55px 28px', gap: 8, padding: '10px 16px', background: 'var(--surf2)', borderTop: '1px solid var(--border)' }}>
                  <span /><span style={{ fontWeight: 600, fontSize: 13 }}>Total</span><span /><span />
                  <span style={{ fontWeight: 800, fontSize: 16, textAlign: 'right', color: getLoadStatus(loadPct).color }}>
                    {Math.round(totalDays * 10) / 10}j
                  </span>
                  <span />
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <Card style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🗓</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#E2E8F0' }}>Aucun sprint</div>
          <div>Créez votre premier sprint pour commencer le suivi de charge.</div>
          <Btn onClick={() => setShowNewSprint(true)} style={{ marginTop: 16 }}>Créer un sprint</Btn>
        </Card>
      )}
    </div>
  )
}
