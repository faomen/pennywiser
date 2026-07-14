import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Goals from './pages/Goals'
import Shared from './pages/Shared'
import Settings from './pages/Settings'
import Portfolio from './pages/Portfolio'
import JoinGroup from './pages/JoinGroup'

const ease = [0.16, 1, 0.3, 1]

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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="login-panel" style={{
        display: 'none', flex: 1,
        background: 'linear-gradient(160deg, #064e3b 0%, #065f46 40%, #047857 100%)',
        padding: '48px', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease }}
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 700 }}>P</div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Pennywiser</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease }}>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.03em', marginBottom: 16 }}>
            O teu dinheiro,<br />organizado.
          </p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Controla despesas, define objetivos de poupança e divide contas com quem queres.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }}
          style={{ display: 'flex', gap: 24 }}>
          {[['📊', 'Dashboard'], ['🎯', 'Objetivos'], ['👥', 'Partilhadas']].map(([e, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{e}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{l}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}
          style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#fff', fontWeight: 700, boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            }}>P</div>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Pennywiser</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={isSignUp ? 'signup' : 'signin'} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
                {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
                {isSignUp ? 'Começa a controlar as tuas finanças hoje.' : 'Entra na tua conta para continuar.'}
              </p>
            </motion.div>
          </AnimatePresence>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" placeholder="o@teu.email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14 }} />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--expense-bg)', border: '1px solid var(--expense)', fontSize: 13, color: 'var(--expense)', overflow: 'hidden' }}>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading} style={{
              marginTop: 4, padding: '13px', borderRadius: 10,
              background: loading ? 'var(--accent-bg)' : 'var(--accent)',
              color: loading ? 'var(--accent)' : '#fff',
              border: 'none', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '-0.01em',
            }}>
              {loading ? 'A processar...' : isSignUp ? 'Criar conta' : 'Entrar'}
            </motion.button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
            {isSignUp ? 'Já tens conta?' : 'Não tens conta?'}{' '}
            <span onClick={() => { setIsSignUp(!isSignUp); setError('') }} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>
              {isSignUp ? 'Entrar' : 'Criar conta'}
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease }}
      >
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/shared" element={<Shared />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/join/:token" element={<JoinGroup />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--accent-bg)', borderTop: '3px solid var(--accent)' }} />
    </div>
  )

  if (!session) return <LoginPage />

  return (
    <BrowserRouter>
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </BrowserRouter>
  )
}