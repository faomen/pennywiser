import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function JoinGroup() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | joining | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function join() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate(`/?redirect=/join/${token}`); return }

      // Busca o convite
      const { data: invite, error } = await supabase
        .from('group_invites')
        .select('*, shared_groups(name)')
        .eq('token', token)
        .single()

      if (error || !invite) { setStatus('error'); setMessage('Convite inválido ou expirado.'); return }
      if (invite.used_at) { setStatus('error'); setMessage('Este convite já foi utilizado.'); return }
      if (new Date(invite.expires_at) < new Date()) { setStatus('error'); setMessage('Este convite expirou.'); return }

      setStatus('joining')
      setMessage(`A juntar-te a "${invite.shared_groups.name}"...`)

      // Verifica se já é membro
      const { data: existing } = await supabase
        .from('shared_group_members')
        .select('user_id')
        .eq('group_id', invite.group_id)
        .eq('user_id', user.id)
        .single()

      if (!existing) {
        await supabase.from('shared_group_members').insert({ group_id: invite.group_id, user_id: user.id })
      }

      // Marca convite como usado
      await supabase.from('group_invites').update({ used_at: new Date().toISOString(), used_by: user.id }).eq('id', invite.id)

      setStatus('success')
      setMessage(`Juntaste-te a "${invite.shared_groups.name}" com sucesso!`)
      setTimeout(() => navigate('/shared'), 2000)
    }
    join()
  }, [token])

  const icon = { loading: '⏳', joining: '🔄', success: '✅', error: '❌' }[status]
  const color = { loading: '#9ca3af', joining: '#6366f1', success: '#10b981', error: '#ef4444' }[status]

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 360, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>{icon}</p>
        <p style={{ fontSize: 16, fontWeight: 500, color, margin: 0 }}>{message || 'A processar convite...'}</p>
        {status === 'success' && <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>A redirecionar...</p>}
        {status === 'error' && (
          <button onClick={() => navigate('/shared')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Ir para Partilhadas
          </button>
        )}
      </div>
    </div>
  )
}