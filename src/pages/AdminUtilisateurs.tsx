import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import type { Utilisateur } from '../types'
import { Card, Spinner } from '../components/UI'

export default function AdminUtilisateurs() {
  const { isAdmin, impersonate } = useUser()
  const navigate                 = useNavigate()
  const [users, setUsers]        = useState<Utilisateur[]>([])
  const [loading, setLoading]    = useState(true)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    supabase.from('utilisateurs').select('*').order('created_at')
      .then(({ data }) => { setUsers(data ?? []); setLoading(false) })
  }, [isAdmin, navigate])

  const toggleRole = async (id: string, role: string) => {
    const newRole = role === 'admin' ? 'piegeur' : 'admin'
    await supabase.from('utilisateurs').update({ role: newRole }).eq('id', id)
    setUsers(u => u.map(x => x.id === id ? { ...x, role: newRole as 'admin' | 'piegeur' } : x))
  }

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from('utilisateurs').update({ actif: !actif }).eq('id', id)
    setUsers(u => u.map(x => x.id === id ? { ...x, actif: !actif } : x))
  }

  const handleImpersonate = (u: Utilisateur) => {
    impersonate({ email: u.email, nom: u.nom, role: u.role, actif: u.actif })
    navigate('/')
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="text-lg font-semibold flex-1">Utilisateurs ({users.length})</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {users.map(u => (
          <Card key={u.id}>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${u.actif ? 'text-white' : 'text-gray-500'}`}>{u.email}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Depuis le {new Date(u.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400'
                }`}>
                  {u.role === 'admin' ? '⭐ Admin' : '👤 Piégeur'}
                </span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {/* Voir comme ce piégeur */}
                {u.role !== 'admin' && u.actif && (
                  <button onClick={() => handleImpersonate(u)}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition-colors font-medium">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Voir comme lui
                  </button>
                )}
                <button onClick={() => toggleRole(u.id, u.role)}
                  className="flex-1 text-xs py-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors font-medium">
                  {u.role === 'admin' ? 'Retirer admin' : 'Passer admin'}
                </button>
                <button onClick={() => toggleActif(u.id, u.actif)}
                  className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${
                    u.actif ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                  }`}>
                  {u.actif ? 'Désactiver' : 'Réactiver'}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
