import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import {
  createObservation, updateObservation, getObservation,
  getDonneurs, addDonneur, uploadPhoto, geocodeAdresse
} from '../lib/supabase'
import { getEntreprise } from '../lib/entreprise'
import type { Espece, TypeNid, Emplacement, DonneurOrdre } from '../types'
import { TYPES_NID, EMPLACEMENTS } from '../types'
import { useEspeces } from '../hooks/useEspeces'
import { Btn, ToggleBtn, Input, Stepper, Spinner } from '../components/UI'

interface FormData {
  date_observation: string
  donneur_ordre: string
  origine_localisation: 'GPS' | 'Adresse'
  latitude: number | null
  longitude: number | null
  adresse: string
  espece: Espece
  type_nid: TypeNid | ''
  nombre_nids: number
  beneficiaire: string
  emplacement: Emplacement | ''
  retire: boolean | null
  saisi_par_email: string
  image_file: File | null
  image_url: string | null
}

export default function FormulaireIntervention() {
  const { id }   = useParams()
  const isEdit   = Boolean(id)
  const { user, isAdmin } = useUser()
  const { noms: especesNoms, getColor: especesGetColor } = useEspeces()
  const navigate = useNavigate()

  const [donneurs, setDonneurs]         = useState<DonneurOrdre[]>([])
  const [loading, setLoading]           = useState(false)
  const [loadingGPS, setLoadingGPS]     = useState(false)
  const [saving, setSaving]             = useState(false)
  const [errors, setErrors]             = useState<Partial<Record<string, string>>>({})
  const [preview, setPreview]           = useState<string | null>(null)
  // Ajout donneur inline
  const [showAddDonneur, setShowAddDonneur] = useState(false)
  const [newDonneur, setNewDonneur]         = useState('')
  const [savingDonneur, setSavingDonneur]   = useState(false)
  // Envoi fiche au donneur d'ordre
  const [showConfirmSend, setShowConfirmSend] = useState(false)
  const [showSuccess, setShowSuccess]         = useState(false)
  const [sendError, setSendError]             = useState<string | null>(null)
  const [sending, setSending]                 = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>({
    date_observation: new Date().toISOString().split('T')[0],
    donneur_ordre: '', origine_localisation: 'GPS',
    latitude: null, longitude: null, adresse: '',
    espece: 'Asiatique', type_nid: '',
    nombre_nids: 1, beneficiaire: '', emplacement: '',
    retire: null, saisi_par_email: '',
    image_file: null, image_url: null,
  })

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const loadDonneurs = () =>
    getDonneurs(user?.email, isAdmin).then(setDonneurs)

  useEffect(() => {
    loadDonneurs()
    if (isEdit && id) {
      setLoading(true)
      getObservation(id).then(obs => {
        if (!obs) return
        setForm({
          date_observation: obs.date_observation,
          donneur_ordre: obs.donneur_ordre ?? '',
          origine_localisation: obs.origine_localisation ?? 'GPS',
          latitude: obs.latitude, longitude: obs.longitude,
          adresse: obs.adresse ?? '',
          espece: obs.espece, type_nid: (obs.type_nid ?? '') as TypeNid | '',
          nombre_nids: obs.nombre_nids, beneficiaire: obs.beneficiaire ?? '',
          emplacement: (obs.emplacement ?? '') as Emplacement | '',
          retire: obs.retire, saisi_par_email: obs.saisi_par_email ?? '',
          image_file: null, image_url: obs.image_url,
        })
        if (obs.image_url) setPreview(obs.image_url)
        setLoading(false)
      })
    }
  }, [id, isEdit, user])

  // Ajouter un nouveau donneur d'ordre
  const handleAddDonneur = async () => {
    const nom = newDonneur.trim()
    if (!nom) return
    setSavingDonneur(true)
    await addDonneur({ nom }, user?.email)
    await loadDonneurs()
    set('donneur_ordre', nom)
    setNewDonneur('')
    setShowAddDonneur(false)
    setSavingDonneur(false)
  }

  const captureGPS = (): Promise<{lat: number, lng: number} | null> => {
    setLoadingGPS(true)
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          set('latitude', coords.lat)
          set('longitude', coords.lng)
          setLoadingGPS(false)
          resolve(coords)
        },
        () => {
          setLoadingGPS(false)
          alert('Impossible de récupérer la position GPS.\nVérifiez que la localisation est autorisée, ou saisissez l\'adresse.')
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    set('image_file', file)
    setPreview(URL.createObjectURL(file))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.donneur_ordre) errs.donneur_ordre = 'Requis'
    // Au moins l'un des deux : adresse OU GPS
    const aAdresse = form.adresse.trim().length > 0
    const aGPS = form.latitude != null && form.longitude != null
    if (!aAdresse && !aGPS) {
      errs.localisation = 'Saisissez une adresse ou capturez la position GPS'
    }
    if (!form.type_nid) errs.type_nid = 'Choisissez un type de nid'
    if (!form.emplacement) errs.emplacement = 'Choisissez un emplacement'
    if (form.retire === null) errs.retire = 'Indiquez si le nid est retiré'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Sauvegarde la fiche en base et retourne les valeurs effectives (lat/lng/image_url)
  // utilisées après géocodage et upload. Ne navigue pas.
  const saveAndReturn = async (): Promise<{ lat: number | null; lng: number | null; image_url: string | null } | null> => {
    if (!user) return null
    let lat = form.latitude, lng = form.longitude
    const adresse = form.adresse.trim()

    let image_url = form.image_url
    if (form.image_file) image_url = await uploadPhoto(user.email, form.image_file)

    // Si adresse saisie sans GPS → géocodage automatique
    if (adresse && !lat) {
      const coords = await geocodeAdresse(adresse)
      if (coords) {
        lat = coords.lat
        lng = coords.lng
      } else {
        // Adresse non trouvée et pas de GPS → on bloque avec un message d'erreur
        setErrors(prev => ({
          ...prev,
          localisation: 'Adresse introuvable. Précisez l\'adresse ou capturez la position GPS.',
        }))
        return null
      }
    }

    const origine: 'GPS' | 'Adresse' =
      form.latitude != null ? 'GPS' :
      adresse ? 'Adresse' : 'GPS'

    const payload = {
      date_observation: form.date_observation,
      donneur_ordre: form.donneur_ordre || null,
      origine_localisation: origine,
      latitude: lat, longitude: lng,
      adresse: adresse || null,
      espece: form.espece, type_nid: form.type_nid as TypeNid,
      nombre_nids: form.nombre_nids,
      beneficiaire: form.beneficiaire || null,
      emplacement: (form.emplacement || null) as Emplacement | null,
      retire: form.retire as boolean, image_url,
      saisi_par_email: isEdit ? (form.saisi_par_email || user.email) : user.email,
    }

    if (isEdit && id) await updateObservation(id, payload)
    else await createObservation(payload)

    // On synchronise le state local avec les valeurs effectivement enregistrées
    setForm(f => ({
      ...f,
      latitude: lat, longitude: lng,
      image_url, image_file: null,
    }))
    return { lat, lng, image_url }
  }

  const handleSave = async () => {
    if (!validate() || !user) return
    setSaving(true)
    try {
      const result = await saveAndReturn()
      if (result === null) return // Échec géocodage : erreur déjà affichée dans le form
      navigate(-1)
    } catch (e) {
      alert('Erreur lors de la sauvegarde')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Donneur d'ordre actuellement sélectionné (objet complet, pas juste le nom)
  const donneurSelectionne = donneurs.find(d => d.nom === form.donneur_ordre) ?? null

  // Email valide ? (format simple)
  const donneurAEmailValide = !!(
    donneurSelectionne?.email &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(donneurSelectionne.email)
  )

  // Tous les champs obligatoires sont-ils remplis ?
  const tousChampsObligatoiresRemplis = !!(
    form.donneur_ordre &&
    (form.adresse.trim() || (form.latitude != null && form.longitude != null)) &&
    form.type_nid &&
    form.emplacement &&
    form.retire !== null
  )

  // Le CTA "Informer le donneur d'ordre" doit-il être affiché ?
  // Vue dès que la fiche est complète + le donneur a un email valide
  // (peu importe si la fiche est sauvegardée ou non)
  const peutInformerDonneur = donneurAEmailValide && tousChampsObligatoiresRemplis

  // Envoyer la fiche d'intervention par email au donneur d'ordre
  // Workflow : sauvegarde d'abord (avec upload photo + géocodage), puis envoi
  const sendFicheIntervention = async () => {
    if (!user || !donneurSelectionne?.email) return
    if (!validate()) {
      setSendError('Veuillez compléter tous les champs obligatoires')
      return
    }
    setSendError(null)
    setSending(true)
    try {
      // 1) Sauvegarde la fiche en base (assure que photo uploadée et lat/lng disponibles)
      const saved = await saveAndReturn()
      if (!saved) throw new Error('Erreur lors de la sauvegarde')
      const { lat, lng, image_url } = saved
      if (lat == null || lng == null) {
        throw new Error('La position GPS n\'a pas pu être déterminée')
      }

      // 2) Récupère les infos entreprise du pro
      const entreprise = await getEntreprise(user.email)
      const proAdresse = [
        entreprise?.entreprise_adresse,
        entreprise?.entreprise_complement,
        entreprise?.entreprise_cp,
        entreprise?.entreprise_ville,
      ].filter(Boolean).join(', ')

      // 3) Construit le payload qui sera affiché dans le mail
      const data = {
        id_court: id ? id.slice(0, 8) : 'nouvelle',
        numero_fiche: '',
        espece: form.espece,
        emplacement: form.emplacement || '—',
        commentaire: form.beneficiaire || '',
        adresse: form.adresse || '',
        latitude: lat,
        longitude: lng,
        date_observation: new Date(form.date_observation).toLocaleDateString('fr-FR'),
        date_traitement: form.retire ? new Date().toLocaleDateString('fr-FR') : null,
        retire: form.retire,
        photo_url: image_url,
        donneur_ordre: form.donneur_ordre,
        pro_entreprise: entreprise?.entreprise || null,
        pro_siret: entreprise?.siret || null,
        pro_adresse_complete: proAdresse || null,
        pro_telephone: entreprise?.entreprise_telephone || null,
      }

      // 4) Envoi de l'email
      const url      = import.meta.env.VITE_SUPABASE_URL as string
      const anonKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      const res = await fetch(`${url}/functions/v1/send-support-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket_id: 'fiche-intervention',
          sujet: `Compte-rendu d'intervention — ${form.donneur_ordre}`,
          contenu: JSON.stringify(data),
          auteur_email: user.email,
          auteur_role: 'admin',
          destinataire_email: donneurSelectionne.email!,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const result = await res.json()
      if (!result.ok) throw new Error(result.error || 'Erreur inconnue')

      setShowConfirmSend(false)
      setShowSuccess(true)
    } catch (e) {
      setSendError('Erreur lors de l\'envoi : ' + (e as Error).message)
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="flex-1 text-lg font-semibold">{isEdit ? 'Modifier intervention' : 'Saisie intervention'}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-32">

        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-400">Date traitement <span className="text-amber-500">*</span></label>
          <input type="date" value={form.date_observation} onChange={e => set('date_observation', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-amber-500" />
        </div>

        {/* Donneur d'ordre */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-400">
              Donneur d'ordre <span className="text-amber-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowAddDonneur(v => !v)}
              className="text-xs text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1"
            >
              {showAddDonneur ? '✕ Annuler' : '+ Ajouter'}
            </button>
          </div>

          {/* Formulaire ajout inline */}
          {showAddDonneur && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDonneur}
                  onChange={e => setNewDonneur(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddDonneur()}
                  placeholder="Nom du donneur d'ordre…"
                  autoFocus
                  className="flex-1 bg-gray-700 border border-amber-500/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleAddDonneur}
                  disabled={savingDonneur || !newDonneur.trim()}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-medium text-sm rounded-xl transition-colors"
                >
                  {savingDonneur ? '…' : 'OK'}
                </button>
              </div>
              <p className="text-xs text-amber-500/70">
                💡 Les coordonnées complètes (adresse, ville, contact) pourront être ajoutées
                plus tard depuis la page « Gérer les donneurs d'ordre ».
              </p>
            </div>
          )}

          <select value={form.donneur_ordre} onChange={e => set('donneur_ordre', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-amber-500 appearance-none">
            <option value="">— Choisir —</option>
            {donneurs.map(d => (
              <option key={d.id} value={d.nom}>{d.nom}</option>
            ))}
          </select>
          {errors.donneur_ordre && <p className="text-xs text-red-400">{errors.donneur_ordre}</p>}
        </div>

        {/* Localisation : adresse libre + bouton GPS, au moins l'un des deux */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-400">
              Localisation <span className="text-amber-500">*</span>
            </label>
            <span className="text-xs text-gray-600">Au moins l'un des deux</span>
          </div>

          {/* Adresse libre */}
          <div className="space-y-1.5">
            <Input placeholder="ex: 13 Av. des Quatre Vents, 44360 Cordemais"
              value={form.adresse}
              onChange={e => set('adresse', e.target.value)} />
          </div>

          {/* Bouton GPS */}
          <div className="space-y-1.5">
            <Btn variant="secondary" fullWidth onClick={captureGPS} loading={loadingGPS}>
              📍 {loadingGPS
                ? 'Acquisition…'
                : form.latitude != null && form.longitude != null
                  ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`
                  : 'Capturer position GPS'}
            </Btn>
            {form.latitude != null && form.longitude != null && (
              <button onClick={() => { set('latitude', null); set('longitude', null) }}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                Effacer la position GPS
              </button>
            )}
          </div>

          {errors.localisation && (
            <p className="text-xs text-red-400">{errors.localisation}</p>
          )}
        </div>

        {/* Espèce */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Espèce <span className="text-amber-500">*</span></label>
          <div className="space-y-2">
            {especesNoms.map(e => (
              <ToggleBtn key={e} label={e} selected={form.espece === e} onClick={() => set('espece', e)}
                color={form.espece === e ? especesGetColor(e) : undefined} />
            ))}
          </div>
        </div>

        {/* Type de nid */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Type de nid <span className="text-amber-500">*</span></label>
          <div className="grid grid-cols-3 gap-2">
            {TYPES_NID.map(t => (
              <ToggleBtn key={t} label={t} selected={form.type_nid === t} onClick={() => set('type_nid', t)} />
            ))}
          </div>
          {errors.type_nid && <p className="text-xs text-red-400">{errors.type_nid}</p>}
        </div>

        {/* Nombre de nids */}
        <Stepper label="Nombre de nids" required value={form.nombre_nids} onChange={v => set('nombre_nids', v)} />

        {/* Bénéficiaire */}
        <Input label="Bénéficiaire" required value={form.beneficiaire}
          onChange={e => set('beneficiaire', e.target.value)} placeholder="Nom du bénéficiaire" />

        {/* Saisi par — admin en modification seulement */}
        {isAdmin && isEdit && (
          <Input label="Saisi par" value={form.saisi_par_email}
            onChange={e => set('saisi_par_email', e.target.value)}
            placeholder="email@exemple.com" />
        )}

        {/* Emplacement */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Emplacement <span className="text-amber-500">*</span></label>
          <div className="space-y-2">
            {EMPLACEMENTS.map(emp => (
              <ToggleBtn key={emp} label={emp} selected={form.emplacement === emp}
                onClick={() => set('emplacement', form.emplacement === emp ? '' : emp)} />
            ))}
          </div>
          {errors.emplacement && <p className="text-xs text-red-400">{errors.emplacement}</p>}
        </div>

        {/* Photo */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Image</label>
          {/* Sans capture : le système propose lui-même Caméra/Photothèque/Fichier sur mobile */}
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Nid" className="w-full h-48 object-cover rounded-xl border border-gray-700" />
              <button onClick={() => { setPreview(null); set('image_file', null); set('image_url', null) }}
                className="absolute top-2 right-2 bg-gray-900/80 text-white rounded-full w-8 h-8 flex items-center justify-center">✕</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full h-36 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-amber-500/60 hover:text-amber-500 transition-colors">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span className="text-sm">Ajouter une photo</span>
            </button>
          )}
        </div>

        {/* Retiré */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Retiré <span className="text-amber-500">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            <ToggleBtn label="NON" selected={form.retire === false} onClick={() => set('retire', false)} />
            <ToggleBtn label="OUI" selected={form.retire === true}  onClick={() => set('retire', true)} />
          </div>
          {errors.retire && <p className="text-xs text-red-400">{errors.retire}</p>}
        </div>

        {/* CTA Informer le donneur d'ordre — visible dès que la fiche est complète + donneur a email valide */}
        {peutInformerDonneur && (
          <button onClick={() => { setSendError(null); setShowConfirmSend(true) }}
            className="w-full flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-amber-400 font-medium py-3.5 rounded-2xl transition-colors">
            <span className="text-xl">📧</span>
            <span className="text-sm">Informer le donneur d'ordre</span>
          </button>
        )}
      </div>

      {/* Modale de confirmation envoi */}
      {showConfirmSend && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto safe-bottom">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📧</span>
                <div>
                  <p className="text-base font-semibold text-white">Envoyer fiche d'intervention ?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Le donneur recevra un compte-rendu par email.</p>
                </div>
              </div>

              <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-3 text-xs space-y-1">
                <p><span className="text-gray-500">Destinataire :</span> <span className="text-white">{donneurSelectionne?.email}</span></p>
                <p><span className="text-gray-500">Donneur :</span> <span className="text-white">{form.donneur_ordre}</span></p>
                <p><span className="text-gray-500">Espèce :</span> <span className="text-white">{form.espece}</span></p>
                <p><span className="text-gray-500">Emplacement :</span> <span className="text-white">{form.emplacement || '—'}</span></p>
                <p><span className="text-gray-500">Statut :</span> <span className="text-white">{form.retire ? '✓ Nid retiré' : '○ Non retiré'}</span></p>
              </div>

              {sendError && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-3 py-2 text-center">
                  {sendError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Btn variant="ghost" onClick={() => setShowConfirmSend(false)} className="flex-1" disabled={sending}>
                  Annuler
                </Btn>
                <Btn onClick={sendFicheIntervention} loading={sending} className="flex-1">
                  Envoyer
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale de succès */}
      {showSuccess && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md safe-bottom">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✓</span>
                <div>
                  <p className="text-base font-semibold text-white">Fiche d'intervention envoyée</p>
                  <p className="text-xs text-gray-500 mt-0.5">Le donneur va recevoir le compte-rendu par email.</p>
                </div>
              </div>
              <Btn onClick={() => setShowSuccess(false)} fullWidth>
                Fermer
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Footer fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-4 flex gap-3 safe-bottom">
        <Btn variant="ghost" size="lg" onClick={() => navigate(-1)} className="flex-1">Cancel</Btn>
        <Btn size="lg" onClick={handleSave} loading={saving} className="flex-1">Save</Btn>
      </div>
    </div>
  )
}
