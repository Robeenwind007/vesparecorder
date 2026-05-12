// ============================================================
// Modale "Mon entreprise" — fiche descriptive du pro
// Affichée depuis ProfilPage pour les users ayant le module Traitement
// ============================================================
import { useState, useEffect } from 'react'
import { useUser } from '../hooks/useUser'
import { getEntreprise, updateEntreprise, isValidSiret } from '../lib/entreprise'
import type { EntrepriseFields } from '../lib/entreprise'
import { Btn, Input, Spinner } from './UI'

const EMPTY: EntrepriseFields = {
  entreprise:            '',
  siret:                 '',
  entreprise_adresse:    '',
  entreprise_complement: '',
  entreprise_cp:         '',
  entreprise_ville:      '',
  entreprise_telephone:  '',
}

export default function EntrepriseModal({ onClose }: { onClose: () => void }) {
  const { user } = useUser()
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [fields, setFields]     = useState<EntrepriseFields>(EMPTY)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!user) return
    getEntreprise(user.email).then(data => {
      if (data) {
        setFields({
          entreprise:            data.entreprise            ?? '',
          siret:                 data.siret                 ?? '',
          entreprise_adresse:    data.entreprise_adresse    ?? '',
          entreprise_complement: data.entreprise_complement ?? '',
          entreprise_cp:         data.entreprise_cp         ?? '',
          entreprise_ville:      data.entreprise_ville      ?? '',
          entreprise_telephone:  data.entreprise_telephone  ?? '',
        })
      }
      setLoading(false)
    })
  }, [user])

  const handleSave = async () => {
    if (!user) return
    // Validation : raison sociale et SIRET obligatoires
    if (!fields.entreprise?.trim()) {
      setError('La raison sociale est obligatoire')
      return
    }
    if (!fields.siret?.trim()) {
      setError('Le SIRET est obligatoire')
      return
    }
    if (!isValidSiret(fields.siret)) {
      setError('Le SIRET doit comporter 14 chiffres')
      return
    }
    setError('')
    setSaving(true)
    const { error: dbError } = await updateEntreprise(user.email, fields)
    setSaving(false)
    if (dbError) {
      setError('Erreur lors de l\'enregistrement : ' + dbError.message)
      return
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto safe-bottom">

        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
          <span className="text-2xl">🏢</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Mon entreprise</p>
            <p className="text-xs text-gray-500">Informations de votre activité professionnelle</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Spinner size={28} /></div>
          ) : (
            <>
              <Field label="Raison sociale *"
                value={fields.entreprise ?? ''}
                onChange={v => setFields(f => ({ ...f, entreprise: v }))}
                placeholder="Ex: SAS DésinfectPro" />

              <Field label="SIRET *"
                value={fields.siret ?? ''}
                onChange={v => setFields(f => ({ ...f, siret: v }))}
                placeholder="14 chiffres"
                inputMode="numeric"
                maxLength={14} />

              <Field label="Adresse"
                value={fields.entreprise_adresse ?? ''}
                onChange={v => setFields(f => ({ ...f, entreprise_adresse: v }))}
                placeholder="Ex: 1 rue de l'Activité" />

              <Field label="Complément d'adresse"
                value={fields.entreprise_complement ?? ''}
                onChange={v => setFields(f => ({ ...f, entreprise_complement: v }))}
                placeholder="Bâtiment, étage, etc." />

              <div className="grid grid-cols-3 gap-2">
                <Field label="CP"
                  value={fields.entreprise_cp ?? ''}
                  onChange={v => setFields(f => ({ ...f, entreprise_cp: v }))}
                  placeholder="44360"
                  inputMode="numeric" />
                <div className="col-span-2">
                  <Field label="Ville"
                    value={fields.entreprise_ville ?? ''}
                    onChange={v => setFields(f => ({ ...f, entreprise_ville: v }))}
                    placeholder="Cordemais" />
                </div>
              </div>

              <Field label="Téléphone"
                value={fields.entreprise_telephone ?? ''}
                onChange={v => setFields(f => ({ ...f, entreprise_telephone: v }))}
                placeholder="02 40 00 00 00"
                inputMode="tel" />

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-3 py-2 text-center">
                  {error}
                </p>
              )}

              <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-3">
                <p className="text-xs text-gray-400">
                  💡 Seuls la <b>raison sociale</b> et le <b>SIRET</b> sont obligatoires.
                  Les autres informations sont facultatives mais utiles pour les rapports d'intervention.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Btn variant="ghost" onClick={onClose} className="flex-1" disabled={saving}>
                  Annuler
                </Btn>
                <Btn onClick={handleSave} loading={saving} className="flex-1">
                  Enregistrer
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Champ formulaire compact ──────────────────────────────────────
function Field({
  label, value, onChange, placeholder, inputMode, maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: 'text' | 'numeric' | 'tel'
  maxLength?: number
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block px-1">{label}</label>
      <Input value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
      />
    </div>
  )
}
