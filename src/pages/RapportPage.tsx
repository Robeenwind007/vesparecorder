import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { supabase } from '../lib/supabase'
import type { Observation, Utilisateur } from '../types'
import { Btn, Spinner } from '../components/UI'

export default function RapportPage() {
  const { isAdmin } = useUser()
  const navigate    = useNavigate()

  const [dateDebut, setDateDebut]   = useState(() => {
    const d = new Date(); d.setMonth(0); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateFin, setDateFin]       = useState(() => new Date().toISOString().split('T')[0])
  const [piegeur, setPiegeur]       = useState('tous')
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview]       = useState<Observation[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    supabase.from('utilisateurs').select('*').eq('actif', true).order('email')
      .then(({ data }) => setUtilisateurs(data ?? []))
  }, [isAdmin, navigate])

  const fetchObs = async (): Promise<Observation[]> => {
    let q = supabase
      .from('observations')
      .select('*')
      .gte('date_observation', dateDebut)
      .lte('date_observation', dateFin)
      .order('date_observation', { ascending: true })
    if (piegeur !== 'tous') q = q.eq('saisi_par_email', piegeur)
    const { data } = await q
    return data ?? []
  }

  const handlePreview = async () => {
    setLoadingPreview(true)
    const data = await fetchObs()
    setPreview(data)
    setLoadingPreview(false)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    const obs = preview ?? await fetchObs()

    // Charger jsPDF dynamiquement
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
    doc.text('VespaRecorder — Rapport d\'interventions', W / 2, 17, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Période : ${fmt(dateDebut)} au ${fmt(dateFin)}   •   Piégeur : ${piegeur === 'tous' ? 'Tous' : piegeur}   •   Généré le ${fmt(new Date().toISOString().split('T')[0])}`, W / 2, 25, { align: 'center' })

    // ── TABLEAU ────────────────────────────────────────────
    const cols = [
      { header: 'Date',        dataKey: 'date' },
      { header: 'Piégeur',     dataKey: 'piegeur' },
      { header: 'Donneur',     dataKey: 'donneur' },
      { header: 'Bénéficiaire',dataKey: 'benef' },
      { header: 'Espèce',      dataKey: 'espece' },
      { header: 'Type nid',    dataKey: 'type' },
      { header: 'Nids',        dataKey: 'nb' },
      { header: 'Emplacement', dataKey: 'emplacement' },
      { header: 'Localisation',dataKey: 'loc' },
      { header: 'Retiré',      dataKey: 'retire' },
    ]

    const rows = obs.map(o => ({
      date:        fmt(o.date_observation),
      piegeur:     o.saisi_par_email?.split('@')[0] ?? '—',
      donneur:     o.donneur_ordre ?? '—',
      benef:       o.beneficiaire ?? '—',
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
    }))

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
        nb:     { halign: 'center', cellWidth: 10 },
        retire: { halign: 'center', cellWidth: 14 },
        type:   { cellWidth: 18 },
        espece: { cellWidth: 22 },
        date:   { cellWidth: 18 },
        piegeur:{ cellWidth: 24 },
      },
      didParseCell: (data: any) => {
        if (data.column.dataKey === 'retire' && data.section === 'body') {
          data.cell.styles.textColor = data.cell.raw === 'OUI' ? [5, 150, 105] : [220, 38, 38]
          data.cell.styles.fontStyle = 'bold'
        }
        if (data.column.dataKey === 'espece' && data.section === 'body') {
          const colors: Record<string, number[]> = {
            'Asiatique': [217, 119, 6],
            'Européen':  [37, 99, 235],
            'Guêpes':    [124, 58, 237],
          }
          const c = colors[data.cell.raw]
          if (c) { data.cell.styles.textColor = c; data.cell.styles.fontStyle = 'bold' }
        }
      },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 8

    // ── RÉCAPITULATIF ──────────────────────────────────────
    const total     = obs.length
    const retires   = obs.filter(o => o.retire).length
    const laisses   = total - retires
    const primaires = obs.filter(o => o.type_nid === 'Primaire').length
    const secondaires = obs.filter(o => o.type_nid === 'Secondaire').length
    const tauxTraitement = total ? Math.round((retires / total) * 100) : 0

    const byEspece = obs.reduce<Record<string, number>>((a, o) => {
      a[o.espece] = (a[o.espece] ?? 0) + 1; return a
    }, {})

    // Box récap
    const boxH = 38
    const boxY = Math.min(finalY, doc.internal.pageSize.getHeight() - boxH - 12)

    doc.setFillColor(...DARK)
    doc.roundedRect(10, boxY, W - 20, boxH, 4, 4, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...AMBER as any)
    doc.text('Récapitulatif', 18, boxY + 8)

    // Stats en colonnes
    const stats = [
      ['Total interventions', String(total)],
      ['Nids retirés', `${retires} (${tauxTraitement}%)`],
      ['Nids laissés', String(laisses)],
      ['Nids primaires', String(primaires)],
      ['Nids secondaires', String(secondaires)],
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

    // Séparateur + espèces
    const sepX = 10 + stats.length * colW
    if (Object.keys(byEspece).length > 0) {
      doc.setDrawColor(...MGRAY as any)
      doc.line(sepX + 2, boxY + 4, sepX + 2, boxY + boxH - 4)

      let espY = boxY + 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...AMBER as any)
      doc.text('Par espèce', sepX + 8, espY)
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
      doc.text(`VespaRecorder v2.0 — © Olivier BERNARD 2026`, 14, doc.internal.pageSize.getHeight() - 5)
      doc.text(`Page ${i} / ${pageCount}`, W - 14, doc.internal.pageSize.getHeight() - 5, { align: 'right' })
    }

    const filename = `VespaRecorder_Rapport_${dateDebut}_${dateFin}${piegeur !== 'tous' ? '_' + piegeur.split('@')[0] : ''}.pdf`
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
        <h2 className="flex-1 text-lg font-semibold">Rapport PDF</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-24">

        {/* Formulaire filtres */}
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-5 space-y-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Paramètres du rapport</p>

          {/* Dates */}
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

          {/* Piégeur */}
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

          {/* Aperçu */}
          <Btn variant="secondary" fullWidth onClick={handlePreview} loading={loadingPreview}>
            👁 Aperçu des données
          </Btn>
        </div>

        {/* Aperçu résultats */}
        {preview !== null && (
          <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{preview.length} observation{preview.length > 1 ? 's' : ''} trouvée{preview.length > 1 ? 's' : ''}</p>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${preview.length > 0 ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                {preview.length > 0 ? '✓ Prêt' : '✗ Vide'}
              </span>
            </div>

            {preview.length > 0 && (
              <>
                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Retirés', preview.filter(o => o.retire).length, 'text-green-400'],
                    ['Laissés', preview.filter(o => !o.retire).length, 'text-red-400'],
                    ['Taux', `${preview.length ? Math.round((preview.filter(o=>o.retire).length/preview.length)*100) : 0}%`, 'text-amber-400'],
                  ].map(([label, val, color]) => (
                    <div key={label as string} className="bg-gray-900/60 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className={`text-xl font-bold ${color}`}>{val}</p>
                    </div>
                  ))}
                </div>

                {/* Aperçu des 5 premières lignes */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Aperçu (5 premières lignes)</p>
                  {preview.slice(0, 5).map(o => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{o.donneur_ordre ?? '—'} — {o.beneficiaire ?? '—'}</p>
                        <p className="text-xs text-gray-500">{fmt(o.date_observation)} · {o.espece} · {o.type_nid ?? '—'}</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-medium ml-3 ${o.retire ? 'text-green-400' : 'text-red-400'}`}>
                        {o.retire ? 'Retiré' : 'Laissé'}
                      </span>
                    </div>
                  ))}
                  {preview.length > 5 && (
                    <p className="text-xs text-gray-600 text-center">+ {preview.length - 5} autres lignes dans le PDF</p>
                  )}
                </div>
              </>
            )}
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
              ['Colonnes', '10 (date, piégeur, donneur…)'],
              ['Récapitulatif', 'En bas de dernière page'],
              ['Couleurs', 'Espèces + statuts colorés'],
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
