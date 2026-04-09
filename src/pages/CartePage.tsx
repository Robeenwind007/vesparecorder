import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getObservations } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import type { Observation, Espece } from '../types'
import { ESPECE_COLORS, ESPECES } from '../types'
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

export default function CartePage() {
  const mapRef   = useRef<HTMLDivElement>(null)
  const leaflet  = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const { user, isAdmin } = useUser()
  const navigate = useNavigate()

  const [loading, setLoading]           = useState(true)
  const [obs, setObs]                   = useState<Observation[]>([])
  const [filtreEspece, setFiltreEspece] = useState('all')
  const [filtreRetire, setFiltreRetire] = useState('all')
  // Admin peut basculer entre "mes obs" et "toutes"
  const [voirTout, setVoirTout]         = useState(false)

  useEffect(() => {
    if (!mapRef.current || leaflet.current) return
    leaflet.current = L.map(mapRef.current, { center: [47.32, -1.90], zoom: 11, zoomControl: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(leaflet.current)
    L.control.zoom({ position: 'bottomright' }).addTo(leaflet.current)
    layerRef.current = L.layerGroup().addTo(leaflet.current)
    return () => { leaflet.current?.remove(); leaflet.current = null }
  }, [])

  useEffect(() => {
    if (!user) return
    const emailFiltre = isAdmin && voirTout ? undefined : user.email
    getObservations({ emailFiltre }).then(data => { setObs(data); setLoading(false) })
  }, [user, isAdmin, voirTout])

  useEffect(() => {
    if (!layerRef.current) return
    layerRef.current.clearLayers()
    obs
      .filter(o => {
        if (!o.latitude || !o.longitude) return false
        if (filtreEspece !== 'all' && o.espece !== filtreEspece) return false
        if (filtreRetire === 'actif'  &&  o.retire) return false
        if (filtreRetire === 'retire' && !o.retire) return false
        return true
      })
      .forEach(o => {
        const color  = ESPECE_COLORS[o.espece as Espece] ?? '#D97706'
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
            <p style="font-size:12px;margin:0">${o.retire ? '✅ Retiré' : '🟠 Actif'}</p>
            <button onclick="window.location.href='/observation/${o.id}'"
              style="margin-top:8px;background:#D97706;color:white;border:none;padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;width:100%">
              Voir détail →
            </button>
          </div>
        `, { maxWidth: 220 })
        marker.addTo(layerRef.current!)
      })
  }, [obs, filtreEspece, filtreRetire])

  const withGPS = obs.filter(o => o.latitude && o.longitude).length

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Filtres + toggle admin */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2 flex-wrap">
        <select value={filtreEspece} onChange={e => setFiltreEspece(e.target.value)}
          className="bg-gray-900/95 backdrop-blur border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
          <option value="all">Toutes espèces</option>
          {ESPECES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filtreRetire} onChange={e => setFiltreRetire(e.target.value)}
          className="bg-gray-900/95 backdrop-blur border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
          <option value="all">Tous statuts</option>
          <option value="actif">Actifs</option>
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
      <div className="absolute bottom-20 left-3 z-[1000] bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-300">
        {loading ? <Spinner size={14} /> : <span>{withGPS} / {obs.length} géolocalisées</span>}
      </div>

      {/* Légende */}
      <div className="absolute bottom-20 right-3 z-[1000] bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl p-3 space-y-1.5">
        {Object.entries(ESPECE_COLORS).map(([esp, color]) => (
          <div key={esp} className="flex items-center gap-2 text-xs text-gray-300">
            <div className="w-3 h-3 rounded-full border border-white/40 flex-shrink-0" style={{ backgroundColor: color }} />
            {esp}
          </div>
        ))}
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 border-t border-gray-700">
          <div className="w-3 h-3 rounded-full bg-gray-500 border border-white/40 flex-shrink-0" />
          Retiré
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => navigate('/nouveau')}
        className="absolute bottom-24 right-3 z-[1000] w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 active:scale-95 transition-transform text-white text-2xl font-light">
        +
      </button>
    </div>
  )
}
