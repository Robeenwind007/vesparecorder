import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStats, getObservations } from '../lib/supabase'
import { getPiegeages, totalCapturesPiegeage } from '../lib/piegeage'
import { useUser } from '../hooks/useUser'
import type { StatsDashboard, Observation } from '../types'
import type { PiegeageAvecCaptures } from '../types/piegeage'
import { StatCard, Spinner, Empty } from '../components/UI'
import { useEspeces } from '../hooks/useEspeces'

type Tab = 'observations' | 'piegeages'

export default function StatsPage() {
  const { user, isAdmin, hasModuleTraitement, hasModulePiegeage } = useUser()
  const navigate                = useNavigate()
  const [stats, setStats]       = useState<StatsDashboard | null>(null)
  const [obs, setObs]           = useState<Observation[]>([])
  const [pieges, setPieges]     = useState<PiegeageAvecCaptures[]>([])
  const [voirTout, setVoirTout] = useState(false)
  const [loading, setLoading]   = useState(true)

  // Onglet par défaut : le premier module disponible
  const initialTab: Tab = hasModuleTraitement ? 'observations' : 'piegeages'
  const [tab, setTab]   = useState<Tab>(initialTab)

  useEffect(() => {
    if (!user) return
    const emailFiltre = isAdmin && voirTout ? undefined : user.email
    setLoading(true)
    Promise.all([
      hasModuleTraitement ? getStats(emailFiltre)            : Promise.resolve(null),
      hasModuleTraitement ? getObservations({ emailFiltre }) : Promise.resolve([]),
      hasModulePiegeage   ? getPiegeages({ emailFiltre })    : Promise.resolve([]),
    ]).then(([s, o, p]) => {
      setStats(s as StatsDashboard | null)
      setObs(o as Observation[])
      setPieges(p as PiegeageAvecCaptures[])
      setLoading(false)
    })
  }, [user, isAdmin, voirTout, hasModuleTraitement, hasModulePiegeage])

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  // Aucun module activé : message dédié
  if (!hasModuleTraitement && !hasModulePiegeage) {
    return (
      <div className="px-4 py-8">
        <Empty message="Aucun module activé. Contactez un administrateur." icon="🔒" />
      </div>
    )
  }

  const showTabs = hasModuleTraitement && hasModulePiegeage

  return (
    <div className="overflow-y-auto pb-24 px-4 py-4 space-y-5">
      {/* Header */}
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

      {/* Onglets — uniquement si les 2 modules sont actifs */}
      {showTabs && (
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-1 flex gap-1">
          <button
            onClick={() => setTab('observations')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
              tab === 'observations' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Observations
            <span className="ml-2 text-xs opacity-70">{obs.length}</span>
          </button>
          <button
            onClick={() => setTab('piegeages')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
              tab === 'piegeages' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Piégeages
            <span className="ml-2 text-xs opacity-70">{pieges.length}</span>
          </button>
        </div>
      )}

      {/* Contenu selon onglet et modules */}
      {hasModuleTraitement && (showTabs ? tab === 'observations' : true) && stats && (
        <StatsObservations stats={stats} obs={obs} />
      )}
      {hasModulePiegeage   && (showTabs ? tab === 'piegeages'    : !hasModuleTraitement) && (
        <StatsPiegeages pieges={pieges} />
      )}

      {/* Bouton "Mes rapports" — non-admin : génère un rapport personnel filtré */}
      {!isAdmin && (
        <button onClick={() => navigate('/admin/rapport-global')}
          className="w-full flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-amber-400 font-medium py-3.5 rounded-2xl transition-colors">
          <span className="text-xl">📊</span>
          <span className="text-sm">Mes rapports PDF</span>
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// SECTION OBSERVATIONS
// ────────────────────────────────────────────────────────────────
function StatsObservations({ stats, obs }: { stats: StatsDashboard; obs: Observation[] }) {
  const { getColor: especesGetColor } = useEspeces()
  const byEspece = obs.reduce<Record<string, number>>((a, o) => { a[o.espece] = (a[o.espece] ?? 0) + 1; return a }, {})
  const byEmpl   = obs.reduce<Record<string, number>>((a, o) => { if (o.emplacement) a[o.emplacement] = (a[o.emplacement] ?? 0) + 1; return a }, {})
  const byDon    = obs.reduce<Record<string, number>>((a, o) => { if (o.donneur_ordre) a[o.donneur_ordre] = (a[o.donneur_ordre] ?? 0) + 1; return a }, {})

  const topEmpl = Object.entries(byEmpl).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topDon  = Object.entries(byDon).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxDon  = topDon[0]?.[1] ?? 1

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total"       value={stats.total_observations} color="amber" />
        <StatCard label="Cette année" value={stats.cette_annee}        color="amber" />
        <StatCard label="Laissés"     value={stats.total_actifs}       color="red"   sub="nids en place" />
        <StatCard label="Retirés"     value={stats.total_retires}      color="green" sub="nids traités" />
        <StatCard label="Primaires"   value={stats.total_primaires}    color="purple" />
        <StatCard label="Secondaires" value={stats.total_secondaires}  color="blue" />
      </div>

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
                         backgroundColor: especesGetColor(esp) }} />
            </div>
          </div>
        ))}
      </div>

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

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
        <p className="text-xs text-amber-400/70 uppercase tracking-wide mb-1">Ce mois-ci</p>
        <p className="text-5xl font-bold text-amber-400">{stats.ce_mois}</p>
        <p className="text-sm text-amber-400/60 mt-1">observation{stats.ce_mois > 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// SECTION PIÉGEAGES
// ────────────────────────────────────────────────────────────────
function StatsPiegeages({ pieges }: { pieges: PiegeageAvecCaptures[] }) {
  const { getColor: especesGetColor } = useEspeces()
  const total      = pieges.length
  const enPlace    = pieges.filter(p => !p.date_retrait).length

  const now      = new Date()
  const yyyy     = String(now.getFullYear())
  const ym       = `${yyyy}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const annee    = pieges.filter(p => p.date_pose.startsWith(yyyy)).length
  const ceMois   = pieges.filter(p => p.date_pose.startsWith(ym)).length

  const totalCaptures = pieges.reduce((s, p) => s + totalCapturesPiegeage(p), 0)
  const moyenne       = total ? (totalCaptures / total) : 0

  const byEspece: Record<string, number> = {}
  pieges.forEach(p => (p.captures ?? []).forEach(c => {
    byEspece[c.espece] = (byEspece[c.espece] ?? 0) + c.quantite
  }))

  const byType: Record<string, number> = {}
  pieges.forEach(p => { if (p.type_piege) byType[p.type_piege] = (byType[p.type_piege] ?? 0) + 1 })
  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const byEmpl: Record<string, number> = {}
  pieges.forEach(p => { if (p.emplacement) byEmpl[p.emplacement] = (byEmpl[p.emplacement] ?? 0) + 1 })
  const topEmpl = Object.entries(byEmpl).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const byAppat: Record<string, number> = {}
  pieges.forEach(p => { if (p.appat) byAppat[p.appat] = (byAppat[p.appat] ?? 0) + 1 })
  const topAppat = Object.entries(byAppat).sort((a, b) => b[1] - a[1]).slice(0, 5)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
        <span className="text-5xl">🪤</span>
        <p className="text-sm text-center">Aucun piégeage à analyser</p>
      </div>
    )
  }

  const maxByEspece = Math.max(...Object.values(byEspece), 1)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total pièges"  value={total}         color="amber" />
        <StatCard label="Cette année"   value={annee}         color="amber" />
        <StatCard label="En place"      value={enPlace}       color="red"   sub="non retirés" />
        <StatCard label="Captures"      value={totalCaptures} color="blue"  sub="toutes espèces" />
        <StatCard label="Moy. / piège"  value={moyenne.toFixed(1)} color="purple" />
      </div>

      {Object.keys(byEspece).length > 0 && (
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Captures par espèce</p>
          {Object.entries(byEspece).sort((a, b) => b[1] - a[1]).map(([esp, qte]) => (
            <div key={esp} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">{esp}</span>
                <span className="text-white font-medium">{qte}</span>
              </div>
              <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${Math.round((qte / maxByEspece) * 100)}%`,
                           backgroundColor: especesGetColor(esp) }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {topType.length > 0 && (
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Top types de pièges</p>
          {topType.map(([type, count]) => (
            <div key={type} className="flex items-center gap-3">
              <span className="text-sm text-gray-300 flex-1 truncate">{type}</span>
              <div className="w-20 bg-gray-700 rounded-full h-2 overflow-hidden flex-shrink-0">
                <div className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.round((count / topType[0][1]) * 100)}%` }} />
              </div>
              <span className="text-sm text-white font-medium w-8 text-right flex-shrink-0">{count}</span>
            </div>
          ))}
        </div>
      )}

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

      {topAppat.length > 0 && (
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Top appâts</p>
          {topAppat.map(([app, count]) => (
            <div key={app} className="flex items-center gap-3">
              <span className="text-sm text-gray-300 flex-1 truncate">{app}</span>
              <div className="w-20 bg-gray-700 rounded-full h-2 overflow-hidden flex-shrink-0">
                <div className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.round((count / topAppat[0][1]) * 100)}%` }} />
              </div>
              <span className="text-sm text-white font-medium w-6 text-right flex-shrink-0">{count}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
        <p className="text-xs text-amber-400/70 uppercase tracking-wide mb-1">Ce mois-ci</p>
        <p className="text-5xl font-bold text-amber-400">{ceMois}</p>
        <p className="text-sm text-amber-400/60 mt-1">piégeage{ceMois > 1 ? 's' : ''} posé{ceMois > 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}
