import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../context/PageTitleContext'
import HubLayout from '../components/layout/HubLayout'
import { Card, Icon, Pill, SkeletonRows, Stat } from '../components/ui'
import { getEvents } from '../api/events'
import { getActiveStudents, getActiveTutors } from '../api/tutors'

const TIERS = {
  student: ['Newcomer', 'Explorer', 'Scholar', 'Achiever', 'Prodigy', 'Elite', 'Legend'],
  tutor:   ['Guide', 'Mentor', 'Educator', 'Expert', 'Professor', 'Master', 'Grandmaster'],
}
const THRESHOLDS = [0, 150, 400, 900, 1800, 3500, 6000]

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
      getEvents().then((r) => setEvents((r.data.events ?? []).filter((e) => e.role === mode))),
      (mode === 'tutor' ? getActiveStudents() : getActiveTutors())
        .then((r) => setPeople(r.data.tutors ?? r.data.students ?? [])),
    ]).finally(() => setLoading(false))
  }, [mode])

  const live = events.filter((e) => e.status !== 'canceled')
  const done = live.filter((e) => ['confirmed', 'paid'].includes(e.status))
  const paid = live.filter((e) => e.status === 'paid')
  const xp = mode === 'tutor'
    ? done.length * 50 + paid.length * 100 + people.length * 30
    : live.length * 50 + done.length * 100 + people.length * 30

  const tiers = TIERS[mode]
  const level = THRESHOLDS.reduce((acc, t, i) => (xp >= t ? i : acc), 0)
  const next = THRESHOLDS[level + 1]
  const pct = next ? ((xp - THRESHOLDS[level]) / (next - THRESHOLDS[level])) * 100 : 100

  return (
    <HubLayout>
      <PageTitle title="Graduation" icon="military_tech" />

      <div className="dash-head">
        <div>
          <div className="eyebrow">{mode === 'tutor' ? 'Tutor' : 'Student'} graduation</div>
          <h1 style={{ marginTop: 6 }}>You’re a <em>{tiers[level]}</em></h1>
          <p>{next ? `${next - xp} XP to ${tiers[level + 1]}` : 'Top tier reached — legendary.'}</p>
        </div>
        {user?.is_premium && <Pill tone="coral">✦ Explorer badge</Pill>}
      </div>

      <section className="card spotlight" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>{loading ? '—' : xp}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-faint)' }}>XP</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Level {level + 1} of {tiers.length}
          </span>
        </div>
        <div className="progress" style={{ height: 8 }}><i style={{ width: `${loading ? 0 : pct}%`, transition: 'width 0.9s ease' }} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiers.length}, 1fr)`, gap: 4 }}>
          {tiers.map((name, i) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div style={{
                width: 22, height: 22, margin: '0 auto 5px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i <= level ? 'var(--coral)' : 'rgb(var(--fg) / 0.08)',
                color: i <= level ? '#fff' : 'var(--text-faint)', fontSize: 11, fontWeight: 800,
              }}>
                {i < level ? <Icon name="check" size={14} /> : i + 1}
              </div>
              <div style={{ fontSize: 11, fontWeight: i === level ? 800 : 600, color: i === level ? 'var(--text)' : 'var(--text-faint)' }}>{name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{THRESHOLDS[i]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card stat-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <Stat icon="event" label={mode === 'tutor' ? 'Sessions taught' : 'Sessions booked'} value={live.length} />
        <Stat icon="check_circle" label="Confirmed or paid" value={done.length} />
        <Stat icon="groups_2" label={mode === 'tutor' ? 'Students' : 'Tutors'} value={people.length} />
      </section>

      <Card title="How to earn XP" icon="bolt">
        {loading ? <SkeletonRows rows={3} /> : (
          <div className="row-list">
            {ACTIONS[mode].map((a) => (
              <div key={a.label} className="row">
                <span className="avatar" style={{ width: 32, height: 32, background: 'var(--coral-soft)', color: 'var(--coral)' }}>
                  <Icon name={a.icon} size={17} />
                </span>
                <div className="main"><div className="title">{a.label}</div></div>
                <Pill tone="coral">+{a.xp} XP</Pill>
              </div>
            ))}
          </div>
        )}
      </Card>

      {mode === 'student' && !user?.is_premium && (
        <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 14 }}>
          Explorer members get the ✦ Explorer badge on their profile. <Link to="/membership" className="card-link" style={{ display: 'inline' }}>See the plan</Link>
        </p>
      )}
    </HubLayout>
  )
}
