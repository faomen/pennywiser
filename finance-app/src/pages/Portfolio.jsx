// src/pages/Portfolio.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts'

const fmt = (n, decimals = 2) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals }).format(n)
const fmtPct = (n) => `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`

const TYPE_COLORS = { etf: '#10b981', stock: '#6366f1', crypto: '#f59e0b', other: '#94a3b8' }
const TYPE_LABELS = { etf: 'ETF', stock: 'Ação', crypto: 'Cripto', other: 'Outro' }

// ─── Hooks ────────────────────────────────────────────────────
function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_summary')
        .select('*')
        .order('market_value', { ascending: false })
      if (error) throw error
      return data
    },
    refetchInterval: 60000 // atualiza a cada minuto
  })
}

function usePortfolioTx() {
  return useQuery({
    queryKey: ['portfolio_tx'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    }
  })
}

function useAddPosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pos) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('portfolio_positions')
        .upsert({ ...pos, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id,isin' })
        .select().single()
      if (error) throw error
      // Regista transação de compra
      await supabase.from('portfolio_transactions').insert({
        user_id: user.id,
        position_id: data.id,
        isin: pos.isin,
        type: 'buy',
        quantity: pos.quantity,
        price: pos.avg_price,
        total: pos.quantity * pos.avg_price,
        date: new Date().toISOString().split('T')[0],
      })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] })
  })
}

function useDeletePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('portfolio_positions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] })
  })
}

function useRefreshPrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isin }) => {
      // Chama a Edge Function para buscar preço atual
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trade-republic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ action: 'price', isin })
      })
      if (!res.ok) throw new Error('Erro ao buscar preço')
      const { data } = await res.json()
      const price = data?.last?.price || data?.close?.price

      if (price) {
        await supabase.from('portfolio_positions')
          .update({ current_price: price, last_synced: new Date().toISOString() })
          .eq('id', id)
        // Guarda no histórico
        await supabase.from('portfolio_price_history').insert({ position_id: id, price })
      }
      return price
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portfolio'] })
  })
}

// ─── Add Position Form ────────────────────────────────────────
function AddPositionForm({ onClose }) {
  const addPos = useAddPosition()
  const [form, setForm] = useState({ isin: '', ticker: '', name: '', type: 'etf', quantity: '', avg_price: '', currency: 'EUR' })
  const [searching, setSearching] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inputStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, width: '100%', outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }
  const labelStyle = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block', fontWeight: 500 }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await addPos.mutateAsync({ ...form, quantity: parseFloat(form.quantity), avg_price: parseFloat(form.avg_price) })
    onClose()
  }

  const totalInvested = (parseFloat(form.quantity) || 0) * (parseFloat(form.avg_price) || 0)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Adicionar posição</h3>
          <button onClick={onClose} style={{ background: 'var(--surface-2)', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tipo */}
          <div>
            <label style={labelStyle}>Tipo de ativo</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('type', v)}
                  style={{ padding: '8px 4px', borderRadius: 8, border: `2px solid ${form.type === v ? TYPE_COLORS[v] : 'var(--border)'}`, background: form.type === v ? TYPE_COLORS[v] + '20' : 'var(--surface)', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: form.type === v ? TYPE_COLORS[v] : 'var(--text-muted)', transition: 'all 0.15s' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>ISIN</label>
            <input type="text" placeholder="Ex: IE00B3RBWM25" value={form.isin}
              onChange={e => set('isin', e.target.value.toUpperCase())} required style={inputStyle} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Encontras o ISIN na app do Trade Republic, nos detalhes do ativo
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Ticker (opcional)</label>
              <input type="text" placeholder="Ex: VWCE" value={form.ticker}
                onChange={e => set('ticker', e.target.value.toUpperCase())} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Moeda</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} style={inputStyle}>
                <option value="EUR">EUR €</option>
                <option value="USD">USD $</option>
                <option value="GBP">GBP £</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Nome do ativo</label>
            <input type="text" placeholder="Ex: Vanguard FTSE All-World UCITS ETF" value={form.name}
              onChange={e => set('name', e.target.value)} required style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Quantidade</label>
              <input type="number" step="0.00000001" min="0" placeholder="0.00" value={form.quantity}
                onChange={e => set('quantity', e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Preço médio (€)</label>
              <input type="number" step="0.0001" min="0" placeholder="0.00" value={form.avg_price}
                onChange={e => set('avg_price', e.target.value)} required style={inputStyle} />
            </div>
          </div>

          {totalInvested > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Total investido</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', margin: 0, fontFamily: 'var(--font-display)' }}>{fmt(totalInvested)}</p>
            </div>
          )}

          <button type="submit" disabled={addPos.isPending}
            style={{ padding: '12px', borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
            {addPos.isPending ? 'A guardar...' : 'Adicionar posição'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Position Card ────────────────────────────────────────────
function PositionCard({ pos, onDelete, onRefresh }) {
  const pnl = Number(pos.unrealized_pnl) || 0
  const pnlPct = Number(pos.pnl_pct) || 0
  const isPositive = pnl >= 0
  const marketValue = Number(pos.market_value) || 0
  const costBasis = Number(pos.cost_basis) || 0

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: TYPE_COLORS[pos.type] + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            {pos.type === 'etf' ? '📈' : pos.type === 'stock' ? '🏢' : pos.type === 'crypto' ? '₿' : '💼'}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              {pos.ticker || pos.isin}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pos.name}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: TYPE_COLORS[pos.type] + '20', color: TYPE_COLORS[pos.type], fontWeight: 600 }}>
            {TYPE_LABELS[pos.type]}
          </span>
          <button onClick={() => onRefresh(pos)} title="Atualizar preço"
            style={{ background: 'var(--surface-2)', border: 'none', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ↻
          </button>
          <button onClick={() => { if (confirm(`Remover ${pos.ticker || pos.name}?`)) onDelete(pos.id) }}
            style={{ background: 'var(--surface-2)', border: 'none', width: 28, height: 28, borderRadius: 6, cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor atual</p>
          <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {fmt(marketValue)}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investido</p>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-secondary)' }}>
            {fmt(costBasis)}
          </p>
        </div>
        <div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>P&L</p>
          <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: isPositive ? 'var(--income)' : 'var(--expense)' }}>
            {fmtPct(pnlPct)}
          </p>
        </div>
      </div>

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Number(pos.quantity).toFixed(4)} unid.</span>
          {pos.current_price && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>@ {fmt(pos.current_price, 4)}</span>
          )}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: isPositive ? 'var(--income)' : 'var(--expense)' }}>
          {isPositive ? '+' : ''}{fmt(pnl)}
        </span>
      </div>

      {pos.last_synced && (
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right' }}>
          Atualizado {new Date(pos.last_synced).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function Portfolio() {
  const { data: positions = [], isLoading } = usePortfolio()
  const { data: transactions = [] } = usePortfolioTx()
  const deletePos = useDeletePosition()
  const refreshPrice = useRefreshPrice()
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState('positions') // positions | history
  const [refreshingId, setRefreshingId] = useState(null)

  const totalInvested = positions.reduce((s, p) => s + Number(p.cost_basis), 0)
  const totalValue = positions.reduce((s, p) => s + Number(p.market_value), 0)
  const totalPnl = totalValue - totalInvested
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0

  const byType = Object.entries(
    positions.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + Number(p.market_value)
      return acc
    }, {})
  ).map(([type, value]) => ({ name: TYPE_LABELS[type], value, color: TYPE_COLORS[type] }))

  const handleRefresh = async (pos) => {
    setRefreshingId(pos.id)
    try {
      await refreshPrice.mutateAsync({ id: pos.id, isin: pos.isin })
    } catch (e) {
      alert(`Erro ao atualizar preço: ${e.message}`)
    }
    setRefreshingId(null)
  }

  const handleRefreshAll = async () => {
    for (const pos of positions) {
      await handleRefresh(pos)
    }
  }

  const tooltipStyle = {
    contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {showForm && <AddPositionForm onClose={() => setShowForm(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Portfolio</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>Trade Republic · sincronização manual</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleRefreshAll} disabled={positions.length === 0}
            style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            ↻ Atualizar preços
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Posição
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { label: 'Valor total', value: fmt(totalValue), color: 'var(--text-primary)' },
          { label: 'Total investido', value: fmt(totalInvested), color: 'var(--text-secondary)' },
          { label: 'P&L total', value: `${totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)} (${fmtPct(totalPnlPct)})`, color: totalPnl >= 0 ? 'var(--income)' : 'var(--expense)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '1rem 1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: 0, fontFamily: 'var(--font-display)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {positions.length > 0 && (
        <div className="grid-2" style={{ marginBottom: 24 }}>
          {/* Alocação por tipo */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Alocação por tipo</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} paddingAngle={3}>
                  {byType.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {byType.map(t => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.name} · {((t.value / totalValue) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top performers */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Posições por peso</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {positions.slice(0, 5).map(p => {
                const weight = totalValue > 0 ? (Number(p.market_value) / totalValue) * 100 : 0
                return (
                  <div key={p.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{p.ticker || p.isin}</span>
                      <span style={{ fontSize: 12, color: Number(p.pnl_pct) >= 0 ? 'var(--income)' : 'var(--expense)', fontWeight: 600 }}>
                        {fmtPct(p.pnl_pct)}
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 2 }}>
                      <div style={{ height: 4, borderRadius: 2, background: TYPE_COLORS[p.type], width: `${weight}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['positions', 'Posições'], ['history', 'Histórico']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${tab === v ? 'var(--accent)' : 'var(--border)'}`, background: tab === v ? 'var(--accent-bg)' : 'var(--surface)', color: tab === v ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: tab === v ? 600 : 400 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Posições */}
      {tab === 'positions' && (
        isLoading ? (
          <p style={{ color: 'var(--text-muted)' }}>A carregar...</p>
        ) : positions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>📈</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>Sem posições ainda.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16, maxWidth: 300, margin: '0 auto 16px' }}>
              Adiciona as tuas posições manualmente com o ISIN — encontras na app do Trade Republic.
            </p>
            <button onClick={() => setShowForm(true)}
              style={{ padding: '10px 24px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              + Adicionar posição
            </button>
          </div>
        ) : (
          <div className="grid-2">
            {positions.map(p => (
              <PositionCard
                key={p.id} pos={p}
                onDelete={(id) => deletePos.mutate(id)}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )
      )}

      {/* Histórico */}
      {tab === 'history' && (
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {transactions.length === 0 ? (
            <p style={{ padding: '2rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Sem transações registadas.</p>
          ) : (
            transactions.map((tx, i) => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{tx.type === 'buy' ? '📥' : tx.type === 'sell' ? '📤' : tx.type === 'dividend' ? '💸' : '✂️'}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>
                      {tx.type === 'buy' ? 'Compra' : tx.type === 'sell' ? 'Venda' : tx.type === 'dividend' ? 'Dividendo' : 'Split'} · {tx.isin}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                      {Number(tx.quantity).toFixed(4)} unid. @ {fmt(tx.price)} · {new Date(tx.date).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: tx.type === 'buy' ? 'var(--expense)' : 'var(--income)' }}>
                  {tx.type === 'buy' ? '-' : '+'}{fmt(tx.total)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}