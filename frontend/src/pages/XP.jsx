import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Card, Icon, Pill, SkeletonRows, Stat } from '../components/ui'
import { getEvents } from '../api/events'
import { getActiveStudents, getActiveTutors } from '../api/tutors'
import { awardedXp, levelFor, THRESHOLDS, TIERS, xpFor, xpSessions } from '../lib/xp'
import './XP.css'

const article = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a') // "an Explorer", "a Scholar"

const ACTIONS = {
  student: [
    { icon: 'event_available',    label: 'Book a session',        xp: 50 },
    { icon: 'check_circle',       label: 'Complete a session',    xp: 100 },
    { icon: 'cast_for_education', label: 'Connect with a tutor',  xp: 30 },
  ],
  tutor: [
    { icon: 'event_available', label: 'Confirm a session',  xp: 50 },
    { icon: 'payments',        label: 'Get paid for a session', xp: 100 },
    { icon: 'person_add',      label: 'Take on a student',  xp: 30 },
    { icon: 'redeem',          label: 'Invite a tutor who gets approved', xp: 150, to: '/referrals' },
  ],
}

export default function XP() {
  const { user } = useAuth()
  const mode = user?.is_tutor && localStorage.getItem('sws_hub_mode') === 'tutor' ? 'tutor' : 'student'
  const [events, setEvents] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getEvents().then((r) => setEvents(r.data.events ?? [])),
      (mode === 'tutor' ? getActiveStudents() : getActiveTutors())
        .then((r) => setPeople(r.data.tutors ?? r.data.students ?? [])),
    ]).finally(() => setLoading(false))
  }, [mode])

  // Same rules as the dashboard's level (lib/xp.js)
  const live = xpSessions(mode, events)
  const done = live.filter((e) => ['confirmed', 'paid'].includes(e.status))
  const paid = live.filter((e) => e.status === 'paid')
  const xp = xpFor(mode, events, people.length, awardedXp(mode, user))

  const tiers = TIERS[mode]
  const { index: level, next, progress } = levelFor(mode, xp)
  const pct = progress * 100

  return (
    <HubLayout>
      <PageTitle title="Graduation" icon="military_tech" />

      <div className="dash-head">
        <div>
          <div className="eyebrow">{mode === 'tutor' ? 'Tutor' : 'Student'} graduation</div>
          <h1 style={{ marginTop: 6 }}>You’re {article(tiers[level])} <em>{tiers[level]}</em></h1>
          <p>{next ? `${next - xp} XP to ${tiers[level + 1]}` : 'Top tier reached — legendary.'}</p>
        </div>
      </div>

      <section className="card spotlight" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{loading ? '—' : xp}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-faint)' }}>XP</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Level {level + 1} of {tiers.length}
          </span>
        </div>
        <div className="progress" style={{ height: 8 }}><i style={{ width: `${loading ? 0 : pct}%`, transition: 'width 0.9s ease' }} /></div>
        <ol className="xp-tiers" aria-label="Tiers">
          {tiers.map((name, i) => (
            <li key={name} className={`xp-tier ${i <= level ? 'reached' : ''} ${i === level ? 'current' : ''}`} title={`${name} · ${THRESHOLDS[i]} XP`}
              aria-current={i === level ? 'step' : undefined}>
              <div className="xp-tier-dot">{i < level ? <Icon name="check" size={14} /> : i + 1}</div>
              <div className="xp-tier-name">{name}</div>
              <div className="xp-tier-xp">{THRESHOLDS[i]}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card stat-grid">
        <Stat label={mode === 'tutor' ? 'Sessions taught' : 'Sessions booked'} value={loading ? '—' : live.length} />
        <Stat label="Confirmed or paid" value={loading ? '—' : done.length} />
        <Stat label="Paid" value={loading ? '—' : paid.length} />
        <Stat label={mode === 'tutor' ? 'Students' : 'Tutors'} value={loading ? '—' : people.length} />
      </section>

      <Card title="How to earn XP" icon="bolt">
        {loading ? <SkeletonRows rows={3} /> : (
          <div className="row-list">
            {ACTIONS[mode].map((a) => {
              const row = (
                <>
                  <span className="avatar" style={{ width: 32, height: 32, background: 'var(--coral-soft)', color: 'var(--coral)' }}>
                    <Icon name={a.icon} size={17} />
                  </span>
                  <div className="main"><div className="title">{a.label}</div></div>
                  <Pill tone="coral">+{a.xp} XP</Pill>
                </>
              )
              return a.to
                ? <Link key={a.label} to={a.to} className="row">{row}</Link>
                : <div key={a.label} className="row">{row}</div>
            })}
          </div>
        )}
      </Card>

    </HubLayout>
  )
}
