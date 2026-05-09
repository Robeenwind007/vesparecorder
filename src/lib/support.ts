// ============================================================
// Service Support — Tickets, messages, et notification email
// ============================================================
import { supabase } from './supabase'
import type {
  SupportTicket, SupportMessage, SupportTicketWithMessages,
} from '../types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ── Tickets ──────────────────────────────────────────────────
// Admin → tous les tickets, User → uniquement les siens
export const getTickets = async (
  email?: string,
  isAdmin = false
): Promise<SupportTicket[]> => {
  let q = supabase
    .from('support_tickets')
    .select('*')
    .order('last_message_at', { ascending: false })

  if (!isAdmin && email) {
    q = q.eq('user_email', email)
  }

  const { data } = await q
  return data ?? []
}

export const getTicket = async (id: string): Promise<SupportTicketWithMessages | null> => {
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .single()
  if (!ticket) return null

  const { data: messages } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at')

  return { ...(ticket as SupportTicket), messages: (messages ?? []) as SupportMessage[] }
}

// Crée un ticket + premier message dans une seule action
export const createTicket = async (
  userEmail: string,
  sujet: string,
  contenu: string
): Promise<SupportTicket> => {
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      user_email: userEmail,
      sujet,
      statut: 'ouvert',
      unread_count_admin: 0,  // sera incrémenté par le trigger lors de l'insertion du message
      unread_count_user: 0,
    })
    .select()
    .single()
  if (error || !ticket) throw error ?? new Error('Erreur création ticket')

  // Premier message (déclenche le trigger qui MAJ le compteur admin)
  const { error: errMsg } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: (ticket as SupportTicket).id,
      auteur_email: userEmail,
      auteur_role: 'user',
      contenu,
    })
  if (errMsg) throw errMsg

  // Notif email à l'admin (best-effort, ne bloque pas si ça échoue)
  notifyByEmail({
    ticket_id: (ticket as SupportTicket).id,
    sujet,
    contenu,
    auteur_email: userEmail,
    auteur_role: 'user',
    destinataire_email: '',  // ignoré côté Edge Function quand auteur=user
  }).catch(e => console.warn('Notif email échouée:', e))

  return ticket as SupportTicket
}

// Ajoute un message à un ticket existant
export const addMessage = async (
  ticketId: string,
  auteurEmail: string,
  auteurRole: 'user' | 'admin',
  contenu: string
): Promise<SupportMessage> => {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticketId,
      auteur_email: auteurEmail,
      auteur_role: auteurRole,
      contenu,
    })
    .select()
    .single()
  if (error) throw error

  // Récupère le ticket pour le sujet et le destinataire
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single()

  if (ticket) {
    notifyByEmail({
      ticket_id: ticketId,
      sujet: (ticket as SupportTicket).sujet,
      contenu,
      auteur_email: auteurEmail,
      auteur_role: auteurRole,
      destinataire_email: (ticket as SupportTicket).user_email,
    }).catch(e => console.warn('Notif email échouée:', e))
  }

  return data as SupportMessage
}

// Marque les messages comme lus pour le rôle donné
export const markAsRead = async (
  ticketId: string,
  role: 'user' | 'admin'
) => {
  const field = role === 'admin' ? 'unread_count_admin' : 'unread_count_user'
  await supabase
    .from('support_tickets')
    .update({ [field]: 0 })
    .eq('id', ticketId)
}

// Compteur global pour le badge
export const countUnread = async (
  email?: string,
  isAdmin = false
): Promise<number> => {
  if (isAdmin) {
    const { data } = await supabase
      .from('support_tickets')
      .select('unread_count_admin')
    return (data ?? []).reduce(
      (sum, t) => sum + ((t as { unread_count_admin: number }).unread_count_admin ?? 0),
      0
    )
  } else if (email) {
    const { data } = await supabase
      .from('support_tickets')
      .select('unread_count_user')
      .eq('user_email', email)
    return (data ?? []).reduce(
      (sum, t) => sum + ((t as { unread_count_user: number }).unread_count_user ?? 0),
      0
    )
  }
  return 0
}

// Ferme un ticket (admin)
export const closeTicket = async (ticketId: string) => {
  await supabase
    .from('support_tickets')
    .update({ statut: 'ferme' })
    .eq('id', ticketId)
}

// ── Notification email via Edge Function ─────────────────────
async function notifyByEmail(payload: {
  ticket_id: string
  sujet: string
  contenu: string
  auteur_email: string
  auteur_role: 'user' | 'admin'
  destinataire_email: string
}): Promise<void> {
  await fetch(`${SUPABASE_URL}/functions/v1/send-support-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}
