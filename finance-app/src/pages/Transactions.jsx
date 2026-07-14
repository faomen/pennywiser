import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTransactions, useAddTransaction, useDeleteTransaction } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { ReceiptScanner } from '../components/ReceiptScanner'
import { AnimatedModal, StaggerList, StaggerItem, Skeleton } from '../lib/motion'

const fmt = (n) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const RECURRENCE_LABELS = { none: 'Sem recorrência', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }

function useIsMobile() { return window.innerWidth < 768 }

function TransactionForm({ onClose, categories, initialData, isMobile }) {
  const addTx = useAddTransaction()
  const [form, setForm] = useState({
    type: 'expense', amount: initialData?.amount || '', description: initialData?.description || '',
    category_id: '', date: initialData?.date || new Date().toISOString().split('T')[0],
    recurrence: 'none', notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await addTx.mutateAsync({ ...form, amount: parseFloat(form.amount), category_id: form.category_id || null })
    onClose()
  }

  const filteredCats = categories?.filter(c => c.type === form.type || c.type === 'both') || []
  const inp = { padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 16, width: '100%', outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' }
  const lbl = { fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500 }

  return (
    <AnimatedModal onClose={onClose} isMobile={isMobile}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: isMobile ? '20px 20px 0 0' : 16,
        padding: isMobile ? '8px 20px 32px' : 24,
        width: isMobile ? '100vw' : '95vw',
        maxWidth: isMobile ? '100%' : 420,
        maxHeight: '92dvh', overflowY: 'auto',
      }}>
        {isMobile && <div style={{ width: 36, height: 4, background: 'var(--border-strong)', borderRadius: 2, margin: '12px auto 20px' }} />}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: isMobile ? 18 : 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Nova transação
            {initialData && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)', marginLeft: 8 }}>✨ recibo</span>}
          </h3>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
            style={{ background: 'var(--surface-2)', border: 'none', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</motion.button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['expense', 'income'].map(t => (
              <motion.button key={t} whileTap={{ scale: 0.96 }} type="button" onClick={() => set('type', t)}
                style={{ padding: '14px 8px', borderRadius: 12, border: `2px solid ${form.type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'var(--border)'}`, background: form.type === t ? (t === 'income' ? 'var(--income-bg)' : 'var(--expense-bg)') : 'var(--surface)', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: form.type === t ? (t === 'income' ? 'var(--income)' : 'var(--expense)') : 'var(--text-muted)' }}>
                {t === 'expense' ? '💸 Despesa' : '💰 Receita'}
              </motion.button>
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

          <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={addTx.isPending}
            style={{ padding: '16px', borderRadius: 14, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
            {addTx.isPending ? 'A guardar...' : 'Guardar transação'}
          </motion.button>
        </form>
      </div>
    </AnimatedModal>
  )
}

function TxRow({ tx, onDelete }) {
  const isIncome = tx.type === 'income'
  return (
    <StaggerItem>
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
              {tx.categories && <span style={{ fontSize: 11, background: (tx.categories.color || '#10b981') + '20', color: tx.categories.color || '#10b981', padding: '2px 7px', borderRadius: 5, fontWeight: 500 }}>{tx.categories.name}</span>}
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString('pt-PT')}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: isIncome ? '#10b981' : '#f43f5e' }}>{isIncome ? '+' : '-'}{fmt(tx.amount)}</span>
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => onDelete(tx.id)}
            style={{ background: 'var(--surface-2)', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</motion.button>
        </div>
      </div>
    </StaggerItem>
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

  const handleDelete = async (id) => { if (confirm('Apagar esta transação?')) await deleteTx.mutateAsync(id) }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {showScanner && <ReceiptScanner onClose={() => setShowScanner(false)} onResult={(data) => { setScanData(data); setShowScanner(false); setShowForm(true) }} />}
      {showForm && <TransactionForm onClose={() => { setShowForm(false); setScanData(null) }} categories={categories} initialData={scanData} isMobile={isMobile} />}

      {isMobile ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Transações</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowScanner(true)}
                style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)}
                style={{ height: 44, padding: '0 16px', borderRadius: 12, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ Adicionar</motion.button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navMonth(-1)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 16 }}>‹</motion.button>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, outline: 'none' }}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 80, padding: '8px 6px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, outline: 'none' }}>
              {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navMonth(1)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 16 }}>›</motion.button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Transações</h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navMonth(-1)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>‹</motion.button>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}>
              {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navMonth(1)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', cursor: 'pointer' }}>›</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowScanner(true)} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>📷 Scan</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Adicionar</motion.button>
          </div>
        </div>
      )}

      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
          { label: 'Receitas', value: fmt(income), color: '#10b981' },
          { label: 'Despesas', value: fmt(expenses), color: '#f43f5e' },
          { label: 'Saldo', value: fmt(income - expenses), color: income - expenses >= 0 ? '#10b981' : '#f43f5e' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '12px 14px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="filters-scroll" style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {[['all','Todas'],['expense','Despesas'],['income','Receitas']].map(([v, l]) => (
          <motion.button key={v} whileTap={{ scale: 0.95 }} onClick={() => setFilter(v)}
            style={{ padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${filter === v ? 'var(--accent)' : 'var(--border)'}`, background: filter === v ? 'var(--accent-bg)' : 'var(--surface)', color: filter === v ? 'var(--accent)' : 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontWeight: filter === v ? 700 : 400, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {l}
          </motion.button>
        ))}
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: '0 16px' }}>
        {isLoading ? (
          <div style={{ padding: '1rem 0' }}><Skeleton height={60} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem 0', textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>💳</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Sem transações este mês.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowScanner(true)} style={{ padding: '12px 20px', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>📷 Scan recibo</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(true)} style={{ padding: '12px 20px', borderRadius: 10, background: 'var(--accent)', color: 'white', border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}>+ Adicionar</motion.button>
            </div>
          </div>
        ) : (
          <StaggerList gap={0}>
            {filtered.map(tx => <TxRow key={tx.id} tx={tx} onDelete={handleDelete} />)}
          </StaggerList>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, textAlign: 'right' }}>
        {filtered.length} transação{filtered.length !== 1 ? 'ões' : ''}
      </p>
    </div>
  )
}