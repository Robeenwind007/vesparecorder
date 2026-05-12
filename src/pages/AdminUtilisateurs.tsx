import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import type { Utilisateur } from '../types'
import { Btn, Card, Spinner } from '../components/UI'

export default function AdminUtilisateurs() {
  const { isAdmin, impersonate, user: currentUser } = useUser()
  const navigate                 = useNavigate()
  const [users, setUsers]        = useState<Utilisateur[]>([])
  const [loading, setLoading]    = useState(true)
  const [toDelete, setToDelete]  = useState<Utilisateur | null>(null)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    load()
  }, [isAdmin, navigate])

  const load = () =>
    supabase.from('utilisateurs').select('*').order('created_at')
      .then(({ data }) => { setUsers(data ?? []); setLoading(false) })

  const toggleRole = async (id: string, role: string) => {
    const newRole = role === 'admin' ? 'piegeur' : 'admin'
    const { data } = await supabase.from('utilisateurs')
      .update({ role: newRole }).eq('id', id).select().single()
    if (data) setUsers(u => u.map(x => x.id === id ? (data as typeof x) : x))
  }

  const toggleActif = async (id: string, actif: boolean) => {
    const { data } = await supabase.from('utilisateurs')
      .update({ actif: !actif }).eq('id', id).select().single()
    if (data) setUsers(u => u.map(x => x.id === id ? (data as typeof x) : x))
  }

  const toggleModule = async (id: string, module: 'module_traitement' | 'module_piegeage', current: boolean) => {
    // Récupérer l'état avant pour détecter le passage actif:false→true
    const before = users.find(u => u.id === id)
    const wasActif = before?.actif ?? false

    const { data } = await supabase.from('utilisateurs')
      .update({ [module]: !current }).eq('id', id).select().single()
    if (data) {
      setUsers(u => u.map(x => x.id === id ? (data as typeof x) : x))
      // Email de bienvenue si le compte vient de passer actif
      if (!wasActif && (data as Utilisateur).actif) {
        sendWelcomeEmail((data as Utilisateur))
          .catch(e => console.warn('Email bienvenue échoué:', e))
      }
    } else {
      setUsers(u => u.map(x => x.id === id ? { ...x, [module]: !current } : x))
    }
  }

  const handleImpersonate = (u: Utilisateur) => {
    impersonate({
      email: u.email, nom: u.nom, role: u.role, actif: u.actif,
      module_traitement: u.module_traitement, module_piegeage: u.module_piegeage,
    })
    navigate('/')
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  // Tri : comptes en attente d'abord, puis par date de création
  const pending = users.filter(u => !u.actif && u.role === 'piegeur')
  const others  = users.filter(u => !(u.role === 'piegeur' && !u.actif))
  const ordered = [...pending, ...others]

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="text-lg font-semibold flex-1">
          Utilisateurs ({users.length})
          {pending.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-amber-500 text-black rounded-full text-xs font-bold">
              {pending.length}
            </span>
          )}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {pending.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4">
            <p className="text-sm text-amber-300 font-medium">
              ⏳ {pending.length} compte{pending.length > 1 ? 's' : ''} en attente de validation
            </p>
            <p className="text-xs text-amber-400/70 mt-1">
              Activez au moins un module pour autoriser l'accès à l'application.
            </p>
          </div>
        )}

        {ordered.map(u => {
          const isPending = u.role === 'piegeur' && !u.actif
          const isMe = u.email === currentUser?.email
          return (
          <Card key={u.id}>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${u.actif ? 'text-white' : 'text-gray-500'}`}>{u.email}</p>
                  {u.entreprise && (
                    <p className="text-xs text-amber-400 mt-0.5 truncate">🏢 {u.entreprise}</p>
                  )}
                  {u.siret && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">SIRET : {u.siret}</p>
                  )}
                  {u.entreprise_telephone && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">☎ {u.entreprise_telephone}</p>
                  )}
                  {(u.entreprise_adresse || u.entreprise_ville) && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {[u.entreprise_adresse, u.entreprise_cp, u.entreprise_ville].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">Depuis le {new Date(u.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                {isPending ? (
                  <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    ⏳ En attente
                  </span>
                ) : (
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {u.role === 'admin' ? '⭐ Admin' : '👤 Piégeur'}
                  </span>
                )}
              </div>

              {/* Bannière modules demandés (uniquement si demandes faites) */}
              {isPending && (u.demande_traitement || u.demande_piegeage) && (
                <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl px-3 py-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-blue-400 font-medium">Demandé par l'utilisateur</p>
                  <div className="flex gap-2 flex-wrap text-xs text-blue-200">
                    {u.demande_traitement && <span>🐝 Traitement</span>}
                    {u.demande_piegeage   && <span>🪤 Piégeage</span>}
                  </div>
                </div>
              )}

              {u.role !== 'admin' && (
                <div className="bg-gray-900/40 border border-gray-700/50 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">Modules autorisés</p>
                  <div className="grid grid-cols-2 gap-2">
                    <ModuleToggle
                      label="Traitement" icon="🐝"
                      enabled={u.module_traitement}
                      onChange={() => toggleModule(u.id, 'module_traitement', u.module_traitement)}
                    />
                    <ModuleToggle
                      label="Piégeage" icon="🪤"
                      enabled={u.module_piegeage}
                      onChange={() => toggleModule(u.id, 'module_piegeage', u.module_piegeage)}
                    />
                  </div>
                  {!u.module_traitement && !u.module_piegeage && (
                    <p className="text-xs text-amber-500/80">⚠️ Aucun module activé : l'utilisateur ne pourra rien saisir.</p>
                  )}
                </div>
              )}

              {u.role === 'admin' && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2">
                  <p className="text-xs text-amber-400/80">⭐ Les administrateurs ont tous les modules par défaut.</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
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
                {u.role === 'admin' && (
                  <button onClick={() => toggleActif(u.id, u.actif)}
                    className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${
                      u.actif ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                    }`}>
                    {u.actif ? 'Désactiver' : 'Réactiver'}
                  </button>
                )}
                {!isMe && (
                  <button onClick={() => setToDelete(u)}
                    className="flex-1 text-xs py-2 rounded-lg bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors font-medium">
                    🗑 Supprimer
                  </button>
                )}
              </div>
            </div>
          </Card>
          )
        })}
      </div>

      {/* Modale de suppression */}
      {toDelete && (
        <DeleteModal
          user={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={() => { setToDelete(null); load() }}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Toggle module (switch ON/OFF)
// ──────────────────────────────────────────────────────────────
function ModuleToggle({
  label, icon, enabled, onChange,
}: {
  label: string; icon: string; enabled: boolean; onChange: () => void
}) {
  return (
    <button onClick={onChange}
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
        enabled
          ? 'bg-amber-500/15 border-amber-500/40'
          : 'bg-gray-800/40 border-gray-700/50'
      }`}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-base">{icon}</span>
        <span className={`text-sm font-medium truncate ${enabled ? 'text-amber-300' : 'text-gray-500'}`}>{label}</span>
      </span>
      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
        enabled ? 'bg-amber-500' : 'bg-gray-600'
      }`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-[1.25rem]' : 'translate-x-[0.2rem]'
        }`} />
      </span>
    </button>
  )
}

// ──────────────────────────────────────────────────────────────
// Modale de suppression d'utilisateur
// ──────────────────────────────────────────────────────────────
interface Counts {
  observations: number
  piegeages: number
  donneurs: number
  tickets: number
  especes: number
}

function DeleteModal({
  user, onClose, onDeleted,
}: {
  user: Utilisateur
  onClose: () => void
  onDeleted: () => void
}) {
  const [counts, setCounts]   = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode]       = useState<'keep' | 'all'>('keep')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    countUserData(user.email).then(c => { setCounts(c); setLoading(false) })
  }, [user.email])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      if (mode === 'all') {
        // Hard delete des données associées (sauf observations/piégeages
        // qui appartiennent au métier — on garde l'historique en mode "all"
        // aussi si tu changes d'avis, dis-le)
        await supabase.from('observations').delete().eq('saisi_par_email', user.email)
        await supabase.from('piegeages').delete().eq('saisi_par_email', user.email)
        await supabase.from('donneurs_ordre').delete().eq('created_by_email', user.email)
        await supabase.from('especes').delete().eq('created_by_email', user.email)
        // Tickets : cascade delete sur support_messages via FK
        await supabase.from('support_tickets').delete().eq('user_email', user.email)
      }
      // Toujours supprimer le user en dernier
      const { error } = await supabase.from('utilisateurs').delete().eq('id', user.id)
      if (error) throw error
      onDeleted()
    } catch (e) {
      alert('Erreur lors de la suppression : ' + (e as Error).message)
      console.error(e)
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto safe-bottom">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Supprimer l'utilisateur</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-4">

          <p className="text-sm text-gray-300">
            Cette action est <strong className="text-red-400">irréversible</strong>.
            Que faire des données associées à ce compte ?
          </p>

          {/* Compteurs */}
          {loading ? (
            <div className="flex justify-center py-4"><Spinner size={20} /></div>
          ) : counts && (
            <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-4 space-y-1.5 text-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Données du compte</p>
              <Row label="Observations"        value={counts.observations} />
              <Row label="Piégeages"           value={counts.piegeages} />
              <Row label="Donneurs perso"      value={counts.donneurs} />
              <Row label="Tickets de support"  value={counts.tickets} />
              <Row label="Espèces perso"       value={counts.especes} />
            </div>
          )}

          {/* Choix */}
          <div className="space-y-2">
            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              mode === 'keep' ? 'bg-amber-500/10 border-amber-500/40' : 'bg-gray-800 border-gray-700'
            }`}>
              <input type="radio" name="mode" value="keep"
                checked={mode === 'keep'} onChange={() => setMode('keep')}
                className="mt-0.5 accent-amber-500" />
              <div>
                <p className="text-sm text-white font-medium">Garder les données</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Le compte est supprimé. Ses observations, piégeages, donneurs et tickets restent en base
                  (l'email apparaîtra encore dans les listes mais ne pourra plus se reconnecter sans demander une nouvelle validation).
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
              mode === 'all' ? 'bg-red-900/20 border-red-700/60' : 'bg-gray-800 border-gray-700'
            }`}>
              <input type="radio" name="mode" value="all"
                checked={mode === 'all'} onChange={() => setMode('all')}
                className="mt-0.5 accent-red-500" />
              <div>
                <p className="text-sm text-white font-medium">Tout supprimer</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Le compte ET toutes ses données (observations, piégeages, donneurs, tickets, espèces).
                  Aucun moyen de récupérer ensuite, sauf via une sauvegarde JSON.
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Btn variant="ghost" onClick={onClose} className="flex-1" disabled={deleting}>
              Annuler
            </Btn>
            <Btn variant="danger" onClick={handleDelete} className="flex-1" loading={deleting}>
              {mode === 'all' ? 'Tout supprimer' : 'Supprimer le compte'}
            </Btn>
          </div>

        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-gray-300">
      <span>{label}</span>
      <span className={value > 0 ? 'text-amber-400 font-medium tabular-nums' : 'text-gray-600 tabular-nums'}>
        {value}
      </span>
    </div>
  )
}

// Compte les données associées à un email
async function countUserData(email: string): Promise<Counts> {
  const [obs, pie, don, tic, esp] = await Promise.all([
    supabase.from('observations').select('*', { count: 'exact', head: true }).eq('saisi_par_email', email),
    supabase.from('piegeages').select('*', { count: 'exact', head: true }).eq('saisi_par_email', email),
    supabase.from('donneurs_ordre').select('*', { count: 'exact', head: true }).eq('created_by_email', email),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('user_email', email),
    supabase.from('especes').select('*', { count: 'exact', head: true }).eq('created_by_email', email),
  ])
  return {
    observations: obs.count ?? 0,
    piegeages:    pie.count ?? 0,
    donneurs:     don.count ?? 0,
    tickets:      tic.count ?? 0,
    especes:      esp.count ?? 0,
  }
}

// Envoie un email de bienvenue à l'utilisateur quand son compte est activé
async function sendWelcomeEmail(user: Utilisateur): Promise<void> {
  const url      = import.meta.env.VITE_SUPABASE_URL as string
  const anonKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  const modules: string[] = []
  if (user.module_traitement) modules.push('Traitement des nids')
  if (user.module_piegeage)   modules.push('Piégeage')
  const modulesText = modules.length > 0 ? modules.join(' et ') : 'aucun module pour l\'instant'

  await fetch(`${url}/functions/v1/send-support-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ticket_id: 'welcome',
      sujet: `Bienvenue sur VespaRecorder !`,
      contenu: `Votre compte a été validé. Vous pouvez maintenant vous connecter à l'application avec votre email ${user.email}.\n\nModules autorisés : ${modulesText}.\n\nSi vous étiez sur l'écran d'attente, l'application s'ouvrira automatiquement dans les 30 secondes. Sinon, retournez sur https://www.vesparecorder.fr pour vous connecter.`,
      auteur_email: 'admin@vesparecorder.fr',
      auteur_role: 'admin',
      destinataire_email: user.email,
    }),
  })
}
