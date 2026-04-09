import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getObservations } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import type { Observation } from '../types'
import { ESPECES } from '../types'
import { EspeceBadge, RetireBadge, Card, Empty, Spinner } from '../components/UI'

export default function ListePage() {
  const { user, isAdmin } = useUser()
  const navigate = useNavigate()

  const [obs, setObs]         = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filtreEsp, setFiltreEsp] = useState('')
  const [filtreRet, setFiltreRet] = useState('')
  const [voirTout, setVoirTout]   = useState(false) // admin seulement

  useEffect(() => {
    if (!user) return
    const emailFiltre = isAdmin && voirTout ? undefined : user.email
    getObservations({ emailFiltre }).then(data => { setObs(data); setLoading(false) })
  }, [user, isAdmin, voirTout])

  const filtered = obs.filter(o => {
    if (filtreEsp && o.espece !== filtreEsp) return false
    if (filtreRet === 'oui' && !o.retire)   return false
    if (filtreRet === 'non' &&  o.retire)   return false
    if (search) {
      const s = search.toLowerCase()
      return (
        o.donneur_ordre?.toLowerCase().includes(s) ||
        o.beneficiaire?.toLowerCase().includes(s) ||
        o.adresse?.toLowerCase().includes(s) ||
        o.espece.toLowerCase().includes(s) ||
        o.emplacement?.toLowerCase().includes(s) ||
        o.saisi_par_email?.toLowerCase().includes(s)
      )
    }
    return true
  })

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="px-4 pt-4 pb-3 space-y-3 border-b border-gray-800">
        {/* Recherche */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="search" placeholder="Rechercher…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500" />
        </div>

        {/* Filtres + toggle admin */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <select value={filtreEsp} onChange={e => setFiltreEsp(e.target.value)}
            className="flex-shrink-0 bg-gray-800 border border-gray-700 text-sm text-white rounded-xl px-3 py-2 focus:outline-none">
            <option value="">Toutes espèces</option>
            {ESPECES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filtreRet} onChange={e => setFiltreRet(e.target.value)}
            className="flex-shrink-0 bg-gray-800 border border-gray-700 text-sm text-white rounded-xl px-3 py-2 focus:outline-none">
            <option value="">Tous statuts</option>
            <option value="non">Actifs</option>
            <option value="oui">Retirés</option>
          </select>
          {isAdmin && (
            <button onClick={() => setVoirTout(v => !v)}
              className={`flex-shrink-0 text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${
                voirTout ? 'bg-amber-500 border-amber-500 text-black' : 'bg-gray-800 border-gray-700 text-gray-300'
              }`}>
              {voirTout ? '👁 Tous' : '👤 Les miennes'}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500">{filtered.length} observation{filtered.length > 1 ? 's' : ''}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-20">
        {loading ? (
          <div className="flex justify-center pt-12"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <Empty message="Aucune observation trouvée" icon="🔍" />
        ) : filtered.map(o => (
          <Card key={o.id} onClick={() => navigate(`/observation/${o.id}`)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <EspeceBadge espece={o.espece} />
                  {o.type_nid && (
                    <span className="text-xs text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full">
                      {o.type_nid}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-white truncate">{o.donneur_ordre ?? '—'}</p>
                {o.beneficiaire && <p className="text-xs text-gray-400 truncate">👤 {o.beneficiaire}</p>}
                {(o.adresse || (o.latitude && o.longitude)) && (
                  <p className="text-xs text-gray-500 truncate">
                    📍 {o.adresse ?? `${o.latitude?.toFixed(4)}, ${o.longitude?.toFixed(4)}`}
                  </p>
                )}
                {o.emplacement && <p className="text-xs text-gray-500">🌿 {o.emplacement}</p>}
                {/* Afficher l'email seulement si admin en mode "tout voir" */}
                {isAdmin && voirTout && o.saisi_par_email && (
                  <p className="text-xs text-amber-600/70 truncate">✉ {o.saisi_par_email}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <RetireBadge retire={o.retire} />
                <p className="text-xs text-gray-500">
                  {new Date(o.date_observation).toLocaleDateString('fr-FR')}
                </p>
                {o.image_url && (
                  <img src={o.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-700" />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
