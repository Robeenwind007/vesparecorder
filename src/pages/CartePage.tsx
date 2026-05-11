import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getObservations } from '../lib/supabase'
import { getPiegeages, totalCapturesPiegeage } from '../lib/piegeage'
import { useUser } from '../hooks/useUser'
import type { Observation, Espece } from '../types'
import type { PiegeageAvecCaptures } from '../types/piegeage'
import { useEspeces } from '../hooks/useEspeces'
import { Spinner } from '../components/UI'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function makeIcon(color: string, size = 14) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid rgba(255,255,255,0.85);border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function makeSquareIcon(color: string, size = 14) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid rgba(255,255,255,0.85);box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const PIEGE_COLOR        = '#475569'
const PIEGE_RETIRE_COLOR = '#6B7280'

type FiltreType = 'all' | 'nids' | 'pieges'

export default function CartePage() {
  const mapRef   = useRef<HTMLDivElement>(null)
  const leaflet  = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const { user, isAdmin, hasModuleTraitement, hasModulePiegeage } = useUser()
  const { especes, noms: especesNoms, getColor: especesGetColor } = useEspeces()
  const navigate = useNavigate()

  const [loading, setLoading]           = useState(true)
  const [obs, setObs]                   = useState<Observation[]>([])
  const [pieges, setPieges]             = useState<PiegeageAvecCaptures[]>([])

  // Filtre type adapté aux modules disponibles
  const initialFiltreType: FiltreType =
    hasModuleTraitement && hasModulePiegeage ? 'all'
    : hasModuleTraitement ? 'nids'
    : 'pieges'
  const [filtreType, setFiltreType]     = useState<FiltreType>(initialFiltreType)

  const [filtreEspece, setFiltreEspece] = useState('all')
  const [filtreRetire, setFiltreRetire] = useState('all')
  const [filtreAnnee, setFiltreAnnee]   = useState<string>(String(new Date().getFullYear()))
  const [annees, setAnnees]             = useState<string[]>([])
  const [voirTout, setVoirTout]         = useState(false)

  // Init map
  useEffect(() => {
    if (!mapRef.current || leaflet.current) return
    leaflet.current = L.map(mapRef.current, { center: [47.32, -1.90], zoom: 11, zoomControl: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(leaflet.current)
    L.control.zoom({ position: 'topright' }).addTo(leaflet.current)
    layerRef.current = L.layerGroup().addTo(leaflet.current)

    // Géolocalisation : centre la carte sur la position de l'utilisateur si possible
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          if (leaflet.current) {
            leaflet.current.setView([pos.coords.latitude, pos.coords.longitude], 13)
            // Marqueur de position utilisateur (petit cercle bleu)
            L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
              radius: 8,
              fillColor: '#3B82F6',
              color: '#ffffff',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            }).addTo(leaflet.current).bindTooltip('Vous êtes ici', { permanent: false })
          }
        },
        err => {
          // Position refusée ou indisponible : on garde le centre par défaut, sans bloquer
          console.warn('Géolocalisation indisponible:', err.message)
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      )
    }

    return () => { leaflet.current?.remove(); leaflet.current = null }
  }, [])

  // Chargement données — respecte les modules autorisés
  useEffect(() => {
    if (!user) return
    setLoading(true)
    const emailFiltre = isAdmin && voirTout ? undefined : user.email

    Promise.all([
      hasModuleTraitement ? getObservations({ emailFiltre }) : Promise.resolve([]),
      hasModulePiegeage   ? getPiegeages({ emailFiltre })    : Promise.resolve([]),
    ]).then(([dataObs, dataPieges]) => {
      setObs(dataObs)
      setPieges(dataPieges as PiegeageAvecCaptures[])

      const anneesObs    = dataObs.map(o => o.date_observation.substring(0, 4))
      const anneesPieges = (dataPieges as PiegeageAvecCaptures[]).map(p => p.date_pose.substring(0, 4))
      const anneesPresentes = [...new Set([...anneesObs, ...anneesPieges])]
        .sort((a, b) => b.localeCompare(a))
      setAnnees(anneesPresentes)
      const anneeActuelle = String(new Date().getFullYear())
      if (anneesPresentes.includes(anneeActuelle)) setFiltreAnnee(anneeActuelle)
      else if (anneesPresentes.length > 0) setFiltreAnnee(anneesPresentes[0])
      else setFiltreAnnee('all')
      setLoading(false)
    })
  }, [user, isAdmin, voirTout, hasModuleTraitement, hasModulePiegeage])

  // Refresh markers
  useEffect(() => {
    if (!layerRef.current) return
    layerRef.current.clearLayers()

    // Observations (uniquement si module autorisé)
    if (hasModuleTraitement && filtreType !== 'pieges') {
      obs
        .filter(o => {
          if (!o.latitude || !o.longitude) return false
          if (filtreAnnee !== 'all' && !o.date_observation.startsWith(filtreAnnee)) return false
          if (filtreEspece !== 'all' && o.espece !== filtreEspece) return false
          if (filtreRetire === 'actif'  &&  o.retire) return false
          if (filtreRetire === 'retire' && !o.retire) return false
          return true
        })
        .forEach(o => {
          const color  = especesGetColor(o.espece as Espece)
          const marker = L.marker([o.latitude!, o.longitude!], {
            icon: makeIcon(o.retire ? '#6B7280' : color),
          })
          marker.bindPopup(`
            <div style="font-family:system-ui;min-width:180px">
              <p style="font-weight:600;margin:0 0 4px">${o.espece}</p>
              <p style="color:#9ca3af;font-size:12px;margin:0 0 2px">${o.date_observation}</p>
              <p style="color:#9ca3af;font-size:12px;margin:0 0 2px">${o.donneur_ordre ?? ''}</p>
              ${o.type_nid ? `<p style="font-size:12px;margin:0 0 4px">Nid : ${o.type_nid}</p>` : ''}
              ${o.emplacement ? `<p style="font-size:12px;margin:0 0 4px">📍 ${o.emplacement}</p>` : ''}
              <p style="font-size:12px;margin:0">${o.retire ? '✅ Retiré' : '🟠 Non retiré'}</p>
              <button onclick="window.location.href='/observation/${o.id}'"
                style="margin-top:8px;background:#D97706;color:white;border:none;padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;width:100%">
                Voir détail →
              </button>
            </div>
          `, { maxWidth: 220 })
          marker.addTo(layerRef.current!)
        })
    }

    // Piégeages (uniquement si module autorisé)
    if (hasModulePiegeage && filtreType !== 'nids') {
      pieges
        .filter(p => {
          if (!p.latitude || !p.longitude) return false
          if (filtreAnnee !== 'all' && !p.date_pose.startsWith(filtreAnnee)) return false
          const enPlace = !p.date_retrait
          if (filtreRetire === 'actif'  && !enPlace) return false
          if (filtreRetire === 'retire' &&  enPlace) return false
          if (filtreEspece !== 'all') {
            const hasEspece = (p.captures ?? []).some(c => c.espece === filtreEspece)
            if (!hasEspece) return false
          }
          return true
        })
        .forEach(p => {
          const enPlace = !p.date_retrait
          const color   = enPlace ? PIEGE_COLOR : PIEGE_RETIRE_COLOR
          const marker  = L.marker([p.latitude!, p.longitude!], {
            icon: makeSquareIcon(color),
          })
          const capturesHtml = (p.captures ?? []).length === 0
            ? '<p style="color:#9ca3af;font-size:12px;margin:4px 0">Aucune capture</p>'
            : '<div style="margin:6px 0 2px">'
              + (p.captures ?? []).map(c =>
                  `<p style="font-size:12px;margin:0 0 2px"><strong>${c.quantite}</strong> ${c.espece}</p>`
                ).join('')
              + `<p style="font-size:11px;color:#9ca3af;margin:4px 0 0">Total : ${totalCapturesPiegeage(p)}</p>`
              + '</div>'

          marker.bindPopup(`
            <div style="font-family:system-ui;min-width:180px">
              <p style="font-weight:600;margin:0 0 4px">🪤 ${p.type_piege}</p>
              <p style="color:#9ca3af;font-size:12px;margin:0 0 2px">Pose : ${p.date_pose}</p>
              ${p.date_retrait ? `<p style="color:#9ca3af;font-size:12px;margin:0 0 2px">Retiré : ${p.date_retrait}</p>` : ''}
              ${p.appat ? `<p style="font-size:12px;margin:0 0 2px">🍯 ${p.appat}</p>` : ''}
              ${p.emplacement ? `<p style="font-size:12px;margin:0 0 2px">📍 ${p.emplacement}</p>` : ''}
              ${capturesHtml}
              <p style="font-size:12px;margin:4px 0 0">${enPlace ? '🟠 En place' : '✅ Retiré'}</p>
              <button onclick="window.location.href='/piegeages/${p.id}'"
                style="margin-top:8px;background:#475569;color:white;border:none;padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;width:100%">
                Voir détail →
              </button>
            </div>
          `, { maxWidth: 240 })
          marker.addTo(layerRef.current!)
        })
    }
  }, [obs, pieges, filtreType, filtreAnnee, filtreEspece, filtreRetire, hasModuleTraitement, hasModulePiegeage])

  // Compteurs
  const obsAnnee = filtreAnnee === 'all'
    ? obs
    : obs.filter(o => o.date_observation.startsWith(filtreAnnee))
  const piegesAnnee = filtreAnnee === 'all'
    ? pieges
    : pieges.filter(p => p.date_pose.startsWith(filtreAnnee))

  const obsGPS    = obsAnnee.filter(o => o.latitude && o.longitude).length
  const piegesGPS = piegesAnnee.filter(p => p.latitude && p.longitude).length

  // Si seul un module est dispo, le filtre type n'a aucun sens
  const hasBothModules = hasModuleTraitement && hasModulePiegeage

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Filtres */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2 flex-wrap">
        {hasBothModules && (
          <select value={filtreType} onChange={e => setFiltreType(e.target.value as FiltreType)}
            className="bg-gray-900/95 backdrop-blur border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
            <option value="all">Nids + Pièges</option>
            <option value="nids">Nids seulement</option>
            <option value="pieges">Pièges seulement</option>
          </select>
        )}
        <select value={filtreAnnee} onChange={e => setFiltreAnnee(e.target.value)}
          className="bg-gray-900/95 backdrop-blur border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
          <option value="all">Toutes années</option>
          {annees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtreEspece} onChange={e => setFiltreEspece(e.target.value)}
          className="bg-gray-900/95 backdrop-blur border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
          <option value="all">Toutes espèces</option>
          {especesNoms.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filtreRetire} onChange={e => setFiltreRetire(e.target.value)}
          className="bg-gray-900/95 backdrop-blur border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
          <option value="all">Tous statuts</option>
          <option value="actif">Actifs / En place</option>
          <option value="retire">Retirés</option>
        </select>
        {isAdmin && (
          <button onClick={() => setVoirTout(v => !v)}
            className={`text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${
              voirTout
                ? 'bg-amber-500 border-amber-500 text-black'
                : 'bg-gray-900/95 border-gray-700 text-gray-300'
            }`}>
            {voirTout ? '👁 Tous' : '👤 Les miennes'}
          </button>
        )}
      </div>

      {/* Compteur */}
      <div className="absolute bottom-20 left-3 z-[1000] bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-300 space-y-0.5">
        {loading ? <Spinner size={14} /> : (
          <>
            {hasModuleTraitement && filtreType !== 'pieges' && <div>● {obsGPS}/{obsAnnee.length} nids</div>}
            {hasModulePiegeage   && filtreType !== 'nids'   && <div>■ {piegesGPS}/{piegesAnnee.length} pièges</div>}
          </>
        )}
      </div>

      {/* Légende */}
      <div className="absolute bottom-20 right-3 z-[1000] bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl p-3 space-y-1.5 max-w-[180px]">
        {hasModuleTraitement && filtreType !== 'pieges' && (
          <>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Nids</p>
            {especes.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs text-gray-300">
                <div className="w-3 h-3 rounded-full border border-white/40 flex-shrink-0" style={{ backgroundColor: e.couleur }} />
                {e.nom}
              </div>
            ))}
            <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 border-t border-gray-700">
              <div className="w-3 h-3 rounded-full bg-gray-500 border border-white/40 flex-shrink-0" />
              Retiré
            </div>
          </>
        )}
        {hasModulePiegeage && filtreType !== 'nids' && (
          <>
            <p className={`text-[10px] text-gray-500 uppercase tracking-wide ${
              hasModuleTraitement && filtreType === 'all' ? 'pt-1.5 border-t border-gray-700 mt-1.5' : ''
            }`}>Pièges</p>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <div className="w-3 h-3 border border-white/40 flex-shrink-0" style={{ backgroundColor: PIEGE_COLOR }} />
              En place
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 border border-white/40 flex-shrink-0" style={{ backgroundColor: PIEGE_RETIRE_COLOR }} />
              Retiré
            </div>
          </>
        )}
      </div>

      {/* FAB → menu de saisie : adapté aux modules */}
      {(hasModuleTraitement || hasModulePiegeage) && (
        <FabSaisie
          showNid={hasModuleTraitement}
          showPiege={hasModulePiegeage}
          onNid={() => navigate('/nouveau')}
          onPiege={() => navigate('/piegeages/nouveau')}
        />
      )}
    </div>
  )
}

function FabSaisie({
  showNid, showPiege, onNid, onPiege,
}: {
  showNid: boolean; showPiege: boolean; onNid: () => void; onPiege: () => void
}) {
  const [open, setOpen] = useState(false)

  // Si un seul module dispo, FAB direct sans menu
  if (showNid && !showPiege) {
    return (
      <button onClick={onNid}
        className="absolute bottom-72 right-3 z-[1100] w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 active:scale-95 transition-transform text-white text-2xl font-light">
        +
      </button>
    )
  }
  if (showPiege && !showNid) {
    return (
      <button onClick={onPiege}
        className="absolute bottom-72 right-3 z-[1100] w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 active:scale-95 transition-transform text-white text-2xl font-light">
        +
      </button>
    )
  }

  // Les deux modules → menu de choix
  return (
    <div className="absolute bottom-72 right-3 z-[1100] flex flex-col items-end gap-2">
      {open && (
        <>
          <button onClick={() => { setOpen(false); onNid() }}
            className="flex items-center gap-2 pl-3 pr-4 py-2.5 bg-amber-500 text-white rounded-full shadow-lg active:scale-95 transition-transform text-sm font-medium">
            <span className="w-2.5 h-2.5 bg-white rounded-full" />
            Nouveau nid
          </button>
          <button onClick={() => { setOpen(false); onPiege() }}
            className="flex items-center gap-2 pl-3 pr-4 py-2.5 bg-slate-600 text-white rounded-full shadow-lg active:scale-95 transition-transform text-sm font-medium">
            <span className="w-2.5 h-2.5 bg-white" />
            Nouveau piège
          </button>
        </>
      )}
      <button onClick={() => setOpen(o => !o)}
        className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 active:scale-95 transition-transform text-white text-2xl font-light">
        {open ? '×' : '+'}
      </button>
    </div>
  )
}
