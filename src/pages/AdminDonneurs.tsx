import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDonneurs, addDonneur, supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import type { DonneurOrdre } from '../types'
import { Btn, Input, Card, Spinner } from '../components/UI'

export default function AdminDonneurs() {
  const { isAdmin, user } = useUser()
  const navigate          = useNavigate()
  const [donneurs, setDonneurs] = useState<DonneurOrdre[]>([])
  const [loading, setLoading]   = useState(true)
  const [nouveau, setNouveau]   = useState('')
  const [saving, setSaving]     = useState(false)

  const load = () => {
    // Admin voit tous les donneurs ; pour ne récupérer que les actifs OU inactifs
    // (pour la gestion admin), on ne filtre pas sur actif côté lib.
    // On utilise donc une requête directe ici.
    supabase.from('donneurs_ordre').select('*').order('nom')
      .then(({ data }) => { setDonneurs(data ?? []); setLoading(false) })
  }

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    load()
  }, [isAdmin, navigate])

  const handleAdd = async () => {
    if (!nouveau.trim()) return
    setSaving(true)
    // L'admin qui ajoute → personnel à lui
    await addDonneur(nouveau.trim(), user?.email)
    await load()
    setNouveau('')
    setSaving(false)
  }

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from('donneurs_ordre').update({ actif: !actif }).eq('id', id)
    setDonneurs(d => d.map(don => don.id === id ? { ...don, actif: !actif } : don))
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  // Regrouper par utilisateur pour lecture
  const groupes = donneurs.reduce<Record<string, DonneurOrdre[]>>((acc, d) => {
    const key = d.created_by_email ?? '— Sans propriétaire —'
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

  // Trier : mes donneurs en premier, puis par email
  const ordreUtilisateurs = Object.keys(groupes).sort((a, b) => {
    if (a === user?.email) return -1
    if (b === user?.email) return 1
    return a.localeCompare(b)
  })

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="text-lg font-semibold flex-1">Donneurs d'ordre ({donneurs.length})</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">

        {/* Ajouter un donneur (personnel à l'admin connecté) */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Ajouter un donneur</p>
          <div className="flex gap-2">
            <Input placeholder="Nouveau donneur d'ordre…" value={nouveau}
              onChange={e => setNouveau(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1" />
            <Btn onClick={handleAdd} loading={saving} disabled={!nouveau.trim()}>
              Ajouter
            </Btn>
          </div>
          <p className="text-xs text-gray-600">
            Le donneur sera attribué à votre compte ({user?.email}).
          </p>
        </div>

        {/* Donneurs groupés par utilisateur */}
        {ordreUtilisateurs.map(emailUser => {
          const liste = groupes[emailUser]
          const isMine = emailUser === user?.email
          return (
            <div key={emailUser} className="space-y-2">
              <p className="text-xs uppercase tracking-wide font-medium flex items-center gap-2">
                <span className={isMine ? 'text-amber-400' : 'text-gray-500'}>
                  {isMine ? '⭐ Mes donneurs' : `✉ ${emailUser}`}
                </span>
                <span className="text-gray-600">({liste.length})</span>
              </p>
              {liste.map(d => (
                <Card key={d.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-medium ${d.actif ? 'text-white' : 'text-gray-500 line-through'}`}>
                      {d.nom}
                    </span>
                    <button onClick={() => toggleActif(d.id, d.actif)}
                      className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        d.actif ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'
                      }`}>
                      {d.actif ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
