import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { getTickets, closeTicket } from '../lib/support'
import type { SupportTicket } from '../types'
import { Card, Spinner, Empty } from '../components/UI'

export default function AdminSupportPage() {
  const { isAdmin, user } = useUser()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre]   = useState<'all' | 'unread' | 'ouvert' | 'ferme'>('all')

  const load = () => {
    if (!user) return
    setLoading(true)
    getTickets(user.email, true).then(d => { setTickets(d); setLoading(false) })
  }

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    load()
  }, [isAdmin, navigate, user])

  const handleClose = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Fermer ce ticket ?')) return
    await closeTicket(id)
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size={32} /></div>

  const filtres = tickets.filter(t => {
    if (filtre === 'unread' && t.unread_count_admin === 0) return false
    if (filtre === 'ouvert' && t.statut !== 'ouvert')      return false
    if (filtre === 'ferme'  && t.statut !== 'ferme')       return false
    return true
  })

  const totalUnread = tickets.reduce((s, t) => s + t.unread_count_admin, 0)

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
        <button onClick={() => navigate('/profil')} className="text-gray-400 hover:text-white p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Messages support</h2>
          <p className="text-xs text-gray-500">
            {tickets.length} ticket{tickets.length > 1 ? 's' : ''}
            {totalUnread > 0 && (
              <span className="text-amber-400 font-medium"> · {totalUnread} non lu{totalUnread > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="px-4 py-3 border-b border-gray-800 flex gap-2 flex-wrap">
        {([
          ['all',     'Tous'],
          ['unread',  '🔴 Non lus'],
          ['ouvert',  '● Ouverts'],
          ['ferme',   '✓ Fermés'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFiltre(key)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filtre === key
                ? 'bg-amber-500 text-black'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {filtres.length === 0 ? (
          <div className="pt-12">
            <Empty message="Aucun ticket à afficher." icon="📨" />
          </div>
        ) : filtres.map(t => (
          <Card key={t.id} onClick={() => navigate(`/support/${t.id}`)}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-white truncate flex-1">{t.sujet}</p>
              {t.unread_count_admin > 0 && (
                <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1 bg-amber-500 text-black rounded-full text-xs font-bold">
                  {t.unread_count_admin}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-1.5">👤 {t.user_email}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {fmtDate(t.last_message_at)} ·{' '}
                <span className={t.statut === 'ouvert' ? 'text-amber-400' : 'text-gray-500'}>
                  {t.statut === 'ouvert' ? '● Ouvert' : '✓ Fermé'}
                </span>
              </p>
              {t.statut === 'ouvert' && (
                <button onClick={(e) => handleClose(t.id, e)}
                  className="text-xs px-2 py-1 rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors font-medium">
                  Fermer
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

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
