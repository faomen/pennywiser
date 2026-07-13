import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { useTransactions } from '../hooks/useTransactions'

const fmt = (n) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6']

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: '1rem 1.25rem' }}>
      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 500, color: color || '#111827' }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

function TxRow({ tx }) {
  const isIncome = tx.type === 'income'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #f3f4f6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: tx.categories?.color ? tx.categories.color + '20' : '#f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
        }}>
          {isIncome ? '💰' : '💸'}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{tx.description || tx.categories?.name || 'Sem descrição'}</p>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{tx.categories?.name} · {new Date(tx.date).toLocaleDateString('pt-PT')}</p>
        </div>
      </div>
      <span style={{ fontSize: 14, fontWeight: 500, color: isIncome ? '#10b981' : '#ef4444' }}>
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

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const balance = income - expenses

  // Dados para gráfico de pizza por categoria
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

  // Dados para gráfico de barras (últimos 6 meses)
  const barData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 1 - (5 - i))
    return { month: MONTHS[d.getMonth()].slice(0, 3), income: 0, expense: 0 }
  })

  const previo = transactions
  barData[5].income = income
  barData[5].expense = expenses

  const recentTx = [...transactions].slice(0, 8)

  const navMonth = (dir) => {
    let m = month + dir, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Dashboard</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navMonth(-1)} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 500, minWidth: 120, textAlign: 'center' }}>{MONTHS[month - 1]} {year}</span>
          <button onClick={() => navMonth(1)} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>›</button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: '#9ca3af' }}>A carregar...</p>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard label="Saldo" value={fmt(balance)} color={balance >= 0 ? '#10b981' : '#ef4444'} />
            <StatCard label="Receitas" value={fmt(income)} color="#10b981" sub={`${transactions.filter(t => t.type === 'income').length} transações`} />
            <StatCard label="Despesas" value={fmt(expenses)} color="#ef4444" sub={`${transactions.filter(t => t.type === 'expense').length} transações`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

            {/* Gráfico barras */}
            <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: '1.25rem' }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: '#374151' }}>Receitas vs Despesas</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} barSize={16}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Bar dataKey="income" fill="#10b981" radius={[4,4,0,0]} name="Receitas" />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico pizza */}
            <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: '1.25rem' }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#374151' }}>Despesas por categoria</p>
              {byCategory.length === 0 ? (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
                  Sem despesas este mês
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} paddingAngle={2}>
                      {byCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top categorias */}
          {byCategory.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: '1.25rem', marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: '#374151' }}>Top categorias</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {byCategory.slice(0, 5).map((cat, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#374151' }}>{cat.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{fmt(cat.value)}</span>
                    </div>
                    <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2 }}>
                      <div style={{ height: 4, borderRadius: 2, background: cat.color || COLORS[i], width: `${Math.round((cat.value / expenses) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimas transações */}
          <div style={{ background: 'white', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: '1.25rem' }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#374151' }}>Últimas transações</p>
            {recentTx.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 13, padding: '1rem 0' }}>Sem transações este mês. Adiciona a primeira em Transações.</p>
            ) : (
              recentTx.map(tx => <TxRow key={tx.id} tx={tx} />)
            )}
          </div>
        </>
      )}
    </div>
  )
}