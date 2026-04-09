export type Espece = 'Asiatique' | 'Européen' | 'Guêpes' | 'Vespa Soror' | 'Vespa Orientalis'
export type TypeNid = 'Primaire' | 'Secondaire' | 'Non défini'
export type OrigineLocalisation = 'GPS' | 'Adresse'
export type Emplacement =
  | 'Arbre' | 'Haie' | 'Appenti' | 'Toiture'
  | 'Garage' | 'Volet/fenêtre' | 'Enterré' | 'Carton/Pneu' | 'Autres'

export interface Utilisateur {
  id: string
  email: string
  nom: string | null
  role: 'admin' | 'piegeur'
  actif: boolean
  created_at: string
}

export interface DonneurOrdre {
  id: string
  nom: string
  actif: boolean
}

export interface Observation {
  id: string
  date_observation: string
  donneur_ordre: string | null
  origine_localisation: OrigineLocalisation | null
  latitude: number | null
  longitude: number | null
  adresse: string | null
  espece: Espece
  type_nid: TypeNid | null
  nombre_nids: number
  beneficiaire: string | null
  emplacement: Emplacement | null
  image_url: string | null
  retire: boolean
  saisi_par_email: string | null
  created_at: string
  updated_at: string
}

export type ObservationInsert = Omit<Observation, 'id' | 'created_at' | 'updated_at'>

export interface StatsDashboard {
  total_observations: number
  total_asiatique: number
  total_autres: number
  total_retires: number
  total_actifs: number
  total_primaires: number
  total_secondaires: number
  ce_mois: number
  cette_annee: number
}

export const ESPECES: Espece[] = [
  'Asiatique', 'Européen', 'Guêpes', 'Vespa Soror', 'Vespa Orientalis'
]
export const TYPES_NID: TypeNid[] = ['Primaire', 'Secondaire', 'Non défini']
export const EMPLACEMENTS: Emplacement[] = [
  'Arbre', 'Haie', 'Appenti', 'Toiture',
  'Garage', 'Volet/fenêtre', 'Enterré', 'Carton/Pneu', 'Autres'
]
export const ESPECE_COLORS: Record<Espece, string> = {
  'Asiatique':        '#D97706',
  'Européen':         '#2563EB',
  'Guêpes':           '#7C3AED',
  'Vespa Soror':      '#DC2626',
  'Vespa Orientalis': '#059669',
}
