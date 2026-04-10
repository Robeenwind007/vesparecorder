import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getObservations, getDonneurs } from '../lib/supabase'
import type { DonneurOrdre } from '../types'
import { useUser } from '../hooks/useUser'
import type { Observation } from '../types'
import { ESPECES } from '../types'
import { EspeceBadge, RetireBadge, Card, Empty, Spinner } from '../components/UI'

export default function ListePage() {
  const { user, isAdmin } = useUser()
  const navigate = useNavigate()

  const [obs, setObs]           = useState<Observation[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filtreEsp, setFiltreEsp] = useState('')
  const [filtreRet, setFiltreRet] = useState('')
  const [filtreAnnee, setFiltreAnnee] = useState('')
  const [voirTout, setVoirTout] = useState(false)
  const [annees, setAnnees]     = useState<string[]>([])

  // Export
  const [showExport, setShowExport]   = useState(false)
  const [exportDebut, setExportDebut] = useState('2025-01-01')
  const [exportFin, setExportFin]     = useState(() => new Date().toISOString().split('T')[0])
  const [exportDonneur, setExportDonneur] = useState('')
  const [donneurs, setDonneurs]           = useState<DonneurOrdre[]>([])
  const [exporting, setExporting]         = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) getDonneurs(user.email).then(setDonneurs)
  }, [user])

  useEffect(() => {
    if (!user) return
    const emailFiltre = isAdmin && voirTout ? undefined : user.email
    setLoading(true)
    getObservations({ emailFiltre }).then(data => {
      setObs(data)
      const anneesPresentes = [...new Set(
        data.map(o => o.date_observation.substring(0, 4))
      )].sort((a, b) => b.localeCompare(a))
      setAnnees(anneesPresentes)
      const anneeActuelle = String(new Date().getFullYear())
      if (anneesPresentes.includes(anneeActuelle)) setFiltreAnnee(anneeActuelle)
      else if (anneesPresentes.length > 0) setFiltreAnnee(anneesPresentes[0])
      setLoading(false)
    })
  }, [user, isAdmin, voirTout])

  const filtered = obs.filter(o => {
    if (filtreAnnee && !o.date_observation.startsWith(filtreAnnee)) return false
    if (filtreEsp && o.espece !== filtreEsp)   return false
    if (filtreRet === 'oui' && !o.retire)      return false
    if (filtreRet === 'non' &&  o.retire)      return false
    if (search) {
      const s = search.toLowerCase()
      return (
        o.donneur_ordre?.toLowerCase().includes(s) ||
        o.beneficiaire?.toLowerCase().includes(s) ||
        o.adresse?.toLowerCase().includes(s) ||
        o.espece.toLowerCase().includes(s) ||
        o.emplacement?.toLowerCase().includes(s) ||
        o.saisi_par_email?.toLowerCase().includes(s)
      )
    }
    return true
  })

  // Export = filtres actifs (espèce, statut, recherche, année) + période dates
  const exportData = obs.filter(o => {
    // Période
    if (o.date_observation < exportDebut || o.date_observation > exportFin) return false
    // Filtres actifs de la liste
    if (filtreEsp && o.espece !== filtreEsp)  return false
    if (filtreRet === 'oui' && !o.retire)     return false
    if (filtreRet === 'non' &&  o.retire)     return false
    if (exportDonneur && o.donneur_ordre !== exportDonneur) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        o.donneur_ordre?.toLowerCase().includes(s) ||
        o.beneficiaire?.toLowerCase().includes(s) ||
        o.adresse?.toLowerCase().includes(s) ||
        o.espece.toLowerCase().includes(s) ||
        o.emplacement?.toLowerCase().includes(s)
      )
    }
    return true
  }).sort((a, b) => a.date_observation.localeCompare(b.date_observation))

  const fmt = (d: string) => {
    const [y, m, j] = d.split('-'); return `${j}/${m}/${y}`
  }
  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s

  // ── Export PDF ─────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true)
    try {
      const { jsPDF } = await import('https://esm.sh/jspdf@2.5.1' as string) as any
      const { default: autoTable } = await import('https://esm.sh/jspdf-autotable@3.8.2' as string) as any

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const DARK  = [17, 24, 39]
      const AMBER = [217, 119, 6]
      const LGRAY = [243, 244, 246]
      const MGRAY = [107, 114, 128]
      const WHITE = [255, 255, 255]

      // En-tête
      doc.setFillColor(...DARK)
      doc.roundedRect(10, 8, W - 20, 22, 4, 4, 'F')
      doc.setTextColor(...WHITE)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      doc.text('VespaRecorder — Mes interventions', W / 2, 17, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...WHITE)
      const filtresActifs = [
        filtreEsp ? `Espèce : ${filtreEsp}` : null,
        filtreRet === 'oui' ? 'Retirés seulement' : filtreRet === 'non' ? 'Non retirés seulement' : null,
        exportDonneur ? `Donneur : ${exportDonneur}` : null,
        search ? `Recherche : "${search}"` : null,
      ].filter(Boolean).join('  •  ')
      const ligne2 = `Piégeur : ${user?.email}   •   Période : ${fmt(exportDebut)} au ${fmt(exportFin)}   •   Généré le ${fmt(new Date().toISOString().split('T')[0])}`
      doc.text(ligne2, W / 2, filtresActifs ? 22 : 25, { align: 'center' })
      if (filtresActifs) {
        doc.setFontSize(8)
        doc.setTextColor(217, 119, 6)
        doc.text(`Filtres actifs : ${filtresActifs}`, W / 2, 28, { align: 'center' })
      }

      // Tableau
      autoTable(doc, {
        startY: 36,
        columns: [
          { header: 'Date',         dataKey: 'date' },
          { header: 'Donneur',      dataKey: 'donneur' },
          { header: 'Bénéficiaire', dataKey: 'benef' },
          { header: 'Espèce',       dataKey: 'espece' },
          { header: 'Type nid',     dataKey: 'type' },
          { header: 'Nids',         dataKey: 'nb' },
          { header: 'Emplacement',  dataKey: 'emplacement' },
          { header: 'Localisation', dataKey: 'loc' },
          { header: 'Retiré',       dataKey: 'retire' },
        ],
        body: exportData.map(o => ({
          date:        fmt(o.date_observation),
          donneur:     o.donneur_ordre ?? '—',
          benef:       o.beneficiaire ?? '—',
          espece:      o.espece,
          type:        o.type_nid ?? '—',
          nb:          String(o.nombre_nids),
          emplacement: o.emplacement ?? '—',
          loc:         o.adresse ? truncate(o.adresse, 30) : o.latitude ? `${o.latitude.toFixed(4)}, ${o.longitude?.toFixed(4)}` : '—',
          retire:      o.retire ? 'OUI' : 'NON',
        })),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica' },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8, halign: 'center' },
        alternateRowStyles: { fillColor: LGRAY },
        columnStyles: {
          nb:     { halign: 'center', cellWidth: 10 },
          retire: { halign: 'center', cellWidth: 14 },
          date:   { cellWidth: 18 },
          type:   { cellWidth: 18 },
          espece: { cellWidth: 22 },
        },
        didParseCell: (data: any) => {
          if (data.column.dataKey === 'retire' && data.section === 'body') {
            data.cell.styles.textColor = data.cell.raw === 'OUI' ? [5, 150, 105] : [220, 38, 38]
            data.cell.styles.fontStyle = 'bold'
          }
          if (data.column.dataKey === 'espece' && data.section === 'body') {
            const colors: Record<string, number[]> = { 'Asiatique': [217,119,6], 'Européen': [37,99,235], 'Guêpes': [124,58,237] }
            const c = colors[data.cell.raw]
            if (c) { data.cell.styles.textColor = c; data.cell.styles.fontStyle = 'bold' }
          }
        },
      })

      const finalY = (doc as any).lastAutoTable.finalY + 8
      const total    = exportData.length
      const retires  = exportData.filter(o => o.retire).length
      const laisses  = total - retires
      const taux     = total ? Math.round((retires / total) * 100) : 0
      const byEspece = exportData.reduce<Record<string, number>>((a, o) => { a[o.espece] = (a[o.espece] ?? 0) + 1; return a }, {})

      const boxH = 34
      const boxY = Math.min(finalY, doc.internal.pageSize.getHeight() - boxH - 12)
      doc.setFillColor(...DARK)
      doc.roundedRect(10, boxY, W - 20, boxH, 4, 4, 'F')

      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...AMBER as any)
      doc.text('Récapitulatif', 18, boxY + 8)

      const stats = [['Total', String(total)], ['Retirés', `${retires} (${taux}%)`], ['Laissés', String(laisses)]]
      const colW = (W - 20) / (stats.length + 1)
      stats.forEach(([label, val], i) => {
        const x = 10 + i * colW + colW / 2
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MGRAY as any)
        doc.text(label, x, boxY + 17, { align: 'center' })
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...WHITE)
        doc.text(val, x, boxY + 27, { align: 'center' })
      })

      let espY = boxY + 10
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...AMBER as any)
      const espX = 10 + stats.length * colW + 8
      doc.text('Par espèce', espX, espY); espY += 5
      Object.entries(byEspece).sort((a, b) => b[1] - a[1]).forEach(([esp, cnt]) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...WHITE)
        doc.text(`${esp} : ${cnt}`, espX, espY); espY += 4.5
      })

      // Footer
      for (let i = 1; i <= doc.getNumberOfPages(); i++) {
        doc.setPage(i)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MGRAY as any)
        doc.text(`VespaRecorder v2.0 — © Olivier BERNARD 2026`, 14, doc.internal.pageSize.getHeight() - 5)
        doc.text(`Page ${i} / ${doc.getNumberOfPages()}`, W - 14, doc.internal.pageSize.getHeight() - 5, { align: 'right' })
      }

      doc.save(`VespaRecorder_${user?.email?.split('@')[0]}_${exportDebut}_${exportFin}.pdf`)
    } catch (e) {
      alert('Erreur lors de la génération PDF'); console.error(e)
    }
    setExporting(false)
  }

  // ── Export Excel ───────────────────────────────────────────
  const exportExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import('https://esm.sh/xlsx@0.18.5' as string) as any

      const rows = [
        ['Date', 'Donneur d\'ordre', 'Bénéficiaire', 'Espèce', 'Type nid', 'Nb nids', 'Emplacement', 'Adresse / GPS', 'Retiré', 'Saisi par'],
        ...exportData.map(o => [
          fmt(o.date_observation),
          o.donneur_ordre ?? '',
          o.beneficiaire ?? '',
          o.espece,
          o.type_nid ?? '',
          o.nombre_nids,
          o.emplacement ?? '',
          o.adresse ?? (o.latitude ? `${o.latitude.toFixed(5)}, ${o.longitude?.toFixed(5)}` : ''),
          o.retire ? 'OUI' : 'NON',
          o.saisi_par_email ?? '',
        ])
      ]

      const ws = XLSX.utils.aoa_to_sheet(rows)
      // Largeurs colonnes
      ws['!cols'] = [10, 20, 18, 14, 12, 8, 14, 30, 8, 28].map(w => ({ wch: w }))

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Interventions')

      // Onglet récap
      const total   = exportData.length
      const retires = exportData.filter(o => o.retire).length
      const byEsp   = exportData.reduce<Record<string, number>>((a, o) => { a[o.espece] = (a[o.espece] ?? 0) + 1; return a }, {})
      const filtresExcel = [
        filtreEsp || 'Toutes espèces',
        filtreRet === 'oui' ? 'Retirés' : filtreRet === 'non' ? 'Non retirés' : 'Tous statuts',
        exportDonneur ? `Donneur : ${exportDonneur}` : null,
        search ? `Recherche : "${search}"` : null,
      ].filter(Boolean).join(', ')
      const recap = [
        ['Récapitulatif', ''],
        ['Période', `${fmt(exportDebut)} au ${fmt(exportFin)}`],
        ['Piégeur', user?.email ?? ''],
        ['Filtres appliqués', filtresExcel],
        ['Total interventions', total],
        ['Nids retirés', retires],
        ['Nids laissés', total - retires],
        ['Taux de traitement', `${total ? Math.round((retires/total)*100) : 0}%`],
        [],
        ['Par espèce', ''],
        ...Object.entries(byEsp).sort((a, b) => b[1] - a[1]).map(([esp, cnt]) => [esp, cnt]),
      ]
      const ws2 = XLSX.utils.aoa_to_sheet(recap)
      ws2['!cols'] = [{ wch: 22 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(wb, ws2, 'Récapitulatif')

      XLSX.writeFile(wb, `VespaRecorder_${user?.email?.split('@')[0]}_${exportDebut}_${exportFin}.xlsx`)
    } catch (e) {
      alert('Erreur lors de la génération Excel'); console.error(e)
    }
    setExporting(false)
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="px-4 pt-4 pb-3 space-y-3 border-b border-gray-800">

        {/* Barre recherche + bouton rapport */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="search" placeholder="Rechercher…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500" />
          </div>
          {/* Bouton rapport */}
          <button
            onClick={() => setShowExport(v => !v)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showExport ? 'bg-amber-500 border-amber-500 text-black' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            Rapport
          </button>
        </div>

        {/* Panneau export (glissant) */}
        {showExport && (
          <div ref={panelRef} className="bg-gray-900 border border-amber-500/30 rounded-2xl p-4 space-y-4">
            <p className="text-xs text-amber-500 uppercase tracking-wide font-medium">Exporter mes interventions</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Date début</label>
                <input type="date" value={exportDebut} onChange={e => setExportDebut(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500">Date fin</label>
                <input type="date" value={exportFin} onChange={e => setExportFin(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500" />
              </div>
            </div>

            {/* Filtre donneur d'ordre */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Donneur d'ordre</label>
              <select value={exportDonneur} onChange={e => setExportDonneur(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 appearance-none">
                <option value="">Tous les donneurs</option>
                {donneurs.map(d => <option key={d.id} value={d.nom}>{d.nom}</option>)}
              </select>
            </div>

            {/* Compteur rapide */}
            <p className="text-xs text-gray-500">
              {exportData.length} observation{exportData.length > 1 ? 's' : ''} sur cette période
              {exportData.length > 0 && ` · ${exportData.filter(o => o.retire).length} retirées`}
              {(filtreEsp || filtreRet || search || exportDonneur) && (
                <span className="text-amber-500/70"> · filtres actifs</span>
              )}
            </p>

            {/* Boutons export */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={exportPDF}
                disabled={exporting || exportData.length === 0}
                className="flex items-center justify-center gap-2 py-3 bg-red-900/40 hover:bg-red-900/60 disabled:opacity-40 border border-red-900/50 rounded-xl text-red-400 text-sm font-medium transition-colors"
              >
                {exporting ? <Spinner size={14} /> : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                )}
                PDF
              </button>
              <button
                onClick={exportExcel}
                disabled={exporting || exportData.length === 0}
                className="flex items-center justify-center gap-2 py-3 bg-green-900/40 hover:bg-green-900/60 disabled:opacity-40 border border-green-900/50 rounded-xl text-green-400 text-sm font-medium transition-colors"
              >
                {exporting ? <Spinner size={14} /> : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                )}
                Excel
              </button>
            </div>
          </div>
        )}

        {/* Filtre années */}
        {annees.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button onClick={() => setFiltreAnnee('')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${filtreAnnee === '' ? 'bg-amber-500 border-amber-500 text-black' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
              Toutes
            </button>
            {annees.map(a => (
              <button key={a} onClick={() => setFiltreAnnee(a)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${filtreAnnee === a ? 'bg-amber-500 border-amber-500 text-black' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
                {a}
              </button>
            ))}
          </div>
        )}

        {/* Filtres espèce / statut / admin */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <select value={filtreEsp} onChange={e => setFiltreEsp(e.target.value)}
            className="flex-shrink-0 bg-gray-800 border border-gray-700 text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500">
            <option value="">Toutes espèces</option>
            {ESPECES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filtreRet} onChange={e => setFiltreRet(e.target.value)}
            className="flex-shrink-0 bg-gray-800 border border-gray-700 text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500">
            <option value="">Tous statuts</option>
            <option value="non">Non retirés</option>
            <option value="oui">Retirés</option>
          </select>
          {isAdmin && (
            <button onClick={() => setVoirTout(v => !v)}
              className={`flex-shrink-0 text-xs px-3 py-2 rounded-xl border font-medium transition-colors ${voirTout ? 'bg-amber-500 border-amber-500 text-black' : 'bg-gray-800 border-gray-700 text-gray-300'}`}>
              {voirTout ? '👁 Tous' : '👤 Les miennes'}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500">
          {filtered.length} observation{filtered.length > 1 ? 's' : ''}
          {filtreAnnee ? ` en ${filtreAnnee}` : ''}
        </p>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-20">
        {loading ? (
          <div className="flex justify-center pt-12"><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <Empty message="Aucune observation trouvée" icon="🔍" />
        ) : filtered.map(o => (
          <Card key={o.id} onClick={() => navigate(`/observation/${o.id}`)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <EspeceBadge espece={o.espece} />
                  {o.type_nid && (
                    <span className="text-xs text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full">{o.type_nid}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-white truncate">{o.donneur_ordre ?? '—'}</p>
                {o.beneficiaire && <p className="text-xs text-gray-400 truncate">👤 {o.beneficiaire}</p>}
                {(o.adresse || (o.latitude && o.longitude)) && (
                  <p className="text-xs text-gray-500 truncate">
                    📍 {o.adresse ?? `${o.latitude?.toFixed(4)}, ${o.longitude?.toFixed(4)}`}
                  </p>
                )}
                {o.emplacement && <p className="text-xs text-gray-500">🌿 {o.emplacement}</p>}
                {isAdmin && voirTout && o.saisi_par_email && (
                  <p className="text-xs text-amber-600/70 truncate">✉ {o.saisi_par_email}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <RetireBadge retire={o.retire} />
                <p className="text-xs text-gray-500">{new Date(o.date_observation).toLocaleDateString('fr-FR')}</p>
                {o.image_url && (
                  <img src={o.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-700" />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
