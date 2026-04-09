import { useState, useEffect } from 'react'
import { getStats, getObservations } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import type { StatsDashboard, Observation } from '../types'
import { StatCard, Spinner } from '../components/UI'
import { ESPECE_COLORS } from '../types'

export default function StatsPage() {
  const { user, isAdmin } = useUser()
  const [stats, setStats]     = useState<StatsDashboard | null>(null)
  const [obs, setObs]         = useState<Observation[]>([])
  const [voirTout, setVoirTout] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const emailFiltre = isAdmin && voirTout ? undefined : user.email
    setLoading(true)
    Promise.all([
      getStats(emailFiltre),
      getObservations({ emailFiltre })
    ]).then(([s, o]) => { setStats(s); setObs(o); setLoading(false) })
  }, [user, isAdmin, voirTout])

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>
  if (!stats)  return null

  const byEspece = obs.reduce<Record<string, number>>((a, o) => { a[o.espece] = (a[o.espece] ?? 0) + 1; return a }, {})
  const byEmpl   = obs.reduce<Record<string, number>>((a, o) => { if (o.emplacement) a[o.emplacement] = (a[o.emplacement] ?? 0) + 1; return a }, {})
  const byDon    = obs.reduce<Record<string, number>>((a, o) => { if (o.donneur_ordre) a[o.donneur_ordre] = (a[o.donneur_ordre] ?? 0) + 1; return a }, {})

  const topEmpl = Object.entries(byEmpl).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topDon  = Object.entries(byDon).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxDon  = topDon[0]?.[1] ?? 1

  return (
    <div className="overflow-y-auto pb-24 px-4 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Statistiques</h2>
        {isAdmin && (
          <button onClick={() => setVoirTout(v => !v)}
            className={`text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${
              voirTout ? 'bg-amber-500 border-amber-500 text-black' : 'bg-gray-800 border-gray-700 text-gray-300'
            }`}>
            {voirTout ? '👁 Globales' : '👤 Les miennes'}
          </button>
        )}
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total"       value={stats.total_observations} color="amber" />
        <StatCard label="Cette année" value={stats.cette_annee}        color="amber" />
        <StatCard label="Actifs"      value={stats.total_actifs}       color="red"   sub="nids en place" />
        <StatCard label="Retirés"     value={stats.total_retires}      color="green" sub="nids traités" />
        <StatCard label="Primaires"   value={stats.total_primaires}    color="purple" />
        <StatCard label="Secondaires" value={stats.total_secondaires}  color="blue" />
      </div>

      {/* Taux de traitement */}
      {stats.total_observations > 0 && (
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Taux de traitement</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.round((stats.total_retires / stats.total_observations) * 100)}%` }} />
            </div>
            <span className="text-lg font-bold text-green-400 tabular-nums">
              {Math.round((stats.total_retires / stats.total_observations) * 100)}%
            </span>
          </div>
          <p className="text-xs text-gray-500">{stats.total_retires} traités sur {stats.total_observations}</p>
        </div>
      )}

      {/* Par espèce */}
      <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Par espèce</p>
        {Object.entries(byEspece).sort((a, b) => b[1] - a[1]).map(([esp, count]) => (
          <div key={esp} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">{esp}</span>
              <span className="text-white font-medium">{count}</span>
            </div>
            <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full"
                style={{ width: `${Math.round((count / stats.total_observations) * 100)}%`,
                         backgroundColor: ESPECE_COLORS[esp as keyof typeof ESPECE_COLORS] ?? '#D97706' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Top emplacements */}
      {topEmpl.length > 0 && (
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Top emplacements</p>
          {topEmpl.map(([emp, count]) => (
            <div key={emp} className="flex items-center gap-3">
              <span className="text-sm text-gray-300 w-28 flex-shrink-0">{emp}</span>
              <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.round((count / topEmpl[0][1]) * 100)}%` }} />
              </div>
              <span className="text-sm text-white font-medium w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top donneurs */}
      {topDon.length > 0 && (
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Donneurs d'ordre</p>
          {topDon.map(([don, count]) => (
            <div key={don} className="flex items-center gap-3">
              <span className="text-sm text-gray-300 flex-1 truncate">{don}</span>
              <div className="w-20 bg-gray-700 rounded-full h-2 overflow-hidden flex-shrink-0">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((count / maxDon) * 100)}%` }} />
              </div>
              <span className="text-sm text-white font-medium w-6 text-right flex-shrink-0">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Ce mois */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
        <p className="text-xs text-amber-400/70 uppercase tracking-wide mb-1">Ce mois-ci</p>
        <p className="text-5xl font-bold text-amber-400">{stats.ce_mois}</p>
        <p className="text-sm text-amber-400/60 mt-1">observation{stats.ce_mois > 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}
