// ============================================================
// Service Push — gestion de l'abonnement aux notifications
// ============================================================
import { supabase } from './supabase'

// Clé publique VAPID (à remplacer par la vraie)
// Cette clé identifie ton serveur auprès d'Apple/Google push services.
// Elle est PUBLIQUE, pas un secret.
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

// Détecte si l'environnement supporte les push
export const pushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Détecte si l'app tourne en mode "standalone" (installée sur l'écran d'accueil)
// Sur iOS, les push ne marchent QUE en mode standalone.
export const isPWAInstalled = (): boolean => {
  // iOS Safari
  if ((navigator as { standalone?: boolean }).standalone === true) return true
  // Android et autres
  return window.matchMedia('(display-mode: standalone)').matches
}

// Convertit la clé VAPID base64url en Uint8Array attendu par PushManager
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const out = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i)
  return out.buffer as ArrayBuffer
}

// État actuel de l'abonnement de ce navigateur
export const getCurrentSubscription = async (): Promise<PushSubscription | null> => {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

// Abonne ce navigateur aux push et enregistre l'endpoint dans Supabase
export const subscribePush = async (userEmail: string): Promise<{ ok: boolean; error?: string }> => {
  if (!pushSupported()) {
    return { ok: false, error: 'Notifications non supportées sur cet appareil' }
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, error: 'Clé VAPID non configurée' }
  }

  // 1) Demande la permission utilisateur
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: 'Permission refusée' }
  }

  // 2) S'abonne via PushManager
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  // 3) Récupère les clés et l'endpoint
  const json = sub.toJSON()
  const endpoint = sub.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!p256dh || !auth) {
    return { ok: false, error: 'Clés d\'abonnement manquantes' }
  }

  // 4) Enregistre dans Supabase (upsert par endpoint pour éviter doublons)
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_email: userEmail,
    endpoint,
    keys_p256dh: p256dh,
    keys_auth: auth,
    user_agent: navigator.userAgent,
  }, { onConflict: 'endpoint' })

  if (error) {
    console.error('Erreur enregistrement push subscription:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

// Désabonne ce navigateur des push et supprime l'enregistrement
export const unsubscribePush = async (): Promise<{ ok: boolean; error?: string }> => {
  if (!pushSupported()) return { ok: false, error: 'Non supporté' }
  const sub = await getCurrentSubscription()
  if (!sub) return { ok: true }

  // Supprime côté navigateur
  await sub.unsubscribe()

  // Supprime côté serveur
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  if (error) {
    console.error('Erreur suppression push subscription:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
