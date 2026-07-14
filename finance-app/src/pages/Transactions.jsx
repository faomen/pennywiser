import { useState } from 'react'
import { useTransactions, useAddTransaction, useDeleteTransaction } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { ReceiptScanner } from '../components/ReceiptScanner'

const fmt = (n) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const RECURRENCE_LABELS = { none: 'Sem recorrência', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }

function useIsMobile() {
  return window.innerWidth < 768
}

function TransactionForm({ onClose, categories, initialData }) {
  const addTx = useAddTransaction()
  const [form, setForm] = useState({
    type: 'expense',
    amount: initialData?.amount || '',
    description: initialData?.description || '',
    category_id: '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
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
  const inp = { padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 16, width: '100%', outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)', WebkitAppearance: 'none' }
  const lbl = { fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '8px 20px 32px', width: '100%', maxHeight: '92dvh', overflowY: 'auto' }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '12px auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Nova transação
            {initialData && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)', marginLeft: 8 }}>✨ recibo</span>}
          </h3>
          <button onClick={onClose} style={{ background: 'var(--surface-2)', border: 'none', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['expense', 'income'].map(t => (
              <button key={t} type="button" onClick={() => set('type', t)}
                style={{ padding: '14px 8px', borderRadius: 12, border: `2px solid ${form.type === t ? (t === 'income' ? 'var(--income, #10b981)' : 'var(--expense, #f43f5e)') : 'var(--border)'}`, background: form.type === t ? (t === 'income' ? 'var(--income-bg, #ecfdf5)' : 'var(--expense-bg, #fff1f2)') : 'var(--surface)', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: form.type === t ? (t === 'income' ? 'var(--income, #10b981)' : 'var(--expense, #f43f5e)') : 'var(--text-muted)', WebkitTapHighlightColor: 'transparent' }}>
                {t === 'expense' ? '💸 Despesa' : '💰 Receita'}
              </button>
            ))}
          </div>

          <div>
            <label style={lbl}>Valor (€)</label>
            <input type="number" inputMode="decimal" step="0.01" min="0.01" placeholder="0,00" value={form.amount} onChange={e => set('amount', e.target.value)} required style={{ ...inp, fontSize: 24, fontWeight: 700, textAlign: 'center' }} />
          </div>

          <div>
            <label style={lbl}>Descrição</label>
            <input type="text" placeholder="Ex: Supermercado Continente" value={form.description} onChange={e => set('description', e.target.value)} style={inp} />
          </div>

          <div>
            <label style={lbl}>Categoria</label>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)} style={inp}>
              <option value="">Sem categoria</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Data</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required style={inp} />
            </div>
            <div>
              <label style={lbl}>Recorrência</label>
              <select value={form.recurrence} onChange={e => set('recurrence', e.target.value)} style={inp}>
                {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={addTx.isPending}
            style={{ padding: '16px', borderRadius: 14, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', marginTop: 4 }}>
            {addTx.isPending ? 'A guardar...' : 'Guardar transação'}
          </button>
        </form>
      </div>
    </div>
  )
}

function TxRow({ tx, onDelete }) {
  const isIncome = tx.type === 'income'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: (tx.categories?.color || '#10b981') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {isIncome ? '💰' : '💸'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tx.description || tx.categories?.name || 'Sem descrição'}
          </p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
            {tx.categories && (
              <span style={{ fontSize: 11, background: (tx.categories.color || '#10b981') + '20', color: tx.categories.color || '#10b981', padding: '2px 7px', borderRadius: 5, fontWeight: 500 }}>
                {tx.categories.name}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString('pt-PT')}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: isIncome ? '#10b981' : '#f43f5e' }}>
          {isIncome ? '+' : '-'}{fmt(tx.amount)}
        </span>
        <button onClick={() => onDelete(tx.id)}
          style={{ background: 'var(--surface-2)', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
          ×
        </button>
      </div>
    </div>
  )
}

export default function Transactions() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanData, setScanData] = useState(null)
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const isMobile = useIsMobile()

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
      {showScanner && (
        <ReceiptScanner
          onClose={() => setShowScanner(false)}
          onResult={(data) => { setScanData(data); setShowScanner(false); setShowForm(true) }}
        />
      )}
      {showForm && (
        <TransactionForm
          onClose={() => { setShowForm(false); setScanData(null) }}
          categories={categories}
          initialData={scanData}
        />
      )}

      {/* Header mobile — compacto */}
      {isMobile ? (
        <div style={{ marginBottom: 16 }}>
          {/* Título + botões de ação */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Transações</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowScanner(true)}
                style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
                📷
              </button>
              <button onClick={() => setShowForm(true)}
                style={{ height: 44, padding: '0 16px', borderRadius: 12, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                + Adicionar
              </button>
            </div>
          </div>

          {/* Navegação mês — linha separada */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => navMonth(-1)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>‹</button>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, outline: 'none' }}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              style={{ width: 80, padding: '8px 6px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, outline: 'none' }}>
              {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => navMonth(1)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>›</button>
          </div>
        </div>
      ) : (
        /* Header desktop */
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Transações</h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navMonth(-1)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>‹</button>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
              {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => navMonth(1)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>›</button>
            <button onClick={() => setShowScanner(true)} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>📷 Scan</button>
            <button onClick={() => setShowForm(true)} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Adicionar</button>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
          { label: 'Receitas', value: fmt(income), color: '#10b981' },
          { label: 'Despesas', value: fmt(expenses), color: '#f43f5e' },
          { label: 'Saldo', value: fmt(income - expenses), color: income - expenses >= 0 ? '#10b981' : '#f43f5e' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: '12px 14px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2, WebkitOverflowScrolling: 'touch' }}>
        {[['all','Todas'],['expense','Despesas'],['income','Receitas']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            style={{ padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${filter === v ? 'var(--accent)' : 'var(--border)'}`, background: filter === v ? 'var(--accent-bg)' : 'var(--surface)', color: filter === v ? 'var(--accent)' : 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontWeight: filter === v ? 700 : 400, whiteSpace: 'nowrap', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
            {l}
          </button>
        ))}
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Lista */}
      <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '0 16px' }}>
        {isLoading ? (
          <p style={{ padding: '2rem 0', color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>A carregar...</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem 0', textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>💳</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Sem transações este mês.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setShowScanner(true)}
                style={{ padding: '12px 20px', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                📷 Scan recibo
              </button>
              <button onClick={() => setShowForm(true)}
                style={{ padding: '12px 20px', borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>
                + Adicionar
              </button>
            </div>
          </div>
        ) : (
          filtered.map(tx => <TxRow key={tx.id} tx={tx} onDelete={handleDelete} />)
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, textAlign: 'right' }}>
        {filtered.length} transação{filtered.length !== 1 ? 'ões' : ''}
      </p>
    </div>
  )
}