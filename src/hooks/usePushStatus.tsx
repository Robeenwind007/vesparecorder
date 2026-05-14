// ============================================================
// usePushStatus — état des notifications push pour l'utilisateur
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import {
  pushSupported, isPWAInstalled, getCurrentSubscription,
  subscribePush, unsubscribePush,
} from '../lib/push'

export type PushStatus = 'unsupported' | 'not-pwa' | 'denied' | 'inactive' | 'active' | 'loading'

export function usePushStatus(userEmail: string | undefined) {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setStatus('unsupported')
      return
    }
    // iOS exige le mode PWA installée
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS && !isPWAInstalled()) {
      setStatus('not-pwa')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    const sub = await getCurrentSubscription()
    setStatus(sub ? 'active' : 'inactive')
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const activate = async () => {
    if (!userEmail) return
    setBusy(true)
    setError(null)
    const res = await subscribePush(userEmail)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Erreur inconnue')
      await refresh()
      return
    }
    setStatus('active')
  }

  const deactivate = async () => {
    setBusy(true)
    setError(null)
    const res = await unsubscribePush()
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Erreur inconnue')
      return
    }
    setStatus('inactive')
  }

  return { status, busy, error, activate, deactivate, refresh }
}
