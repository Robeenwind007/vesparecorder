// ============================================================
// useUser — identification légère sans mot de passe
// L'email est saisi une fois et stocké dans localStorage.
// Le rôle est résolu en consultant la table `utilisateurs`.
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
  loading: boolean
  isAdmin: boolean
  setUser: (u: CurrentUser | null) => void
  logout: () => void
}

const LS_KEY = 'vespa_user'

const UserContext = createContext<UserCtx>({
  user: null, loading: true, isAdmin: false,
  setUser: () => {}, logout: () => {}
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, _setUser]   = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Chargement initial depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CurrentUser
        // Vérifier que l'utilisateur est toujours actif en BDD
        supabase
          .from('utilisateurs')
          .select('email, nom, role, actif')
          .eq('email', parsed.email)
          .single()
          .then(({ data }) => {
            if (data && data.actif) {
              const u: CurrentUser = {
                email: data.email,
                nom: data.nom,
                role: data.role,
                actif: data.actif,
              }
              _setUser(u)
              localStorage.setItem(LS_KEY, JSON.stringify(u))
            } else {
              // Compte désactivé ou supprimé
              localStorage.removeItem(LS_KEY)
            }
            setLoading(false)
          })
      } catch {
        localStorage.removeItem(LS_KEY)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const setUser = (u: CurrentUser | null) => {
    _setUser(u)
    if (u) localStorage.setItem(LS_KEY, JSON.stringify(u))
    else localStorage.removeItem(LS_KEY)
  }

  const logout = () => {
    localStorage.removeItem(LS_KEY)
    _setUser(null)
  }

  return (
    <UserContext.Provider value={{
      user, loading, isAdmin: user?.role === 'admin',
      setUser, logout
    }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)

// ── Helper: résoudre un email depuis la BDD ───────────────────
export async function resolveUser(email: string): Promise<CurrentUser | null> {
  const normalized = email.trim().toLowerCase()

  // Chercher dans la table utilisateurs
  const { data, error } = await supabase
    .from('utilisateurs')
    .select('email, nom, role, actif')
    .eq('email', normalized)
    .single()

  if (error || !data) {
    // Email inconnu → créer automatiquement comme piégeur
    const { data: created } = await supabase
      .from('utilisateurs')
      .insert({ email: normalized, role: 'piegeur', actif: true })
      .select('email, nom, role, actif')
      .single()
    if (!created) return null
    return { email: created.email, nom: created.nom, role: created.role, actif: created.actif }
  }

  if (!data.actif) return null // compte désactivé
  return { email: data.email, nom: data.nom, role: data.role, actif: data.actif }
}
