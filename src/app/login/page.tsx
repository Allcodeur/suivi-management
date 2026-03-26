'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, role: 'colleague' } },
        })
        if (error) throw error
        setError('Vérifiez votre email pour confirmer votre compte.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 800px 600px at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 70%)',
      }} />

      <div style={{
        background: 'var(--surf)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 40, width: '100%', maxWidth: 420,
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>WorkloadIQ</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
            Gestion de charge intelligente
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', background: 'var(--surf2)', borderRadius: 10,
          padding: 3, marginBottom: 24,
        }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: mode === m ? 'var(--primary)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--muted)',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}>
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                Nom complet
              </label>
              <input
                type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Jean Dupont" required style={{ width: '100%' }}
              />
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.com" required style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
              Mot de passe
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6} style={{ width: '100%' }}
            />
          </div>

          {error && (
            <div style={{
              background: error.includes('Vérifiez') ? '#10B98118' : '#EF444418',
              border: `1px solid ${error.includes('Vérifiez') ? '#10B98140' : '#EF444440'}`,
              borderRadius: 8, padding: '10px 14px', fontSize: 13,
              color: error.includes('Vérifiez') ? 'var(--success)' : 'var(--danger)',
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '12px 0',
            fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, fontFamily: 'inherit',
            transition: 'opacity 0.15s',
          }}>
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 20 }}>
          Les comptes Manager doivent être configurés par un administrateur Supabase.
        </p>
      </div>
    </div>
  )
}
