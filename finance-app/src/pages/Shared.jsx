import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const fmt = (n) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Math.abs(n))

// ─── Algoritmo de simplificação de dívidas ───────────────────
function simplifyDebts(balances) {
  const creditors = balances.filter(b => b.balance > 0.01).map(b => ({ ...b })).sort((a, b) => b.balance - a.balance)
  const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b })).sort((a, b) => a.balance - b.balance)
  const transfers = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(Math.abs(debtors[i].balance), creditors[j].balance)
    transfers.push({ from: debtors[i].display_name, from_id: debtors[i].user_id, to: creditors[j].display_name, to_id: creditors[j].user_id, amount: Math.round(amount * 100) / 100 })
    debtors[i].balance += amount
    creditors[j].balance -= amount
    if (Math.abs(debtors[i].balance) < 0.01) i++
    if (Math.abs(creditors[j].balance) < 0.01) j++
  }
  return transfers
}

// ─── Hooks ───────────────────────────────────────────────────
function useGroups() {
  return useQuery({
    queryKey: ['shared_groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_groups')
        .select(`*, shared_group_members(user_id, profiles(display_name)), shared_expenses(id, amount, description, date, paid_by, shared_expense_splits(user_id, amount, is_settled, profiles(display_name)))`)
        .order('created_at', { ascending: false })
      if (error) throw error

      // Busca o nome de quem pagou cada despesa
      if (data) {
        const userIds = [...new Set(data.flatMap(g => (g.shared_expenses || []).map(e => e.paid_by)))]
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds)
          const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p.display_name]))
          data.forEach(g => {
            (g.shared_expenses || []).forEach(e => {
              e.paid_by_name = profileMap[e.paid_by] || 'Alguém'
            })
          })
        }
      }
      return data
    }
  })
}

function useAddGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, type, description, memberEmails }) => {
      const { data: { user } } = await supabase.auth.getUser()

      // Cria o grupo
      const { data: group, error: ge } = await supabase
        .from('shared_groups')
        .insert({ name, type, description, created_by: user.id })
        .select().single()
      if (ge) throw ge

      // Adiciona o criador como membro
      const members = [{ group_id: group.id, user_id: user.id }]

      // Procura outros membros por email
      for (const email of memberEmails.filter(Boolean)) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', (await supabase.auth.admin?.getUserByEmail?.(email))?.data?.user?.id || '')
          .single()
        // Tenta encontrar por auth.users via email — simplificado: convite por link futuro
      }

      await supabase.from('shared_group_members').insert(members)
      return group
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared_groups'] })
  })
}

function useAddExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ group_id, description, amount, date, splits }) => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: expense, error } = await supabase
        .from('shared_expenses')
        .insert({ group_id, description, amount, date, paid_by: user.id })
        .select().single()
      if (error) throw error

      const { error: se } = await supabase.from('shared_expense_splits').insert(
        splits.map(s => ({ expense_id: expense.id, user_id: s.user_id, amount: s.amount }))
      )
      if (se) throw se
      return expense
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared_groups'] })
  })
}

function useSettleExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (expense_id) => {
      const { error } = await supabase
        .from('shared_expense_splits')
        .update({ is_settled: true, settled_at: new Date().toISOString() })
        .eq('expense_id', expense_id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared_groups'] })
  })
}

function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('shared_groups').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared_groups'] })
  })
}

// ─── Group Form ───────────────────────────────────────────────
function GroupForm({ onClose }) {
  const addGroup = useAddGroup()
  const [form, setForm] = useState({ name: '', type: 'event', description: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inputStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, width: '100%', outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }
  const labelStyle = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await addGroup.mutateAsync({ ...form, memberEmails: [] })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: '95%', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Novo grupo</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[['event','🎉 Evento'],['fixed_partner','👫 Parceiro fixo']].map(([v,l]) => (
              <button key={v} type="button" onClick={() => set('type', v)}
                style={{ padding: 8, borderRadius: 8, border: `2px solid ${form.type === v ? 'var(--accent)' : 'var(--border)'}`, background: form.type === v ? 'var(--accent-bg)' : 'var(--surface)', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: form.type === v ? 'var(--accent)' : 'var(--text-muted)' }}>
                {l}
              </button>
            ))}
          </div>
          <div>
            <label style={labelStyle}>Nome do grupo</label>
            <input type="text" placeholder={form.type === 'event' ? 'Ex: Férias Algarve 2025' : 'Ex: Casa com a Ana'} value={form.name} onChange={e => set('name', e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Descrição (opcional)</label>
            <input type="text" placeholder="Descrição..." value={form.description} onChange={e => set('description', e.target.value)} style={inputStyle} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, background: 'var(--bg)', padding: '8px 12px', borderRadius: 8 }}>
            💡 Podes convidar outros membros depois de criar o grupo partilhando o ID do grupo com eles.
          </p>
          <button type="submit" disabled={addGroup.isPending}
            style={{ padding: 10, borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {addGroup.isPending ? 'A criar...' : 'Criar grupo'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Expense Form ─────────────────────────────────────────────
function ExpenseForm({ group, onClose }) {
  const addExpense = useAddExpense()
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [splitEqual, setSplitEqual] = useState(true)

  const members = group.shared_group_members || []
  const memberCount = members.length || 1

  const handleSubmit = async (e) => {
    e.preventDefault()
    const total = parseFloat(amount)
    const perPerson = Math.round((total / memberCount) * 100) / 100

    const splits = members.map((m, i) => ({
      user_id: m.user_id,
      amount: i === members.length - 1
        ? Math.round((total - perPerson * (members.length - 1)) * 100) / 100
        : perPerson
    }))

    await addExpense.mutateAsync({ group_id: group.id, description: desc, amount: total, date, splits })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: '95%', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Nova despesa — {group.name}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="text" placeholder="Descrição (ex: Jantar, Gasolina...)" value={desc} onChange={e => setDesc(e.target.value)} required
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }} />
          <input type="number" step="0.01" min="0.01" placeholder="Valor (€)" value={amount} onChange={e => setAmount(e.target.value)} required
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }} />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required
            style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }} />

          {amount && members.length > 0 && (
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px' }}>Divisão igualitária entre {memberCount} pessoa{memberCount !== 1 ? 's' : ''}:</p>
              {members.map((m, i) => (
                <div key={m.user_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{m.profiles?.display_name || 'Membro'}</span>
                  <span style={{ fontWeight: 500 }}>{fmt(parseFloat(amount || 0) / memberCount)}</span>
                </div>
              ))}
            </div>
          )}

          <button type="submit" disabled={addExpense.isPending}
            style={{ padding: 10, borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {addExpense.isPending ? 'A guardar...' : 'Adicionar despesa'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Group Card ───────────────────────────────────────────────
function GroupCard({ group, onAddExpense, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const settle = useSettleExpense()

  const expenses = group.shared_expenses || []
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const members = group.shared_group_members || []
  const isEvent = group.type === 'event'

  // Calcular balances
  const balanceMap = {}
  members.forEach(m => {
    balanceMap[m.user_id] = { user_id: m.user_id, display_name: m.profiles?.display_name || 'Membro', balance: 0 }
  })

  expenses.forEach(exp => {
    if (balanceMap[exp.paid_by]) balanceMap[exp.paid_by].balance += Number(exp.amount)
    exp.shared_expense_splits?.filter(s => !s.is_settled).forEach(split => {
      if (balanceMap[split.user_id]) balanceMap[split.user_id].balance -= Number(split.amount)
    })
  })

  const balances = Object.values(balanceMap)
  const transfers = simplifyDebts(balances)
  const unsettledExpenses = expenses.filter(e => e.shared_expense_splits?.some(s => !s.is_settled))

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{isEvent ? '🎉' : '👫'}</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>{group.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                {isEvent ? 'Evento' : 'Parceiro fixo'} · {members.length} membro{members.length !== 1 ? 's' : ''} · {expenses.length} despesa{expenses.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{fmt(totalSpent)}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Resumo de quem deve */}
        {transfers.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {transfers.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ padding: '2px 8px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 4, fontWeight: 500 }}>{t.from}</span>
                <span style={{ color: 'var(--text-muted)' }}>deve</span>
                <span style={{ padding: '2px 8px', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 4, fontWeight: 500 }}>{fmt(t.amount)}</span>
                <span style={{ color: 'var(--text-muted)' }}>a</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{t.to}</span>
              </div>
            ))}
          </div>
        )}
        {transfers.length === 0 && expenses.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 8, margin: '8px 0 0' }}>✅ Tudo liquidado!</p>
        )}
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '0.5px solid var(--border)' }}>
          {/* Ações */}
          <div style={{ padding: '10px 1.25rem', display: 'flex', gap: 8, borderBottom: '0.5px solid var(--border)' }}>
            <button onClick={() => onAddExpense(group)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #6366f1', background: 'var(--surface)', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
              + Despesa
            </button>
            <button onClick={() => { if (confirm('Apagar grupo e todas as despesas?')) onDelete(group.id) }}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--danger-bg)', background: 'var(--surface)', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>
              Apagar grupo
            </button>
          </div>

          {/* Lista de despesas */}
          <div style={{ padding: '0 1.25rem' }}>
            {expenses.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '1rem 0' }}>Sem despesas ainda.</p>
            ) : (
              expenses.map(exp => {
                const settled = exp.shared_expense_splits?.every(s => s.is_settled)
                return (
                  <div key={exp.id} style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: settled ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: settled ? 'line-through' : 'none' }}>
                        {exp.description}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                        Pago por {exp.paid_by_name || 'alguém'} · {new Date(exp.date).toLocaleDateString('pt-PT')}
                      </p>
                      {exp.shared_expense_splits?.map(s => (
                        <span key={s.user_id} style={{ fontSize: 10, marginRight: 6, color: s.is_settled ? 'var(--success)' : 'var(--text-muted)' }}>
                          {s.profiles?.display_name}: {fmt(s.amount)} {s.is_settled ? '✓' : ''}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{fmt(exp.amount)}</span>
                      {!settled && (
                        <button onClick={() => settle.mutate(exp.id)}
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--success-bg)', background: 'var(--success-bg)', color: 'var(--success)', fontSize: 11, cursor: 'pointer' }}>
                          Liquidar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function Shared() {
  const { data: groups = [], isLoading } = useGroups()
  const deleteGroup = useDeleteGroup()
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [expenseGroup, setExpenseGroup] = useState(null)
  const [tab, setTab] = useState('all')

  const filtered = groups.filter(g => tab === 'all' || g.type === tab)
  const totalOwed = groups.reduce((s, g) => {
    const expenses = g.shared_expenses || []
    return s + expenses.reduce((es, e) => es + Number(e.amount), 0)
  }, 0)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {showGroupForm && <GroupForm onClose={() => setShowGroupForm(false)} />}
      {expenseGroup && <ExpenseForm group={expenseGroup} onClose={() => setExpenseGroup(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Partilhadas</h2>
        <button onClick={() => setShowGroupForm(true)}
          style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          + Novo grupo
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px' }}>Total em grupos</p>
          <p style={{ fontSize: 24, fontWeight: 500, color: 'var(--accent)', margin: 0 }}>{fmt(totalOwed)}</p>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px' }}>Grupos ativos</p>
          <p style={{ fontSize: 24, fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>{groups.filter(g => !g.settled_at).length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['all','Todos'],['event','Eventos'],['fixed_partner','Parceiro fixo']].map(([v,l]) => (
          <button key={v} onClick={() => setTab(v)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${tab === v ? 'var(--accent)' : 'var(--border)'}`, background: tab === v ? 'var(--accent-bg)' : 'var(--surface)', color: tab === v ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: tab === v ? 500 : 400 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Groups */}
      {isLoading ? (
        <p style={{ color: 'var(--text-muted)' }}>A carregar...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>👥</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>Sem grupos ainda. Cria um para dividir despesas!</p>
          <button onClick={() => setShowGroupForm(true)}
            style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, cursor: 'pointer' }}>
            Criar grupo
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(g => (
            <GroupCard key={g.id} group={g} onAddExpense={setExpenseGroup} onDelete={(id) => deleteGroup.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  )
}