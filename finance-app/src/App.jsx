import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Goals from './pages/Goals'
import Shared from './pages/Shared'
import JoinGroup from './pages/JoinGroup'
import Settings from './pages/Settings'


// LoginPage — cola dentro do App.jsx substituindo o componente LoginPage existente

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: 'var(--bg)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        display: 'none',
        flex: 1,
        background: 'linear-gradient(160deg, #064e3b 0%, #065f46 40%, #047857 100%)',
        padding: '48px',
        flexDirection: 'column',
        justifyContent: 'space-between',
        // only show on desktop via media query — handled inline for simplicity
      }} className="login-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 700, fontFamily: 'var(--font-display)' }}>P</div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Pennywiser</span>
        </div>
        <div>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: 16 }}>
            O teu dinheiro,<br />organizado.
          </p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Controla despesas, define objetivos de poupança e divide contas com quem queres — tudo num só lugar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['📊', 'Dashboard'], ['🎯', 'Objetivos'], ['👥', 'Partilhadas']].map(([e, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{e}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: '100%', maxWidth: 440,
        margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#fff', fontWeight: 700,
              fontFamily: 'var(--font-display)',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            }}>P</div>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Pennywiser
            </span>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
            {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
            {isSignUp ? 'Começa a controlar as tuas finanças hoje.' : 'Entra na tua conta para continuar.'}
          </p>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email" placeholder="o@teu.email" value={email}
                onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Password</label>
              <input
                type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14 }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--expense-bg)', border: '1px solid var(--expense)', fontSize: 13, color: 'var(--expense)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop: 4,
              padding: '13px',
              borderRadius: 10,
              background: loading ? 'var(--accent-bg)' : 'var(--accent)',
              color: loading ? 'var(--accent)' : '#fff',
              border: 'none', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.15s',
              letterSpacing: '-0.01em',
            }}>
              {loading ? 'A processar...' : isSignUp ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
            {isSignUp ? 'Já tens conta?' : 'Não tens conta?'}{' '}
            <span
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
            >
              {isSignUp ? 'Entrar' : 'Criar conta'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      A carregar...
    </div>
  )

  if (!session) return <LoginPage />

  return (
    <BrowserRouter>
      <Layout session={session}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/shared" element={<Shared />} />
          <Route path="/join/:token" element={<JoinGroup />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}