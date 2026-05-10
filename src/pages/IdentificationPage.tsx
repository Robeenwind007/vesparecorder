// Page affichée uniquement au premier lancement ou après déconnexion
// L'utilisateur saisit son email → stocké dans localStorage pour toujours
// Si compte en attente → écran "Validation requise"

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, resolveUser, checkUserStatus } from '../hooks/useUser'

const PENDING_KEY = 'vespa_pending_email'

export default function IdentificationPage() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const { setUser } = useUser()
  const navigate = useNavigate()

  // Au montage : on regarde si on avait un email en attente
  useEffect(() => {
    const stored = localStorage.getItem(PENDING_KEY)
    if (stored) setPendingEmail(stored)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Saisissez un email valide')
      return
    }
    setError('')
    setLoading(true)
    const user = await resolveUser(trimmed)
    setLoading(false)

    if (!user) {
      // Compte créé ou existant mais en attente
      localStorage.setItem(PENDING_KEY, trimmed)
      setPendingEmail(trimmed)
      return
    }
    // Compte actif → connexion
    localStorage.removeItem(PENDING_KEY)
    setUser(user)
    navigate('/', { replace: true })
  }

  // ── Vue : compte en attente de validation ─────────────────
  if (pendingEmail) {
    return <PendingView email={pendingEmail}
      onValidated={(u) => {
        localStorage.removeItem(PENDING_KEY)
        setUser(u)
        navigate('/', { replace: true })
      }}
      onChangeEmail={() => {
        localStorage.removeItem(PENDING_KEY)
        setPendingEmail(null)
        setEmail('')
      }}
    />
  }

  // ── Vue : saisie email ─────────────────────────────────────
  return (
    <div className="min-h-dvh bg-gray-900 flex flex-col items-center justify-center px-6 gap-10">
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-3xl bg-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
          <span className="text-5xl">🐝</span>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">VespaRecorder</h1>
          <p className="text-sm text-gray-500 mt-1">Suivi des nids de frelons</p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <p className="text-base text-gray-300 font-medium">Qui êtes-vous ?</p>
          <p className="text-sm text-gray-500">
            Saisissez votre email une seule fois.<br/>
            L'application s'en souvient sur cet appareil.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com"
            autoComplete="email"
            autoFocus
            inputMode="email"
            className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors text-center"
          />

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3 text-center">
              {error}
            </p>
          )}

          <button type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-lg py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-500/30">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Vérification…
              </span>
            ) : 'Continuer →'}
          </button>
        </form>

        <p className="text-xs text-gray-600 text-center">
          Si c'est votre première connexion, votre demande sera<br/>
          envoyée à l'administrateur pour validation.
        </p>
      </div>

      <p className="text-xs text-gray-700">Vespa Recorder — Olivier BERNARD</p>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Écran d'attente de validation
// ──────────────────────────────────────────────────────────────
function PendingView({
  email, onValidated, onChangeEmail,
}: {
  email: string
  onValidated: (u: import('../hooks/useUser').CurrentUser) => void
  onChangeEmail: () => void
}) {
  const [checking, setChecking]   = useState(false)
  const [message, setMessage]     = useState<string | null>(null)
  const [autoChecks, setAutoChecks] = useState(0)
  const [lastCheck, setLastCheck]   = useState<Date | null>(null)

  // Vérification automatique
  const performCheck = async (auto: boolean) => {
    if (!auto) setChecking(true)
    setMessage(null)
    const status = await checkUserStatus(email)
    if (!auto) setChecking(false)
    setLastCheck(new Date())
    if (status.actif && status.user) {
      onValidated(status.user)
    } else if (!auto) {
      // Message uniquement sur clic manuel
      if (status.exists) {
        setMessage('Votre compte est encore en attente de validation.')
      } else {
        setMessage('Compte introuvable. Veuillez recommencer la procédure.')
      }
    }
  }

  // Auto-check toutes les 30 secondes
  useEffect(() => {
    const iv = setInterval(() => {
      setAutoChecks(c => c + 1)
      performCheck(true)
    }, 30000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  const handleCheck = () => performCheck(false)

  return (
    <div className="min-h-dvh bg-gray-900 flex flex-col items-center justify-center px-6 gap-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-3xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center">
          <span className="text-5xl">⏳</span>
        </div>
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-white mb-2">Demande en cours</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Votre demande d'accès pour <span className="text-amber-400 font-medium">{email}</span> a été
            transmise à l'administrateur.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed mt-3">
            Dès que votre compte sera validé, l'application s'ouvrira automatiquement.
            Vous pouvez laisser cette page ouverte.
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {/* Indicateur de vérification automatique */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          Vérification automatique toutes les 30 secondes
          {autoChecks > 0 && lastCheck && (
            <span className="text-gray-600">·  {autoChecks} essai{autoChecks > 1 ? 's' : ''}</span>
          )}
        </div>

        <button onClick={handleCheck} disabled={checking}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold py-4 rounded-2xl transition-all active:scale-95">
          {checking ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Vérification…
            </span>
          ) : '🔄  Vérifier maintenant'}
        </button>

        {message && (
          <p className="text-sm bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-center text-gray-300">
            {message}
          </p>
        )}

        <button onClick={onChangeEmail}
          className="w-full text-sm text-gray-500 hover:text-gray-300 py-2 transition-colors">
          ← Saisir un autre email
        </button>
      </div>

      <p className="text-xs text-gray-700">Vespa Recorder — Olivier BERNARD</p>
    </div>
  )
}
