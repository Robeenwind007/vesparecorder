// ============================================================
// useUser — identification légère sans mot de passe
// Supporte le mode "impersonation" pour les admins
// + gestion des modules (traitement / piégeage) par utilisateur
// ============================================================
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

export interface CurrentUser {
  email: string
  nom: string | null
  role: 'admin' | 'piegeur'
  actif: boolean
  module_traitement: boolean
  module_piegeage: boolean
}

interface UserCtx {
  user: CurrentUser | null
  realUser: CurrentUser | null       // Toujours l'admin réel
  loading: boolean
  isAdmin: boolean
  isImpersonating: boolean
  // Helpers modules : un admin a tout par défaut, sinon on regarde le user courant
  hasModuleTraitement: boolean
  hasModulePiegeage: boolean
  setUser: (u: CurrentUser | null) => void
  impersonate: (u: CurrentUser) => void
  stopImpersonating: () => void
  logout: () => void
}

const LS_KEY      = 'vespa_user'
const LS_REAL_KEY = 'vespa_real_user'

const UserContext = createContext<UserCtx>({
  user: null, realUser: null, loading: true,
  isAdmin: false, isImpersonating: false,
  hasModuleTraitement: false, hasModulePiegeage: false,
  setUser: () => {}, impersonate: () => {},
  stopImpersonating: () => {}, logout: () => {}
})

const SELECT_COLS = 'email, nom, role, actif, module_traitement, module_piegeage, demande_traitement, demande_piegeage, entreprise'

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, _setUser]         = useState<CurrentUser | null>(null)
  const [realUser, _setRealUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading]    = useState(true)

  useEffect(() => {
    const stored     = localStorage.getItem(LS_KEY)
    const storedReal = localStorage.getItem(LS_REAL_KEY)

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CurrentUser
        supabase
          .from('utilisateurs')
          .select(SELECT_COLS)
          .eq('email', parsed.email)
          .single()
          .then(({ data }) => {
            if (data && data.actif) {
              _setUser({
                email: data.email,
                nom: data.nom,
                role: data.role,
                actif: data.actif,
                module_traitement: data.module_traitement ?? true,
                module_piegeage:   data.module_piegeage   ?? true,
              })
              localStorage.setItem(LS_KEY, JSON.stringify(data))
            } else {
              localStorage.removeItem(LS_KEY)
              localStorage.removeItem(LS_REAL_KEY)
            }
            setLoading(false)
          })
        if (storedReal) {
          _setRealUser(JSON.parse(storedReal))
        }
      } catch {
        localStorage.removeItem(LS_KEY)
        localStorage.removeItem(LS_REAL_KEY)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const setUser = (u: CurrentUser | null) => {
    _setUser(u)
    if (u) localStorage.setItem(LS_KEY, JSON.stringify(u))
    else { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_REAL_KEY) }
  }

  const impersonate = (target: CurrentUser) => {
    const current = user!
    _setRealUser(current)
    localStorage.setItem(LS_REAL_KEY, JSON.stringify(current))
    _setUser(target)
  }

  const stopImpersonating = () => {
    if (realUser) {
      _setUser(realUser)
      _setRealUser(null)
      localStorage.removeItem(LS_REAL_KEY)
    }
  }

  const logout = () => {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_REAL_KEY)
    _setUser(null)
    _setRealUser(null)
  }

  const isImpersonating = realUser !== null
  // Admin = vrai rôle (même en impersonation)
  const isAdmin = (realUser ?? user)?.role === 'admin'

  // Modules : pendant l'impersonation, on reflète la vue de l'utilisateur cible
  // Hors impersonation, l'admin a tous les modules par défaut.
  // Le piégeur respecte ses flags.
  const hasModuleTraitement = isImpersonating
    ? (user?.module_traitement ?? true)
    : (isAdmin ? true : (user?.module_traitement ?? true))
  const hasModulePiegeage = isImpersonating
    ? (user?.module_piegeage ?? true)
    : (isAdmin ? true : (user?.module_piegeage ?? true))

  return (
    <UserContext.Provider value={{
      user, realUser, loading,
      isAdmin,
      isImpersonating,
      hasModuleTraitement,
      hasModulePiegeage,
      setUser, impersonate, stopImpersonating, logout
    }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)

export interface NewAccountRequest {
  demande_traitement: boolean
  demande_piegeage: boolean
  entreprise?: string | null
}

export async function resolveUser(email: string, request?: NewAccountRequest): Promise<CurrentUser | null> {
  const normalized = email.trim().toLowerCase()
  const { data, error } = await supabase
    .from('utilisateurs')
    .select(SELECT_COLS)
    .eq('email', normalized)
    .single()

  if (error || !data) {
    // Création d'un nouveau compte EN ATTENTE
    // Si aucun request fourni → écran d'attente, ne pas créer (cas premier lookup)
    if (!request) {
      // Comportement original : on crée mais sans demandes spécifiques
      const { data: created } = await supabase
        .from('utilisateurs')
        .insert({
          email: normalized,
          role: 'piegeur',
        })
        .select(SELECT_COLS)
        .single()
      if (!created) return null
      notifyNewAccount(normalized, false, false, null)
        .catch(e => console.warn('Notif nouvel utilisateur échouée:', e))
      return null
    }

    // Avec demandes : on crée avec les demandes
    const { data: created } = await supabase
      .from('utilisateurs')
      .insert({
        email: normalized,
        role: 'piegeur',
        demande_traitement: request.demande_traitement,
        demande_piegeage: request.demande_piegeage,
        entreprise: request.entreprise ?? null,
      })
      .select(SELECT_COLS)
      .single()
    if (!created) return null

    notifyNewAccount(normalized, request.demande_traitement, request.demande_piegeage, request.entreprise ?? null)
      .catch(e => console.warn('Notif nouvel utilisateur échouée:', e))

    return null
  }

  if (!data.actif) {
    return null
  }

  return {
    email: data.email,
    nom: data.nom,
    role: data.role,
    actif: data.actif,
    module_traitement: data.module_traitement ?? false,
    module_piegeage:   data.module_piegeage   ?? false,
  }
}

// Vérifie le statut d'un email sans le créer (pour la page d'attente)
export async function checkUserStatus(email: string): Promise<{
  exists: boolean
  actif: boolean
  user: CurrentUser | null
}> {
  const normalized = email.trim().toLowerCase()
  const { data } = await supabase
    .from('utilisateurs')
    .select(SELECT_COLS)
    .eq('email', normalized)
    .single()

  if (!data) return { exists: false, actif: false, user: null }

  const isActif = !!data.actif
  return {
    exists: true,
    actif: isActif,
    user: isActif ? {
      email: data.email,
      nom: data.nom,
      role: data.role,
      actif: data.actif,
      module_traitement: data.module_traitement ?? false,
      module_piegeage:   data.module_piegeage   ?? false,
    } : null,
  }
}

// Notifications email lors d'une nouvelle demande de compte :
// 1. À l'admin → nouvelle demande à valider (avec détails)
// 2. À l'utilisateur → confirmation de prise en compte
async function notifyNewAccount(
  emailUser: string,
  demTraitement: boolean,
  demPiegeage: boolean,
  entreprise: string | null,
): Promise<void> {
  const url      = import.meta.env.VITE_SUPABASE_URL as string
  const anonKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  // Construction du résumé des demandes
  const demandes: string[] = []
  if (demTraitement) demandes.push('🐝 Traitement des nids')
  if (demPiegeage)   demandes.push('🪤 Piégeage')
  const demandesText = demandes.length > 0
    ? demandes.join(' et ')
    : 'aucun module précisé'
  const entrepriseText = entreprise
    ? `\n\nEntreprise : ${entreprise}`
    : ''

  const sendMail = (payload: Record<string, string>) =>
    fetch(`${url}/functions/v1/send-support-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

  // 1) Notification admin
  await sendMail({
    ticket_id: 'new-account',
    sujet: `Nouvelle demande d'accès : ${emailUser}`,
    contenu: `L'utilisateur ${emailUser} demande l'accès à VespaRecorder.\n\nModules demandés : ${demandesText}${entrepriseText}\n\nConnectez-vous à l'application et activez son compte depuis « Profil → Gérer les utilisateurs ».`,
    auteur_email: emailUser,
    auteur_role: 'user',
    destinataire_email: '',
  })

  // 2) Confirmation à l'utilisateur
  await sendMail({
    ticket_id: 'new-account-confirm',
    sujet: `Votre demande d'accès à VespaRecorder`,
    contenu: `Bonjour,\n\nVotre demande d'accès à VespaRecorder pour l'adresse ${emailUser} a bien été enregistrée.\n\nVous recevrez un nouveau message dès que l'administrateur aura validé votre compte.\n\nEn attendant, vous pouvez laisser la page d'attente ouverte dans votre navigateur. L'application s'ouvrira automatiquement dès validation, sans action de votre part.`,
    auteur_email: 'noreply@vesparecorder.fr',
    auteur_role: 'admin',
    destinataire_email: emailUser,
  })
}
