import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { useTheme } from '../hooks/useTheme'
import type { Theme } from '../hooks/useTheme'
import { useUnreadSupport } from '../hooks/useUnreadSupport'
import { usePendingUsers } from '../hooks/usePendingUsers'
import { useEntrepriseStatus } from '../hooks/useEntrepriseStatus'
import EntrepriseModal from '../components/EntrepriseModal'

export default function ProfilPage() {
  const { user, isAdmin, hasModuleTraitement, logout } = useUser()
  const { theme, resolvedTheme, setTheme }  = useTheme()
  const { count: unreadSupport } = useUnreadSupport()
  const { count: pendingUsers }  = usePendingUsers()
  const { complete: entrepriseComplete, refresh: refreshEntreprise } = useEntrepriseStatus()
  const [showEntreprise, setShowEntreprise] = useState(false)
  const navigate = useNavigate()

  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const confirmLogout = () => {
    setShowLogoutModal(false)
    logout()
    navigate('/identification', { replace: true })
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

      {/* ── Mon entreprise (uniquement pour les pros avec module Traitement) ── */}
      {hasModuleTraitement && (
        <button onClick={() => setShowEntreprise(true)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-colors text-left ${
            entrepriseComplete
              ? 'bg-gray-800/80 border-gray-700/50 hover:bg-gray-700/50'
              : 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20'
          }`}>
          <span className="text-2xl">🏢</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Mon entreprise</p>
            <p className="text-xs text-gray-500">
              {entrepriseComplete
                ? 'Coordonnées et SIRET enregistrés'
                : 'Raison sociale et SIRET à compléter'}
            </p>
          </div>
          {!entrepriseComplete && (
            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
              À compléter
            </span>
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
      )}

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

      {/* ── Mon activité (uniquement pour pros avec module Traitement, hors admin qui l'a dans Administration) ── */}
      {hasModuleTraitement && !isAdmin && (
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/50">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Mon activité</p>
          </div>
          <button onClick={() => navigate('/admin/donneurs')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors">
            <span>🏢 Mes donneurs d'ordre</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      )}

      {/* Admin */}
      {isAdmin && (
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/50">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Administration</p>
          </div>
          <button onClick={() => navigate('/admin/utilisateurs')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors">
            <span className="flex items-center gap-2">
              <span>👥 Gérer les utilisateurs</span>
              {pendingUsers > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-amber-500 text-black rounded-full text-xs font-bold">
                  {pendingUsers}
                </span>
              )}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => navigate('/admin/rapport')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors border-t border-gray-700/50">
            <span>📄 Rapport traitements PDF</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => navigate('/admin/rapport-pieges')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors border-t border-gray-700/50">
            <span>📄 Rapport pièges PDF</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => navigate('/admin/donneurs')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors border-t border-gray-700/50">
            <span>🏢 Gérer les donneurs d'ordre</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => navigate('/admin/especes')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors border-t border-gray-700/50">
            <span>🐝 Gérer les espèces</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => navigate('/admin/faq')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors border-t border-gray-700/50">
            <span>📚 Gérer la FAQ</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => navigate('/admin/types-pieges')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors border-t border-gray-700/50">
            <span>🪤 Gérer les types de pièges</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => navigate('/admin/appats')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors border-t border-gray-700/50">
            <span>🍯 Gérer les appâts</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => navigate('/admin/sauvegarde')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors border-t border-gray-700/50">
            <span>💾 Sauvegarde / Restauration</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button onClick={() => navigate('/admin/support')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors border-t border-gray-700/50">
            <span className="flex items-center gap-2">
              <span>📨 Messages support</span>
              {isAdmin && unreadSupport > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-amber-500 text-black rounded-full text-xs font-bold">
                  {unreadSupport}
                </span>
              )}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      )}

      {/* Aide & support — accessible à tous */}
      <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700/50">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Aide</p>
        </div>
        <button onClick={() => navigate('/support')}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm hover:bg-gray-700/50 transition-colors">
          <span className="flex items-center gap-2">
            <span>🆘 Aide & support</span>
            {!isAdmin && unreadSupport > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-amber-500 text-black rounded-full text-xs font-bold">
                {unreadSupport}
              </span>
            )}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

      {/* Application */}
      <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700/50">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Application</p>
        </div>
        <div className="divide-y divide-gray-700/50">
          {[
            ['Version', __APP_VERSION__],
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

      {/* Modale "Mon entreprise" */}
      {showEntreprise && (
        <EntrepriseModal onClose={() => { setShowEntreprise(false); refreshEntreprise() }} />
      )}

      {/* Modale confirmation déconnexion */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md safe-bottom">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">👋</span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-white">Changer d'utilisateur ?</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Vous allez être déconnecté de <span className="text-amber-400">{user?.email}</span> sur cet appareil.
                  </p>
                </div>
              </div>

              <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-3">
                <p className="text-xs text-gray-400">
                  💡 Vos données restent en sécurité dans le cloud. Vous pourrez vous reconnecter à tout moment avec votre email.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors">
                  Annuler
                </button>
                <button onClick={confirmLogout}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors active:scale-95">
                  Me déconnecter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
