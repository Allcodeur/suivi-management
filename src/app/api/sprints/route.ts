import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendLoadAlert } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const url = new URL(req.url)
  const colleagueId = url.searchParams.get('colleague_id')

  let query = supabase
    .from('sprint_summary')
    .select('*')
    .order('start_date', { ascending: false })

  // Colleagues only see their own
  if (profile?.role !== 'manager') {
    query = query.eq('colleague_id', user.id)
  } else if (colleagueId) {
    query = query.eq('colleague_id', colleagueId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, start_date, end_date, capacity_days } = body

  // Deactivate current active sprint
  await supabase.from('sprints').update({ is_active: false })
    .eq('colleague_id', user.id).eq('is_active', true)

  const { data, error } = await supabase.from('sprints').insert({
    name, start_date, end_date,
    capacity_days: capacity_days ?? 8,
    colleague_id: user.id,
    is_active: true,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  const { data, error } = await supabase.from('sprints')
    .update(updates).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Check load & trigger notification if threshold crossed
  const { data: summary } = await supabase.from('sprint_summary')
    .select('*').eq('id', id).single()

  if (summary && (summary.load_pct > 110 || summary.load_pct < 75)) {
    // Fire-and-forget — don't block response
    sendLoadAlert(summary).catch(console.error)
  }

  return NextResponse.json(data)
}
