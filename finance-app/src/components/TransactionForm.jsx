function TransactionForm({ onClose, categories, initialData }) {
  const [form, setForm] = useState({
    type: 'expense',
    amount: initialData?.amount || '',
    description: initialData?.description || '',
    category_id: '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    recurrence: 'none',
    notes: ''
  })