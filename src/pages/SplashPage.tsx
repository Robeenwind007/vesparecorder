import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'

export default function SplashPage() {
  const { user, loading } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    const timer = setTimeout(() => {
      navigate(user ? '/' : '/identification', { replace: true })
    }, 2500)
    return () => clearTimeout(timer)
  }, [loading, user, navigate])

  return (
    <div className="min-h-dvh bg-gray-900 flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-6">
        <div className="w-28 h-28 rounded-3xl bg-amber-500 flex items-center justify-center shadow-2xl shadow-amber-500/40">
          <span className="text-7xl font-black text-black leading-none">V</span>
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-bold text-white tracking-tight">VespaRecorder</h1>
          <p className="text-base text-gray-400">Suivi des nids de frelons asiatiques</p>
        </div>
      </div>

      <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full" style={{
          animation: 'loading 2.2s ease-in-out forwards'
        }} />
      </div>

      <div className="absolute bottom-10 text-center space-y-1">
        <p className="text-xs text-gray-600">Version 2.0.0</p>
        <p className="text-xs text-gray-600">© Olivier BERNARD 2026</p>
      </div>

      <style>{`
        @keyframes loading {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  )
}
