// ============================================================
// useUnreadSupport — compte les messages non lus pour l'utilisateur courant
// Rafraîchit toutes les 30s pour avoir un badge à peu près à jour
// ============================================================
import { useEffect, useState, useCallback } from 'react'
import { useUser } from './useUser'
import { countUnread } from '../lib/support'

export function useUnreadSupport() {
  const { user, isAdmin } = useUser()
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) return
    const n = await countUnread(user.email, isAdmin)
    setCount(n)
  }, [user, isAdmin])

  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, 30000)
    return () => clearInterval(iv)
  }, [refresh])

  return { count, refresh }
}
