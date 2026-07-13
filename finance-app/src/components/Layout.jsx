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
  { to: '/dashboard',    icon: '▦',  text: 'Dashboard' },
  { to: '/transactions', icon: '↕',  text: 'Transações' },
  { to: '/goals',        icon: '◎',  text: 'Objetivos' },
  { to: '/shared',       icon: '⊕',  text: 'Partilhadas' },
  { to: '/settings',     icon: '◈',  text: 'Definições' },
]

const navLinkStyle = (isActive) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 12px', borderRadius: 8,
  textDecoration: 'none', fontSize: 13,
  fontWeight: isActive ? 600 : 400,
  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
  background: isActive ? 'var(--accent-bg)' : 'transparent',
  transition: 'all 0.15s',
  letterSpacing: isActive ? '-0.01em' : 'normal',
})

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
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px',
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff', fontWeight: 700,
            fontFamily: 'var(--font-display)'
          }}>P</div>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Pennywiser
          </span>
        </div>
        <button onClick={toggle} style={{
          background: 'var(--surface-2)', border: 'none',
          width: 34, height: 34, borderRadius: 8,
          cursor: 'pointer', fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {dark ? '☀️' : '🌙'}
        </button>
      </header>

      <main style={{ flex: 1, padding: '16px', paddingBottom: 72 }}>
        {children}
      </main>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
      }}>
        {NAV.map(({ to, text }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '8px 2px 6px', textDecoration: 'none', gap: 3,
            color: isActive ? 'var(--accent)' : 'var(--text-muted)',
            position: 'relative',
          })}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <div style={{
                    position: 'absolute', top: 0, left: '20%', right: '20%',
                    height: 2, background: 'var(--accent)',
                    borderRadius: '0 0 2px 2px',
                  }} />
                )}
                <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400, marginTop: 2, letterSpacing: '-0.01em' }}>
                  {text}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )

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
        {/* Logo */}
        <div style={{ padding: '4px 8px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 700,
            fontFamily: 'var(--font-display)', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
          }}>P</div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Pennywiser
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>gestão financeira</p>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV.map(({ to, text }) => (
            <NavLink key={to} to={to} style={({ isActive }) => navLinkStyle(isActive)}>
              <span>{text}</span>
            </NavLink>
          ))}
        </div>

        {/* Bottom */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 1, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button onClick={toggle} style={{
            padding: '9px 12px', borderRadius: 8,
            border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 10,
            textAlign: 'left', width: '100%', fontFamily: 'var(--font-body)',
            transition: 'all 0.15s',
          }}>
            <span>{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Modo claro' : 'Modo escuro'}</span>
          </button>
          <button onClick={signOut} style={{
            padding: '9px 12px', borderRadius: 8,
            border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 10,
            textAlign: 'left', width: '100%', fontFamily: 'var(--font-body)',
            transition: 'all 0.15s',
          }}>
            <span>←</span><span>Sair</span>
          </button>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem', overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}