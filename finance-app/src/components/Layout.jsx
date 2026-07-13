import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDarkMode } from '../context/DarkMode'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { dark, toggle } = useDarkMode()

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const nav = [
    { to: '/dashboard',    label: '📊', text: 'Dashboard' },
    { to: '/transactions', label: '💳', text: 'Transações' },
    { to: '/goals',        label: '🎯', text: 'Objetivos' },
    { to: '/shared',       label: '👥', text: 'Partilhadas' },
    { to: '/settings',     label: '⚙️', text: 'Definições' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <nav style={{
        width: 220, borderRight: '1px solid var(--border)',
        padding: '1.5rem 0.75rem',
        display: 'flex', flexDirection: 'column', gap: 4,
        background: 'var(--surface)',
        position: 'sticky', top: 0, height: '100vh'
      }}>
        {/* Logo */}
        <div style={{ padding: '0 0.5rem', marginBottom: 24 }}>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            💰 Pennywiser
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>gestão financeira</p>
        </div>

        {/* Nav links */}
        {nav.map(({ to, label, text }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            padding: '9px 12px',
            borderRadius: 8,
            textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, fontWeight: isActive ? 500 : 400,
            color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
            background: isActive ? 'var(--accent-bg)' : 'transparent',
            transition: 'all 0.15s'
          })}>
            <span>{label}</span>
            <span>{text}</span>
          </NavLink>
        ))}

        {/* Bottom actions */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Dark mode toggle */}
          <button onClick={toggle} style={{
            padding: '9px 12px', borderRadius: 8,
            border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 13,
            color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 10,
            textAlign: 'left', width: '100%',
            transition: 'all 0.15s'
          }}>
            <span>{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Modo claro' : 'Modo escuro'}</span>
          </button>

          <button onClick={signOut} style={{
            padding: '9px 12px', borderRadius: 8,
            border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 13,
            color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 10,
            textAlign: 'left', width: '100%'
          }}>
            <span>🚪</span>
            <span>Sair</span>
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}