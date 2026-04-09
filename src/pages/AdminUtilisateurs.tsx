import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import type { Profile } from '../types'
import { Card, Spinner } from '../components/UI'

export default function AdminUtilisateurs() {
  const { isAdmin } = useUser()
  const navigate    = useNavigate()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    supabase
      .from('profiles')
      .select('*')
      .order('created_at')
      .then(({ data }) => { setProfiles(data ?? []); setLoading(false) })
  }, [isAdmin, navigate])

  const toggleRole = async (id: string, role: string) => {
    const newRole = role === 'admin' ? 'piegeur' : 'admin'
    await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    setProfiles(p => p.map(u => u.id === id ? { ...u, role: newRole as 'admin' | 'piegeur' } : u))
  }

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from('profiles').update({ actif: !actif }).eq('id', id)
    setProfiles(p => p.map(u => u.id === id ? { ...u, actif: !actif } : u))
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
        <h2 className="text-lg font-semibold flex-1">Utilisateurs ({profiles.length})</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {profiles.map(u => (
          <Card key={u.id}>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${u.actif ? 'text-white' : 'text-gray-500'}`}>
                    {u.email}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Depuis le {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  u.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {u.role === 'admin' ? '⭐ Admin' : '👤 Piégeur'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleRole(u.id, u.role)}
                  className="flex-1 text-xs py-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors font-medium"
                >
                  {u.role === 'admin' ? 'Retirer admin' : 'Passer admin'}
                </button>
                <button
                  onClick={() => toggleActif(u.id, u.actif)}
                  className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${
                    u.actif
                      ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                      : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                  }`}
                >
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
