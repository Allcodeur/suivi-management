import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendLoadAlert } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sprintId = new URL(req.url).searchParams.get('sprint_id')
  if (!sprintId) return NextResponse.json({ error: 'sprint_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('sprint_id', sprintId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sprint_id, name, days, category, quadrant } = body

  const { data, error } = await supabase.from('tasks').insert({
    sprint_id, name,
    days: parseFloat(days) || 1,
    category: category || 'Autre',
    quadrant: quadrant || 'Q2',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Check load after adding task
  await checkAndNotify(supabase, sprint_id)

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, sprint_id, ...updates } = body

  if (updates.days) updates.days = parseFloat(updates.days)

  const { data, error } = await supabase.from('tasks')
    .update(updates).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (sprint_id) await checkAndNotify(supabase, sprint_id)

  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, sprint_id } = await req.json()

  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (sprint_id) await checkAndNotify(supabase, sprint_id)

  return NextResponse.json({ ok: true })
}

// Check load pct and fire alert if threshold crossed
async function checkAndNotify(supabase: any, sprintId: string) {
  const { data: summary } = await supabase
    .from('sprint_summary').select('*').eq('id', sprintId).single()

  if (!summary) return

  const ratio = summary.load_pct / 100
  if (ratio > 1.1 || ratio < 0.75) {
    // Check if we already sent this type in the last hour to avoid spam
    const { data: recent } = await supabase
      .from('notification_log')
      .select('id')
      .eq('sprint_id', sprintId)
      .eq('type', ratio > 1.1 ? 'overload' : 'underload')
      .gte('sent_at', new Date(Date.now() - 3600 * 1000).toISOString())
      .limit(1)

    if (!recent || recent.length === 0) {
      sendLoadAlert(summary).catch(console.error)
    }
  }
}
