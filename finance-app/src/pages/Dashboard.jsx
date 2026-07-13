import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { useTransactions } from '../hooks/useTransactions'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const fmt = (n) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function useBudgetAlerts(month, year, transactions) {
  return useQuery({
    queryKey: ['budgets', month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, categories(name, color)')
        .eq('month', month)
        .eq('year', year)
      if (error) throw error
      return data.map(b => {
        const spent = transactions
          .filter(t => t.type === 'expense' && t.category_id === b.category_id)
          .reduce((s, t) => s + Number(t.amount), 0)
        const pct = Math.round((spent / Number(b.amount)) * 100)
        return { ...b, spent, pct }
      }).sort((a, b) => b.pct - a.pct)
    },
    enabled: transactions.length >= 0
  })
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1rem 1.25rem' }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 500, color: color || 'var(--text-primary)' }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

function BudgetAlert({ budget }) {
  const isOver = budget.pct >= 100
  const isWarn = budget.pct >= 80 && !isOver
  if (!isOver && !isWarn) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 8,
      background: isOver ? 'var(--danger-bg)' : 'var(--warning-bg)',
      border: `1px solid ${isOver ? 'var(--danger)' : 'var(--warning)'}20`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{isOver ? '🔴' : '🟡'}</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: isOver ? 'var(--danger)' : 'var(--warning)' }}>
            {budget.categories?.name}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
            {isOver ? 'Orçamento excedido' : `${budget.pct}% do orçamento usado`}
          </p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: isOver ? 'var(--danger)' : 'var(--warning)' }}>{fmt(budget.spent)}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>de {fmt(budget.amount)}</p>
      </div>
    </div>
  )
}

function TxRow({ tx }) {
  const isIncome = tx.type === 'income'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: (tx.categories?.color || '#6366f1') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
          {isIncome ? '💰' : '💸'}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>{tx.description || tx.categories?.name || 'Sem descrição'}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{tx.categories?.name} · {new Date(tx.date).toLocaleDateString('pt-PT')}</p>
        </div>
      </div>
      <span style={{ fontSize: 14, fontWeight: 500, color: isIncome ? 'var(--success)' : 'var(--danger)' }}>
        {isIncome ? '+' : '-'}{fmt(tx.amount)}
      </span>
    </div>
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

  const byCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const name = t.categories?.name || 'Outros'
      const color = t.categories?.color || '#94a3b8'
      const existing = acc.find(a => a.name === name)
      if (existing) existing.value += Number(t.amount)
      else acc.push({ name, value: Number(t.amount), color })
      return acc
    }, [])
    .sort((a, b) => b.value - a.value)

  const activeAlerts = budgetAlerts.filter(b => b.pct >= 80)

  const navMonth = (dir) => {
    let m = month + dir, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  const tooltipStyle = {
    contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>Dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navMonth(-1)} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>‹</button>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '6px 8px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '6px 8px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => navMonth(1)} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>›</button>
        </div>
      </div>

      {isLoading ? <p style={{ color: 'var(--text-muted)' }}>A carregar...</p> : (
        <>
          {activeAlerts.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>⚠️ Alertas de orçamento</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeAlerts.map(b => <BudgetAlert key={b.id} budget={b} />)}
              </div>
            </div>
          )}

          <div className="grid-3" style={{ marginBottom: 24 }}>
            <StatCard label="Saldo" value={fmt(balance)} color={balance >= 0 ? 'var(--success)' : 'var(--danger)'} />
            <StatCard label="Receitas" value={fmt(income)} color="var(--success)" sub={`${transactions.filter(t => t.type === 'income').length} transações`} />
            <StatCard label="Despesas" value={fmt(expenses)} color="var(--danger)" sub={`${transactions.filter(t => t.type === 'expense').length} transações`} />
          </div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1.25rem' }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: 'var(--text-secondary)' }}>Receitas vs Despesas</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[{ month: MONTHS[month-1].slice(0,3), income, expense: expenses }]} barSize={24}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => fmt(v)} {...tooltipStyle} />
                  <Bar dataKey="income" fill="var(--success)" radius={[4,4,0,0]} name="Receitas" />
                  <Bar dataKey="expense" fill="var(--danger)" radius={[4,4,0,0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1.25rem' }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--text-secondary)' }}>Por categoria</p>
              {byCategory.length === 0 ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Sem despesas este mês</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} paddingAngle={2}>
                      {byCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} {...tooltipStyle} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {budgetAlerts.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1.25rem', marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: 'var(--text-secondary)' }}>Orçamentos do mês</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {budgetAlerts.map(b => {
                  const color = b.pct >= 100 ? 'var(--danger)' : b.pct >= 80 ? 'var(--warning)' : 'var(--success)'
                  return (
                    <div key={b.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{b.categories?.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color }}>{fmt(b.spent)} / {fmt(b.amount)} ({b.pct}%)</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3 }}>
                        <div style={{ height: 5, borderRadius: 3, background: color, width: `${Math.min(100, b.pct)}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1.25rem' }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Últimas transações</p>
            {transactions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '1rem 0' }}>Sem transações este mês.</p>
            ) : (
              transactions.slice(0, 8).map(tx => <TxRow key={tx.id} tx={tx} />)
            )}
          </div>
        </>
      )}
    </div>
  )
}