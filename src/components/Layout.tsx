import { NavLink, Outlet } from 'react-router-dom'
import { useUser } from '../hooks/useUser'

const NAV = [
  { to: '/',        icon: MapIcon,   label: 'Carte'        },
  { to: '/liste',   icon: ListIcon,  label: 'Observations' },
  { to: '/nouveau', icon: PlusIcon,  label: 'Saisir'       },
  { to: '/stats',   icon: ChartIcon, label: 'Stats'        },
  { to: '/profil',  icon: UserIcon,  label: 'Profil'       },
]

export default function Layout() {
  const { user, isAdmin } = useUser()

  return (
    <div className="flex flex-col h-dvh bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 safe-top">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
          V
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold leading-none">VespaRecorder</h1>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        {isAdmin && (
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 flex-shrink-0">
            Admin
          </span>
        )}
      </header>

      {/* Contenu */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Navigation bottom */}
      <nav className="flex bg-gray-900 border-t border-gray-800 safe-bottom">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                isActive ? 'text-amber-500' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function MapIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
}
function ListIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg>
}
function PlusIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
}
function ChartIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
}
function UserIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
