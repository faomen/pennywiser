import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const fmt = (n) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)

const ASSET_TYPES = {
  etf:      { label: 'ETF', emoji: '📈' },
  imovel:   { label: 'Imóvel', emoji: '🏠' },
  deposito: { label: 'Depósito a prazo', emoji: '🏦' },
  ppr:      { label: 'PPR', emoji: '🛡️' },
  acoes:    { label: 'Ações', emoji: '📊' },
  cripto:   { label: 'Cripto', emoji: '₿' },
  outro:    { label: 'Outro', emoji: '💼' },
}

function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*, goal_contributions(amount, date)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })
}

function useAddGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (goal) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('goals').insert({ ...goal, user_id: user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] })
  })
}

function useAddContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goal_id, amount, note }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('goal_contributions')
        .insert({ goal_id, amount, note, user_id: user.id, date: new Date().toISOString().split('T')[0] })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] })
  })
}

function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] })
  })
}

// Projeção com juro composto
function project(current, monthly, rate, months) {
  const r = rate / 100 / 12
  if (r === 0) return current + monthly * months
  return current * Math.pow(1 + r, months) + monthly * ((Math.pow(1 + r, months) - 1) / r)
}

function GoalForm({ onClose }) {
  const addGoal = useAddGoal()
  const [form, setForm] = useState({
    name: '', type: 'savings', asset_type: 'outro',
    target_amount: '', current_amount: '', monthly_contrib: '',
    estimated_return: '0', deadline: '', color: 'var(--accent)', notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inputStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, width: '100%', outline: 'none', background: 'var(--surface)' }
  const labelStyle = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await addGoal.mutateAsync({
      ...form,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount || 0),
      monthly_contrib: form.monthly_contrib ? parseFloat(form.monthly_contrib) : null,
      estimated_return: parseFloat(form.estimated_return || 0),
    })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Novo objetivo</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['savings','🐷 Poupança'],['investment','📈 Investimento']].map(([v,l]) => (
              <button key={v} type="button" onClick={() => set('type', v)}
                style={{ padding: 8, borderRadius: 8, border: `2px solid ${form.type === v ? 'var(--accent)' : 'var(--border)'}`, background: form.type === v ? 'var(--accent-bg)' : 'var(--surface)', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: form.type === v ? 'var(--accent)' : 'var(--text-muted)' }}>
                {l}
              </button>
            ))}
          </div>

          <div>
            <label style={labelStyle}>Nome do objetivo</label>
            <input type="text" placeholder="Ex: Fundo de emergência" value={form.name} onChange={e => set('name', e.target.value)} required style={inputStyle} />
          </div>

          {form.type === 'investment' && (
            <div>
              <label style={labelStyle}>Tipo de ativo</label>
              <select value={form.asset_type} onChange={e => set('asset_type', e.target.value)} style={inputStyle}>
                {Object.entries(ASSET_TYPES).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Meta (€)</label>
              <input type="number" step="0.01" min="1" placeholder="10000" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Valor atual (€)</label>
              <input type="number" step="0.01" min="0" placeholder="0" value={form.current_amount} onChange={e => set('current_amount', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Contribuição mensal (€)</label>
              <input type="number" step="0.01" min="0" placeholder="200" value={form.monthly_contrib} onChange={e => set('monthly_contrib', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Retorno anual estimado (%)</label>
              <input type="number" step="0.1" min="0" max="100" placeholder="7" value={form.estimated_return} onChange={e => set('estimated_return', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Prazo (data)</label>
              <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cor</label>
              <input type="color" value={form.color} onChange={e => set('color', e.target.value)} style={{ ...inputStyle, padding: 4, height: 38, cursor: 'pointer' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notas</label>
            <textarea placeholder="Notas sobre este objetivo..." value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <button type="submit" disabled={addGoal.isPending}
            style={{ padding: 10, borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {addGoal.isPending ? 'A guardar...' : 'Criar objetivo'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ContribModal({ goal, onClose }) {
  const addContrib = useAddContribution()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [isWithdraw, setIsWithdraw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    await addContrib.mutateAsync({
      goal_id: goal.id,
      amount: isWithdraw ? -parseFloat(amount) : parseFloat(amount),
      note
    })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Atualizar — {goal.name}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[[false,'➕ Depositar'],[true,'➖ Levantar']].map(([v,l]) => (
              <button key={String(v)} type="button" onClick={() => setIsWithdraw(v)}
                style={{ padding: 8, borderRadius: 8, border: `2px solid ${isWithdraw === v ? 'var(--accent)' : 'var(--border)'}`, background: isWithdraw === v ? 'var(--accent-bg)' : 'var(--surface)', cursor: 'pointer', fontSize: 13 }}>
                {l}
              </button>
            ))}
          </div>
          <input type="number" step="0.01" min="0.01" placeholder="Valor (€)" value={amount} onChange={e => setAmount(e.target.value)} required
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }} />
          <input type="text" placeholder="Nota (opcional)" value={note} onChange={e => setNote(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }} />
          <button type="submit" disabled={addContrib.isPending}
            style={{ padding: 10, borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {addContrib.isPending ? 'A guardar...' : 'Confirmar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function GoalCard({ goal, onContrib, onDelete }) {
  const pct = Math.min(100, Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100))
  const isInvestment = goal.type === 'investment'
  const asset = ASSET_TYPES[goal.asset_type] || ASSET_TYPES.outro
  const remaining = Number(goal.target_amount) - Number(goal.current_amount)

  // Projeção
  let projMonths = null
  let projValue = null
  if (goal.monthly_contrib && goal.deadline) {
    const months = Math.max(0, Math.round((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24 * 30)))
    projMonths = months
    projValue = project(Number(goal.current_amount), Number(goal.monthly_contrib), Number(goal.estimated_return || 0), months)
  }

  const willReach = projValue !== null && projValue >= Number(goal.target_amount)

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: (goal.color || 'var(--accent)') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {isInvestment ? asset.emoji : '🐷'}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>{goal.name}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              {isInvestment ? asset.label : 'Poupança'}
              {goal.deadline && ` · até ${new Date(goal.deadline).toLocaleDateString('pt-PT')}`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onContrib(goal)} style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${goal.color || 'var(--accent)'}`, background: 'var(--surface)', color: goal.color || 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
            Atualizar
          </button>
          <button onClick={() => { if (confirm('Apagar objetivo?')) onDelete(goal.id) }}
            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--danger-bg)', background: 'var(--surface)', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>
            ×
          </button>
        </div>
      </div>

      {/* Progresso */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{fmt(goal.current_amount)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>meta {fmt(goal.target_amount)}</span>
        </div>
        <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: 8, borderRadius: 4, background: goal.color || 'var(--accent)', width: `${pct}%`, transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}% concluído</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>faltam {fmt(Math.max(0, remaining))}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {goal.monthly_contrib && (
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 2px' }}>Mensal</p>
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text-secondary)' }}>{fmt(goal.monthly_contrib)}</p>
          </div>
        )}
        {goal.estimated_return > 0 && (
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 2px' }}>Retorno est.</p>
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text-secondary)' }}>{goal.estimated_return}%/ano</p>
          </div>
        )}
        {projValue !== null && (
          <div style={{ background: willReach ? 'var(--success-bg)' : '#fff7ed', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 2px' }}>Projeção</p>
            <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: willReach ? 'var(--success)' : '#f59e0b' }}>{fmt(Math.round(projValue))}</p>
          </div>
        )}
      </div>

      {projValue !== null && (
        <p style={{ fontSize: 11, margin: 0, color: willReach ? 'var(--success)' : '#f59e0b' }}>
          {willReach ? `✅ Vais atingir a meta em ${projMonths} meses` : `⚠️ Projeção abaixo da meta em ${projMonths} meses`}
        </p>
      )}
    </div>
  )
}

export default function Goals() {
  const { data: goals = [], isLoading } = useGoals()
  const deleteGoal = useDeleteGoal()
  const [showForm, setShowForm] = useState(false)
  const [contribGoal, setContribGoal] = useState(null)
  const [tab, setTab] = useState('all') // all | savings | investment

  const filtered = goals.filter(g => tab === 'all' || g.type === tab)
  const totalSaved = goals.filter(g => g.type === 'savings').reduce((s, g) => s + Number(g.current_amount), 0)
  const totalInvested = goals.filter(g => g.type === 'investment').reduce((s, g) => s + Number(g.current_amount), 0)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {showForm && <GoalForm onClose={() => setShowForm(false)} />}
      {contribGoal && <ContribModal goal={contribGoal} onClose={() => setContribGoal(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Objetivos</h2>
        <button onClick={() => setShowForm(true)}
          style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + Novo objetivo
        </button>
      </div>

      {/* Totais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px' }}>Total poupado</p>
          <p style={{ fontSize: 24, fontWeight: 500, color: 'var(--success)', margin: 0 }}>{fmt(totalSaved)}</p>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px' }}>Total investido</p>
          <p style={{ fontSize: 24, fontWeight: 500, color: 'var(--accent)', margin: 0 }}>{fmt(totalInvested)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['all','Todos'],['savings','Poupança'],['investment','Investimento']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${tab === v ? 'var(--accent)' : 'var(--border)'}`, background: tab === v ? 'var(--accent-bg)' : 'var(--surface)', color: tab === v ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: tab === v ? 500 : 400 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Goals grid */}
      {isLoading ? (
        <p style={{ color: 'var(--text-muted)' }}>A carregar...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>🎯</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>Sem objetivos ainda. Cria o teu primeiro!</p>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, cursor: 'pointer' }}>
            Criar objetivo
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
          {filtered.map(g => (
            <GoalCard key={g.id} goal={g} onContrib={setContribGoal} onDelete={(id) => deleteGoal.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  )
}