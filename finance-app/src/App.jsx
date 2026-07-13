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
    const fn = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password })
    const { error } = await fn
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb' }}>
      <div style={{ width: 360, padding: 32, background: 'white', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>💰 Pennywiser</h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
          {isSignUp ? 'Criar conta' : 'Entrar na tua conta'}
        </p>
        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none' }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '10px 12px', borderRadius: 8, background: '#6366f1', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            {loading ? 'A processar...' : isSignUp ? 'Criar conta' : 'Entrar'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' }}>
          {isSignUp ? 'Já tens conta?' : 'Não tens conta?'}{' '}
          <span onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#6366f1', cursor: 'pointer' }}>
            {isSignUp ? 'Entrar' : 'Criar conta'}
          </span>
        </p>
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