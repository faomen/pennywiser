// src/lib/motion.jsx
// Sistema central de animações — Revolut/Linear style
// Import: import { AnimatedNumber, PageTransition, Card, Button, Skeleton } from '../lib/motion'

import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

// ── Easings Linear-style ──
export const easeOut = [0.16, 1, 0.3, 1]
export const easeInOut = [0.65, 0, 0.35, 1]

// ── Contador animado para valores monetários ──
export function AnimatedNumber({ value, format = (n) => n.toFixed(2), duration = 0.6 }) {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    spring.set(value)
  }, [value])

  useEffect(() => {
    const unsub = spring.on('change', (v) => setDisplay(v))
    return unsub
  }, [spring])

  return <span>{format(display)}</span>
}

// ── Wrapper de transição de página ──
export function PageTransition({ children, pageKey }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: easeOut }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ── Card com hover/tap sutil ──
export function Card({ children, style, onClick, ...props }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { y: -2, transition: { duration: 0.15 } } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      style={{
        background: 'var(--surface)',
        borderRadius: 14,
        border: '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// ── Botão com feedback tátil ──
export function Button({ children, variant = 'primary', style, ...props }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontSize: 14, fontWeight: 600, padding: '10px 18px', borderRadius: 10,
    border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
  }
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff' },
    ghost: { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
    danger: { background: 'var(--expense-bg, #fff1f2)', color: 'var(--expense, #f43f5e)' },
  }

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ filter: 'brightness(1.05)' }}
      transition={{ duration: 0.12 }}
      style={{ ...base, ...variants[variant], ...style }}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// ── Lista com stagger (aparecem em sequência) ──
export function StaggerList({ children, gap = 8 }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.04 } }
      }}
      style={{ display: 'flex', flexDirection: 'column', gap }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOut } }
      }}
    >
      {children}
    </motion.div>
  )
}

// ── Modal / Bottom sheet animado ──
export function AnimatedModal({ children, onClose, isMobile }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center', zIndex: 50,
        }}
      >
        <motion.div
          onClick={e => e.stopPropagation()}
          initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.28, ease: easeOut }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Skeleton loader ──
export function Skeleton({ width = '100%', height = 16, radius = 6 }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width, height, borderRadius: radius, background: 'var(--surface-2)' }}
    />
  )
}

// ── Checkmark de sucesso animado (SVG path draw) ──
export function SuccessCheck({ size = 48 }) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 52 52">
      <motion.circle
        cx="26" cy="26" r="24" fill="none" stroke="var(--accent)" strokeWidth="3"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: easeOut }}
      />
      <motion.path
        d="M14 27l7 7 16-16" fill="none" stroke="var(--accent)" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: 0.35, ease: easeOut }}
      />
    </motion.svg>
  )
}

// ── Progress bar animada ──
export function AnimatedBar({ pct, color = 'var(--accent)', height = 6 }) {
  return (
    <div style={{ height, background: 'var(--surface-2)', borderRadius: height / 2, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.6, ease: easeOut }}
        style={{ height: '100%', borderRadius: height / 2, background: color }}
      />
    </div>
  )
}

// ── Tap scale wrapper genérico (para envolver qualquer elemento clicável) ──
export function Tappable({ children, ...props }) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} style={{ WebkitTapHighlightColor: 'transparent' }} {...props}>
      {children}
    </motion.div>
  )
}