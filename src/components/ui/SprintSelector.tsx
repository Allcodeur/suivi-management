'use client'
import { useEffect, useState } from 'react'
import type { SprintSummary } from '@/types'

interface Props {
  onSelect: (sprint: SprintSummary) => void
  selectedId?: string
}

export default function SprintSelector({ onSelect, selectedId }: Props) {
  const [sprints, setSprints] = useState<SprintSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sprints')
      .then(r => r.json())
      .then(data => {
        setSprints(data)
        const active = data.find((s: SprintSummary) => s.is_active) || data[0]
        if (active && !selectedId) onSelect(active)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color: 'var(--muted)', fontSize: 13 }}>Chargement...</div>
  if (!sprints.length) return null

  return (
    <select
      value={selectedId || ''}
      onChange={e => {
        const s = sprints.find(s => s.id === e.target.value)
        if (s) onSelect(s)
      }}
      style={{ minWidth: 200 }}
    >
      {sprints.map(s => (
        <option key={s.id} value={s.id}>
          {s.name} {s.is_active ? '★' : ''} · {s.load_pct}%
        </option>
      ))}
    </select>
  )
}
