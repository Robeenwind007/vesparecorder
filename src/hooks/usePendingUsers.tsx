// ============================================================
// usePendingUsers — compte les piégeurs inactifs (en attente)
// pour le badge admin dans Profil
// ============================================================
import { useEffect, useState, useCallback } from 'react'
import { useUser } from './useUser'
import { supabase } from '../lib/supabase'

export function usePendingUsers() {
  const { isAdmin } = useUser()
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!isAdmin) { setCount(0); return }
    const { count: n } = await supabase
      .from('utilisateurs')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'piegeur')
      .eq('actif', false)
    setCount(n ?? 0)
  }, [isAdmin])

  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, 30000)
    return () => clearInterval(iv)
  }, [refresh])

  return { count, refresh }
}
