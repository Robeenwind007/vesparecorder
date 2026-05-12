import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDonneur, updateDonneur, supabase } from '../lib/supabase'
import type { DonneurFields } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import type { DonneurOrdre } from '../types'
import { Btn, Input, Card, Spinner } from '../components/UI'

const EMPTY_FIELDS: DonneurFields = {
  nom: '',
  adresse: '',
  adresse_complement: '',
  code_postal: '',
  ville: '',
  responsable: '',
  email: '',
}

export default function AdminDonneurs() {
  const { isAdmin, user } = useUser()
  const navigate          = useNavigate()
  const [donneurs, setDonneurs] = useState<DonneurOrdre[]>([])
  const [loading, setLoading]   = useState(true)
  const [voirTout, setVoirTout] = useState(true)

  // États du formulaire (ajout OU édition)
  const [editId, setEditId]         = useState<string | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [fields, setFields]         = useState<DonneurFields>(EMPTY_FIELDS)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const load = () => {
    supabase.from('donneurs_ordre').select('*').order('nom')
      .then(({ data }) => { setDonneurs(data ?? []); setLoading(false) })
  }

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    load()
  }, [isAdmin, navigate])

  const validateFields = (): string | null => {
    if (!fields.nom.trim())         return 'Le nom est obligatoire'
    if (!fields.adresse?.trim())    return 'L\'adresse est obligatoire'
    if (!fields.code_postal?.trim()) return 'Le code postal est obligatoire'
    if (!fields.ville?.trim())      return 'La ville est obligatoire'
    if (!fields.responsable?.trim()) return 'Le nom du responsable est obligatoire'
    if (!fields.email?.trim())      return 'L\'email est obligatoire'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.email.trim()))
      return 'Format d\'email invalide'
    return null
  }

  const openCreateForm = () => {
    setEditId(null)
    setFields(EMPTY_FIELDS)
    setError('')
    setShowForm(true)
  }

  const openEditForm = (d: DonneurOrdre) => {
    setEditId(d.id)
    setFields({
      nom: d.nom,
      adresse:            d.adresse            ?? '',
      adresse_complement: d.adresse_complement ?? '',
      code_postal:        d.code_postal        ?? '',
      ville:              d.ville              ?? '',
      responsable:        d.responsable        ?? '',
      email:              d.email              ?? '',
    })
    setError('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setFields(EMPTY_FIELDS)
    setError('')
  }

  const handleSave = async () => {
    const err = validateFields()
    if (err) { setError(err); return }
    setError('')
    setSaving(true)
    if (editId) {
      await updateDonneur(editId, fields)
    } else {
      await addDonneur(fields, user?.email)
    }
    await load()
    setSaving(false)
    closeForm()
  }

  const toggleActif = async (id: string, actif: boolean) => {
    await supabase.from('donneurs_ordre').update({ actif: !actif }).eq('id', id)
    setDonneurs(d => d.map(don => don.id === id ? { ...don, actif: !actif } : don))
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  const donneursAffiches = voirTout
    ? donneurs
    : donneurs.filter(d => d.created_by_email === user?.email)

  const groupes = donneursAffiches.reduce<Record<string, DonneurOrdre[]>>((acc, d) => {
    const key = d.created_by_email ?? '— Sans propriétaire —'
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})

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
        <h2 className="text-lg font-semibold flex-1">
          Donneurs d'ordre ({donneursAffiches.length})
        </h2>
        <button onClick={() => setVoirTout(v => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            voirTout
              ? 'bg-amber-500 border-amber-500 text-black'
              : 'bg-gray-800 border-gray-700 text-gray-300'
          }`}>
          {voirTout ? '👁 Tous' : '👤 Les miens'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">

        {/* Bouton ouvrir formulaire d'ajout */}
        {!showForm && (
          <Btn onClick={openCreateForm} fullWidth>
            + Ajouter un donneur
          </Btn>
        )}

        {/* Formulaire (ajout ou édition) */}
        {showForm && (
          <Card>
            <p className="text-xs text-amber-500 uppercase tracking-wide font-medium mb-3">
              {editId ? 'Modifier le donneur' : 'Nouveau donneur d\'ordre'}
            </p>
            <div className="space-y-3">
              <Field label="Nom *"
                value={fields.nom}
                onChange={v => setFields(f => ({ ...f, nom: v }))}
                placeholder="Ex: Mairie de Cordemais" />

              <Field label="Adresse *"
                value={fields.adresse ?? ''}
                onChange={v => setFields(f => ({ ...f, adresse: v }))}
                placeholder="Ex: 1 rue de la Mairie" />

              <Field label="Complément d'adresse"
                value={fields.adresse_complement ?? ''}
                onChange={v => setFields(f => ({ ...f, adresse_complement: v }))}
                placeholder="Bâtiment, étage, etc." />

              <div className="grid grid-cols-3 gap-2">
                <Field label="CP *"
                  value={fields.code_postal ?? ''}
                  onChange={v => setFields(f => ({ ...f, code_postal: v }))}
                  placeholder="44360"
                  inputMode="numeric" />
                <div className="col-span-2">
                  <Field label="Ville *"
                    value={fields.ville ?? ''}
                    onChange={v => setFields(f => ({ ...f, ville: v }))}
                    placeholder="Cordemais" />
                </div>
              </div>

              <Field label="Responsable *"
                value={fields.responsable ?? ''}
                onChange={v => setFields(f => ({ ...f, responsable: v }))}
                placeholder="Prénom et nom" />

              <Field label="Email *"
                value={fields.email ?? ''}
                onChange={v => setFields(f => ({ ...f, email: v }))}
                placeholder="contact@mairie.fr"
                type="email" />

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-3 py-2 text-center">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Btn variant="ghost" onClick={closeForm} className="flex-1">
                  Annuler
                </Btn>
                <Btn onClick={handleSave} loading={saving} className="flex-1">
                  {editId ? 'Enregistrer' : 'Ajouter'}
                </Btn>
              </div>
            </div>
          </Card>
        )}

        {ordreUtilisateurs.length === 0 && !showForm && (
          <div className="text-center py-8 text-sm text-gray-500">
            Aucun donneur à afficher.
          </div>
        )}

        {/* Liste groupée */}
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
              {liste.map(d => {
                const incomplet = !d.adresse || !d.ville || !d.email
                return (
                  <Card key={d.id}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${d.actif ? 'text-white' : 'text-gray-500 line-through'}`}>
                              {d.nom}
                            </span>
                            {incomplet && d.actif && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                À compléter
                              </span>
                            )}
                          </div>
                          {(d.adresse || d.ville) && (
                            <p className="text-xs text-gray-500 mt-1">
                              {[d.adresse, d.code_postal, d.ville].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {d.responsable && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Resp. : {d.responsable}
                            </p>
                          )}
                          {d.email && (
                            <p className="text-xs text-gray-500 mt-0.5">{d.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEditForm(d)}
                          className="flex-1 text-xs py-2 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition-colors font-medium">
                          Modifier
                        </button>
                        <button onClick={() => toggleActif(d.id, d.actif)}
                          className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${
                            d.actif ? 'bg-red-900/40 text-red-400' : 'bg-green-900/40 text-green-400'
                          }`}>
                          {d.actif ? 'Désactiver' : 'Réactiver'}
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Champ formulaire compact ──────────────────────────────────────
function Field({
  label, value, onChange, placeholder, type, inputMode,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'email'
  inputMode?: 'text' | 'numeric' | 'email'
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block px-1">{label}</label>
      <Input value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        type={type ?? 'text'}
        inputMode={inputMode}
      />
    </div>
  )
}
