import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useTransactions({ month, year }) {
  return useQuery({
    queryKey: ['transactions', month, year],
    queryFn: async () => {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end   = `${year}-${String(month).padStart(2, '0')}-31`
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(*)')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
      if (error) throw error
      return data
    }
  })
}

export function useAddTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tx) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...tx, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] })
  })
}