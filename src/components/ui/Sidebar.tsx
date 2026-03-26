'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface Props { profile: Profile }

const NAV = [
  { href: '/dashboard',   icon: '⚡', label: 'Dashboard' },
  { href: '/sprint',      icon: '🗓', label: 'Sprint Planning' },
  { href: '/eisenhower',  icon: '🗺', label: 'Eisenhower' },
  { href: '/analytics',   icon: '📈', label: 'Analytics' },
]

export default function Sidebar({ profile }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = (profile.full_name || profile.email)
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: 'var(--surf)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.5 }}>⚡ WorkloadIQ</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
          {profile.role === 'manager' ? '👔 Manager' : '💼 Collaborateur'}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <a key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 9, marginBottom: 2,
              background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: active ? 'var(--primary)' : 'var(--muted)',
              textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 400,
              transition: 'all 0.15s', border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </a>
          )
        })}
      </nav>

      {/* User profile + logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 9,
          background: 'var(--surf2)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(99,102,241,0.3)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'var(--primary)', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.full_name || profile.email.split('@')[0]}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.email}
            </div>
          </div>
          <button onClick={logout} title="Déconnexion" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 16, padding: 2,
            display: 'flex', alignItems: 'center',
          }}>
            ⇥
          </button>
        </div>
      </div>
    </aside>
  )
}
