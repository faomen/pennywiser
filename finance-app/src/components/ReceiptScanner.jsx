// ReceiptScanner.jsx — componente de scan de recibos com Claude Vision
// Cola em src/components/ReceiptScanner.jsx

import { useState, useRef } from 'react'

const CATEGORY_SUGGESTIONS = {
  'supermercado': 'Alimentação', 'continente': 'Alimentação', 'pingo doce': 'Alimentação',
  'lidl': 'Alimentação', 'aldi': 'Alimentação', 'minipreço': 'Alimentação',
  'restaurante': 'Restaurantes', 'café': 'Restaurantes', 'mcdonald': 'Restaurantes',
  'galp': 'Transportes', 'bp': 'Transportes', 'repsol': 'Transportes',
  'uber': 'Transportes', 'bolt': 'Transportes', 'cp ': 'Transportes',
  'farmácia': 'Saúde', 'farmacia': 'Saúde', 'clínica': 'Saúde',
  'netflix': 'Assinaturas', 'spotify': 'Assinaturas', 'nós': 'Assinaturas',
  'meo': 'Assinaturas', 'vodafone': 'Assinaturas', 'nos ': 'Assinaturas',
  'zara': 'Roupa', 'h&m': 'Roupa', 'pull': 'Roupa',
  'fnac': 'Lazer', 'cinema': 'Lazer', 'worten': 'Lazer',
}

function guessCategoryFromText(text) {
  const lower = text.toLowerCase()
  for (const [keyword, category] of Object.entries(CATEGORY_SUGGESTIONS)) {
    if (lower.includes(keyword)) return category
  }
  return null
}

export function ReceiptScanner({ onResult, onClose }) {
  const [step, setStep] = useState('idle') // idle | preview | scanning | done | error
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview({ url, file })
    setStep('preview')
  }

  const handleScan = async () => {
    if (!preview?.file) return
    setStep('scanning')
    setError('')

    try {
      // Converte para base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(preview.file)
      })

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: preview.file.type || 'image/jpeg', data: base64 }
              },
              {
                type: 'text',
                text: `Analisa este recibo/talão e extrai as informações. Responde APENAS com JSON válido, sem markdown, sem explicações:
{
  "total": <número com o valor total pago, ex: 12.50>,
  "store": "<nome do estabelecimento>",
  "date": "<data no formato YYYY-MM-DD, ou null se não visível>",
  "description": "<descrição curta do que foi comprado>",
  "category_hint": "<uma destas categorias: Alimentação, Restaurantes, Transportes, Saúde, Lazer, Assinaturas, Roupa, Habitação, Educação, Outros>"
}
Se não conseguires identificar algum campo, usa null. O total é obrigatório.`
              }
            ]
          }]
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro na API')
      }

      const text = data.content?.[0]?.text || ''

      // Parse JSON da resposta
      let parsed
      try {
        parsed = JSON.parse(text.trim())
      } catch {
        // Tenta extrair JSON se vier com texto extra
        const match = text.match(/\{[\s\S]*\}/)
        if (match) parsed = JSON.parse(match[0])
        else throw new Error('Não foi possível interpretar a resposta')
      }

      if (!parsed.total) throw new Error('Não foi possível identificar o valor total')

      // Sugere categoria local se a API não deu boa sugestão
      const categoryHint = parsed.category_hint || guessCategoryFromText(parsed.store || parsed.description || '')

      const scanResult = {
        amount: parsed.total,
        description: parsed.store || parsed.description || '',
        date: parsed.date || new Date().toISOString().split('T')[0],
        category_hint: categoryHint,
      }

      setResult(scanResult)
      setStep('done')

    } catch (err) {
      console.error(err)
      setError(err.message || 'Erro ao analisar o recibo')
      setStep('error')
    }
  }

  const handleConfirm = () => {
    onResult(result)
    onClose()
  }

  const handleRetry = () => {
    setStep('idle')
    setPreview(null)
    setResult(null)
    setError('')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 60, padding: 16
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 16,
        width: '100%', maxWidth: 400,
        overflow: 'hidden', boxShadow: 'var(--shadow-md)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              Scan de recibo
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
              Tira foto ou escolhe da galeria
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--surface-2)', border: 'none',
            width: 32, height: 32, borderRadius: 8,
            cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{ padding: 20 }}>

          {/* IDLE — escolher imagem */}
          {step === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                ref={inputRef} type="file"
                accept="image/*" capture="environment"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => { inputRef.current.removeAttribute('capture'); inputRef.current.click() }}
                style={{
                  padding: '14px', borderRadius: 12,
                  border: '2px dashed var(--border)',
                  background: 'var(--surface-2)',
                  cursor: 'pointer', fontSize: 14,
                  color: 'var(--text-secondary)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8
                }}>
                <span style={{ fontSize: 32 }}>🖼️</span>
                <span style={{ fontWeight: 500 }}>Escolher da galeria</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Seleciona uma foto existente</span>
              </button>
              <button
                onClick={() => { inputRef.current.setAttribute('capture', 'environment'); inputRef.current.click() }}
                style={{
                  padding: '12px', borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--accent)', color: '#fff',
                  cursor: 'pointer', fontSize: 14, fontWeight: 500,
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8
                }}>
                <span>📷</span> Abrir câmara
              </button>
            </div>
          )}

          {/* PREVIEW — confirmar imagem */}
          {step === 'preview' && preview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', maxHeight: 280 }}>
                <img src={preview.url} alt="Recibo" style={{ width: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                Boa foto? O Claude vai extrair os dados automaticamente.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleRetry} style={{
                  flex: 1, padding: '11px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--surface-2)',
                  cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500
                }}>
                  Tirar outra
                </button>
                <button onClick={handleScan} style={{
                  flex: 2, padding: '11px', borderRadius: 10,
                  border: 'none', background: 'var(--accent)', color: '#fff',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600
                }}>
                  ✨ Analisar recibo
                </button>
              </div>
            </div>
          )}

          {/* SCANNING — loading */}
          {step === 'scanning' && (
            <div style={{ padding: '32px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '3px solid var(--accent-bg)',
                borderTop: '3px solid var(--accent)',
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>A analisar o recibo...</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>O Claude está a extrair os dados</p>
            </div>
          )}

          {/* DONE — resultado */}
          {step === 'done' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: 'var(--income-bg)',
                border: '1px solid var(--income)',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--income)', margin: 0 }}>Recibo identificado!</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Confirma os dados antes de guardar</p>
                </div>
              </div>

              {[
                { label: 'Valor total', value: `${result.amount} €`, highlight: true },
                { label: 'Estabelecimento', value: result.description },
                { label: 'Data', value: result.date },
                { label: 'Categoria sugerida', value: result.category_hint || '—' },
              ].map(({ label, value, highlight }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)'
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: highlight ? 700 : 500, color: highlight ? 'var(--income)' : 'var(--text-primary)' }}>
                    {value}
                  </span>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={handleRetry} style={{
                  flex: 1, padding: '11px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--surface-2)',
                  cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500
                }}>
                  Tentar outra vez
                </button>
                <button onClick={handleConfirm} style={{
                  flex: 2, padding: '11px', borderRadius: 10,
                  border: 'none', background: 'var(--accent)', color: '#fff',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600
                }}>
                  Usar estes dados →
                </button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '16px 0' }}>
              <span style={{ fontSize: 40 }}>😕</span>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', textAlign: 'center' }}>
                Não consegui ler o recibo
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                {error}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Tenta com melhor iluminação ou foto mais próxima
              </p>
              <button onClick={handleRetry} style={{
                padding: '10px 24px', borderRadius: 10,
                border: 'none', background: 'var(--accent)', color: '#fff',
                cursor: 'pointer', fontSize: 13, fontWeight: 600
              }}>
                Tentar outra vez
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}