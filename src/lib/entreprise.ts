// ============================================================
// Service entreprise — fiche descriptive d'un utilisateur pro
// (uniquement utile pour ceux qui ont le module Traitement)
// ============================================================
import { supabase } from './supabase'

export interface EntrepriseFields {
  entreprise?: string | null
  siret?: string | null
  entreprise_adresse?: string | null
  entreprise_complement?: string | null
  entreprise_cp?: string | null
  entreprise_ville?: string | null
  entreprise_telephone?: string | null
}

export const updateEntreprise = async (email: string, fields: EntrepriseFields) =>
  supabase.from('utilisateurs').update({
    entreprise:            fields.entreprise?.trim()            || null,
    siret:                 fields.siret?.trim()                 || null,
    entreprise_adresse:    fields.entreprise_adresse?.trim()    || null,
    entreprise_complement: fields.entreprise_complement?.trim() || null,
    entreprise_cp:         fields.entreprise_cp?.trim()         || null,
    entreprise_ville:      fields.entreprise_ville?.trim()      || null,
    entreprise_telephone:  fields.entreprise_telephone?.trim()  || null,
  }).eq('email', email).select().single()

// Récupère les infos entreprise d'un utilisateur
export const getEntreprise = async (email: string): Promise<EntrepriseFields | null> => {
  const { data } = await supabase
    .from('utilisateurs')
    .select('entreprise, siret, entreprise_adresse, entreprise_complement, entreprise_cp, entreprise_ville, entreprise_telephone')
    .eq('email', email)
    .single()
  return data
}

// Validation SIRET (14 chiffres, contrôle Luhn pour les 9 derniers caractères normalement,
// mais on reste souple : juste 14 chiffres)
export const isValidSiret = (siret: string): boolean => {
  const clean = siret.replace(/\s/g, '')
  return /^\d{14}$/.test(clean)
}

// Vérifie si la fiche entreprise est minimalement remplie (raison sociale + SIRET)
export const isEntrepriseComplete = (user: EntrepriseFields | null): boolean => {
  if (!user) return false
  return !!(user.entreprise?.trim() && user.siret?.trim() && isValidSiret(user.siret))
}
