// ============================================================
// useUser — identification légère sans mot de passe
// Supporte le mode "impersonation" pour les admins
// ============================================================
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

export interface CurrentUser {
  email: string
  nom: string | null
  role: 'admin' | 'piegeur'
  actif: boolean
}

interface UserCtx {
  user: CurrentUser | null
  realUser: CurrentUser | null       // Toujours l'admin réel
  loading: boolean
  isAdmin: boolean
  isImpersonating: boolean           // true si l'admin simule un autre compte
  setUser: (u: CurrentUser | null) => void
  impersonate: (u: CurrentUser) => void
  stopImpersonating: () => void
  logout: () => void
}

const LS_KEY      = 'vespa_user'
const LS_REAL_KEY = 'vespa_real_user' // Sauvegarde du vrai compte admin

const UserContext = createContext<UserCtx>({
  user: null, realUser: null, loading: true,
  isAdmin: false, isImpersonating: false,
  setUser: () => {}, impersonate: () => {},
  stopImpersonating: () => {}, logout: () => {}
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, _setUser]       = useState<CurrentUser | null>(null)
  const [realUser, _setRealUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    const stored     = localStorage.getItem(LS_KEY)
    const storedReal = localStorage.getItem(LS_REAL_KEY)

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CurrentUser
        supabase
          .from('utilisateurs')
          .select('email, nom, role, actif')
          .eq('email', parsed.email)
          .single()
          .then(({ data }) => {
            if (data && data.actif) {
              _setUser({ email: data.email, nom: data.nom, role: data.role, actif: data.actif })
              localStorage.setItem(LS_KEY, JSON.stringify(data))
            } else {
              localStorage.removeItem(LS_KEY)
              localStorage.removeItem(LS_REAL_KEY)
            }
            setLoading(false)
          })
        // Restaurer le vrai compte admin si impersonation en cours
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

  // Simuler la vue d'un autre utilisateur
  const impersonate = (target: CurrentUser) => {
    const current = user!
    // Sauvegarder le vrai compte admin
    _setRealUser(current)
    localStorage.setItem(LS_REAL_KEY, JSON.stringify(current))
    // Basculer vers le compte cible (sans toucher LS_KEY = session réelle)
    _setUser(target)
  }

  // Revenir au vrai compte admin
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

  return (
    <UserContext.Provider value={{
      user, realUser, loading,
      isAdmin: (realUser ?? user)?.role === 'admin', // Admin = vrai rôle
      isImpersonating,
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
    .select('email, nom, role, actif')
    .eq('email', normalized)
    .single()

  if (error || !data) {
    const { data: created } = await supabase
      .from('utilisateurs')
      .insert({ email: normalized, role: 'piegeur', actif: true })
      .select('email, nom, role, actif')
      .single()
    if (!created) return null
    return { email: created.email, nom: created.nom, role: created.role, actif: created.actif }
  }
  if (!data.actif) return null
  return { email: data.email, nom: data.nom, role: data.role, actif: data.actif }
}
