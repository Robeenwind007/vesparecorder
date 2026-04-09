import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import {
  createObservation, updateObservation, getObservation,
  getDonneurs, uploadPhoto, geocodeAdresse
} from '../lib/supabase'
import type { Espece, TypeNid, Emplacement, DonneurOrdre } from '../types'
import { ESPECES, TYPES_NID, EMPLACEMENTS } from '../types'
import { Btn, ToggleBtn, Input, Stepper, Spinner } from '../components/UI'

interface FormData {
  date_observation: string
  donneur_ordre: string
  origine_localisation: 'GPS' | 'Adresse'
  latitude: number | null
  longitude: number | null
  adresse: string
  espece: Espece
  type_nid: TypeNid
  nombre_nids: number
  beneficiaire: string
  emplacement: Emplacement | ''
  retire: boolean
  saisi_par_email: string
  image_file: File | null
  image_url: string | null
}

export default function FormulaireIntervention() {
  const { id }   = useParams()
  const isEdit   = Boolean(id)
  const { user, isAdmin } = useUser()
  const navigate = useNavigate()

  const [donneurs, setDonneurs]     = useState<DonneurOrdre[]>([])
  const [loading, setLoading]       = useState(false)
  const [loadingGPS, setLoadingGPS] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [errors, setErrors]         = useState<Partial<Record<string, string>>>({})
  const [preview, setPreview]       = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>({
    date_observation: new Date().toISOString().split('T')[0],
    donneur_ordre: '', origine_localisation: 'GPS',
    latitude: null, longitude: null, adresse: '',
    espece: 'Asiatique', type_nid: 'Secondaire',
    nombre_nids: 1, beneficiaire: '', emplacement: '',
    retire: false, saisi_par_email: '', image_file: null, image_url: null,
  })

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    getDonneurs().then(setDonneurs)
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
          espece: obs.espece, type_nid: (obs.type_nid ?? 'Secondaire') as TypeNid,
          nombre_nids: obs.nombre_nids, beneficiaire: obs.beneficiaire ?? '',
          emplacement: (obs.emplacement ?? '') as Emplacement | '',
          retire: obs.retire, saisi_par_email: obs.saisi_par_email ?? '', image_file: null, image_url: obs.image_url,
        })
        if (obs.image_url) setPreview(obs.image_url)
        setLoading(false)
      })
    }
  }, [id, isEdit])

  const captureGPS = () => {
    setLoadingGPS(true)
    navigator.geolocation.getCurrentPosition(
      pos => { set('latitude', pos.coords.latitude); set('longitude', pos.coords.longitude); setLoadingGPS(false) },
      ()  => { alert('Impossible de récupérer le GPS'); setLoadingGPS(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
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
    if (form.origine_localisation === 'GPS' && (!form.latitude || !form.longitude))
      errs.gps = 'Capturez la position GPS ou choisissez Adresse'
    if (form.origine_localisation === 'Adresse' && !form.adresse.trim())
      errs.adresse = 'Adresse requise'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate() || !user) return
    setSaving(true)
    try {
      let image_url = form.image_url
      if (form.image_file) image_url = await uploadPhoto(user.email, form.image_file)

      let lat = form.latitude, lng = form.longitude
      if (form.origine_localisation === 'Adresse' && form.adresse && !lat) {
        const coords = await geocodeAdresse(form.adresse)
        if (coords) { lat = coords.lat; lng = coords.lng }
      }

      const payload = {
        date_observation: form.date_observation,
        donneur_ordre: form.donneur_ordre || null,
        origine_localisation: form.origine_localisation,
        latitude: lat, longitude: lng,
        adresse: form.origine_localisation === 'Adresse' ? form.adresse : null,
        espece: form.espece, type_nid: form.type_nid,
        nombre_nids: form.nombre_nids,
        beneficiaire: form.beneficiaire || null,
        emplacement: (form.emplacement || null) as Emplacement | null,
        retire: form.retire, image_url,
        saisi_par_email: isEdit ? (form.saisi_par_email || user.email) : user.email,
      }

      if (isEdit && id) await updateObservation(id, payload)
      else await createObservation(payload)
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
          <label className="text-sm font-medium text-gray-400">Donneur d'ordre <span className="text-amber-500">*</span></label>
          <select value={form.donneur_ordre} onChange={e => set('donneur_ordre', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-amber-500 appearance-none">
            <option value="">— Choisir —</option>
            {donneurs.map(d => <option key={d.id} value={d.nom}>{d.nom}</option>)}
          </select>
          {errors.donneur_ordre && <p className="text-xs text-red-400">{errors.donneur_ordre}</p>}
        </div>

        {/* Localisation */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-400">Choix Localisation <span className="text-amber-500">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            {(['GPS', 'Adresse'] as const).map(o => (
              <ToggleBtn key={o} label={o} selected={form.origine_localisation === o} onClick={() => set('origine_localisation', o)} />
            ))}
          </div>
          {form.origine_localisation === 'GPS' ? (
            <div className="space-y-1.5">
              <Btn variant="secondary" fullWidth onClick={captureGPS} loading={loadingGPS}>
                📍 {loadingGPS ? 'Acquisition…' : form.latitude ? `${form.latitude.toFixed(5)}, ${form.longitude?.toFixed(5)}` : 'Capturer position GPS'}
              </Btn>
              {errors.gps && <p className="text-xs text-red-400">{errors.gps}</p>}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Input placeholder="ex: 13 Av. des Quatre Vents, 44360 Cordemais"
                value={form.adresse} onChange={e => set('adresse', e.target.value)} error={errors.adresse} />
              <p className="text-xs text-gray-600">Position géocodée automatiquement.</p>
            </div>
          )}
        </div>

        {/* Espèce */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Espèce <span className="text-amber-500">*</span></label>
          <div className="space-y-2">
            {ESPECES.map(e => (
              <ToggleBtn key={e} label={e} selected={form.espece === e} onClick={() => set('espece', e)}
                color={form.espece === e ? '#D97706' : undefined} />
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
        </div>

        {/* Nombre de nids */}
        <Stepper label="Nombre de nids" required value={form.nombre_nids} onChange={v => set('nombre_nids', v)} />

        {/* Bénéficiaire */}
        <Input label="Bénéficiaire" required value={form.beneficiaire}
          onChange={e => set('beneficiaire', e.target.value)} placeholder="Nom du bénéficiaire" />


        {/* Saisi par — visible admin en modification seulement */}
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
        </div>

        {/* Photo */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Image</label>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Nid" className="w-full h-48 object-cover rounded-xl border border-gray-700" />
              <button onClick={() => { setPreview(null); set('image_file', null); set('image_url', null) }}
                className="absolute top-2 right-2 bg-gray-900/80 text-white rounded-full w-8 h-8 flex items-center justify-center">✕</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full h-36 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-gray-500 transition-colors">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span className="text-sm">Prendre une photo</span>
            </button>
          )}
        </div>

        {/* Retiré */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Retiré <span className="text-amber-500">*</span></label>
          <div className="grid grid-cols-2 gap-3">
            <ToggleBtn label="NON" selected={!form.retire} onClick={() => set('retire', false)} />
            <ToggleBtn label="OUI" selected={form.retire}  onClick={() => set('retire', true)} />
          </div>
        </div>
      </div>

      {/* Footer fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-4 flex gap-3 safe-bottom">
        <Btn variant="ghost" size="lg" onClick={() => navigate(-1)} className="flex-1">Cancel</Btn>
        <Btn size="lg" onClick={handleSave} loading={saving} className="flex-1">Save</Btn>
      </div>
    </div>
  )
}
