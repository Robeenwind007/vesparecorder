import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDonneurs, addDonneur, supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import type { DonneurOrdre } from '../types'
import { Btn, Input, Card, Spinner } from '../components/UI'

export default function AdminDonneurs() {
  const { isAdmin } = useUser()
  const navigate    = useNavigate()
  const [donneurs, setDonneurs] = useState<DonneurOrdre[]>([])
  const [loading, setLoading]   = useState(true)
  const [nouveau, setNouveau]   = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    getDonneurs().then(d => { setDonneurs(d); setLoading(false) })
  }, [isAdmin, navigate])

  const handleAdd = async () => {
    if (!nouveau.trim()) return
    setSaving(true)
    await addDonneur(nouveau.trim())
    const fresh = await getDonneurs()
    setDonneurs(fresh)
    setNouveau('')
    setSaving(false)
  }

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from('donneurs_ordre').update({ actif: !actif }).eq('id', id)
    setDonneurs(d => d.map(don => don.id === id ? { ...don, actif: !actif } : don))
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h2 className="text-lg font-semibold flex-1">Donneurs d'ordre</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {/* Ajouter */}
        <div className="flex gap-2">
          <Input
            placeholder="Nouveau donneur d'ordre…"
            value={nouveau}
            onChange={e => setNouveau(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1"
          />
          <Btn onClick={handleAdd} loading={saving} disabled={!nouveau.trim()}>
            Ajouter
          </Btn>
        </div>

        {/* Liste */}
        <div className="space-y-2">
          {donneurs.map(d => (
            <Card key={d.id}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${d.actif ? 'text-white' : 'text-gray-500 line-through'}`}>
                  {d.nom}
                </span>
                <button
                  onClick={() => toggleActif(d.id, d.actif)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    d.actif
                      ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60'
                      : 'bg-green-900/40 text-green-400 hover:bg-green-900/60'
                  }`}
                >
                  {d.actif ? 'Désactiver' : 'Réactiver'}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
