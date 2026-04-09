// Page affichée uniquement au premier lancement ou après déconnexion
// L'utilisateur saisit son email → stocké dans localStorage pour toujours

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, resolveUser } from '../hooks/useUser'

export default function IdentificationPage() {
  const [email, setEmail]   = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useUser()
  const navigate = useNavigate()

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
      setError('Compte désactivé. Contactez l\'administrateur.')
      return
    }
    setUser(user)
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-gray-900 flex flex-col items-center justify-center px-6 gap-10">

      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-3xl bg-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
          <span className="text-5xl">🐝</span>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">VespaRecorder</h1>
          <p className="text-sm text-gray-500 mt-1">Suivi des nids de frelons</p>
        </div>
      </div>

      {/* Formulaire */}
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

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-lg py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-500/30"
          >
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
          Votre email est uniquement stocké sur cet appareil.<br/>
          Aucun mot de passe requis.
        </p>
      </div>

      <p className="text-xs text-gray-700">Vespa Recorder — Olivier BERNARD v2.0</p>
    </div>
  )
}
