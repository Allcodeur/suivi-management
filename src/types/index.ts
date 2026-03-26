export type Role = 'manager' | 'colleague'
export type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4'
export type Category = 'SEO Tech' | 'Contenu' | 'Stratégie' | 'Admin' | 'Formation' | 'Autre'
export type NotificationType = 'overload' | 'underload' | 'sprint_summary'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  avatar_url?: string
  created_at: string
}

export interface Sprint {
  id: string
  name: string
  start_date: string
  end_date: string
  capacity_days: number
  actual_days?: number
  colleague_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  sprint_id: string
  name: string
  days: number
  category: Category
  quadrant: Quadrant
  is_done: boolean
  created_at: string
  updated_at: string
}

export interface SprintSummary extends Sprint {
  colleague_name: string
  colleague_email: string
  task_count: number
  planned_days: number
  completed_days: number
  load_pct: number
  tasks?: Task[]
}

export interface SprintWithTasks extends Sprint {
  tasks: Task[]
  planned_days: number
  load_pct: number
}

export const CATEGORIES: Category[] = ['SEO Tech', 'Contenu', 'Stratégie', 'Admin', 'Formation', 'Autre']

export const CATEGORY_COLORS: Record<Category, string> = {
  'SEO Tech':   '#6366F1',
  'Contenu':    '#10B981',
  'Stratégie':  '#F59E0B',
  'Admin':      '#EF4444',
  'Formation':  '#38BDF8',
  'Autre':      '#A78BFA',
}

export const QUADRANTS: Record<Quadrant, { label: string; action: string; color: string; description: string }> = {
  Q1: { label: 'Urgent + Important',     action: 'Faites maintenant', color: '#EF4444', description: 'Crises, deadlines imminentes' },
  Q2: { label: 'Important, non-urgent',  action: 'Planifiez',         color: '#10B981', description: 'Stratégie, formation, prévention' },
  Q3: { label: 'Urgent, non-important',  action: 'Déléguez',          color: '#F59E0B', description: 'Interruptions, réunions inutiles' },
  Q4: { label: 'Ni urgent ni important', action: 'Éliminez',          color: '#64748B', description: 'Activités à faible valeur' },
}

export const LOAD_THRESHOLDS = {
  UNDERLOAD: 0.75,   // < 75% = sous-chargé
  OPTIMAL_MAX: 1.10, // 75–110% = optimal
  OVERLOAD: 1.10,    // > 110% = surchargé
}

export function getLoadStatus(loadPct: number): {
  label: string; color: string; type: 'under' | 'ok' | 'over'
} {
  const ratio = loadPct / 100
  if (ratio > LOAD_THRESHOLDS.OVERLOAD)
    return { label: 'Surchargé',    color: '#EF4444', type: 'over' }
  if (ratio < LOAD_THRESHOLDS.UNDERLOAD)
    return { label: 'Sous-chargé',  color: '#F59E0B', type: 'under' }
  return   { label: 'Optimal',      color: '#10B981', type: 'ok' }
}
