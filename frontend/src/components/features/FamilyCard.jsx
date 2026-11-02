// Student home: invites from a parent (accept or decline), the parents linked to this account
// (unlink), and, for an under-18 with no parent yet, a sign-up link to send them: under-18s
// book sessions once a parent is linked (server/family.py).
//   <FamilyCard />
// Renders nothing when there's nothing to show.
import { useState } from 'react'
import toast from 'react-hot-toast'
import { acceptInvite, declineInvite, removeLink } from '../../api/family'
import { errorMessage } from '../../api/client'
import { FQ, parentSignupUrl, refreshFamily } from '../../lib/family'
import { firstName, formatDate } from '../../lib/format'
import { useQuery } from '../../lib/query'
import { Avatar, Card, EmptyState, Icon } from '../ui'
import { useConfirm } from '../ui/confirm'
import './family.css'

export default function FamilyCard() {
  const { data } = useQuery(...FQ.family)
  const confirm = useConfirm()
  const [busy, setBusy] = useState(null)

  if (!data) return null
  const { invites, parents, needs_parent: needsParent, under_18: under18 } = data
  if (!invites.length && !parents.length && !needsParent) return null

  async function act(id, request, success) {
    setBusy(id)
    try {
      await request()
      toast.success(success)
      refreshFamily()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function accept(invite) {
    const name = firstName(invite.name)
    const ok = await confirm({
      title: `Link ${invite.name} as your parent?`,
      body: `${name} will see your sessions, lesson notes, homework and progress, can read your messages with tutors and can pay for sessions. Either of you can unlink at any time.`,
      confirmLabel: 'Link',
    })
    if (ok) act(invite.link_id, () => acceptInvite(invite.link_id), `Linked to ${name}`)
  }

  async function unlink(parent) {
    const name = firstName(parent.name)
    const ok = await confirm({
      title: `Unlink ${name}?`,
      body: `${name} will stop seeing your sessions, progress and messages.${under18 && parents.length === 1 ? ' Under-18s need a parent linked to book sessions.' : ''}`,
      confirmLabel: 'Unlink',
      danger: true,
    })
    if (ok) act(parent.link_id, () => removeLink(parent.link_id), `Unlinked ${name}`)
  }

  async function copySignupLink() {
    try {
      await navigator.clipboard.writeText(parentSignupUrl())
      toast.success('Link copied. Your parent signs up with it, then invites your email address.', { duration: 6000 })
    } catch {
      toast.error('Couldn’t copy the link')
    }
  }

  return (
    <Card title="Parents" count={parents.length || null}>
      <div className="row-list">
        {invites.map((invite) => (
          <div key={invite.link_id} className="row row-wrap">
            <Avatar name={invite.name} size={28} />
            <div className="main">
              <div className="title">{invite.name}</div>
              <div className="meta">Wants to link as your parent · {invite.email}</div>
            </div>
            <div className="row-actions">
              <button className="btn btn-quiet btn-sm" disabled={busy === invite.link_id}
                onClick={() => act(invite.link_id, () => declineInvite(invite.link_id), 'Invite declined')}>Decline</button>
              <button className="btn btn-coral btn-sm" disabled={busy === invite.link_id} onClick={() => accept(invite)}>Accept</button>
            </div>
          </div>
        ))}
        {parents.map((parent) => (
          <div key={parent.link_id} className="row">
            <Avatar name={parent.name} size={28} />
            <div className="main">
              <div className="title">{parent.name}</div>
              <div className="meta">Linked {formatDate(parent.since)}</div>
            </div>
            <button className="btn btn-quiet btn-sm" disabled={busy === parent.link_id} onClick={() => unlink(parent)}>Unlink</button>
          </div>
        ))}
        {needsParent && !invites.length && (
          <EmptyState title="Under-18s link a parent or guardian before booking"
            action={<button className="btn btn-ghost btn-sm" onClick={copySignupLink}><Icon name="link" />Copy sign-up link</button>} />
        )}
      </div>
    </Card>
  )
}
