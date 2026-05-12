// ============================================================
// useEntrepriseStatus — pour afficher le badge "À compléter"
// sur l'entrée Mon entreprise dans Profil
// ============================================================
import { useEffect, useState, useCallback } from 'react'
import { useUser } from './useUser'
import { getEntreprise, isEntrepriseComplete } from '../lib/entreprise'

export function useEntrepriseStatus() {
  const { user, hasModuleTraitement } = useUser()
  const [complete, setComplete] = useState(true)
  const [loading, setLoading]   = useState(true)

  const refresh = useCallback(async () => {
    if (!user || !hasModuleTraitement) {
      setComplete(true)
      setLoading(false)
      return
    }
    const data = await getEntreprise(user.email)
    setComplete(isEntrepriseComplete(data))
    setLoading(false)
  }, [user, hasModuleTraitement])

  useEffect(() => { refresh() }, [refresh])

  return { complete, loading, refresh }
}
