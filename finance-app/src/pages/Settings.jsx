import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const fmt = (n) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)

// ─── Hooks ───────────────────────────────────────────────────
function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name')
      if (error) throw error
      return data
    }
  })
}

function useAddCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cat) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('categories').insert({ ...cat, user_id: user.id }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] })
  })
}

function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] })
  })
}

function useBudgets(month, year) {
  return useQuery({
    queryKey: ['budgets', month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, categories(name, color, icon)')
        .eq('month', month)
        .eq('year', year)
      if (error) throw error
      return data
    }
  })
}

function useUpsertBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ category_id, amount, month, year }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('budgets')
        .upsert({ user_id: user.id, category_id, amount, month, year }, { onConflict: 'user_id,category_id,month,year' })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['budgets', vars.month, vars.year] })
  })
}

function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, month, year }) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
      return { month, year }
    },
    onSuccess: (vars) => qc.invalidateQueries({ queryKey: ['budgets', vars.month, vars.year] })
  })
}

function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error) throw error
      return data
    }
  })
}

function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] })
  })
}

// ─── Category Form ────────────────────────────────────────────
function CategoryForm({ onClose }) {
  const addCat = useAddCategory()
  const [form, setForm] = useState({ name: '', type: 'expense', color: 'var(--accent)', icon: 'wallet' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const inputStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, width: '100%', outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await addCat.mutateAsync(form)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Nova categoria</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Nome</label>
            <input type="text" placeholder="Ex: Ginásio" value={form.name} onChange={e => set('name', e.target.value)} required style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Tipo</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[['expense','💸 Despesa'],['income','💰 Receita'],['both','↕️ Ambos']].map(([v,l]) => (
                <button key={v} type="button" onClick={() => set('type', v)}
                  style={{ padding: 8, borderRadius: 8, border: `2px solid ${form.type === v ? 'var(--accent)' : 'var(--border)'}`, background: form.type === v ? 'var(--accent-bg)' : 'var(--surface)', cursor: 'pointer', fontSize: 12, color: form.type === v ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Cor</label>
              <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                style={{ ...inputStyle, padding: 4, height: 38, cursor: 'pointer' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Ícone (nome)</label>
              <input type="text" placeholder="wallet" value={form.icon} onChange={e => set('icon', e.target.value)} style={inputStyle} />
            </div>
          </div>
          <button type="submit" disabled={addCat.isPending}
            style={{ padding: 10, borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            {addCat.isPending ? 'A guardar...' : 'Criar categoria'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function Settings() {
  const now = new Date()
  const [tab, setTab] = useState('categories')
  const [showCatForm, setShowCatForm] = useState(false)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgetInputs, setBudgetInputs] = useState({})

  const { data: categories = [] } = useCategories()
  const { data: budgets = [] } = useBudgets(month, year)
  const { data: profile } = useProfile()
  const deleteCategory = useDeleteCategory()
  const upsertBudget = useUpsertBudget()
  const deleteBudget = useDeleteBudget()
  const updateProfile = useUpdateProfile()
  const [profileName, setProfileName] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both')

  const getBudget = (cat_id) => budgets.find(b => b.category_id === cat_id)

  const handleBudgetSave = async (category_id) => {
    const amount = parseFloat(budgetInputs[category_id])
    if (!amount || amount <= 0) return
    await upsertBudget.mutateAsync({ category_id, amount, month, year })
    setBudgetInputs(prev => ({ ...prev, [category_id]: '' }))
  }

  const navMonth = (dir) => {
    let m = month + dir, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  const handleProfileSave = async () => {
    await updateProfile.mutateAsync({ display_name: profileName || profile?.display_name })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  const tabStyle = (t) => ({
    padding: '8px 16px', borderRadius: 20, border: `1px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`,
    background: tab === t ? 'var(--accent-bg)' : 'var(--surface)', color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
    fontSize: 13, cursor: 'pointer', fontWeight: tab === t ? 500 : 400
  })

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {showCatForm && <CategoryForm onClose={() => setShowCatForm(false)} />}

      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 24 }}>Definições</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button style={tabStyle('categories')} onClick={() => setTab('categories')}>Categorias</button>
        <button style={tabStyle('budgets')} onClick={() => setTab('budgets')}>Orçamentos</button>
        <button style={tabStyle('profile')} onClick={() => setTab('profile')}>Perfil</button>
      </div>

      {/* ── CATEGORIAS ── */}
      {tab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{categories.length} categorias</p>
            <button onClick={() => setShowCatForm(true)}
              style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              + Nova categoria
            </button>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
            {categories.map((cat, i) => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 1.25rem', borderBottom: i < categories.length - 1 ? '0.5px solid #f3f4f6' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: cat.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: cat.color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>{cat.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                      {cat.type === 'expense' ? 'Despesa' : cat.type === 'income' ? 'Receita' : 'Ambos'}
                      {cat.is_default && ' · default'}
                    </p>
                  </div>
                </div>
                {!cat.is_default && (
                  <button onClick={() => { if (confirm(`Apagar "${cat.name}"?`)) deleteCategory.mutate(cat.id) }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--border-strong)', cursor: 'pointer', fontSize: 18, padding: 4 }}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ORÇAMENTOS ── */}
      {tab === 'budgets' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <button onClick={() => navMonth(-1)} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer' }}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 500, minWidth: 130, textAlign: 'center' }}>{MONTHS[month - 1]} {year}</span>
            <button onClick={() => navMonth(1)} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid var(--border)', background: 'var(--surface)', cursor: 'pointer' }}>›</button>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Define o limite mensal de despesa por categoria. Vais receber um aviso no Dashboard quando te aproximares.
          </p>

          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', overflow: 'hidden' }}>
            {expenseCategories.map((cat, i) => {
              const budget = getBudget(cat.id)
              return (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 1.25rem', borderBottom: i < expenseCategories.length - 1 ? '0.5px solid #f3f4f6' : 'none', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {budget ? (
                      <>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', minWidth: 70, textAlign: 'right' }}>{fmt(budget.amount)}</span>
                        <button onClick={() => deleteBudget.mutate({ id: budget.id, month, year })}
                          style={{ background: 'transparent', border: 'none', color: 'var(--border-strong)', cursor: 'pointer', fontSize: 16, padding: 2 }}>×</button>
                      </>
                    ) : (
                      <>
                        <input
                          type="number" step="0.01" min="1" placeholder="€ limite"
                          value={budgetInputs[cat.id] || ''}
                          onChange={e => setBudgetInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleBudgetSave(cat.id)}
                          style={{ width: 90, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13, outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }}
                        />
                        <button onClick={() => handleBudgetSave(cat.id)}
                          style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 12, cursor: 'pointer' }}>
                          ✓
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
            Podes definir orçamentos diferentes para cada mês. Prime Enter ou ✓ para guardar.
          </p>
        </div>
      )}

      {/* ── PERFIL ── */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1.25rem' }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 16, color: 'var(--text-secondary)' }}>Informação pessoal</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Nome de utilizador</label>
                <input type="text"
                  defaultValue={profile?.display_name}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder={profile?.display_name}
                  style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, width: '100%', outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }} />
              </div>
              <button onClick={handleProfileSave} disabled={updateProfile.isPending}
                style={{ padding: '9px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                {profileSaved ? '✅ Guardado!' : updateProfile.isPending ? 'A guardar...' : 'Guardar alterações'}
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '1.25rem' }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Conta</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Sessão atual</p>
            <button onClick={() => supabase.auth.signOut()}
              style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--danger-bg)', background: 'var(--surface)', color: 'var(--danger)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              Terminar sessão
            </button>
          </div>
        </div>
      )}
    </div>
  )
}