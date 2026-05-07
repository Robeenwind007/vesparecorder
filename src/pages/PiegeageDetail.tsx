import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPiegeage, deletePiegeage, totalCapturesPiegeage } from '../lib/piegeage'
import type { PiegeageAvecCaptures } from '../types/piegeage'
import { useUser } from '../hooks/useUser'
import { Btn, Card, Spinner } from '../components/UI'

export default function PiegeageDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user, isAdmin } = useUser()
  const [p, setP]            = useState<PiegeageAvecCaptures | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    getPiegeage(id).then(data => {
      setP(data)
      setLoading(false)
    })
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('Supprimer définitivement ce piégeage et ses captures ?')) return
    setDeleting(true)
    try {
      await deletePiegeage(id)
      navigate('/piegeages', { replace: true })
    } catch (e) {
      alert('Erreur lors de la suppression')
      console.error(e)
      setDeleting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>
  if (!p) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
      <span className="text-5xl">🪤</span>
      <p>Piégeage introuvable</p>
      <Btn variant="secondary" onClick={() => navigate('/piegeages')}>Retour à la liste</Btn>
    </div>
  )

  // Droit de modification : son propre piège ou admin
  const peutModifier = isAdmin || (p.saisi_par_email === user?.email)
  const enPlace = !p.date_retrait
  const total   = totalCapturesPiegeage(p)

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="flex-1 text-lg font-semibold truncate">{p.type_piege}</h2>
        <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          enPlace ? 'bg-orange-900/60 text-orange-300' : 'bg-green-900/60 text-green-300'
        }`}>
          {enPlace ? '● En place' : '✓ Retiré'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">

        {/* Infos générales */}
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Informations</p>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-gray-400">Date de pose</dt><dd>{p.date_pose}</dd></div>
            {p.date_retrait && (
              <div className="flex justify-between"><dt className="text-gray-400">Date de retrait</dt><dd>{p.date_retrait}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-gray-400">Type de piège</dt><dd>{p.type_piege}</dd></div>
            {p.appat && <div className="flex justify-between"><dt className="text-gray-400">Appât</dt><dd>{p.appat}</dd></div>}
            {p.emplacement && <div className="flex justify-between"><dt className="text-gray-400">Lieu de pose</dt><dd>{p.emplacement}</dd></div>}
            {p.adresse && <div className="flex justify-between gap-3"><dt className="text-gray-400 flex-shrink-0">Adresse</dt><dd className="text-right">{p.adresse}</dd></div>}
            {(p.latitude && p.longitude) && (
              <div className="flex justify-between"><dt className="text-gray-400">GPS</dt><dd className="font-mono text-xs">{p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}</dd></div>
            )}
            {p.saisi_par_email && (
              <div className="flex justify-between gap-3"><dt className="text-gray-400 flex-shrink-0">Saisi par</dt><dd className="truncate text-xs">{p.saisi_par_email}</dd></div>
            )}
          </dl>
        </Card>

        {/* Captures */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Captures</p>
            <span className="text-xs text-amber-400 font-semibold">Total : {total}</span>
          </div>
          {(p.captures?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500 italic">Aucune capture enregistrée</p>
          ) : (
            <div className="space-y-1.5">
              {p.captures.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span>{c.espece}</span>
                  <span className="font-semibold text-amber-400">{c.quantite}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notes */}
        {p.notes && (
          <Card>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{p.notes}</p>
          </Card>
        )}
      </div>

      {/* Footer fixe */}
      {peutModifier && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-4 flex gap-3 safe-bottom">
          <Btn variant="danger" size="lg" onClick={handleDelete} loading={deleting} className="flex-1">
            Supprimer
          </Btn>
          <Btn size="lg" onClick={() => navigate(`/piegeages/${p.id}/edit`)} className="flex-1">
            Modifier
          </Btn>
        </div>
      )}
    </div>
  )
}
