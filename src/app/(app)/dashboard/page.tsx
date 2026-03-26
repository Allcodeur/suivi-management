import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Manager sees all active sprints; colleague sees own
  let query = supabase.from('sprint_summary').select('*').eq('is_active', true)
  if (profile?.role !== 'manager') query = query.eq('colleague_id', user.id)

  const { data: activeSprints } = await query.order('start_date')

  // History (last 6 sprints) for velocity chart
  let histQuery = supabase.from('sprint_summary').select('*').eq('is_active', false)
  if (profile?.role !== 'manager') histQuery = histQuery.eq('colleague_id', user.id)
  const { data: history } = await histQuery.order('start_date', { ascending: false }).limit(6)

  return (
    <DashboardClient
      profile={profile}
      activeSprints={activeSprints ?? []}
      history={(history ?? []).reverse()}
    />
  )
}
