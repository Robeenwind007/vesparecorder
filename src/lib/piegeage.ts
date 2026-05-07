// ============================================================
// Service Supabase — Piégeages, captures, types et appâts
// Calqué sur lib/supabase.ts (donneurs_ordre + observations)
// ============================================================
import { supabase } from './supabase'
import type {
  Piegeage, PiegeageInsert, PiegeageAvecCaptures,
  CaptureDraft,
  TypePiege, Appat,
} from '../types/piegeage'

// ── Types de pièges (liste paramétrable) ─────────────────────
export const getTypesPieges = async (email?: string): Promise<TypePiege[]> => {
  let q = supabase
    .from('types_pieges')
    .select('*')
    .eq('actif', true)
    .order('nom')

  if (email) {
    q = q.or(`created_by_email.is.null,created_by_email.eq.${email}`)
  } else {
    q = q.is('created_by_email', null)
  }

  const { data } = await q
  return data ?? []
}

export const getAllTypesPieges = async (): Promise<TypePiege[]> => {
  const { data } = await supabase
    .from('types_pieges')
    .select('*')
    .order('nom')
  return data ?? []
}

export const addTypePiege = async (nom: string, email?: string) =>
  supabase.from('types_pieges').insert({
    nom,
    created_by_email: email ?? null,
  })

// ── Appâts (liste paramétrable) ──────────────────────────────
export const getAppats = async (email?: string): Promise<Appat[]> => {
  let q = supabase
    .from('appats')
    .select('*')
    .eq('actif', true)
    .order('nom')

  if (email) {
    q = q.or(`created_by_email.is.null,created_by_email.eq.${email}`)
  } else {
    q = q.is('created_by_email', null)
  }

  const { data } = await q
  return data ?? []
}

export const getAllAppats = async (): Promise<Appat[]> => {
  const { data } = await supabase
    .from('appats')
    .select('*')
    .order('nom')
  return data ?? []
}

export const addAppat = async (nom: string, email?: string) =>
  supabase.from('appats').insert({
    nom,
    created_by_email: email ?? null,
  })

// ── Piégeages ─────────────────────────────────────────────────
export const getPiegeages = async (opts?: {
  emailFiltre?: string
  typePiege?: string
  actif?: boolean    // true = pas encore retiré, false = retiré
  annee?: number
}): Promise<PiegeageAvecCaptures[]> => {
  let q = supabase
    .from('piegeages')
    .select('*, captures:piegeages_captures(*)')
    .order('date_pose', { ascending: false })

  if (opts?.emailFiltre)         q = q.eq('saisi_par_email', opts.emailFiltre)
  if (opts?.typePiege)           q = q.eq('type_piege', opts.typePiege)
  if (opts?.actif === true)      q = q.is('date_retrait', null)
  if (opts?.actif === false)     q = q.not('date_retrait', 'is', null)
  if (opts?.annee) {
    q = q
      .gte('date_pose', `${opts.annee}-01-01`)
      .lte('date_pose', `${opts.annee}-12-31`)
  }

  const { data } = await q
  return (data ?? []) as PiegeageAvecCaptures[]
}

export const getPiegeage = async (id: string): Promise<PiegeageAvecCaptures | null> => {
  const { data } = await supabase
    .from('piegeages')
    .select('*, captures:piegeages_captures(*)')
    .eq('id', id)
    .single()
  return data as PiegeageAvecCaptures | null
}

export const createPiegeage = async (
  payload: PiegeageInsert,
  captures: CaptureDraft[]
): Promise<Piegeage> => {
  const { data, error } = await supabase
    .from('piegeages')
    .insert(payload)
    .select()
    .single()
  if (error) throw error

  const rows = captures
    .filter(c => c.espece && c.quantite > 0)
    .map(c => ({
      piegeage_id: (data as Piegeage).id,
      espece: c.espece,
      quantite: c.quantite,
    }))

  if (rows.length > 0) {
    const { error: errCap } = await supabase.from('piegeages_captures').insert(rows)
    if (errCap) throw errCap
  }
  return data as Piegeage
}

export const updatePiegeage = async (
  id: string,
  payload: Partial<Piegeage>,
  captures: CaptureDraft[]
): Promise<Piegeage> => {
  const { data, error } = await supabase
    .from('piegeages')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // Stratégie simple : supprimer/réinsérer (volume faible par piège)
  await supabase.from('piegeages_captures').delete().eq('piegeage_id', id)

  const rows = captures
    .filter(c => c.espece && c.quantite > 0)
    .map(c => ({
      piegeage_id: id,
      espece: c.espece,
      quantite: c.quantite,
    }))
  if (rows.length > 0) {
    const { error: errCap } = await supabase.from('piegeages_captures').insert(rows)
    if (errCap) throw errCap
  }
  return data as Piegeage
}

export const deletePiegeage = async (id: string) => {
  const { error } = await supabase.from('piegeages').delete().eq('id', id)
  if (error) throw error
}

// ── Helpers ──────────────────────────────────────────────────
export const totalCapturesPiegeage = (p: PiegeageAvecCaptures): number =>
  (p.captures ?? []).reduce((sum, c) => sum + (c.quantite ?? 0), 0)

export const piegeageEstActif = (p: Piegeage): boolean =>
  p.date_retrait === null
