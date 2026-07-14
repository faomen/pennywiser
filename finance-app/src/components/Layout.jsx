import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDarkMode } from '../context/DarkMode'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

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
  { to: '/portfolio',    emoji: '📈', text: 'Portfolio' },
  { to: '/shared',       emoji: '👥', text: 'Partilhadas' },
  { to: '/settings',     emoji: '⚙️', text: 'Definições' },
]

const TAB_HEIGHT = 64

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { dark, toggle } = useDarkMode()
  const isMobile = useIsMobile()
  const activeIndex = Math.max(0, NAV.findIndex(n => location.pathname.startsWith(n.to)))

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (isMobile) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>
      <header style={{
        flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 20px', height: 56, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.div
            whileTap={{ scale: 0.92 }}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#fff', fontWeight: 700,
            }}>P</motion.div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Pennywiser
          </span>
        </div>
        <motion.button whileTap={{ scale: 0.9, rotate: 15 }} onClick={toggle} style={{
          background: 'var(--surface-2)', border: 'none', width: 40, height: 40, borderRadius: 10,
          cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {dark ? '☀️' : '🌙'}
        </motion.button>
      </header>

      <main style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 16px',
        paddingBottom: `${TAB_HEIGHT + 16}px`, WebkitOverflowScrolling: 'touch',
      }}>
        {children}
      </main>

      <nav style={{
        flexShrink: 0, position: 'fixed', bottom: 0, left: 0, right: 0, height: TAB_HEIGHT,
        background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)', zIndex: 50,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
      }}>
        <motion.div
          animate={{ left: `${(100 / NAV.length) * activeIndex}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          style={{ position: 'absolute', top: 0, width: `${100 / NAV.length}%`, height: 2, background: 'var(--accent)', borderRadius: '0 0 2px 2px' }}
        />
        {NAV.map(({ to, emoji, text }) => (
          <NavLink key={to} to={to} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', gap: 3, paddingTop: 6, minHeight: TAB_HEIGHT,
            WebkitTapHighlightColor: 'transparent', color: 'var(--text-muted)',
          }}>
            {({ isActive }) => (
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                <span style={{ fontSize: 21, lineHeight: 1 }}>{emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '-0.01em' }}>{text}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{
        width: 232, flexShrink: 0, borderRight: '1px solid var(--border)', padding: '20px 12px',
        display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--surface)',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '4px 8px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', fontWeight: 700, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
          }}>P</div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>Pennywiser</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, margin: 0 }}>gestão financeira</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, position: 'relative' }}>
          {NAV.map(({ to, emoji, text }) => (
            <NavLink key={to} to={to} style={{ position: 'relative', textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{ position: 'relative' }}>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      style={{ position: 'absolute', inset: 0, background: 'var(--accent-bg)', borderRadius: 8 }}
                    />
                  )}
                  <div style={{
                    position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8, fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                    <span>{emoji}</span><span>{text}</span>
                  </div>
                </div>
              )}
            </NavLink>
          ))}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 1, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={toggle} style={{
            padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%',
          }}>
            <span>{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Modo claro' : 'Modo escuro'}</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={signOut} style={{
            padding: '9px 12px', borderRadius: 8, border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', width: '100%',
          }}>
            <span>🚪</span><span>Sair</span>
          </motion.button>
        </div>
      </nav>

      <main style={{ flex: 1, padding: '2rem', overflow: 'auto', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}