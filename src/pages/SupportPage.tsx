import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import {
  getTickets, getTicket, createTicket, addMessage, markAsRead,
} from '../lib/support'
import { getFaq } from '../lib/faq'
import type {
  SupportTicket, SupportTicketWithMessages, FaqItem,
} from '../types'
import { Btn, Input, Card, Spinner, Empty } from '../components/UI'

export default function SupportPage() {
  const { id } = useParams()
  return id ? <Conversation ticketId={id} /> : <ListeTickets />
}

// ──────────────────────────────────────────────────────────────
// Liste des tickets + FAQ
// ──────────────────────────────────────────────────────────────
function ListeTickets() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [faq, setFaq]         = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newSujet, setNewSujet]     = useState('')
  const [newContenu, setNewContenu] = useState('')
  const [creating, setCreating]     = useState(false)
  const [showFaqInForm, setShowFaqInForm] = useState(false)

  // FAQ recherche / filtres
  const [search, setSearch]                   = useState('')
  const [activeCategory, setActiveCategory]   = useState<string>('all')
  const [openIds, setOpenIds]                 = useState<Set<string>>(new Set())

  const load = () => {
    if (!user) return
    setLoading(true)
    Promise.all([
      getTickets(user.email, false),
      getFaq(),
    ]).then(([t, f]) => { setTickets(t); setFaq(f); setLoading(false) })
  }

  useEffect(() => { load() }, [user])

  const handleCreate = async () => {
    if (!user || !newSujet.trim() || !newContenu.trim()) return
    setCreating(true)
    try {
      const ticket = await createTicket(user.email, newSujet.trim(), newContenu.trim())
      setShowNew(false)
      setNewSujet(''); setNewContenu('')
      navigate(`/support/${ticket.id}`)
    } catch (e) {
      alert('Erreur lors de la création du ticket')
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  const toggleOpen = (id: string) => {
    setOpenIds(s => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  // FAQ filtres
  const categories = [...new Set(faq.map(f => f.categorie))]
  const faqFiltree = faq.filter(f => {
    if (activeCategory !== 'all' && f.categorie !== activeCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        f.question.toLowerCase().includes(q) ||
        f.reponse.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate('/profil')} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2 className="text-lg font-semibold flex-1">Aide & support</h2>
        <button onClick={() => setShowNew(s => !s)}
          className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-black font-medium">
          {showNew ? '✕' : '+ Nouveau'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">

        {/* Formulaire nouveau ticket */}
        {showNew && (
          <Card>
            <p className="text-xs text-amber-500 uppercase tracking-wide font-medium mb-3">Nouvelle demande d'aide</p>

            {/* Encart FAQ */}
            <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-3 mb-3">
              <p className="text-xs text-blue-300 mb-2">
                💡 La réponse est peut-être déjà dans la FAQ ci-dessous.
              </p>
              <button onClick={() => {
                  setShowNew(false)
                  setShowFaqInForm(false)
                  document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                📚 Consulter la FAQ →
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Sujet</label>
                <Input
                  placeholder="Ex: Comment saisir un piège ?"
                  value={newSujet}
                  onChange={e => setNewSujet(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Message</label>
                <textarea
                  value={newContenu}
                  onChange={e => setNewContenu(e.target.value)}
                  rows={5}
                  placeholder="Décrivez votre besoin en détail…"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => { setShowNew(false); setNewSujet(''); setNewContenu('') }} className="flex-1">
                  Annuler
                </Btn>
                <Btn onClick={handleCreate} loading={creating}
                  disabled={!newSujet.trim() || !newContenu.trim()} className="flex-1">
                  Envoyer
                </Btn>
              </div>
            </div>
          </Card>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <div id="faq-section" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">📚 Foire aux questions</p>
              {faq.length > 0 && (
                <span className="text-xs text-gray-600">{faqFiltree.length} / {faq.length}</span>
              )}
            </div>

            {/* Recherche */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="search" placeholder="Rechercher dans la FAQ…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500" />
            </div>

            {/* Filtres catégories */}
            {categories.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setActiveCategory('all')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    activeCategory === 'all' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'
                  }`}>
                  Toutes
                </button>
                {categories.map(c => (
                  <button key={c} onClick={() => setActiveCategory(c)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      activeCategory === c ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Items pliables */}
            {faqFiltree.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Aucune réponse trouvée pour « {search} ».<br/>
                <button onClick={() => setShowNew(true)}
                  className="text-amber-400 hover:text-amber-300 font-medium underline mt-2">
                  Poser votre question →
                </button>
              </p>
            ) : faqFiltree.map(item => {
              const isOpen = openIds.has(item.id)
              return (
                <div key={item.id} className="bg-gray-800/80 border border-gray-700/50 rounded-2xl overflow-hidden">
                  <button onClick={() => toggleOpen(item.id)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-gray-700/30 transition-colors">
                    <span className="text-sm font-medium text-white flex-1 min-w-0">
                      {highlight(item.question, search)}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`flex-shrink-0 text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 border-t border-gray-700/50">
                      <p className="text-xs text-amber-500/70 uppercase tracking-wide mt-3 mb-1.5">{item.categorie}</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {highlight(item.reponse, search)}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}

            {/* CTA si rien trouvé après recherche */}
            {search && faqFiltree.length > 0 && (
              <p className="text-xs text-gray-500 text-center pt-2">
                La réponse n'est pas dans la liste ?{' '}
                <button onClick={() => setShowNew(true)}
                  className="text-amber-400 hover:text-amber-300 font-medium underline">
                  Créer un ticket
                </button>
              </p>
            )}
          </div>
        )}

        {/* Séparateur */}
        {faq.length > 0 && tickets.length > 0 && (
          <div className="border-t border-gray-800 my-2" />
        )}

        {/* Liste des tickets */}
        {tickets.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">📋 Mes demandes</p>
            {tickets.map(t => (
              <Card key={t.id} onClick={() => navigate(`/support/${t.id}`)}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-white truncate flex-1">{t.sujet}</p>
                  {t.unread_count_user > 0 && (
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-black rounded-full text-xs font-bold">
                      {t.unread_count_user}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {fmtDate(t.last_message_at)} ·{' '}
                  <span className={t.statut === 'ouvert' ? 'text-amber-400' : 'text-gray-500'}>
                    {t.statut === 'ouvert' ? '● Ouvert' : '✓ Fermé'}
                  </span>
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state si rien (FAQ vide ET pas de tickets) */}
        {faq.length === 0 && tickets.length === 0 && !showNew && (
          <div className="pt-12">
            <Empty
              message="Aucune demande pour le moment. Cliquez sur « + Nouveau » pour en créer une."
              icon="🆘"
            />
          </div>
        )}

      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Vue conversation d'un ticket
// ──────────────────────────────────────────────────────────────
function Conversation({ ticketId }: { ticketId: string }) {
  const { user, isAdmin } = useUser()
  const navigate = useNavigate()
  const [ticket, setTicket]     = useState<SupportTicketWithMessages | null>(null)
  const [loading, setLoading]   = useState(true)
  const [reply, setReply]       = useState('')
  const [sending, setSending]   = useState(false)

  const load = () => {
    setLoading(true)
    getTicket(ticketId).then(t => {
      setTicket(t)
      setLoading(false)
      if (t && user) {
        const role: 'user' | 'admin' = isAdmin ? 'admin' : 'user'
        markAsRead(ticketId, role)
      }
    })
  }

  useEffect(() => { load() }, [ticketId])

  useEffect(() => {
    const iv = setInterval(load, 15000)
    return () => clearInterval(iv)
  }, [ticketId])

  const handleSend = async () => {
    if (!user || !reply.trim()) return
    setSending(true)
    try {
      const role: 'user' | 'admin' = isAdmin ? 'admin' : 'user'
      await addMessage(ticketId, user.email, role, reply.trim())
      setReply('')
      load()
    } catch (e) {
      alert('Erreur lors de l\'envoi')
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>
  if (!ticket) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
      <span className="text-5xl">🆘</span>
      <p>Ticket introuvable</p>
      <Btn variant="secondary" onClick={() => navigate('/support')}>Retour</Btn>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate(isAdmin ? '/admin/support' : '/support')}
          className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{ticket.sujet}</p>
          <p className="text-xs text-gray-500 truncate">
            {ticket.user_email} · {ticket.statut === 'ouvert' ? '● Ouvert' : '✓ Fermé'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {ticket.messages.map(m => {
          const isMine = m.auteur_email === user?.email
          const isAdminMsg = m.auteur_role === 'admin'
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 space-y-1 ${
                isMine
                  ? 'bg-amber-500 text-black'
                  : isAdminMsg
                    ? 'bg-blue-900/50 border border-blue-800/40 text-white'
                    : 'bg-gray-800 text-white'
              }`}>
                {!isMine && (
                  <p className={`text-xs font-medium ${isAdminMsg ? 'text-blue-300' : 'text-gray-400'}`}>
                    {isAdminMsg ? '⭐ Administrateur' : '👤 Utilisateur'}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{m.contenu}</p>
                <p className={`text-xs ${isMine ? 'text-black/60' : 'text-gray-500'}`}>
                  {fmtDateTime(m.created_at)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-3 safe-bottom">
        <div className="flex gap-2 items-end">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Votre message…"
            rows={2}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
          />
          <Btn onClick={handleSend} loading={sending} disabled={!reply.trim()}>
            Envoyer
          </Btn>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────
function fmtDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'à l\'instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h}h`
  const j = Math.floor(h / 24)
  if (j < 7) return `il y a ${j}j`
  return d.toLocaleDateString('fr-FR')
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// Surligne les correspondances de la recherche
function highlight(text: string, search: string): React.ReactNode {
  if (!search) return text
  const re = new RegExp(`(${escapeRegex(search)})`, 'gi')
  const parts = text.split(re)
  return parts.map((part, i) =>
    re.test(part)
      ? <mark key={i} className="bg-amber-500/40 text-amber-200 rounded px-0.5">{part}</mark>
      : <span key={i}>{part}</span>
  )
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
