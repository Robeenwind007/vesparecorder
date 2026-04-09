import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getObservation, deleteObservation } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import type { Observation } from '../types'
import { EspeceBadge, RetireBadge, Btn, Spinner } from '../components/UI'

export default function ObservationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useUser()
  const [obs, setObs]       = useState<Observation | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    getObservation(id).then(data => { setObs(data); setLoading(false) })
  }, [id])

  const handleDelete = async () => {
    if (!id || !confirm('Supprimer cette observation ?')) return
    setDeleting(true)
    await deleteObservation(id)
    navigate(-1)
  }

  // Peut modifier : admin ou auteur
  const canEdit = obs && (isAdmin || obs.saisi_par_email === user?.email)

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>
  if (!obs)    return <div className="p-6 text-gray-400">Observation introuvable</div>

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="flex-1 text-lg font-semibold">Détail observation</h2>
        {canEdit && (
          <button onClick={() => navigate(`/observation/${id}/edit`)} className="text-amber-500 text-sm font-medium">
            Modifier
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {obs.image_url && (
          <img src={obs.image_url} alt="Nid" className="w-full h-56 object-cover rounded-2xl border border-gray-700" />
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <EspeceBadge espece={obs.espece} />
          {obs.type_nid && <span className="text-xs text-gray-300 border border-gray-700 px-2.5 py-1 rounded-full">{obs.type_nid}</span>}
          <RetireBadge retire={obs.retire} />
        </div>

        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 divide-y divide-gray-700/50">
          <Row label="Date"           value={new Date(obs.date_observation).toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} />
          <Row label="Donneur d'ordre" value={obs.donneur_ordre} />
          <Row label="Bénéficiaire"   value={obs.beneficiaire} />
          <Row label="Nombre de nids" value={String(obs.nombre_nids)} />
          <Row label="Emplacement"    value={obs.emplacement} />
        </div>

        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 divide-y divide-gray-700/50">
          <Row label="Localisation" value={obs.origine_localisation} />
          {obs.adresse && <Row label="Adresse" value={obs.adresse} />}
          {obs.latitude && obs.longitude && (
            <Row label="Coordonnées" value={`${obs.latitude.toFixed(5)}, ${obs.longitude.toFixed(5)}`} />
          )}
          {obs.latitude && obs.longitude && (
            <div className="px-4 py-3">
              <a href={`https://www.google.com/maps?q=${obs.latitude},${obs.longitude}`}
                target="_blank" rel="noreferrer" className="text-amber-500 text-sm font-medium">
                Ouvrir dans Maps →
              </a>
            </div>
          )}
        </div>

        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 divide-y divide-gray-700/50">
          <Row label="Saisi par" value={obs.saisi_par_email} />
          <Row label="Créé le"   value={new Date(obs.created_at).toLocaleDateString('fr-FR')} />
        </div>

        {isAdmin && (
          <Btn variant="danger" fullWidth loading={deleting} onClick={handleDelete}>
            Supprimer l'observation
          </Btn>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="text-xs text-gray-500 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-white flex-1">{value}</span>
    </div>
  )
}
