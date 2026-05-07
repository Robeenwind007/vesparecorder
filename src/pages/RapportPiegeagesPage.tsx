import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { supabase } from '../lib/supabase'
import { getPiegeages, totalCapturesPiegeage } from '../lib/piegeage'
import type { PiegeageAvecCaptures } from '../types/piegeage'
import type { Utilisateur } from '../types'
import { Btn } from '../components/UI'

export default function RapportPiegeagesPage() {
  const { isAdmin } = useUser()
  const navigate    = useNavigate()

  const [dateDebut, setDateDebut] = useState(() => {
    const d = new Date(); d.setMonth(0); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateFin, setDateFin]     = useState(() => new Date().toISOString().split('T')[0])
  const [piegeur, setPiegeur]     = useState('tous')
  const [statut, setStatut]       = useState<'tous' | 'actif' | 'retire'>('tous')
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [generating, setGenerating]     = useState(false)
  const [preview, setPreview]           = useState<PiegeageAvecCaptures[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    supabase.from('utilisateurs').select('*').eq('actif', true).order('email')
      .then(({ data }) => setUtilisateurs(data ?? []))
  }, [isAdmin, navigate])

  const fetchPieges = async (): Promise<PiegeageAvecCaptures[]> => {
    const opts: { emailFiltre?: string; actif?: boolean } = {}
    if (piegeur !== 'tous') opts.emailFiltre = piegeur
    if (statut === 'actif')  opts.actif = true
    if (statut === 'retire') opts.actif = false

    const data = await getPiegeages(opts)
    // Filtrer côté JS sur la période (date_pose dans l'intervalle)
    return data.filter(p => p.date_pose >= dateDebut && p.date_pose <= dateFin)
  }

  const handlePreview = async () => {
    setLoadingPreview(true)
    const data = await fetchPieges()
    setPreview(data)
    setLoadingPreview(false)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    const pieges = preview ?? await fetchPieges()

    const { jsPDF } = await import('https://esm.sh/jspdf@2.5.1' as string) as any
    const { default: autoTable } = await import('https://esm.sh/jspdf-autotable@3.8.2' as string) as any

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const W   = doc.internal.pageSize.getWidth()

    const AMBER  = [217, 119, 6]
    const DARK   = [17, 24, 39]
    const LGRAY  = [243, 244, 246]
    const MGRAY  = [107, 114, 128]
    const WHITE  = [255, 255, 255]

    // ── EN-TÊTE ────────────────────────────────────────────
    doc.setFillColor(...DARK)
    doc.roundedRect(10, 8, W - 20, 22, 4, 4, 'F')
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('VespaRecorder — Rapport de piégeages', W / 2, 17, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const statutLabel = statut === 'tous' ? 'Tous' : statut === 'actif' ? 'En place' : 'Retirés'
    doc.text(
      `Période : ${fmt(dateDebut)} au ${fmt(dateFin)}   •   Piégeur : ${piegeur === 'tous' ? 'Tous' : piegeur}   •   Statut : ${statutLabel}   •   Généré le ${fmt(new Date().toISOString().split('T')[0])}`,
      W / 2, 25, { align: 'center' }
    )

    // ── TABLEAU ────────────────────────────────────────────
    // Une ligne par espèce capturée. Si un piège n'a aucune capture, une ligne avec espèce/qty vides.
    const cols = [
      { header: 'Date pose',      dataKey: 'date_pose' },
      { header: 'Date retrait',   dataKey: 'date_retrait' },
      { header: 'Piégeur',        dataKey: 'piegeur' },
      { header: 'Type piège',     dataKey: 'type' },
      { header: 'Appât',          dataKey: 'appat' },
      { header: 'Lieu',           dataKey: 'lieu' },
      { header: 'Localisation',   dataKey: 'loc' },
      { header: 'Espèce',         dataKey: 'espece' },
      { header: 'Qté',            dataKey: 'qte' },
      { header: 'Statut',         dataKey: 'statut' },
    ]

    type Row = Record<string, string>
    const rows: Row[] = []
    pieges.forEach(p => {
      const baseRow = {
        date_pose:    fmt(p.date_pose),
        date_retrait: p.date_retrait ? fmt(p.date_retrait) : '—',
        piegeur:      p.saisi_par_email?.split('@')[0] ?? '—',
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
      columns: cols,
      body: rows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        overflow: 'linebreak',
        font: 'helvetica',
      },
      headStyles: {
        fillColor: DARK,
        textColor: WHITE,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: {
        qte:          { halign: 'center', cellWidth: 10 },
        statut:       { halign: 'center', cellWidth: 20 },
        type:         { cellWidth: 28 },
        espece:       { cellWidth: 24 },
        date_pose:    { cellWidth: 18 },
        date_retrait: { cellWidth: 18 },
        piegeur:      { cellWidth: 22 },
      },
      didParseCell: (data: any) => {
        if (data.column.dataKey === 'statut' && data.section === 'body') {
          data.cell.styles.textColor = data.cell.raw === 'RETIRÉ' ? [5, 150, 105] : [217, 119, 6]
          data.cell.styles.fontStyle = 'bold'
        }
        if (data.column.dataKey === 'espece' && data.section === 'body') {
          const colors: Record<string, number[]> = {
            'Asiatique': [217, 119, 6],
            'Européen':  [37, 99, 235],
            'Guêpes':    [124, 58, 237],
          }
          const c = colors[data.cell.raw as string]
          if (c) { data.cell.styles.textColor = c; data.cell.styles.fontStyle = 'bold' }
        }
      },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 8

    // ── RÉCAPITULATIF ──────────────────────────────────────
    const totalPieges  = pieges.length
    const enPlace      = pieges.filter(p => !p.date_retrait).length
    const retires      = pieges.filter(p =>  p.date_retrait).length
    const totalCaps    = pieges.reduce((s, p) => s + totalCapturesPiegeage(p), 0)
    const moyenneCaps  = totalPieges ? (totalCaps / totalPieges).toFixed(1) : '0'

    const byEspece: Record<string, number> = {}
    pieges.forEach(p => (p.captures ?? []).forEach(c => {
      byEspece[c.espece] = (byEspece[c.espece] ?? 0) + c.quantite
    }))

    // Box récap
    const boxH = 38
    const boxY = Math.min(finalY, doc.internal.pageSize.getHeight() - boxH - 12)

    doc.setFillColor(...DARK)
    doc.roundedRect(10, boxY, W - 20, boxH, 4, 4, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...AMBER as any)
    doc.text('Récapitulatif', 18, boxY + 8)

    const stats = [
      ['Total pièges',     String(totalPieges)],
      ['En place',         String(enPlace)],
      ['Retirés',          String(retires)],
      ['Total captures',   String(totalCaps)],
      ['Moy. / piège',     moyenneCaps],
    ]

    const colW = (W - 20) / stats.length
    stats.forEach(([label, val], i) => {
      const x = 10 + i * colW + colW / 2
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...MGRAY as any)
      doc.text(label, x, boxY + 18, { align: 'center' })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(...WHITE)
      doc.text(val, x, boxY + 30, { align: 'center' })
    })

    // Séparateur + captures par espèce
    const sepX = 10 + stats.length * colW
    if (Object.keys(byEspece).length > 0) {
      doc.setDrawColor(...MGRAY as any)
      doc.line(sepX + 2, boxY + 4, sepX + 2, boxY + boxH - 4)

      let espY = boxY + 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...AMBER as any)
      doc.text('Captures par espèce', sepX + 8, espY)
      espY += 5
      Object.entries(byEspece).sort((a, b) => b[1] - a[1]).forEach(([esp, cnt]) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...WHITE)
        doc.text(`${esp} : ${cnt}`, sepX + 8, espY)
        espY += 4.5
      })
    }

    // ── FOOTER ─────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...MGRAY as any)
      doc.text(`VespaRecorder v2.2 — © Olivier BERNARD 2026`, 14, doc.internal.pageSize.getHeight() - 5)
      doc.text(`Page ${i} / ${pageCount}`, W - 14, doc.internal.pageSize.getHeight() - 5, { align: 'right' })
    }

    const filename = `VespaRecorder_Pieges_${dateDebut}_${dateFin}${piegeur !== 'tous' ? '_' + piegeur.split('@')[0] : ''}.pdf`
    doc.save(filename)
    setGenerating(false)
  }

  // Helpers
  const fmt = (d: string) => {
    if (!d) return '—'
    const [y, m, j] = d.split('-')
    return `${j}/${m}/${y}`
  }
  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s

  if (!isAdmin) return null

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate('/profil')} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="flex-1 text-lg font-semibold">Rapport pièges PDF</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-24">

        {/* Formulaire filtres */}
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-5 space-y-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Paramètres du rapport</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Date début <span className="text-amber-500">*</span></label>
              <input type="date" value={dateDebut} onChange={e => { setDateDebut(e.target.value); setPreview(null) }}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-400">Date fin <span className="text-amber-500">*</span></label>
              <input type="date" value={dateFin} onChange={e => { setDateFin(e.target.value); setPreview(null) }}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-400">Piégeur</label>
            <select value={piegeur} onChange={e => { setPiegeur(e.target.value); setPreview(null) }}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 appearance-none">
              <option value="tous">Tous les piégeurs</option>
              {utilisateurs.map(u => (
                <option key={u.id} value={u.email}>{u.email}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-400">Statut des pièges</label>
            <select value={statut} onChange={e => { setStatut(e.target.value as 'tous' | 'actif' | 'retire'); setPreview(null) }}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 appearance-none">
              <option value="tous">Tous les statuts</option>
              <option value="actif">En place uniquement</option>
              <option value="retire">Retirés uniquement</option>
            </select>
          </div>

          <Btn variant="secondary" fullWidth onClick={handlePreview} loading={loadingPreview}>
            👁 Aperçu des données
          </Btn>
        </div>

        {/* Aperçu résultats */}
        {preview !== null && (
          <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{preview.length} piégeage{preview.length > 1 ? 's' : ''} trouvé{preview.length > 1 ? 's' : ''}</p>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${preview.length > 0 ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                {preview.length > 0 ? '✓ Prêt' : '✗ Vide'}
              </span>
            </div>

            {preview.length > 0 && (() => {
              const totalCaps = preview.reduce((s, p) => s + totalCapturesPiegeage(p), 0)
              const enPlace   = preview.filter(p => !p.date_retrait).length
              const retires   = preview.filter(p =>  p.date_retrait).length
              return (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-900/60 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">En place</p>
                      <p className="text-xl font-bold text-amber-400">{enPlace}</p>
                    </div>
                    <div className="bg-gray-900/60 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Retirés</p>
                      <p className="text-xl font-bold text-green-400">{retires}</p>
                    </div>
                    <div className="bg-gray-900/60 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">Captures</p>
                      <p className="text-xl font-bold text-blue-400">{totalCaps}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Aperçu (5 premières lignes)</p>
                    {preview.slice(0, 5).map(p => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{p.type_piege} — {p.emplacement ?? '—'}</p>
                          <p className="text-xs text-gray-500">
                            {fmt(p.date_pose)} · {totalCapturesPiegeage(p)} capture(s)
                          </p>
                        </div>
                        <span className={`flex-shrink-0 text-xs font-medium ml-3 ${p.date_retrait ? 'text-green-400' : 'text-amber-400'}`}>
                          {p.date_retrait ? 'Retiré' : 'En place'}
                        </span>
                      </div>
                    ))}
                    {preview.length > 5 && (
                      <p className="text-xs text-gray-600 text-center">+ {preview.length - 5} autres lignes dans le PDF</p>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* Bouton générer */}
        {preview !== null && preview.length > 0 && (
          <Btn fullWidth size="lg" onClick={handleGenerate} loading={generating}>
            {generating ? 'Génération en cours…' : '⬇️  Télécharger le rapport PDF'}
          </Btn>
        )}

        {/* Info format */}
        <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Format du rapport</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            {[
              ['Format', 'A4 paysage'],
              ['Colonnes', '10 (date pose, retrait, piégeur, type…)'],
              ['Captures', 'Une ligne par espèce'],
              ['Récapitulatif', 'En bas du document'],
            ].map(([k, v]) => (
              <div key={k}>
                <span className="text-gray-600">{k} : </span>{v}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
