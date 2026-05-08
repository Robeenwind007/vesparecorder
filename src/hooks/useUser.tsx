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

const SELECT_COLS = 'email, nom, role, actif, module_traitement, module_piegeage'

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

export async function resolveUser(email: string): Promise<CurrentUser | null> {
  const normalized = email.trim().toLowerCase()
  const { data, error } = await supabase
    .from('utilisateurs')
    .select(SELECT_COLS)
    .eq('email', normalized)
    .single()

  if (error || !data) {
    const { data: created } = await supabase
      .from('utilisateurs')
      .insert({ email: normalized, role: 'piegeur', actif: true })
      .select(SELECT_COLS)
      .single()
    if (!created) return null
    return {
      email: created.email,
      nom: created.nom,
      role: created.role,
      actif: created.actif,
      module_traitement: created.module_traitement ?? true,
      module_piegeage:   created.module_piegeage   ?? true,
    }
  }
  if (!data.actif) return null
  return {
    email: data.email,
    nom: data.nom,
    role: data.role,
    actif: data.actif,
    module_traitement: data.module_traitement ?? true,
    module_piegeage:   data.module_piegeage   ?? true,
  }
}
