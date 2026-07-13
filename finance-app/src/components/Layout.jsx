import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDarkMode } from '../context/DarkMode'
import { useEffect, useState } from 'react'

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

const NAV = [
  { to: '/dashboard',    emoji: '📊', text: 'Dashboard' },
  { to: '/transactions', emoji: '💳', text: 'Transações' },
  { to: '/goals',        emoji: '🎯', text: 'Objetivos' },
  { to: '/shared',       emoji: '👥', text: 'Partilhadas' },
  { to: '/settings',     emoji: '⚙️', text: 'Definições' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { dark, toggle } = useDarkMode()
  const isMobile = useIsMobile()

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (isMobile) return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Mobile header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>💰 Pennywiser</h1>
        <button onClick={toggle} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4 }}>
          {dark ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, padding: '16px', paddingBottom: 80, overflowY: 'auto' }}>
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        display: 'flex', paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        {NAV.map(({ to, emoji, text }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '8px 4px', textDecoration: 'none', gap: 2,
            color: isActive ? 'var(--accent)' : 'var(--text-muted)',
            borderTop: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.15s'
          })}>
            <span style={{ fontSize: 20 }}>{emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 500 }}>{text}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )

  // Desktop layout — igual ao anterior
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{
        width: 220, borderRight: '1px solid var(--border)',
        padding: '1.5rem 0.75rem',
        display: 'flex', flexDirection: 'column', gap: 4,
        background: 'var(--surface)',
        position: 'sticky', top: 0, height: '100vh'
      }}>
        <div style={{ padding: '0 0.5rem', marginBottom: 24 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>💰 Pennywiser</h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>gestão financeira</p>
        </div>

        {NAV.map(({ to, emoji, text }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, fontWeight: isActive ? 500 : 400,
            color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
            background: isActive ? 'var(--accent-bg)' : 'transparent',
            transition: 'all 0.15s'
          })}>
            <span>{emoji}</span><span>{text}</span>
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={toggle} style={{
            padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%'
          }}>
            <span>{dark ? '☀️' : '🌙'}</span><span>{dark ? 'Modo claro' : 'Modo escuro'}</span>
          </button>
          <button onClick={signOut} style={{
            padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%'
          }}>
            <span>🚪</span><span>Sair</span>
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}