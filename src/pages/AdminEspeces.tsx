import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { useEspeces } from '../hooks/useEspeces'
import { getAllEspeces, addEspece, updateEspece, toggleEspeceActif } from '../lib/especes'
import type { EspeceParam } from '../types'
import { Btn, Input, Card, Spinner } from '../components/UI'

// Palette de couleurs proposées
const PALETTE = [
  '#D97706', '#DC2626', '#2563EB', '#7C3AED', '#059669',
  '#DB2777', '#0891B2', '#65A30D', '#EA580C', '#475569',
]

export default function AdminEspeces() {
  const { isAdmin, user } = useUser()
  const { reload } = useEspeces()
  const navigate    = useNavigate()
  const [items, setItems] = useState<EspeceParam[]>([])
  const [loading, setLoading] = useState(true)

  // Form ajout
  const [showAdd, setShowAdd] = useState(false)
  const [newNom, setNewNom]       = useState('')
  const [newCouleur, setNewCouleur] = useState(PALETTE[0])
  const [saving, setSaving]       = useState(false)

  // Form édition
  const [editId, setEditId]         = useState<string | null>(null)
  const [editNom, setEditNom]       = useState('')
  const [editCouleur, setEditCouleur] = useState(PALETTE[0])

  const load = () =>
    getAllEspeces().then(d => { setItems(d); setLoading(false) })

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    load()
  }, [isAdmin, navigate])

  const handleAdd = async () => {
    const nom = newNom.trim()
    if (!nom) return
    setSaving(true)
    const ordre = items.length === 0 ? 1 : Math.max(...items.map(i => i.ordre)) + 1
    const { error } = await addEspece(nom, newCouleur, ordre, user?.email)
    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      await load()
      await reload()  // recharge le contexte global
      setNewNom('')
      setNewCouleur(PALETTE[0])
      setShowAdd(false)
    }
    setSaving(false)
  }

  const handleStartEdit = (e: EspeceParam) => {
    setEditId(e.id)
    setEditNom(e.nom)
    setEditCouleur(e.couleur)
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    const nom = editNom.trim()
    if (!nom) return
    const { error } = await updateEspece(editId, { nom, couleur: editCouleur })
    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      await load()
      await reload()
      setEditId(null)
    }
  }

  const handleToggleActif = async (id: string, actif: boolean) => {
    await toggleEspeceActif(id, actif)
    setItems(d => d.map(e => e.id === id ? { ...e, actif: !actif } : e))
    await reload()
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="text-lg font-semibold flex-1">Espèces ({items.length})</h2>
        <button onClick={() => setShowAdd(s => !s)}
          className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-black font-medium">
          {showAdd ? '✕' : '+ Ajouter'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">

        {/* Ajout d'une espèce */}
        {showAdd && (
          <Card>
            <p className="text-xs text-amber-500 uppercase tracking-wide font-medium mb-3">Nouvelle espèce</p>
            <div className="space-y-3">
              <Input
                placeholder="Nom de l'espèce"
                value={newNom}
                onChange={e => setNewNom(e.target.value)}
                autoFocus
              />
              <PaletteCouleur value={newCouleur} onChange={setNewCouleur} />
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => { setShowAdd(false); setNewNom('') }} className="flex-1">
                  Annuler
                </Btn>
                <Btn onClick={handleAdd} loading={saving} disabled={!newNom.trim()} className="flex-1">
                  Ajouter
                </Btn>
              </div>
            </div>
          </Card>
        )}

        {/* Liste des espèces */}
        {items.map(e => (
          <Card key={e.id}>
            {editId === e.id ? (
              // Mode édition
              <div className="space-y-3">
                <Input value={editNom} onChange={ev => setEditNom(ev.target.value)} autoFocus />
                <PaletteCouleur value={editCouleur} onChange={setEditCouleur} />
                <div className="flex gap-2">
                  <Btn variant="ghost" onClick={() => setEditId(null)} className="flex-1">Annuler</Btn>
                  <Btn onClick={handleSaveEdit} disabled={!editNom.trim()} className="flex-1">Enregistrer</Btn>
                </div>
              </div>
            ) : (
              // Mode affichage
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full border-2 border-white/20 flex-shrink-0"
                    style={{ backgroundColor: e.couleur }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${e.actif ? 'text-white' : 'text-gray-500 line-through'}`}>
                      {e.nom}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">{e.couleur}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleStartEdit(e)}
                    className="flex-1 text-xs py-2 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition-colors font-medium">
                    Modifier
                  </button>
                  <button onClick={() => handleToggleActif(e.id, e.actif)}
                    className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${
                      e.actif
                        ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                        : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                    }`}>
                    {e.actif ? 'Désactiver' : 'Réactiver'}
                  </button>
                </div>
              </div>
            )}
          </Card>
        ))}

        {/* Aide */}
        <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">À savoir</p>
          <ul className="text-xs text-gray-400 space-y-1.5 list-disc pl-4">
            <li>La couleur est utilisée pour les markers sur la carte et les graphiques de stats.</li>
            <li>Désactiver une espèce la masque dans les sélecteurs sans toucher aux données existantes.</li>
            <li>Les observations et captures déjà enregistrées avec une espèce désactivée restent intactes.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Palette de couleurs cliquables
// ──────────────────────────────────────────────────────────────
function PaletteCouleur({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 uppercase tracking-wide">Couleur</p>
      <div className="grid grid-cols-5 gap-2">
        {PALETTE.map(c => (
          <button key={c} type="button"
            onClick={() => onChange(c)}
            className={`aspect-square rounded-lg border-2 transition-all ${
              value === c ? 'border-white scale-110' : 'border-transparent hover:border-white/30'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={value}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-700 cursor-pointer bg-gray-800" />
        <input type="text" value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
          placeholder="#D97706"
          maxLength={7}
        />
      </div>
    </div>
  )
}
