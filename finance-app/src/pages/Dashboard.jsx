import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { AnimatedNumber, AnimatedBar, StaggerList, StaggerItem, Skeleton } from '../lib/motion'

const fmt = (n) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const ease = [0.16, 1, 0.3, 1]

function useBudgetAlerts(month, year, transactions) {
  return useQuery({
    queryKey: ['budgets', month, year],
    queryFn: async () => {
      const { data, error } = await supabase.from('budgets').select('*, categories(name, color)').eq('month', month).eq('year', year)
      if (error) throw error
      return data.map(b => {
        const spent = transactions.filter(t => t.type === 'expense' && t.category_id === b.category_id).reduce((s, t) => s + Number(t.amount), 0)
        const pct = Math.round((spent / Number(b.amount)) * 100)
        return { ...b, spent, pct }
      }).sort((a, b) => b.pct - a.pct)
    },
    enabled: transactions.length >= 0
  })
}

function StatCard({ label, value, color, sub, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay, ease }}
      className="card" style={{ padding: '1rem 1.25rem' }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: color || 'var(--text-primary)' }}>
        <AnimatedNumber value={value} format={fmt} />
      </p>
      {sub && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
    </motion.div>
  )
}

function BudgetAlert({ budget, delay }) {
  const isOver = budget.pct >= 100
  const isWarn = budget.pct >= 80 && !isOver
  if (!isOver && !isWarn) return null
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.3, ease }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10,
        background: isOver ? 'var(--expense-bg)' : 'var(--warning-bg)', border: `1px solid ${isOver ? 'var(--expense)' : 'var(--warning)'}30` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{isOver ? '🔴' : '🟡'}</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: isOver ? 'var(--expense)' : 'var(--warning)' }}>{budget.categories?.name}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{isOver ? 'Orçamento excedido' : `${budget.pct}% usado`}</p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: isOver ? 'var(--expense)' : 'var(--warning)' }}>{fmt(budget.spent)}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>de {fmt(budget.amount)}</p>
      </div>
    </motion.div>
  )
}

function TxRow({ tx }) {
  const isIncome = tx.type === 'income'
  return (
    <StaggerItem>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: (tx.categories?.color || 'var(--accent)') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            {isIncome ? '💰' : '💸'}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>{tx.description || tx.categories?.name || 'Sem descrição'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{tx.categories?.name} · {new Date(tx.date).toLocaleDateString('pt-PT')}</p>
          </div>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: isIncome ? 'var(--income)' : 'var(--expense)' }}>{isIncome ? '+' : '-'}{fmt(tx.amount)}</span>
      </div>
    </StaggerItem>
  )
}

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const { data: transactions = [], isLoading } = useTransactions({ month, year })
  const { data: budgetAlerts = [] } = useBudgetAlerts(month, year, transactions)

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = income - expenses

  const byCategory = transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
    const name = t.categories?.name || 'Outros'
    const color = t.categories?.color || '#94a3b8'
    const existing = acc.find(a => a.name === name)
    if (existing) existing.value += Number(t.amount)
    else acc.push({ name, value: Number(t.amount), color })
    return acc
  }, []).sort((a, b) => b.value - a.value)

  const activeAlerts = budgetAlerts.filter(b => b.pct >= 80)

  const navMonth = (dir) => {
    let m = month + dir, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  const tooltipStyle = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' } }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navMonth(-1)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>‹</motion.button>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navMonth(1)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>›</motion.button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid-3">
          <Skeleton height={80} radius={12} /><Skeleton height={80} radius={12} /><Skeleton height={80} radius={12} />
        </div>
      ) : (
        <>
          {activeAlerts.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>⚠️ Alertas de orçamento</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeAlerts.map((b, i) => <BudgetAlert key={b.id} budget={b} delay={i * 0.05} />)}
              </div>
            </div>
          )}

          <div className="grid-3" style={{ marginBottom: 24 }}>
            <StatCard label="Saldo" value={balance} color={balance >= 0 ? 'var(--income)' : 'var(--expense)'} delay={0} />
            <StatCard label="Receitas" value={income} color="var(--income)" sub={`${transactions.filter(t => t.type === 'income').length} transações`} delay={0.05} />
            <StatCard label="Despesas" value={expenses} color="var(--expense)" sub={`${transactions.filter(t => t.type === 'expense').length} transações`} delay={0.1} />
          </div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15, ease }}
              className="card" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>Receitas vs Despesas</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[{ month: MONTHS[month - 1].slice(0, 3), income, expense: expenses }]} barSize={24}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => fmt(v)} {...tooltipStyle} />
                  <Bar dataKey="income" fill="var(--income)" radius={[4, 4, 0, 0]} name="Receitas" animationDuration={600} />
                  <Bar dataKey="expense" fill="var(--expense)" radius={[4, 4, 0, 0]} name="Despesas" animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2, ease }}
              className="card" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Por categoria</p>
              {byCategory.length === 0 ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sem despesas este mês</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} paddingAngle={2} animationDuration={600}>
                      {byCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} {...tooltipStyle} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {budgetAlerts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25, ease }}
              className="card" style={{ padding: '1.25rem', marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Orçamentos do mês</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {budgetAlerts.map(b => {
                  const color = b.pct >= 100 ? 'var(--expense)' : b.pct >= 80 ? 'var(--warning)' : 'var(--income)'
                  return (
                    <div key={b.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{b.categories?.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color }}>{fmt(b.spent)} / {fmt(b.amount)} ({b.pct}%)</span>
                      </div>
                      <AnimatedBar pct={b.pct} color={color} />
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3, ease }}
            className="card" style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Últimas transações</p>
            {transactions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '1rem 0' }}>Sem transações este mês.</p>
            ) : (
              <StaggerList gap={0}>
                {transactions.slice(0, 8).map(tx => <TxRow key={tx.id} tx={tx} />)}
              </StaggerList>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}