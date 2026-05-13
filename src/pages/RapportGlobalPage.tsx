// ============================================================
// RapportGlobalPage — Édition combinée traitements + piégeages
// avec presets de période
// ============================================================
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { supabase } from '../lib/supabase'
import type { Observation } from '../types'
import type { Piegeage, Capture } from '../types/piegeage'
import { Btn, Spinner } from '../components/UI'

// ── Helpers de bornes de période ────────────────────────────
type PeriodePreset = 'libre' | 'semaine' | 'mois' | 'mois-prec' | 'trimestre' | 'annee' | 'annee-prec'

const toISO = (d: Date) => d.toISOString().split('T')[0]

function bornesPreset(p: PeriodePreset): { debut: string, fin: string } {
  const now = new Date()
  let debut = new Date(now), fin = new Date(now)
  switch (p) {
    case 'semaine': {
      // Du lundi au dimanche de la semaine en cours
      const jour = now.getDay() // 0 = dim, 1 = lun, ..., 6 = sam
      const lundiOffset = jour === 0 ? -6 : 1 - jour
      debut = new Date(now); debut.setDate(now.getDate() + lundiOffset)
      fin   = new Date(debut); fin.setDate(debut.getDate() + 6)
      break
    }
    case 'mois': {
      debut = new Date(now.getFullYear(), now.getMonth(), 1)
      fin   = new Date(now.getFullYear(), now.getMonth() + 1, 0) // dernier jour du mois
      break
    }
    case 'mois-prec': {
      debut = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      fin   = new Date(now.getFullYear(), now.getMonth(),     0)
      break
    }
    case 'trimestre': {
      const t = Math.floor(now.getMonth() / 3)
      debut = new Date(now.getFullYear(), t * 3, 1)
      fin   = new Date(now.getFullYear(), t * 3 + 3, 0)
      break
    }
    case 'annee': {
      debut = new Date(now.getFullYear(), 0, 1)
      fin   = new Date(now)
      break
    }
    case 'annee-prec': {
      debut = new Date(now.getFullYear() - 1, 0, 1)
      fin   = new Date(now.getFullYear() - 1, 11, 31)
      break
    }
    default:
      // libre : on garde la valeur actuelle, défaut = depuis début d'année
      debut = new Date(now.getFullYear(), 0, 1)
      fin   = new Date(now)
  }
  return { debut: toISO(debut), fin: toISO(fin) }
}

const fmtDate = (s: string | null | undefined): string => {
  if (!s) return '—'
  const [y, m, d] = s.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s

// ── Composant ────────────────────────────────────────────────
export default function RapportGlobalPage() {
  const { isAdmin } = useUser()
  const navigate    = useNavigate()

  const [preset, setPreset]       = useState<PeriodePreset>('mois')
  const initial = bornesPreset('mois')
  const [dateDebut, setDateDebut] = useState(initial.debut)
  const [dateFin, setDateFin]     = useState(initial.fin)

  const [generating, setGenerating] = useState(false)
  const [previewObs, setPreviewObs]           = useState<Observation[] | null>(null)
  const [previewPiegeages, setPreviewPiegeages] = useState<Piegeage[] | null>(null)
  const [previewCaptures, setPreviewCaptures]   = useState<Capture[] | null>(null)
  const [loadingPreview, setLoadingPreview]     = useState(false)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
  }, [isAdmin, navigate])

  const handlePresetChange = (p: PeriodePreset) => {
    setPreset(p)
    if (p !== 'libre') {
      const { debut, fin } = bornesPreset(p)
      setDateDebut(debut)
      setDateFin(fin)
    }
    // Reset preview pour cohérence
    setPreviewObs(null)
    setPreviewPiegeages(null)
    setPreviewCaptures(null)
  }

  // Quand on modifie manuellement les dates, on passe en mode libre
  const handleDateChange = (which: 'debut' | 'fin', value: string) => {
    if (which === 'debut') setDateDebut(value)
    else                   setDateFin(value)
    setPreset('libre')
    setPreviewObs(null)
    setPreviewPiegeages(null)
    setPreviewCaptures(null)
  }

  // ── Fetch ────────────────────────────────────────────────
  const fetchData = async () => {
    // Observations : filtre sur date_observation
    const { data: obs } = await supabase
      .from('observations')
      .select('*')
      .gte('date_observation', dateDebut)
      .lte('date_observation', dateFin)
      .order('date_observation', { ascending: true })

    // Piégeages :
    // - Si date_retrait NULL : on inclut si date_pose <= dateFin (le piège est en cours pendant la période)
    // - Si date_retrait NOT NULL : on inclut si date_retrait dans [dateDebut, dateFin]
    // On fait 2 requêtes pour ne pas avoir une formule OR trop complexe.
    const { data: piegRelevesTab } = await supabase
      .from('piegeages')
      .select('*')
      .not('date_retrait', 'is', null)
      .gte('date_retrait', dateDebut)
      .lte('date_retrait', dateFin)
      .order('date_retrait', { ascending: true })

    const { data: piegEnCoursTab } = await supabase
      .from('piegeages')
      .select('*')
      .is('date_retrait', null)
      .lte('date_pose', dateFin) // posé avant la fin de la période → encore en cours pendant
      .order('date_pose', { ascending: true })

    const piegRelevesArr = (piegRelevesTab ?? []) as Piegeage[]
    const piegEnCoursArr = (piegEnCoursTab ?? []) as Piegeage[]
    const piegeagesAll = [...piegRelevesArr, ...piegEnCoursArr]

    // Captures : on récupère celles liées aux piégeages affichés
    const ids = piegeagesAll.map(p => p.id)
    let captures: Capture[] = []
    if (ids.length > 0) {
      const { data: capt } = await supabase
        .from('piegeages_captures')
        .select('*')
        .in('piegeage_id', ids)
      captures = (capt ?? []) as Capture[]
    }

    return { obs: (obs ?? []) as Observation[], piegeages: piegeagesAll, captures }
  }

  const handlePreview = async () => {
    setLoadingPreview(true)
    const { obs, piegeages, captures } = await fetchData()
    setPreviewObs(obs)
    setPreviewPiegeages(piegeages)
    setPreviewCaptures(captures)
    setLoadingPreview(false)
  }

  // Map piegeage_id → quantité totale capturée
  const capturesByPiegeage = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of (previewCaptures ?? [])) {
      m.set(c.piegeage_id, (m.get(c.piegeage_id) ?? 0) + c.quantite)
    }
    return m
  }, [previewCaptures])

  // ── Génération PDF ────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true)
    let { obs, piegeages, captures } = previewObs && previewPiegeages
      ? { obs: previewObs, piegeages: previewPiegeages, captures: previewCaptures ?? [] }
      : await fetchData()

    const captByPieg = new Map<string, number>()
    for (const c of captures) captByPieg.set(c.piegeage_id, (captByPieg.get(c.piegeage_id) ?? 0) + c.quantite)

    // jsPDF dynamique
    const { jsPDF } = await import('https://esm.sh/jspdf@2.5.1' as string) as any
    const { default: autoTable } = await import('https://esm.sh/jspdf-autotable@3.8.2' as string) as any
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()

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
    doc.text('VespaRecorder — Rapport global', W / 2, 17, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(
      `Période : ${fmtDate(dateDebut)} au ${fmtDate(dateFin)}   •   Généré le ${fmtDate(toISO(new Date()))}`,
      W / 2, 25, { align: 'center' }
    )

    // ── SECTION 1 : Interventions (traitements) ───────────
    let curY = 36
    doc.setFillColor(...AMBER as any)
    doc.roundedRect(10, curY, W - 20, 8, 2, 2, 'F')
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Interventions (traitements) — ${obs.length} entrée(s)`, 14, curY + 5.5)
    curY += 10

    if (obs.length > 0) {
      autoTable(doc, {
        startY: curY,
        columns: [
          { header: 'Date',        dataKey: 'date' },
          { header: 'Piégeur',     dataKey: 'piegeur' },
          { header: 'Donneur',     dataKey: 'donneur' },
          { header: 'Espèce',      dataKey: 'espece' },
          { header: 'Type nid',    dataKey: 'type' },
          { header: 'Nids',        dataKey: 'nb' },
          { header: 'Emplacement', dataKey: 'emplacement' },
          { header: 'Localisation',dataKey: 'loc' },
          { header: 'Retiré',      dataKey: 'retire' },
        ],
        body: obs.map(o => ({
          date:        fmtDate(o.date_observation),
          piegeur:     o.saisi_par_email?.split('@')[0] ?? '—',
          donneur:     o.donneur_ordre ?? '—',
          espece:      o.espece,
          type:        o.type_nid ?? '—',
          nb:          String(o.nombre_nids),
          emplacement: o.emplacement ?? '—',
          loc:         o.adresse
                        ? truncate(o.adresse, 28)
                        : o.latitude
                          ? `${o.latitude.toFixed(4)}, ${o.longitude?.toFixed(4)}`
                          : '—',
          retire:      o.retire ? 'OUI' : 'NON',
        })),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', font: 'helvetica' },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: LGRAY },
        columnStyles: {
          nb:     { halign: 'center', cellWidth: 10 },
          retire: { halign: 'center', cellWidth: 14 },
        },
        didParseCell: (data: any) => {
          if (data.column.dataKey === 'retire' && data.section === 'body') {
            data.cell.styles.textColor = data.cell.raw === 'OUI' ? [5, 150, 105] : [220, 38, 38]
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })
      curY = (doc as any).lastAutoTable.finalY + 10
    } else {
      doc.setTextColor(...MGRAY as any)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.text('Aucune intervention sur cette période.', 14, curY + 4)
      curY += 12
    }

    // ── SECTION 2 : Piégeages ─────────────────────────────
    // Nouvelle page si pas assez de place
    const pageH = doc.internal.pageSize.getHeight()
    if (curY > pageH - 60) {
      doc.addPage()
      curY = 14
    }

    doc.setFillColor(...AMBER as any)
    doc.roundedRect(10, curY, W - 20, 8, 2, 2, 'F')
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Piégeages — ${piegeages.length} entrée(s)`, 14, curY + 5.5)
    curY += 10

    if (piegeages.length > 0) {
      autoTable(doc, {
        startY: curY,
        columns: [
          { header: 'Date pose',    dataKey: 'pose' },
          { header: 'Date relevé',  dataKey: 'releve' },
          { header: 'Piégeur',      dataKey: 'piegeur' },
          { header: 'Type piège',   dataKey: 'type' },
          { header: 'Appât',        dataKey: 'appat' },
          { header: 'Emplacement',  dataKey: 'emplacement' },
          { header: 'Localisation', dataKey: 'loc' },
          { header: 'Captures',     dataKey: 'capt' },
        ],
        body: piegeages.map(p => ({
          pose:        fmtDate(p.date_pose),
          releve:      p.date_retrait ? fmtDate(p.date_retrait) : 'En cours',
          piegeur:     p.saisi_par_email?.split('@')[0] ?? '—',
          type:        p.type_piege,
          appat:       p.appat ?? '—',
          emplacement: p.emplacement ?? '—',
          loc:         p.adresse
                        ? truncate(p.adresse, 28)
                        : p.latitude
                          ? `${p.latitude.toFixed(4)}, ${p.longitude?.toFixed(4)}`
                          : '—',
          capt:        String(captByPieg.get(p.id) ?? 0),
        })),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak', font: 'helvetica' },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: LGRAY },
        columnStyles: {
          capt: { halign: 'center', cellWidth: 14 },
        },
        didParseCell: (data: any) => {
          if (data.column.dataKey === 'releve' && data.section === 'body' && data.cell.raw === 'En cours') {
            data.cell.styles.textColor = [217, 119, 6]
            data.cell.styles.fontStyle = 'italic'
          }
        },
      })
      curY = (doc as any).lastAutoTable.finalY + 10
    } else {
      doc.setTextColor(...MGRAY as any)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.text('Aucun piégeage sur cette période.', 14, curY + 4)
      curY += 12
    }

    // ── RÉCAPITULATIF ──────────────────────────────────────
    if (curY > pageH - 50) { doc.addPage(); curY = 14 }

    const totalObs    = obs.length
    const retires     = obs.filter(o => o.retire).length
    const tauxRetire  = totalObs ? Math.round((retires / totalObs) * 100) : 0
    const totalPieg   = piegeages.length
    const pieEnCours  = piegeages.filter(p => !p.date_retrait).length
    const pieReleves  = totalPieg - pieEnCours
    const totalCapt   = Array.from(captByPieg.values()).reduce((a, b) => a + b, 0)

    const boxH = 38
    doc.setFillColor(...DARK)
    doc.roundedRect(10, curY, W - 20, boxH, 4, 4, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...AMBER as any)
    doc.text('Récapitulatif', 18, curY + 8)

    const stats = [
      ['Interventions',  String(totalObs)],
      ['Nids retirés',   `${retires} (${tauxRetire}%)`],
      ['Piégeages',      String(totalPieg)],
      ['Pièges relevés', String(pieReleves)],
      ['Pièges en cours',String(pieEnCours)],
      ['Captures total', String(totalCapt)],
    ]
    const colW = (W - 20) / stats.length
    stats.forEach(([label, val], i) => {
      const x = 10 + i * colW + colW / 2
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...MGRAY as any)
      doc.text(label, x, curY + 18, { align: 'center' })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(...WHITE)
      doc.text(val, x, curY + 30, { align: 'center' })
    })

    // ── FOOTER ─────────────────────────────────────────────
    const pages = doc.internal.pages.length - 1
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...MGRAY as any)
      doc.text(`VespaRecorder · www.vesparecorder.fr · Page ${i}/${pages}`, W / 2, pageH - 5, { align: 'center' })
    }

    // ── SAVE ───────────────────────────────────────────────
    const filename = `vesparecorder-rapport-global_${dateDebut}_${dateFin}.pdf`
    doc.save(filename)
    setGenerating(false)
  }

  // ── UI ────────────────────────────────────────────────────
  const presets: { value: PeriodePreset; label: string }[] = [
    { value: 'semaine',    label: 'Cette semaine' },
    { value: 'mois',       label: 'Ce mois' },
    { value: 'mois-prec',  label: 'Mois précédent' },
    { value: 'trimestre',  label: 'Ce trimestre' },
    { value: 'annee',      label: 'Depuis le début de l\'année' },
    { value: 'annee-prec', label: 'Année précédente' },
    { value: 'libre',      label: 'Dates personnalisées' },
  ]

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="text-lg font-semibold flex-1">Rapport global</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* Sélecteur de période */}
        <div className="space-y-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide font-medium px-1">Période</label>
          <div className="grid grid-cols-2 gap-2">
            {presets.map(p => (
              <button key={p.value}
                onClick={() => handlePresetChange(p.value)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  preset === p.value
                    ? 'bg-amber-500 border-amber-500 text-black'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block px-1">Du</label>
            <input type="date" value={dateDebut}
              onChange={e => handleDateChange('debut', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block px-1">Au</label>
            <input type="date" value={dateFin}
              onChange={e => handleDateChange('fin', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={handlePreview} loading={loadingPreview} className="flex-1">
            Aperçu
          </Btn>
          <Btn onClick={handleGenerate} loading={generating} className="flex-1">
            📄 Générer le PDF
          </Btn>
        </div>

        {/* Preview rapide */}
        {previewObs !== null && previewPiegeages !== null && (
          <div className="space-y-3">
            <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-4 space-y-1.5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Aperçu</p>
              <p className="text-sm text-white">
                <span className="text-amber-400 font-semibold">{previewObs.length}</span> intervention(s)
              </p>
              <p className="text-sm text-white">
                <span className="text-amber-400 font-semibold">{previewPiegeages.length}</span> piégeage(s)
                {previewPiegeages.filter(p => !p.date_retrait).length > 0 && (
                  <span className="text-xs text-gray-500"> · {previewPiegeages.filter(p => !p.date_retrait).length} en cours</span>
                )}
              </p>
              <p className="text-sm text-white">
                <span className="text-amber-400 font-semibold">{Array.from(capturesByPiegeage.values()).reduce((a, b) => a + b, 0)}</span> capture(s) totales
              </p>
            </div>
          </div>
        )}

        {loadingPreview && (
          <div className="flex justify-center py-4"><Spinner size={24} /></div>
        )}
      </div>
    </div>
  )
}
