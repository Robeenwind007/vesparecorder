import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { getPiegeages, getTypesPieges, totalCapturesPiegeage } from '../lib/piegeage'
import type { PiegeageAvecCaptures, TypePiege } from '../types/piegeage'
import { Card, Spinner, Empty } from '../components/UI'

export default function ListePiegeagesPage() {
  const { user, isAdmin } = useUser()
  const navigate = useNavigate()

  const [items, setItems]     = useState<PiegeageAvecCaptures[]>([])
  const [loading, setLoading] = useState(true)
  const [voirTout, setVoirTout]       = useState(false)
  const [filtreAnnee, setFiltreAnnee] = useState<string>(String(new Date().getFullYear()))
  const [annees, setAnnees]           = useState<string[]>([])
  const [filtreStatut, setFiltreStatut] = useState<'all' | 'actif' | 'retire'>('all')
  const [recherche, setRecherche]       = useState('')

  // Export
  const [showExport, setShowExport]   = useState(false)
  const [exportDebut, setExportDebut] = useState('2025-01-01')
  const [exportFin, setExportFin]     = useState(() => new Date().toISOString().split('T')[0])
  const [exportType, setExportType]   = useState('')
  const [types, setTypes]             = useState<TypePiege[]>([])
  const [exporting, setExporting]     = useState(false)

  useEffect(() => {
    getTypesPieges().then(setTypes)
  }, [])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const emailFiltre = isAdmin && voirTout ? undefined : user.email
    getPiegeages({ emailFiltre }).then(data => {
      setItems(data)
      const anneesPresentes = [...new Set(
        data.map(p => p.date_pose.substring(0, 4))
      )].sort((a, b) => b.localeCompare(a))
      setAnnees(anneesPresentes)
      const anneeActuelle = String(new Date().getFullYear())
      if (anneesPresentes.includes(anneeActuelle)) setFiltreAnnee(anneeActuelle)
      else if (anneesPresentes.length > 0) setFiltreAnnee(anneesPresentes[0])
      else setFiltreAnnee('all')
      setLoading(false)
    })
  }, [user, isAdmin, voirTout])

  // Filtres affichés à l'écran
  const filtres = items.filter(p => {
    if (filtreAnnee !== 'all' && !p.date_pose.startsWith(filtreAnnee)) return false
    if (filtreStatut === 'actif'  && p.date_retrait) return false
    if (filtreStatut === 'retire' && !p.date_retrait) return false
    if (recherche) {
      const r = recherche.toLowerCase()
      const match = (
        p.type_piege?.toLowerCase().includes(r) ||
        p.appat?.toLowerCase().includes(r) ||
        p.adresse?.toLowerCase().includes(r) ||
        p.emplacement?.toLowerCase().includes(r) ||
        p.notes?.toLowerCase().includes(r)
      )
      if (!match) return false
    }
    return true
  })

  // Données pour export = filtres écran + dates + type
  const exportData = items.filter(p => {
    if (p.date_pose < exportDebut || p.date_pose > exportFin) return false
    if (filtreStatut === 'actif'  && p.date_retrait) return false
    if (filtreStatut === 'retire' && !p.date_retrait) return false
    if (exportType && p.type_piege !== exportType) return false
    if (recherche) {
      const r = recherche.toLowerCase()
      const match = (
        p.type_piege?.toLowerCase().includes(r) ||
        p.appat?.toLowerCase().includes(r) ||
        p.adresse?.toLowerCase().includes(r) ||
        p.emplacement?.toLowerCase().includes(r) ||
        p.notes?.toLowerCase().includes(r)
      )
      if (!match) return false
    }
    return true
  })

  // ── Helpers ─────────────────────────────────────────────────
  const fmt = (d: string) => {
    if (!d) return '—'
    const [y, m, j] = d.split('-')
    return `${j}/${m}/${y}`
  }
  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s

  // ── Export PDF ──────────────────────────────────────────────
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
      doc.text('VespaRecorder — Mes piégeages', W / 2, 17, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...WHITE)
      const filtresActifs = [
        exportType ? `Type : ${exportType}` : null,
        filtreStatut === 'actif' ? 'En place uniquement' : filtreStatut === 'retire' ? 'Retirés uniquement' : null,
        recherche ? `Recherche : "${recherche}"` : null,
      ].filter(Boolean).join('  •  ')
      const ligne2 = `Piégeur : ${user?.email}   •   Période : ${fmt(exportDebut)} au ${fmt(exportFin)}   •   Généré le ${fmt(new Date().toISOString().split('T')[0])}`
      doc.text(ligne2, W / 2, filtresActifs ? 22 : 25, { align: 'center' })
      if (filtresActifs) {
        doc.setFontSize(8)
        doc.setTextColor(217, 119, 6)
        doc.text(`Filtres actifs : ${filtresActifs}`, W / 2, 28, { align: 'center' })
      }

      // Tableau : une ligne par espèce capturée
      type Row = Record<string, string>
      const rows: Row[] = []
      exportData.forEach(p => {
        const baseRow = {
          date_pose:    fmt(p.date_pose),
          date_retrait: p.date_retrait ? fmt(p.date_retrait) : '—',
          type:         p.type_piege,
          appat:        p.appat ?? '—',
          lieu:         p.emplacement ?? '—',
          loc:          p.adresse
                          ? truncate(p.adresse, 28)
                          : p.latitude
                            ? `${p.latitude.toFixed(4)}, ${p.longitude?.toFixed(4)}`
                            : '—',
          statut:       p.date_retrait ? 'RETIRÉ' : 'EN PLACE',
        }
        const caps = p.captures ?? []
        if (caps.length === 0) {
          rows.push({ ...baseRow, espece: '—', qte: '0' })
        } else {
          caps.forEach(c => {
            rows.push({ ...baseRow, espece: c.espece, qte: String(c.quantite) })
          })
        }
      })

      autoTable(doc, {
        startY: 36,
        columns: [
          { header: 'Date pose',    dataKey: 'date_pose' },
          { header: 'Date retrait', dataKey: 'date_retrait' },
          { header: 'Type piège',   dataKey: 'type' },
          { header: 'Appât',        dataKey: 'appat' },
          { header: 'Lieu',         dataKey: 'lieu' },
          { header: 'Localisation', dataKey: 'loc' },
          { header: 'Espèce',       dataKey: 'espece' },
          { header: 'Qté',          dataKey: 'qte' },
          { header: 'Statut',       dataKey: 'statut' },
        ],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica' },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8, halign: 'center' },
        alternateRowStyles: { fillColor: LGRAY },
        columnStyles: {
          qte:          { halign: 'center', cellWidth: 10 },
          statut:       { halign: 'center', cellWidth: 20 },
          type:         { cellWidth: 28 },
          espece:       { cellWidth: 24 },
          date_pose:    { cellWidth: 18 },
          date_retrait: { cellWidth: 18 },
        },
        didParseCell: (data: any) => {
          if (data.column.dataKey === 'statut' && data.section === 'body') {
            data.cell.styles.textColor = data.cell.raw === 'RETIRÉ' ? [5, 150, 105] : [217, 119, 6]
            data.cell.styles.fontStyle = 'bold'
          }
          if (data.column.dataKey === 'espece' && data.section === 'body') {
            const colors: Record<string, number[]> = { 'Asiatique': [217,119,6], 'Européen': [37,99,235], 'Guêpes': [124,58,237] }
            const c = colors[data.cell.raw as string]
            if (c) { data.cell.styles.textColor = c; data.cell.styles.fontStyle = 'bold' }
          }
        },
      })

      const finalY = (doc as any).lastAutoTable.finalY + 8

      // Récap
      const totalPieges = exportData.length
      const enPlace     = exportData.filter(p => !p.date_retrait).length
      const retires     = exportData.filter(p =>  p.date_retrait).length
      const totalCaps   = exportData.reduce((s, p) => s + totalCapturesPiegeage(p), 0)

      const byEspece: Record<string, number> = {}
      exportData.forEach(p => (p.captures ?? []).forEach(c => {
        byEspece[c.espece] = (byEspece[c.espece] ?? 0) + c.quantite
      }))

      const boxH = 34
      const boxY = Math.min(finalY, doc.internal.pageSize.getHeight() - boxH - 12)
      doc.setFillColor(...DARK)
      doc.roundedRect(10, boxY, W - 20, boxH, 4, 4, 'F')

      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...AMBER as any)
      doc.text('Récapitulatif', 18, boxY + 8)

      const stats = [
        ['Pièges', String(totalPieges)],
        ['En place', String(enPlace)],
        ['Retirés', String(retires)],
        ['Captures', String(totalCaps)],
      ]
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
      doc.text('Captures par espèce', espX, espY); espY += 5
      Object.entries(byEspece).sort((a, b) => b[1] - a[1]).forEach(([esp, cnt]) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...WHITE)
        doc.text(`${esp} : ${cnt}`, espX, espY); espY += 4.5
      })

      // Footer
      for (let i = 1; i <= doc.getNumberOfPages(); i++) {
        doc.setPage(i)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MGRAY as any)
        doc.text(`VespaRecorder v2.2 — © Olivier BERNARD 2026`, 14, doc.internal.pageSize.getHeight() - 5)
        doc.text(`Page ${i} / ${doc.getNumberOfPages()}`, W - 14, doc.internal.pageSize.getHeight() - 5, { align: 'right' })
      }

      doc.save(`VespaRecorder_Pieges_${user?.email?.split('@')[0]}_${exportDebut}_${exportFin}.pdf`)
    } catch (e) {
      alert('Erreur lors de la génération PDF'); console.error(e)
    }
    setExporting(false)
  }

  // ── Export Excel ────────────────────────────────────────────
  const exportExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import('https://esm.sh/xlsx@0.18.5' as string) as any

      const rows: (string | number)[][] = [
        ['Date pose', 'Date retrait', 'Piégeur', 'Type piège', 'Appât', 'Lieu de pose', 'Adresse / GPS', 'Espèce', 'Quantité', 'Statut', 'Notes'],
      ]
      exportData.forEach(p => {
        const base = [
          fmt(p.date_pose),
          p.date_retrait ? fmt(p.date_retrait) : '',
          p.saisi_par_email ?? '',
          p.type_piege,
          p.appat ?? '',
          p.emplacement ?? '',
          p.adresse ?? (p.latitude && p.longitude ? `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}` : ''),
        ]
        const statut = p.date_retrait ? 'Retiré' : 'En place'
        const notes  = p.notes ?? ''
        const caps   = p.captures ?? []
        if (caps.length === 0) {
          rows.push([...base, '', 0, statut, notes])
        } else {
          caps.forEach(c => {
            rows.push([...base, c.espece, c.quantite, statut, notes])
          })
        }
      })

      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Piégeages')
      XLSX.writeFile(wb, `VespaRecorder_Pieges_${user?.email?.split('@')[0]}_${exportDebut}_${exportFin}.xlsx`)
    } catch (e) {
      alert('Erreur lors de la génération Excel'); console.error(e)
    }
    setExporting(false)
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pièges ({filtres.length})</h2>
          {isAdmin && (
            <button onClick={() => setVoirTout(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                voirTout
                  ? 'bg-amber-500 border-amber-500 text-black'
                  : 'bg-gray-800 border-gray-700 text-gray-300'
              }`}>
              {voirTout ? '👁 Tous' : '👤 Les miens'}
            </button>
          )}
        </div>

        {/* Barre recherche + bouton rapport */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="search" placeholder="Rechercher (type, appât, adresse, notes…)"
              value={recherche} onChange={e => setRecherche(e.target.value)}
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

        {/* Panneau export */}
        {showExport && (
          <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-4 space-y-4">
            <p className="text-xs text-amber-500 uppercase tracking-wide font-medium">Exporter mes piégeages</p>

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

            {/* Filtre type de piège */}
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Type de piège</label>
              <select value={exportType} onChange={e => setExportType(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 appearance-none">
                <option value="">Tous les types</option>
                {types.map(t => <option key={t.id} value={t.nom}>{t.nom}</option>)}
              </select>
            </div>

            {/* Compteur rapide */}
            <p className="text-xs text-gray-500">
              {exportData.length} piégeage{exportData.length > 1 ? 's' : ''} sur cette période
              {exportData.length > 0 && ` · ${exportData.reduce((s, p) => s + totalCapturesPiegeage(p), 0)} captures`}
              {(filtreStatut !== 'all' || recherche || exportType) && (
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

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          <select value={filtreAnnee} onChange={e => setFiltreAnnee(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
            <option value="all">Toutes années</option>
            {annees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value as 'all' | 'actif' | 'retire')}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none">
            <option value="all">Tous statuts</option>
            <option value="actif">En place</option>
            <option value="retire">Retirés</option>
          </select>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {loading ? (
          <div className="flex items-center justify-center pt-12"><Spinner size={32} /></div>
        ) : filtres.length === 0 ? (
          <Empty message="Aucun piégeage à afficher." icon="🪤" />
        ) : (
          filtres.map(p => {
            const total = totalCapturesPiegeage(p)
            const enPlace = !p.date_retrait
            return (
              <Card key={p.id} onClick={() => navigate(`/piegeages/${p.id}`)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.type_piege}</p>
                    <p className="text-xs text-gray-400">Pose : {p.date_pose}</p>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    enPlace ? 'bg-orange-900/60 text-orange-300' : 'bg-green-900/60 text-green-300'
                  }`}>
                    {enPlace ? '● En place' : '✓ Retiré'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-400">
                  {p.emplacement && <p>📍 {p.emplacement}{p.adresse ? ` — ${p.adresse}` : ''}</p>}
                  {p.appat && <p>🍯 Appât : {p.appat}</p>}
                  {p.date_retrait && <p>🗓 Retiré le : {p.date_retrait}</p>}
                </div>

                {(p.captures?.length ?? 0) > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-700/50 flex flex-wrap gap-1.5">
                    {p.captures.map(c => (
                      <span key={c.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
                        <strong>{c.quantite}</strong> {c.espece}
                      </span>
                    ))}
                    <span className="ml-auto text-xs text-gray-500">Total : {total}</span>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* FAB */}
      <button onClick={() => navigate('/piegeages/nouveau')}
        className="fixed bottom-24 right-4 z-[1000] w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 active:scale-95 transition-transform text-white text-2xl font-light">
        +
      </button>
    </div>
  )
}
