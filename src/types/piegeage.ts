// ============================================================
// Types Piégeage
// ============================================================
import type { Espece, Emplacement } from './index'

// ── Types maîtres (listes paramétrables) ──────────────────────
export interface TypePiege {
  id: string
  nom: string
  actif: boolean
  created_at: string
  created_by_email: string | null
}

export interface Appat {
  id: string
  nom: string
  actif: boolean
  created_at: string
  created_by_email: string | null
}

// ── Capture (relation 1-N) ────────────────────────────────────
export interface Capture {
  id: string
  piegeage_id: string
  espece: Espece
  quantite: number
  created_at: string
}

export type CaptureInsert = Omit<Capture, 'id' | 'created_at'>
export type CaptureDraft = { espece: Espece; quantite: number }

// ── Piégeage ──────────────────────────────────────────────────
export interface Piegeage {
  id: string
  date_pose: string
  type_piege: string
  appat: string | null
  latitude: number | null
  longitude: number | null
  adresse: string | null
  emplacement: Emplacement | null
  date_retrait: string | null
  saisi_par_email: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PiegeageInsert = Omit<Piegeage, 'id' | 'created_at' | 'updated_at'>

// ── Vue enrichie : piégeage + ses captures ────────────────────
export interface PiegeageAvecCaptures extends Piegeage {
  captures: Capture[]
}
