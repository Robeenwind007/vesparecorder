// ── Espèces : maintenant dynamiques (gérées en BDD)
// On garde Espece = string pour ne pas casser le code existant
export type Espece = string

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
  module_traitement: boolean
  module_piegeage: boolean
  created_at: string
}

export interface DonneurOrdre {
  id: string
  nom: string
  actif: boolean
  created_by_email: string | null
}

// Espèce paramétrable (table especes)
export interface EspeceParam {
  id: string
  nom: string
  couleur: string         // ex: '#D97706'
  actif: boolean
  ordre: number
  created_at: string
  created_by_email: string | null
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

// Liste de fallback (utilisée uniquement si le contexte n'est pas dispo, pour compat)
export const ESPECES_DEFAUT: Espece[] = [
  'Asiatique', 'Europeen', 'Guepes', 'Vespa Soror', 'Vespa Orientalis'
]
// Alias pour compat ancien code (sera progressivement remplacé par useEspeces)
export const ESPECES: Espece[] = ESPECES_DEFAUT

export const TYPES_NID: TypeNid[] = ['Primaire', 'Secondaire', 'Non défini']
export const EMPLACEMENTS: Emplacement[] = [
  'Arbre', 'Haie', 'Appenti', 'Toiture',
  'Garage', 'Volet/fenêtre', 'Enterré', 'Carton/Pneu', 'Autres'
]

// Fallback couleurs (utilisé si l'espèce n'est pas dans la liste dynamique)
export const ESPECE_COLORS_DEFAUT: Record<string, string> = {
  'Asiatique':        '#D97706',
  'Europeen':         '#2563EB',
  'Européen':         '#2563EB',
  'Guepes':           '#7C3AED',
  'Guêpes':           '#7C3AED',
  'Vespa Soror':      '#DC2626',
  'Vespa Orientalis': '#059669',
}

// Alias pour compat ancien code
export const ESPECE_COLORS: Record<string, string> = ESPECE_COLORS_DEFAUT

// Helper pour récupérer la couleur d'une espèce avec fallback
export const getEspeceColor = (
  nom: string,
  dynamiques?: Record<string, string>
): string => {
  if (dynamiques && dynamiques[nom]) return dynamiques[nom]
  return ESPECE_COLORS_DEFAUT[nom] ?? '#D97706'
}
