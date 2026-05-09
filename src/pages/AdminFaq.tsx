import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { getAllFaq, addFaq, updateFaq, deleteFaq, toggleFaqActif } from '../lib/faq'
import type { FaqItem } from '../types'
import { Btn, Input, Card, Spinner } from '../components/UI'

const CATEGORIES_DEFAUT = ['Saisie nids', 'Pieges', 'Compte', 'General']

export default function AdminFaq() {
  const { isAdmin } = useUser()
  const navigate = useNavigate()
  const [items, setItems]     = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)

  // Form ajout
  const [showAdd, setShowAdd]         = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [newReponse, setNewReponse]   = useState('')
  const [newCategorie, setNewCategorie] = useState(CATEGORIES_DEFAUT[0])
  const [saving, setSaving]           = useState(false)

  // Form édition
  const [editId, setEditId]               = useState<string | null>(null)
  const [editQuestion, setEditQuestion]   = useState('')
  const [editReponse, setEditReponse]     = useState('')
  const [editCategorie, setEditCategorie] = useState('')

  const load = () => getAllFaq().then(d => { setItems(d); setLoading(false) })

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    load()
  }, [isAdmin, navigate])

  const handleAdd = async () => {
    if (!newQuestion.trim() || !newReponse.trim()) return
    setSaving(true)
    const sameCat = items.filter(i => i.categorie === newCategorie)
    const ordre = sameCat.length === 0 ? 1 : Math.max(...sameCat.map(i => i.ordre)) + 1
    const { error } = await addFaq(newQuestion, newReponse, newCategorie, ordre)
    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      await load()
      setNewQuestion(''); setNewReponse('')
      setShowAdd(false)
    }
    setSaving(false)
  }

  const handleStartEdit = (i: FaqItem) => {
    setEditId(i.id)
    setEditQuestion(i.question)
    setEditReponse(i.reponse)
    setEditCategorie(i.categorie)
  }

  const handleSaveEdit = async () => {
    if (!editId || !editQuestion.trim() || !editReponse.trim()) return
    const { error } = await updateFaq(editId, {
      question: editQuestion.trim(),
      reponse:  editReponse.trim(),
      categorie: editCategorie,
    })
    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      await load()
      setEditId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer définitivement cette question ?')) return
    await deleteFaq(id)
    await load()
  }

  const handleToggleActif = async (id: string, actif: boolean) => {
    await toggleFaqActif(id, actif)
    setItems(d => d.map(i => i.id === id ? { ...i, actif: !actif } : i))
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  // Liste des catégories existantes (pour le select)
  const categoriesUtilisees = [...new Set([...items.map(i => i.categorie), ...CATEGORIES_DEFAUT])]

  // Group by catégorie
  const groupes = items.reduce<Record<string, FaqItem[]>>((acc, i) => {
    if (!acc[i.categorie]) acc[i.categorie] = []
    acc[i.categorie].push(i)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="text-lg font-semibold flex-1">FAQ ({items.length})</h2>
        <button onClick={() => setShowAdd(s => !s)}
          className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-black font-medium">
          {showAdd ? '✕' : '+ Ajouter'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">

        {/* Ajout */}
        {showAdd && (
          <Card>
            <p className="text-xs text-amber-500 uppercase tracking-wide font-medium mb-3">Nouvelle question</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Catégorie</label>
                <select value={newCategorie} onChange={e => setNewCategorie(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 appearance-none">
                  {categoriesUtilisees.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Question</label>
                <Input
                  placeholder="Ex: Comment saisir un nid ?"
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Réponse</label>
                <textarea
                  value={newReponse}
                  onChange={e => setNewReponse(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
                  placeholder="Réponse détaillée…"
                />
              </div>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => { setShowAdd(false); setNewQuestion(''); setNewReponse('') }} className="flex-1">
                  Annuler
                </Btn>
                <Btn onClick={handleAdd} loading={saving}
                  disabled={!newQuestion.trim() || !newReponse.trim()} className="flex-1">
                  Ajouter
                </Btn>
              </div>
            </div>
          </Card>
        )}

        {/* Items groupés par catégorie */}
        {Object.entries(groupes).map(([cat, liste]) => (
          <div key={cat} className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium pl-1">{cat}</p>
            {liste.map(i => (
              <Card key={i.id}>
                {editId === i.id ? (
                  <div className="space-y-3">
                    <select value={editCategorie} onChange={e => setEditCategorie(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                      {categoriesUtilisees.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <Input value={editQuestion} onChange={e => setEditQuestion(e.target.value)} />
                    <textarea value={editReponse} onChange={e => setEditReponse(e.target.value)}
                      rows={4}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none" />
                    <div className="flex gap-2">
                      <Btn variant="ghost" onClick={() => setEditId(null)} className="flex-1">Annuler</Btn>
                      <Btn onClick={handleSaveEdit} disabled={!editQuestion.trim()} className="flex-1">Enregistrer</Btn>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className={`text-sm font-medium ${i.actif ? 'text-white' : 'text-gray-500 line-through'}`}>
                        {i.question}
                      </p>
                      <p className={`text-xs mt-1 whitespace-pre-wrap ${i.actif ? 'text-gray-400' : 'text-gray-600'}`}>
                        {i.reponse}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleStartEdit(i)}
                        className="flex-1 text-xs py-2 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition-colors font-medium">
                        Modifier
                      </button>
                      <button onClick={() => handleToggleActif(i.id, i.actif)}
                        className={`flex-1 text-xs py-2 rounded-lg font-medium transition-colors ${
                          i.actif
                            ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50'
                            : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                        }`}>
                        {i.actif ? 'Masquer' : 'Afficher'}
                      </button>
                      <button onClick={() => handleDelete(i.id)}
                        className="flex-1 text-xs py-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors font-medium">
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ))}

        {/* Aide */}
        <div className="bg-gray-800/40 border border-gray-700/30 rounded-2xl p-4 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">À savoir</p>
          <ul className="text-xs text-gray-400 space-y-1.5 list-disc pl-4">
            <li>La FAQ est affichée en haut de la page Aide & support pour les utilisateurs.</li>
            <li>« Masquer » cache la question sans la supprimer (utile pour préparer des évolutions).</li>
            <li>L'ordre dans une catégorie suit le champ `ordre` (modifiable directement en base si besoin).</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
