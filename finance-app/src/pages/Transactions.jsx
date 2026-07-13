import { useState } from 'react'
import { useTransactions, useAddTransaction, useDeleteTransaction } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'

const fmt = (n) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const RECURRENCE_LABELS = { none: 'Sem recorrência', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }

function TransactionForm({ onClose, categories }) {
  const addTx = useAddTransaction()
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    description: '',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    recurrence: 'none',
    notes: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await addTx.mutateAsync({
      ...form,
      amount: parseFloat(form.amount),
      category_id: form.category_id || null
    })
    onClose()
  }

  const filteredCats = categories?.filter(c => c.type === form.type || c.type === 'both') || []

  const inputStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, width: '100%', outline: 'none', background: 'var(--surface)' }
  const labelStyle = { fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Nova transação</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['expense', 'income'].map(t => (
              <button key={t} type="button" onClick={() => set('type', t)}
                style={{ padding: '8px', borderRadius: 8, border: `2px solid ${form.type === t ? (t === 'income' ? 'var(--success)' : 'var(--danger)') : 'var(--border)'}`, background: form.type === t ? (t === 'income' ? 'var(--success-bg)' : 'var(--danger-bg)') : 'var(--surface)', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: form.type === t ? (t === 'income' ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)' }}>
                {t === 'expense' ? '💸 Despesa' : '💰 Receita'}
              </button>
            ))}
          </div>

          {/* Valor */}
          <div>
            <label style={labelStyle}>Valor (€)</label>
            <input type="number" step="0.01" min="0.01" placeholder="0,00" value={form.amount}
              onChange={e => set('amount', e.target.value)} required style={inputStyle} />
          </div>

          {/* Descrição */}
          <div>
            <label style={labelStyle}>Descrição</label>
            <input type="text" placeholder="Ex: Supermercado Continente" value={form.description}
              onChange={e => set('description', e.target.value)} style={inputStyle} />
          </div>

          {/* Categoria */}
          <div>
            <label style={labelStyle}>Categoria</label>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)} style={inputStyle}>
              <option value="">Sem categoria</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Data */}
          <div>
            <label style={labelStyle}>Data</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required style={inputStyle} />
          </div>

          {/* Recorrência */}
          <div>
            <label style={labelStyle}>Recorrência</label>
            <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)} style={inputStyle}>
              {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label style={labelStyle}>Notas (opcional)</label>
            <textarea placeholder="Notas adicionais..." value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <button type="submit" disabled={addTx.isPending}
            style={{ padding: '10px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 4 }}>
            {addTx.isPending ? 'A guardar...' : 'Guardar transação'}
          </button>
        </form>
      </div>
    </div>
  )
}

function TxRow({ tx, onDelete }) {
  const isIncome = tx.type === 'income'
  const recLabel = tx.recurrence !== 'none' ? RECURRENCE_LABELS[tx.recurrence] : null

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: (tx.categories?.color || 'var(--accent)') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          {isIncome ? '💰' : '💸'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tx.description || tx.categories?.name || 'Sem descrição'}
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
            {tx.categories && (
              <span style={{ fontSize: 11, background: (tx.categories.color || 'var(--accent)') + '20', color: tx.categories.color || 'var(--accent)', padding: '1px 6px', borderRadius: 4 }}>
                {tx.categories.name}
              </span>
            )}
            {recLabel && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔄 {recLabel}</span>}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString('pt-PT')}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: isIncome ? 'var(--success)' : 'var(--danger)' }}>
          {isIncome ? '+' : '-'}{fmt(tx.amount)}
        </span>
        <button onClick={() => onDelete(tx.id)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--border-strong)', fontSize: 16, padding: 4, borderRadius: 4, lineHeight: 1 }}
          title="Apagar">×</button>
      </div>
    </div>
  )
}

export default function Transactions() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all') // all | income | expense
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data: transactions = [], isLoading } = useTransactions({ month, year })
  const { data: categories = [] } = useCategories()
  const deleteTx = useDeleteTransaction()

  const filtered = transactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false
    if (categoryFilter && t.category_id !== categoryFilter) return false
    return true
  })

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  const navMonth = (dir) => {
    let m = month + dir, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  const handleDelete = async (id) => {
    if (confirm('Apagar esta transação?')) await deleteTx.mutateAsync(id)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {showForm && <TransactionForm onClose={() => setShowForm(false)} categories={categories} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Transações</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
          <button onClick={() => setShowForm(true)}
            style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginLeft: 8 }}>
            + Adicionar
          </button>
        </div>
      </div>

      {/* Resumo rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Receitas', value: fmt(income), color: 'var(--success)' },
          { label: 'Despesas', value: fmt(expenses), color: 'var(--danger)' },
          { label: 'Saldo', value: fmt(income - expenses), color: income - expenses >= 0 ? 'var(--success)' : 'var(--danger)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 10, border: '0.5px solid var(--border)', padding: '12px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 2px' }}>{s.label}</p>
            <p style={{ fontSize: 18, fontWeight: 500, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['all','Todas'],['expense','Despesas'],['income','Receitas']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${filter === v ? 'var(--accent)' : 'var(--border)'}`, background: filter === v ? 'var(--accent-bg)' : 'var(--surface)', color: filter === v ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: filter === v ? 500 : 400 }}>
            {l}
          </button>
        ))}
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }}>
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Lista */}
      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '0.5px solid var(--border)', padding: '0 1.25rem' }}>
        {isLoading ? (
          <p style={{ padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: 13 }}>A carregar...</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sem transações este mês.</p>
            <button onClick={() => setShowForm(true)}
              style={{ marginTop: 8, padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, cursor: 'pointer' }}>
              Adicionar primeira transação
            </button>
          </div>
        ) : (
          filtered.map(tx => <TxRow key={tx.id} tx={tx} onDelete={handleDelete} />)
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'right' }}>
        {filtered.length} transação{filtered.length !== 1 ? 'ões' : ''}
      </p>
    </div>
  )
}