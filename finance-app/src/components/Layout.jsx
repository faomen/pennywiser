import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Layout({ children, session }) {
  const navigate = useNavigate()

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 220, borderRight: '1px solid #e5e7eb', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>💰 Pennywiser</h1>
        {[
          { to: '/dashboard', label: '📊 Dashboard' },
          { to: '/transactions', label: '💳 Transações' },
          { to: '/goals', label: '🎯 Objetivos' },
          { to: '/shared', label: '👥 Partilhadas' },
          { to: '/settings', label: '⚙️ Definições' },
        ].map(({ to, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({ padding: '8px 12px', borderRadius: 8, textDecoration: 'none', color: isActive ? '#6366f1' : '#374151', background: isActive ? '#eef2ff' : 'transparent', fontSize: 14 })}>
            {label}
          </NavLink>
        ))}
        <button onClick={signOut} style={{ marginTop: 'auto', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'none', cursor: 'pointer', fontSize: 14, textAlign: 'left' }}>
          Sair
        </button>
      </nav>
      <main style={{ flex: 1, padding: '2rem' }}>{children}</main>
    </div>
  )
}