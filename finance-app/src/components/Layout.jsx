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

const TAB_HEIGHT = 64

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { dark, toggle } = useDarkMode()
  const isMobile = useIsMobile()

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (isMobile) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        flexShrink: 0,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark, #059669))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 700,
          }}>P</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Pennywiser
          </span>
        </div>
        <button onClick={toggle} style={{
          background: 'var(--surface-2)', border: 'none',
          width: 40, height: 40, borderRadius: 10,
          cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {dark ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Scrollable content */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '16px 16px',
        paddingBottom: `${TAB_HEIGHT + 16}px`,
        WebkitOverflowScrolling: 'touch',
      }}>
        {children}
      </main>

      {/* Tab bar */}
      <nav style={{
        flexShrink: 0,
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: TAB_HEIGHT,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 50,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
      }}>
        {NAV.map(({ to, emoji, text }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none',
            gap: 3,
            paddingTop: 6,
            color: isActive ? 'var(--accent)' : 'var(--text-muted)',
            borderTop: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
            minHeight: TAB_HEIGHT,
            WebkitTapHighlightColor: 'transparent',
          })}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '-0.01em' }}>{text}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )

  // Desktop
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{
        width: 232, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        padding: '20px 12px',
        display: 'flex', flexDirection: 'column', gap: 2,
        background: 'var(--surface)',
        position: 'sticky', top: 0, height: '100vh',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '4px 8px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 700, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
          }}>P</div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>Pennywiser</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>gestão financeira</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV.map(({ to, emoji, text }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8,
              textDecoration: 'none', fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              background: isActive ? 'var(--accent-bg)' : 'transparent',
              transition: 'all 0.15s',
            })}>
              <span>{emoji}</span><span>{text}</span>
            </NavLink>
          ))}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 1, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button onClick={toggle} style={{
            padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%',
          }}>
            <span>{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Modo claro' : 'Modo escuro'}</span>
          </button>
          <button onClick={signOut} style={{
            padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%',
          }}>
            <span>🚪</span><span>Sair</span>
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem', overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}