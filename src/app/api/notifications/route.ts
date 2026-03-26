import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendLoadAlert, sendSprintSummary } from '@/lib/notifications'

// POST /api/notifications  — manual trigger or cron
// Body: { type: 'load_check' | 'sprint_summary', sprint_id?: string }
// Cron (Vercel): set CRON_SECRET env and call with ?secret=xxx

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const isCron = secret === process.env.CRON_SECRET

  const supabase = isCron ? createAdminClient() : createClient()

  if (!isCron) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { type, sprint_id } = body

  if (type === 'load_check') {
    // Check all active sprints
    let query = supabase.from('sprint_summary').select('*').eq('is_active', true)
    if (sprint_id) query = query.eq('id', sprint_id)
    const { data: sprints } = await query

    const results = await Promise.allSettled(
      (sprints ?? []).map((s: any) => sendLoadAlert(s))
    )
    return NextResponse.json({ sent: results.filter(r => r.status === 'fulfilled').length })
  }

  if (type === 'sprint_summary') {
    const { data: sprint } = await supabase
      .from('sprint_summary').select('*').eq('id', sprint_id).single()
    if (!sprint) return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })
    await sendSprintSummary(sprint)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
