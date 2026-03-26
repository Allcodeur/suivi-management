// src/lib/notifications.ts
import { Resend } from 'resend'
import { SprintSummary, getLoadStatus } from '@/types'
import { createAdminClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.NOTIFICATION_FROM_EMAIL ?? 'noreply@workloadiq.app'
const MANAGER_EMAIL = process.env.MANAGER_EMAIL ?? ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Overload / underload alert ────────────────────────────────
export async function sendLoadAlert(sprint: SprintSummary) {
  const status = getLoadStatus(sprint.load_pct)
  if (status.type === 'ok') return

  const isOver = status.type === 'over'
  const delta = isOver
    ? (sprint.planned_days - sprint.capacity_days).toFixed(1)
    : (sprint.capacity_days - sprint.planned_days).toFixed(1)

  const subject = isOver
    ? `⚠️ Surcharge détectée — ${sprint.colleague_name} (${sprint.name})`
    : `↓ Sous-charge — ${sprint.colleague_name} (${sprint.name})`

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:32px">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <div style="background:${isOver ? '#EF4444' : '#F59E0B'};padding:20px 24px">
          <h1 style="color:#fff;margin:0;font-size:18px">${subject}</h1>
        </div>
        <div style="padding:24px">
          <p style="color:#334155;margin:0 0 16px">
            ${isOver
              ? `<strong>${sprint.colleague_name}</strong> est <strong>surchargé(e) de ${delta} jours</strong> sur le ${sprint.name}.`
              : `<strong>${sprint.colleague_name}</strong> a <strong>${delta} jours disponibles</strong> non assignés sur le ${sprint.name}.`
            }
          </p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr style="background:#f1f5f9">
              <td style="padding:10px 14px;font-size:13px;color:#64748b">Capacité</td>
              <td style="padding:10px 14px;font-size:13px;font-weight:600;text-align:right">${sprint.capacity_days}j</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-size:13px;color:#64748b">Charge planifiée</td>
              <td style="padding:10px 14px;font-size:13px;font-weight:600;text-align:right;color:${isOver ? '#EF4444' : '#F59E0B'}">${sprint.planned_days}j</td>
            </tr>
            <tr style="background:#f1f5f9">
              <td style="padding:10px 14px;font-size:13px;color:#64748b">Saturation</td>
              <td style="padding:10px 14px;font-size:13px;font-weight:700;text-align:right;color:${isOver ? '#EF4444' : '#F59E0B'}">${sprint.load_pct}%</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-size:13px;color:#64748b">Tâches</td>
              <td style="padding:10px 14px;font-size:13px;font-weight:600;text-align:right">${sprint.task_count}</td>
            </tr>
          </table>
          <a href="${APP_URL}/dashboard"
             style="display:inline-block;background:#6366F1;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">
            Voir le sprint →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">
            ${sprint.start_date} – ${sprint.end_date}
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await resend.emails.send({
    from: FROM,
    to: [MANAGER_EMAIL, sprint.colleague_email],
    subject,
    html,
  })

  // Log the notification
  const supabase = createAdminClient()
  await supabase.from('notification_log').insert({
    sprint_id: sprint.id,
    type: isOver ? 'overload' : 'underload',
    recipient: [MANAGER_EMAIL, sprint.colleague_email].join(', '),
    payload: { load_pct: sprint.load_pct, planned_days: sprint.planned_days, capacity_days: sprint.capacity_days },
  })
}

// ── Weekly sprint summary ─────────────────────────────────────
export async function sendSprintSummary(sprint: SprintSummary) {
  const status = getLoadStatus(sprint.load_pct)

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:32px">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <div style="background:#6366F1;padding:20px 24px">
          <h1 style="color:#fff;margin:0;font-size:18px">⚡ Résumé — ${sprint.name}</h1>
          <p style="color:#c7d2fe;margin:6px 0 0;font-size:13px">${sprint.colleague_name} · ${sprint.start_date} – ${sprint.end_date}</p>
        </div>
        <div style="padding:24px">
          <div style="background:${status.color}18;border:1px solid ${status.color}40;border-radius:8px;padding:14px;margin-bottom:20px;text-align:center">
            <div style="font-size:32px;font-weight:800;color:${status.color}">${sprint.load_pct}%</div>
            <div style="color:${status.color};font-size:13px;font-weight:600">${status.label}</div>
          </div>
          <table style="width:100%;border-collapse:collapse">
            ${[
              ['Capacité', sprint.capacity_days + 'j', '#6366F1'],
              ['Charge planifiée', sprint.planned_days + 'j', status.color],
              ['Tâches complétées', sprint.completed_days + 'j / ' + sprint.planned_days + 'j', '#10B981'],
              ['Nombre de tâches', sprint.task_count.toString(), '#64748B'],
            ].map(([l, v, c], i) => `
              <tr style="${i % 2 === 0 ? 'background:#f8fafc' : ''}">
                <td style="padding:10px 14px;font-size:13px;color:#64748b">${l}</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:700;text-align:right;color:${c}">${v}</td>
              </tr>
            `).join('')}
          </table>
          <a href="${APP_URL}/analytics"
             style="display:inline-block;background:#6366F1;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin-top:20px">
            Voir l'analytics →
          </a>
        </div>
      </div>
    </body>
    </html>
  `

  await resend.emails.send({
    from: FROM,
    to: [MANAGER_EMAIL, sprint.colleague_email],
    subject: `📊 Bilan ${sprint.name} — ${sprint.colleague_name} (${sprint.load_pct}% de charge)`,
    html,
  })

  const supabase = createAdminClient()
  await supabase.from('notification_log').insert({
    sprint_id: sprint.id,
    type: 'sprint_summary',
    recipient: [MANAGER_EMAIL, sprint.colleague_email].join(', '),
    payload: { load_pct: sprint.load_pct, task_count: sprint.task_count },
  })
}
