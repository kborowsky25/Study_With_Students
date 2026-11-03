import { useRef } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Avatar, Card, EmptyState, Icon, Pill, SkeletonRows, StatusPill } from '../components/ui'
import { useQuery } from '../lib/query'
import { Q } from '../lib/queries'
import { formatDate } from '../lib/format'
import { inviteLink } from '../lib/invite'
import './Referrals.css'

// How far each invited person has got: signed up → first session paid (or tutor approved) → reward
const STAGES = {
  joined:   { status: 'pending',   label: 'Signed up' },
  paid:     { status: 'confirmed', label: 'First session paid' },
  credit:   { status: 'paid',      label: 'Credit earned' },
  approved: { status: 'confirmed', label: 'Approved' },
  xp:       { status: 'paid',      label: 'XP earned' },
}

const SHARE_TEXT = 'Join me on Study With Students. Sign up with my link and your first booking fee is waived.'

export default function Referrals() {
  const { isTutor } = useAuth()
  const { data, error, loading, refetch } = useQuery(...Q.referrals, { staleTime: 0 })
  const input = useRef(null)

  const link = data?.code ? inviteLink(data.code) : ''
  const invited = data?.invited ?? []
  const tutor = data?.tutor ?? isTutor  // tutors earn XP rather than booking-fee credits
  const canShare = typeof navigator.share === 'function'
  const show = (value) => (loading ? '—' : value)

  const signsUp = { icon: 'link', label: 'A friend signs up with your link', reward: 'Their first fee waived' }
  const pays = { icon: 'payments', label: 'They pay for their first session' }
  const how = tutor ? [
    signsUp,
    { ...pays, reward: `+${data?.xp_per_family ?? 100} XP` },
    { icon: 'verified_user', label: 'A tutor you invite is approved', reward: `+${data?.xp_per_tutor ?? 150} XP` },
  ] : [
    signsUp,
    { ...pays, reward: 'Your next fee waived' },
    { icon: 'event_busy', label: 'A session is cancelled before it’s paid', reward: 'Credit back' },
  ]

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Link copied')
    } catch {
      // No clipboard access (older browsers, embedded views): copy the selected text instead
      input.current?.select()
      if (document.execCommand?.('copy')) toast.success('Link copied')
      else toast('Copy the selected link')
    }
  }

  async function share() {
    try {
      await navigator.share({ title: 'Study With Students', text: SHARE_TEXT, url: link })
    } catch { /* share sheet closed */ }
  }

  return (
    <HubLayout>
      <PageTitle title="Invite friends" icon="redeem" />

      <div className="dash-head">
        <h1>Invite friends</h1>
      </div>

      {error && !data ? (
        <Card>
          <EmptyState title="Couldn’t load your invites." action={<button className="btn btn-ghost btn-sm" onClick={refetch}>Try again</button>} />
        </Card>
      ) : (
        <>
          <div className="metrics">
            {(!tutor || data?.credits > 0) && (
              <span><b>{show(data?.credits)}</b>{data?.credits === 1 ? 'credit' : 'credits'} to use</span>
            )}
            {!tutor && <span><b>{show(`${data?.earned} of ${data?.cap}`)}</b>earned</span>}
            <span><b>{show(invited.length)}</b>joined</span>
            {tutor && <span><b>{show(`${data?.xp} XP`)}</b>from invites</span>}
          </div>

          <div className="dash-grid">
            <div className="dash-col">
              <Card title="Your invite link">
                <div className="invite-link">
                  <input ref={input} className="input" readOnly value={link} placeholder={loading ? 'Loading…' : ''}
                    aria-label="Your invite link" onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn btn-coral" onClick={copy} disabled={!link}>
                    <Icon name="content_copy" />Copy link
                  </button>
                  {canShare && (
                    <button type="button" className="btn btn-ghost" onClick={share} disabled={!link}>
                      <Icon name="send" />Share
                    </button>
                  )}
                </div>
              </Card>

              <Card title="Invited" count={invited.length || null}>
                {loading ? <SkeletonRows rows={2} /> : invited.length ? (
                  <div className="row-list">
                    {invited.map((p) => (
                      <div key={p.id} className="row">
                        <Avatar name={p.name} size={28} />
                        <div className="main">
                          <div className="title">{p.name}</div>
                          <div className="meta">
                            {p.tutor ? 'Tutor · joined' : 'Joined'} {formatDate(p.joined_at)}
                            {p.stage === 'paid' && ` · past the ${data.cap}-credit limit`}
                          </div>
                        </div>
                        <StatusPill {...STAGES[p.stage]} />
                      </div>
                    ))}
                  </div>
                ) : <EmptyState title="No one has joined with your link yet." />}
              </Card>
            </div>

            <div className="dash-col">
              <Card title="How it works" className="referrals-how">
                <div className="row-list">
                  {how.map((h) => (
                    <div key={h.label} className="row">
                      <span className="avatar" style={{ width: 32, height: 32, background: 'var(--coral-soft)', color: 'var(--coral)' }}>
                        <Icon name={h.icon} size={17} />
                      </span>
                      <div className="main"><div className="title">{h.label}</div></div>
                      <Pill tone="coral">{h.reward}</Pill>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </HubLayout>
  )
}
