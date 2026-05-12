import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { supabase } from '../lib/supabase'
import { Btn, Card, Spinner } from '../components/UI'

// Tables sauvegardées dans l'ordre d'import (parents avant enfants)
// L'ordre inverse est utilisé pour la suppression en mode total.
const TABLES = [
  'utilisateurs',         // pas de dépendance
  'especes',              // paramétrage métier indépendant
  'faq_items',            // paramétrage indépendant
  'donneurs_ordre',       // référence utilisateurs (created_by_email)
  'types_pieges',         // paramétrage indépendant
  'appats',               // paramétrage indépendant
  'observations',         // référence utilisateurs + donneurs + especes
  'piegeages',            // référence utilisateurs + types_pieges
  'piegeages_captures',   // référence piegeages → en dernier
] as const

type TableName = typeof TABLES[number]

interface Backup {
  version: string
  generated_at: string
  generated_by: string
  app_version: string
  tables: Record<TableName, unknown[]>
}

export default function AdminSauvegardePage() {
  const { isAdmin, user } = useUser()
  const navigate         = useNavigate()
  const fileRef          = useRef<HTMLInputElement>(null)

  const [counts, setCounts]     = useState<Partial<Record<TableName, number>>>({})
  const [loadingCounts, setLoadingCounts] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importLog, setImportLog] = useState<string[]>([])
  const [pendingFile, setPendingFile] = useState<{ name: string; data: Backup } | null>(null)
  const [eraseFirst, setEraseFirst] = useState(false)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    loadCounts()
  }, [isAdmin, navigate])

  const loadCounts = async () => {
    setLoadingCounts(true)
    const result: Partial<Record<TableName, number>> = {}
    for (const t of TABLES) {
      const { count } = await supabase.from(t).select('*', { count: 'exact', head: true })
      result[t] = count ?? 0
    }
    setCounts(result)
    setLoadingCounts(false)
  }

  // ── Export ─────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true)
    try {
      const tables = {} as Record<TableName, unknown[]>
      for (const t of TABLES) {
        const { data, error } = await supabase.from(t).select('*')
        if (error) throw error
        tables[t] = data ?? []
      }

      const backup: Backup = {
        version: '1.0',
        generated_at: new Date().toISOString(),
        generated_by: user?.email ?? 'unknown',
        app_version: __APP_VERSION__,
        tables,
      }

      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const date = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `vesparecorder-backup-${date}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Erreur lors de l\'export : ' + (e as Error).message)
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  // ── Import — Étape 1 : charger le fichier ─────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const data = JSON.parse(text) as Backup

        // Validation basique
        if (!data.tables || typeof data.tables !== 'object') {
          throw new Error('Format invalide : champ "tables" manquant')
        }
        // On accepte les sauvegardes anciennes (tables manquantes) : elles seront juste
        // ignorées à l'import. On normalise en remplissant à vide.
        for (const t of TABLES) {
          if (!(t in data.tables)) {
            (data.tables as Record<string, unknown[]>)[t] = []
          }
        }
        setPendingFile({ name: file.name, data })
      } catch (err) {
        alert('Fichier invalide : ' + (err as Error).message)
        if (fileRef.current) fileRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  // ── Import — Étape 2 : restauration ───────────────────────
  const handleRestore = async () => {
    if (!pendingFile) return
    const tables = pendingFile.data.tables

    const totalRows = Object.values(tables).reduce((s, arr) => s + (arr as unknown[]).length, 0)
    const confirmation = eraseFirst
      ? `⚠️ MODE TOTAL\n\nToutes les données existantes seront SUPPRIMÉES, puis ${totalRows} lignes seront importées.\n\nEs-tu absolument sûr ?`
      : `Mode additif : ${totalRows} lignes seront ajoutées (les doublons seront ignorés).\n\nContinuer ?`

    if (!confirm(confirmation)) return

    if (eraseFirst) {
      const second = prompt('Pour confirmer la SUPPRESSION TOTALE, tape EFFACER en majuscules :')
      if (second !== 'EFFACER') {
        alert('Annulé.')
        return
      }
    }

    setImporting(true)
    setImportLog([])
    const log = (msg: string) => setImportLog(prev => [...prev, msg])

    try {
      // Mode total : on supprime d'abord (dans l'ordre INVERSE des dépendances)
      if (eraseFirst) {
        log('🗑  Suppression des données existantes…')
        const reverseTables = [...TABLES].reverse()
        for (const t of reverseTables) {
          const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
          if (error) {
            log(`   ⚠️  ${t} : ${error.message}`)
          } else {
            log(`   ✓ ${t}`)
          }
        }
      }

      // Import : ordre normal (parents d'abord)
      log('📥 Import des données…')
      for (const t of TABLES) {
        const rows = tables[t] as Record<string, unknown>[]
        if (rows.length === 0) {
          log(`   – ${t} : 0 ligne`)
          continue
        }

        // upsert pour gérer les doublons par id
        const { error } = await supabase.from(t).upsert(rows, { onConflict: 'id' })
        if (error) {
          log(`   ⚠️  ${t} : ${error.message}`)
        } else {
          log(`   ✓ ${t} : ${rows.length} ligne${rows.length > 1 ? 's' : ''}`)
        }
      }

      log('✅ Restauration terminée.')
      await loadCounts()
      setPendingFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      log(`❌ Erreur fatale : ${(e as Error).message}`)
      console.error(e)
    } finally {
      setImporting(false)
    }
  }

  if (!isAdmin) return null

  const totalRows = Object.values(counts).reduce((s: number, n) => s + (n ?? 0), 0)
  const totalRowsBackup = pendingFile
    ? Object.values(pendingFile.data.tables).reduce((s, arr) => s + (arr as unknown[]).length, 0)
    : 0

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate('/profil')} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="text-lg font-semibold flex-1">Sauvegarde / Restauration</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-24">

        {/* État actuel */}
        <Card>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">État actuel de la base</p>
          {loadingCounts ? (
            <div className="flex justify-center py-4"><Spinner size={20} /></div>
          ) : (
            <div className="space-y-1.5">
              {TABLES.map(t => (
                <div key={t} className="flex justify-between text-sm">
                  <span className="text-gray-400">{t}</span>
                  <span className="text-white font-medium tabular-nums">{counts[t] ?? 0}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-700/50 flex justify-between text-sm font-semibold">
                <span className="text-gray-300">Total</span>
                <span className="text-amber-400 tabular-nums">{totalRows}</span>
              </div>
            </div>
          )}
        </Card>

        {/* SAUVEGARDE */}
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/50 flex items-center gap-2">
            <span className="text-lg">💾</span>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Sauvegarde complète</p>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-300">
              Télécharge un fichier JSON contenant <strong>toutes les données</strong> de l'application.
            </p>
            <p className="text-xs text-gray-500">
              ⚠️ Conserve ce fichier en lieu sûr. Il contient des informations utilisateurs et toutes les observations/piégeages.
            </p>
            <Btn fullWidth onClick={handleExport} loading={exporting}>
              {exporting ? 'Export en cours…' : '⬇️  Télécharger la sauvegarde JSON'}
            </Btn>
          </div>
        </div>

        {/* RESTAURATION */}
        <div className="bg-gray-800/80 border border-red-900/30 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-red-900/30 flex items-center gap-2">
            <span className="text-lg">📥</span>
            <p className="text-xs text-red-400 uppercase tracking-wide">Restauration depuis un JSON</p>
          </div>
          <div className="p-4 space-y-4">
            {!pendingFile && (
              <>
                <p className="text-sm text-gray-300">
                  Importe un fichier de sauvegarde JSON pour restaurer les données.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Btn variant="secondary" fullWidth onClick={() => fileRef.current?.click()}>
                  📂 Choisir un fichier JSON
                </Btn>
              </>
            )}

            {pendingFile && (
              <>
                <div className="bg-gray-900/60 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs text-gray-500">Fichier sélectionné</p>
                  <p className="text-sm text-white font-medium truncate">{pendingFile.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
                    <span>📅 Généré le : {pendingFile.data.generated_at?.substring(0, 10) ?? '?'}</span>
                    <span>👤 Par : {pendingFile.data.generated_by ?? '?'}</span>
                    <span>🏷 App v{pendingFile.data.app_version ?? '?'}</span>
                  </div>
                  <p className="text-xs text-amber-400 mt-1">
                    Total à importer : <strong>{totalRowsBackup}</strong> lignes
                  </p>
                </div>

                {/* Détail des tables */}
                <div className="space-y-1 text-xs">
                  {TABLES.map(t => {
                    const n = (pendingFile.data.tables[t] as unknown[])?.length ?? 0
                    return (
                      <div key={t} className="flex justify-between text-gray-400">
                        <span>{t}</span>
                        <span className="tabular-nums">{n}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Mode */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-red-900/40 bg-red-950/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eraseFirst}
                    onChange={e => setEraseFirst(e.target.checked)}
                    className="mt-0.5 accent-red-500"
                  />
                  <div>
                    <p className="text-sm text-red-300 font-medium">Effacer les données existantes d'abord</p>
                    <p className="text-xs text-red-400/70 mt-0.5">
                      ⚠️ Mode TOTAL : toutes les données actuelles seront supprimées avant l'import. Sans cette case, les nouvelles données s'ajoutent (mode additif, doublons ignorés).
                    </p>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <Btn variant="ghost" onClick={() => {
                    setPendingFile(null)
                    setEraseFirst(false)
                    setImportLog([])
                    if (fileRef.current) fileRef.current.value = ''
                  }} className="flex-1">
                    Annuler
                  </Btn>
                  <Btn variant={eraseFirst ? 'danger' : 'primary'} onClick={handleRestore} loading={importing} className="flex-1">
                    {importing ? 'Import…' : eraseFirst ? '⚠️ Effacer + Restaurer' : '✓ Restaurer'}
                  </Btn>
                </div>
              </>
            )}

            {/* Log d'import */}
            {importLog.length > 0 && (
              <div className="bg-black/40 border border-gray-700 rounded-xl p-3 space-y-0.5 font-mono text-xs max-h-48 overflow-y-auto">
                {importLog.map((line, i) => (
                  <div key={i} className="text-gray-300 whitespace-pre-wrap">{line}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Aide */}
        <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">À savoir</p>
          <ul className="text-xs text-gray-400 space-y-1.5 list-disc pl-4">
            <li>La sauvegarde est un fichier JSON lisible (tu peux l'ouvrir avec n'importe quel éditeur de texte).</li>
            <li>Le mode <strong>additif</strong> utilise un upsert sur l'ID : les enregistrements existants avec le même ID sont mis à jour, les nouveaux sont créés.</li>
            <li>Le mode <strong>total</strong> efface tout d'abord. Recommandé uniquement pour une vraie restauration de catastrophe.</li>
            <li>Les fichiers JSON contiennent des données utilisateurs : conserve-les en lieu sûr.</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
