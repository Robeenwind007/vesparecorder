// ============================================================
// Service FAQ — questions/réponses paramétrables
// ============================================================
import { supabase } from './supabase'
import type { FaqItem } from '../types'

// Liste des items actifs (pour les utilisateurs)
export const getFaq = async (): Promise<FaqItem[]> => {
  const { data } = await supabase
    .from('faq_items')
    .select('*')
    .eq('actif', true)
    .order('categorie')
    .order('ordre')
  return data ?? []
}

// Liste complète (pour l'admin)
export const getAllFaq = async (): Promise<FaqItem[]> => {
  const { data } = await supabase
    .from('faq_items')
    .select('*')
    .order('categorie')
    .order('ordre')
  return data ?? []
}

export const addFaq = async (
  question: string,
  reponse: string,
  categorie: string,
  ordre: number
) =>
  supabase.from('faq_items').insert({
    question: question.trim(),
    reponse: reponse.trim(),
    categorie: categorie.trim(),
    ordre,
  })

export const updateFaq = async (
  id: string,
  patch: Partial<Pick<FaqItem, 'question' | 'reponse' | 'categorie' | 'ordre' | 'actif'>>
) =>
  supabase.from('faq_items').update({
    ...patch,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

export const deleteFaq = async (id: string) =>
  supabase.from('faq_items').delete().eq('id', id)

export const toggleFaqActif = async (id: string, actif: boolean) =>
  supabase.from('faq_items').update({ actif: !actif }).eq('id', id)
