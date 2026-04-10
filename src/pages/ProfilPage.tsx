import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../hooks/useTheme'

export default function ProfilPage() {
  const { user, isAdmin, logout } = useUser()
  const { theme, resolvedTheme, setTheme }  = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    if (confirm('Changer d\'utilisateur sur cet appareil ?')) {
      logout()
      navigate('/identification', { replace: true })
    }
  }

  const themes: { value: Theme; label: string; icon: string; desc: string }[] = [
    { value: 'dark',   label: 'Sombre',  icon: '🌙', desc: 'Fond noir amber' },
    { value: 'light',  label: 'Clair',   icon: '☀️', desc: 'Fond blanc' },
    { value: 'system', label: 'Système', icon: '⚙️', desc: 'Suit votre appareil' },
  ]

  return (
    <div className="px-4 py-6 space-y-6 pb-24">
      <h2 className="text-xl font-bold">Profil</h2>

      {/* Identité */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl">
          🐝
        </div>
        <div>
          <p className="text-base font-semibold">{user?.nom ?? user?.email}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
            isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-400'
          }`}>
            {isAdmin ? '⭐ Administrateur' : '👤 Piégeur'}
          </span>
        </div>
      </div>

      {/* ── Thème ── */}
      <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700/50">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Apparence</p>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-400">
            Thème actuel : <span className="text-white font-medium">
              {resolvedTheme === 'dark' ? '🌙 Sombre' : '☀️ Clair'}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {themes.map(t => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all ${
                  theme === t.value
                    ? 'bg-amber-500 border-amber-500 text-black'
                    : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'
                }`}
              >
                <span className="text-xl">{t.icon}</span>
                <span className="text-xs font-medium">{t.label}</span>
                <span className={`text-xs opacity-70 text-center leading-tight ${theme === t.value ? 'text-black/70' : 'text-gray-500'}`}>
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info appareil */}
      <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4 space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Cet appareil</p>
        <div className="flex items-start gap-2">
          <span className="text-lg">📱</span>
          <div>
            <p className="text-sm">Identifié comme <strong>{user?.email}</strong></p>
            <p className="text-xs text-gray-500 mt-0.5">Votre email est mémorisé sur cet appareil.<br/>Aucune connexion requise à chaque utilisation.</p>
          </div>
        </div>
      </div>

      {/* Admin */}
      {isAdmin && (
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/50">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Administration</p>
          </div>
          <button onClick={() => navigate('/admin/utilisateurs')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors">
            <span>👥 Gérer les utilisateurs</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => navigate('/admin/rapport')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors border-t border-gray-700/50">
            <span>📄 Générer un rapport PDF</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => navigate('/admin/donneurs')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors border-t border-gray-700/50">
            <span>🏢 Gérer les donneurs d'ordre</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      )}

      {/* Application */}
      <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700/50">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Application</p>
        </div>
        <div className="divide-y divide-gray-700/50">
          {[
            ['Version', '2.1.1'],
            ['Auteur', 'Olivier BERNARD'],
            ['Base de données', '● Supabase'],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-gray-400">{label}</span>
              <span className={`text-sm ${label === 'Base de données' ? 'text-green-400' : ''}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Changer d'utilisateur */}
      <button onClick={handleLogout}
        className="w-full py-4 rounded-2xl border border-gray-700 text-gray-400 text-sm font-medium hover:border-gray-500 transition-colors">
        Changer d'utilisateur sur cet appareil
      </button>
    </div>
  )
}
