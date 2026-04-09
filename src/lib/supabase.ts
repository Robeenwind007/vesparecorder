import { createClient } from '@supabase/supabase-js'
import type { Observation, ObservationInsert, StatsDashboard, DonneurOrdre } from '../types'

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── Donneurs d'ordre ─────────────────────────────────────────
export const getDonneurs = async (): Promise<DonneurOrdre[]> => {
  const { data } = await supabase
    .from('donneurs_ordre')
    .select('*')
    .eq('actif', true)
    .order('nom')
  return data ?? []
}

export const addDonneur = async (nom: string) =>
  supabase.from('donneurs_ordre').insert({ nom })

// ── Observations ─────────────────────────────────────────────
// emailFiltre : si fourni et non-admin → filtrage par piégeur
export const getObservations = async (opts?: {
  emailFiltre?: string   // null = admin (tout voir)
  espece?: string
  retire?: boolean
  annee?: number
  donneur?: string
}): Promise<Observation[]> => {
  let q = supabase
    .from('observations')
    .select('*')
    .order('date_observation', { ascending: false })

  if (opts?.emailFiltre)           q = q.eq('saisi_par_email', opts.emailFiltre)
  if (opts?.espece)                q = q.eq('espece', opts.espece)
  if (opts?.retire !== undefined)  q = q.eq('retire', opts.retire)
  if (opts?.donneur)               q = q.eq('donneur_ordre', opts.donneur)
  if (opts?.annee) {
    q = q
      .gte('date_observation', `${opts.annee}-01-01`)
      .lte('date_observation', `${opts.annee}-12-31`)
  }

  const { data } = await q
  return data ?? []
}

export const getObservation = async (id: string): Promise<Observation | null> => {
  const { data } = await supabase
    .from('observations')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

export const createObservation = async (obs: ObservationInsert): Promise<Observation> => {
  const { data, error } = await supabase
    .from('observations')
    .insert(obs)
    .select()
    .single()
  if (error) throw error
  return data as Observation
}

export const updateObservation = async (id: string, updates: Partial<Observation>): Promise<Observation> => {
  const { data, error } = await supabase
    .from('observations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Observation
}

export const deleteObservation = async (id: string) => {
  const { error } = await supabase.from('observations').delete().eq('id', id)
  if (error) throw error
}

// ── Stats ─────────────────────────────────────────────────────
// Admin : stats globales | Piégeur : stats filtrées par email
export const getStats = async (emailFiltre?: string): Promise<StatsDashboard | null> => {
  if (!emailFiltre) {
    // Admin → vue agrégée
    const { data } = await supabase.from('stats_dashboard').select('*').single()
    return data
  }
  // Piégeur → calcul à la volée
  const { data } = await supabase
    .from('observations')
    .select('espece, type_nid, retire, date_observation')
    .eq('saisi_par_email', emailFiltre)

  if (!data) return null
  const now = new Date()
  const ym  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const yy  = String(now.getFullYear())

  return {
    total_observations: data.length,
    total_asiatique:    data.filter(o => o.espece === 'Asiatique').length,
    total_autres:       data.filter(o => o.espece !== 'Asiatique').length,
    total_retires:      data.filter(o => o.retire).length,
    total_actifs:       data.filter(o => !o.retire).length,
    total_primaires:    data.filter(o => o.type_nid === 'Primaire').length,
    total_secondaires:  data.filter(o => o.type_nid === 'Secondaire').length,
    ce_mois:            data.filter(o => o.date_observation.startsWith(ym)).length,
    cette_annee:        data.filter(o => o.date_observation.startsWith(yy)).length,
  }
}

// ── Storage photos ────────────────────────────────────────────
export const uploadPhoto = async (email: string, file: File): Promise<string> => {
  const slug = email.replace(/[^a-z0-9]/gi, '_')
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${slug}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('photos-nids')
    .upload(path, file, { upsert: false })
  if (error) throw error
  return supabase.storage.from('photos-nids').getPublicUrl(path).data.publicUrl
}

export const deletePhoto = async (url: string) => {
  const path = url.split('/photos-nids/')[1]
  if (path) await supabase.storage.from('photos-nids').remove([path])
}

// ── Géocodage adresse → coords (Nominatim OSM, gratuit) ──────
export const geocodeAdresse = async (adresse: string) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}&limit=1&countrycodes=fr`
    const res  = await fetch(url, { headers: { 'Accept-Language': 'fr' } })
    const json = await res.json()
    if (!json.length) return null
    return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) }
  } catch { return null }
}
