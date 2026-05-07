import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { supabase } from '../lib/supabase'
import { getAllAppats, addAppat } from '../lib/piegeage'
import type { Appat } from '../types/piegeage'
import { Btn, Input, Card, Spinner } from '../components/UI'

export default function AdminAppats() {
  const { isAdmin } = useUser()
  const navigate    = useNavigate()
  const [items, setItems] = useState<Appat[]>([])
  const [loading, setLoading] = useState(true)
  const [nouveau, setNouveau] = useState('')
  const [saving, setSaving]   = useState(false)

  const load = () =>
    getAllAppats().then(d => { setItems(d); setLoading(false) })

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    load()
  }, [isAdmin, navigate])

  const handleAdd = async () => {
    if (!nouveau.trim()) return
    setSaving(true)
    await addAppat(nouveau.trim(), undefined) // null = global (admin)
    await load()
    setNouveau('')
    setSaving(false)
  }

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from('appats').update({ actif: !actif }).eq('id', id)
    setItems(d => d.map(a => a.id === id ? { ...a, actif: !actif } : a))
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  const globaux    = items.filter(a => !a.created_by_email)
  const personnels = items.filter(a =>  a.created_by_email)

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="text-lg font-semibold flex-1">Appâts</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">

        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Ajouter un appât global</p>
          <div className="flex gap-2">
            <Input placeholder="Nouvel appât…" value={nouveau}
              onChange={e => setNouveau(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1" />
            <Btn onClick={handleAdd} loading={saving} disabled={!nouveau.trim()}>Ajouter</Btn>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            Appâts globaux ({globaux.length})
          </p>
          {globaux.map(a => (
            <Card key={a.id}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${a.actif ? 'text-white' : 'text-gray-500 line-through'}`}>
                  {a.nom}
                </span>
                <button onClick={() => toggleActif(a.id, a.actif)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    a.actif ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'
                  }`}>
                  {a.actif ? 'Désactiver' : 'Réactiver'}
                </button>
              </div>
            </Card>
          ))}
        </div>

        {personnels.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Appâts personnels ({personnels.length})
            </p>
            {personnels.map(a => (
              <Card key={a.id}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${a.actif ? 'text-white' : 'text-gray-500 line-through'}`}>
                      {a.nom}
                    </p>
                    <p className="text-xs text-amber-600/70 truncate">✉ {a.created_by_email}</p>
                  </div>
                  <button onClick={() => toggleActif(a.id, a.actif)}
                    className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      a.actif ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'
                    }`}>
                    {a.actif ? 'Désactiver' : 'Réactiver'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
