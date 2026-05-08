import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { geocodeAdresse } from '../lib/supabase'
import {
  getTypesPieges, getAppats,
  getPiegeage, createPiegeage, updatePiegeage,
} from '../lib/piegeage'
import type { TypePiege, Appat, CaptureDraft } from '../types/piegeage'
import type { Espece, Emplacement } from '../types'
import { EMPLACEMENTS } from '../types'
import { useEspeces } from '../hooks/useEspeces'
import { Btn, ToggleBtn, Input, Stepper, Spinner } from '../components/UI'

interface FormData {
  date_pose: string
  type_piege: string
  appat: string
  origine_localisation: 'GPS' | 'Adresse'
  latitude: number | null
  longitude: number | null
  adresse: string
  emplacement: Emplacement | ''
  date_retrait: string
  notes: string
  saisi_par_email: string
}

export default function FormulairePiegeage() {
  const { id }   = useParams()
  const isEdit   = Boolean(id)
  const { user, isAdmin } = useUser()
  const { noms: especesNoms } = useEspeces()
  const navigate = useNavigate()

  const [types, setTypes]     = useState<TypePiege[]>([])
  const [appats, setAppats]   = useState<Appat[]>([])
  const [captures, setCaptures] = useState<CaptureDraft[]>([])
  const [loading, setLoading]   = useState(false)
  const [loadingGPS, setLoadingGPS] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [errors, setErrors]     = useState<Partial<Record<string, string>>>({})

  const [form, setForm] = useState<FormData>({
    date_pose: new Date().toISOString().split('T')[0],
    type_piege: '',
    appat: '',
    origine_localisation: 'GPS',
    latitude: null, longitude: null, adresse: '',
    emplacement: '',
    date_retrait: '',
    notes: '',
    saisi_par_email: '',
  })

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    // Listes communes : pas de filtrage par email — on récupère TOUT (paramétrage admin)
    getTypesPieges().then(setTypes)
    getAppats().then(setAppats)

    if (isEdit && id) {
      setLoading(true)
      getPiegeage(id).then(p => {
        if (!p) { setLoading(false); return }
        setForm({
          date_pose: p.date_pose,
          type_piege: p.type_piege,
          appat: p.appat ?? '',
          origine_localisation: p.adresse ? 'Adresse' : 'GPS',
          latitude: p.latitude, longitude: p.longitude,
          adresse: p.adresse ?? '',
          emplacement: (p.emplacement ?? '') as Emplacement | '',
          date_retrait: p.date_retrait ?? '',
          notes: p.notes ?? '',
          saisi_par_email: p.saisi_par_email ?? '',
        })
        setCaptures((p.captures ?? []).map(c => ({
          espece: c.espece, quantite: c.quantite,
        })))
        setLoading(false)
      })
    }
  }, [id, isEdit])

  // ── Captures dynamiques avec déduplication ───────────────────
  // Espèces déjà utilisées dans les captures actuelles
  const especesUtilisees = new Set(captures.map(c => c.espece))
  // Espèces encore disponibles
  const especesDisponibles = especesNoms.filter(e => !especesUtilisees.has(e))

  const addCaptureLine = () => {
    if (especesDisponibles.length === 0) return
    setCaptures(c => [...c, { espece: especesDisponibles[0], quantite: 1 }])
  }

  const updateCapture = (index: number, patch: Partial<CaptureDraft>) =>
    setCaptures(c => c.map((row, i) => i === index ? { ...row, ...patch } : row))

  const removeCapture = (index: number) =>
    setCaptures(c => c.filter((_, i) => i !== index))

  // Pour un sélecteur donné : sa propre espèce + celles non utilisées
  const especesPourLigne = (currentEspece: Espece): Espece[] =>
    especesNoms.filter(e => e === currentEspece || !especesUtilisees.has(e))

  // ── GPS ──────────────────────────────────────────────────────
  const captureGPS = (): Promise<{ lat: number, lng: number } | null> => {
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
        () => { setLoadingGPS(false); resolve(null) },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  // ── Validation ───────────────────────────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.type_piege) errs.type_piege = 'Requis'
    if (form.origine_localisation === 'Adresse' && !form.adresse.trim())
      errs.adresse = 'Adresse requise'
    if (form.date_retrait && form.date_retrait < form.date_pose)
      errs.date_retrait = 'Doit être ≥ date de pose'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Sauvegarde ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate() || !user) return
    setSaving(true)
    try {
      let lat = form.latitude, lng = form.longitude
      if (form.origine_localisation === 'GPS' && (!lat || !lng)) {
        const coords = await captureGPS()
        if (!coords) {
          alert('Impossible de récupérer la position GPS.\nVérifiez que la localisation est autorisée ou choisissez \'Adresse\'.')
          setSaving(false); return
        }
        lat = coords.lat; lng = coords.lng
      }
      if (form.origine_localisation === 'Adresse' && form.adresse && !lat) {
        const coords = await geocodeAdresse(form.adresse)
        if (coords) { lat = coords.lat; lng = coords.lng }
      }

      const payload = {
        date_pose: form.date_pose,
        type_piege: form.type_piege,
        appat: form.appat || null,
        latitude: lat, longitude: lng,
        adresse: form.origine_localisation === 'Adresse' ? form.adresse : null,
        emplacement: (form.emplacement || null) as Emplacement | null,
        date_retrait: form.date_retrait || null,
        notes: form.notes || null,
        saisi_par_email: isEdit ? (form.saisi_par_email || user.email) : user.email,
      }

      if (isEdit && id) await updatePiegeage(id, payload, captures)
      else await createPiegeage(payload, captures)
      navigate(-1)
    } catch (e) {
      alert('Erreur lors de la sauvegarde')
      console.error(e)
    } finally {
      setSaving(false)
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
        <h2 className="flex-1 text-lg font-semibold">{isEdit ? 'Modifier piégeage' : 'Saisie piégeage'}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-32">

        {/* Date de pose */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-400">Date de pose <span className="text-amber-500">*</span></label>
          <input type="date" value={form.date_pose} onChange={e => set('date_pose', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-amber-500" />
        </div>

        {/* Type de piège */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-400">
            Type de piège <span className="text-amber-500">*</span>
          </label>
          <select value={form.type_piege} onChange={e => set('type_piege', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-amber-500 appearance-none">
            <option value="">— Choisir —</option>
            {types.map(t => (
              <option key={t.id} value={t.nom}>{t.nom}</option>
            ))}
          </select>
          {errors.type_piege && <p className="text-xs text-red-400">{errors.type_piege}</p>}
          <p className="text-xs text-gray-600">Liste gérée par l'admin (Profil → Types de pièges).</p>
        </div>

        {/* Localisation */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-400">Choix Localisation <span className="text-amber-500">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            {(['GPS', 'Adresse'] as const).map(o => (
              <ToggleBtn key={o} label={o} selected={form.origine_localisation === o}
                onClick={() => set('origine_localisation', o)} />
            ))}
          </div>
          {form.origine_localisation === 'GPS' ? (
            <div className="space-y-1.5">
              <Btn variant="secondary" fullWidth onClick={captureGPS} loading={loadingGPS}>
                📍 {loadingGPS ? 'Acquisition…' : form.latitude ? `${form.latitude.toFixed(5)}, ${form.longitude?.toFixed(5)}` : 'Capturer position GPS'}
              </Btn>
              <p className="text-xs text-gray-600">Position capturée automatiquement à la sauvegarde si non renseignée.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Input placeholder="ex: 13 Av. des Quatre Vents, 44360 Cordemais"
                value={form.adresse} onChange={e => set('adresse', e.target.value)} error={errors.adresse} />
              <p className="text-xs text-gray-600">Position géocodée automatiquement.</p>
            </div>
          )}
        </div>

        {/* Lieu de pose */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Lieu de pose</label>
          <div className="space-y-2">
            {EMPLACEMENTS.map(emp => (
              <ToggleBtn key={emp} label={emp} selected={form.emplacement === emp}
                onClick={() => set('emplacement', form.emplacement === emp ? '' : emp)} />
            ))}
          </div>
        </div>

        {/* Appât */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-400">Appât</label>
          <select value={form.appat} onChange={e => set('appat', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-amber-500 appearance-none">
            <option value="">— Aucun / non renseigné —</option>
            {appats.map(a => (
              <option key={a.id} value={a.nom}>{a.nom}</option>
            ))}
          </select>
          <p className="text-xs text-gray-600">Liste gérée par l'admin (Profil → Appâts).</p>
        </div>

        {/* Date de retrait */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-400">Date de retrait</label>
          <input type="date" value={form.date_retrait}
            min={form.date_pose}
            onChange={e => set('date_retrait', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-amber-500" />
          {errors.date_retrait && <p className="text-xs text-red-400">{errors.date_retrait}</p>}
          <p className="text-xs text-gray-600">Laissez vide tant que le piège est en place.</p>
        </div>

        {/* Captures par espèce */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-400">Captures</label>
            <button type="button" onClick={addCaptureLine}
              disabled={especesDisponibles.length === 0}
              className={`text-xs font-medium ${
                especesDisponibles.length === 0
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-amber-500 hover:text-amber-400'
              }`}>
              + Ajouter espèce
            </button>
          </div>

          {captures.length === 0 && (
            <p className="text-xs text-gray-600 italic">
              Aucune capture saisie. Cliquez sur « + Ajouter espèce » pour en saisir une.
            </p>
          )}

          {especesDisponibles.length === 0 && captures.length > 0 && (
            <p className="text-xs text-gray-600 italic">
              Toutes les espèces sont déjà saisies.
            </p>
          )}

          {captures.map((c, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <select value={c.espece}
                  onChange={e => updateCapture(i, { espece: e.target.value as Espece })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 appearance-none">
                  {especesPourLigne(c.espece).map(esp =>
                    <option key={esp} value={esp}>{esp}</option>
                  )}
                </select>
              </div>
              <div className="w-32">
                <Stepper value={c.quantite} min={0} max={9999}
                  onChange={v => updateCapture(i, { quantite: v })} />
              </div>
              <button type="button" onClick={() => removeCapture(i)}
                className="px-3 py-2.5 bg-red-900/40 text-red-400 rounded-xl hover:bg-red-900/60 transition-colors text-sm">
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-400">Notes (optionnel)</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={3} placeholder="Observations, conditions météo, etc."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-amber-500 resize-none" />
        </div>

        {/* Saisi par — admin en modification seulement */}
        {isAdmin && isEdit && (
          <Input label="Saisi par" value={form.saisi_par_email}
            onChange={e => set('saisi_par_email', e.target.value)}
            placeholder="email@exemple.com" />
        )}
      </div>

      {/* Footer fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-4 flex gap-3 safe-bottom">
        <Btn variant="ghost" size="lg" onClick={() => navigate(-1)} className="flex-1">Cancel</Btn>
        <Btn size="lg" onClick={handleSave} loading={saving} className="flex-1">Save</Btn>
      </div>
    </div>
  )
}
