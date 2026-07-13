import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useTransactions({ month, year }) {
  return useQuery({
    queryKey: ['transactions', month, year],
    queryFn: async () => {
      const m = String(month).padStart(2, '0')
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(*)')
        .gte('date', `${year}-${m}-01`)
        .lte('date', `${year}-${m}-31`)
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
        .select('*, categories(*)')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] })
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] })
  })
}