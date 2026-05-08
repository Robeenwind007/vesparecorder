// ============================================================
// Service Supabase — Espèces (paramétrables)
// ============================================================
import { supabase } from './supabase'
import type { EspeceParam } from '../types'

// Liste actives uniquement (pour les sélecteurs)
export const getEspeces = async (): Promise<EspeceParam[]> => {
  const { data } = await supabase
    .from('especes')
    .select('*')
    .eq('actif', true)
    .order('ordre')
    .order('nom')
  return data ?? []
}

// Toutes les espèces (pour l'admin, actives ET inactives)
export const getAllEspeces = async (): Promise<EspeceParam[]> => {
  const { data } = await supabase
    .from('especes')
    .select('*')
    .order('ordre')
    .order('nom')
  return data ?? []
}

export const addEspece = async (
  nom: string,
  couleur: string,
  ordre: number,
  email?: string
) =>
  supabase.from('especes').insert({
    nom: nom.trim(),
    couleur,
    ordre,
    created_by_email: email ?? null,
  })

export const updateEspece = async (
  id: string,
  patch: Partial<Pick<EspeceParam, 'nom' | 'couleur' | 'actif' | 'ordre'>>
) => supabase.from('especes').update(patch).eq('id', id)

export const toggleEspeceActif = async (id: string, actif: boolean) =>
  supabase.from('especes').update({ actif: !actif }).eq('id', id)
