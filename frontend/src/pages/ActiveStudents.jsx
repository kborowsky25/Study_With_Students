import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getActiveStudents } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import PageHeader from '../components/features/PageHeader'
import toast from 'react-hot-toast'

const CORAL  = '#ff725e'
const GREEN  = '#34d399'
const BLUE   = '#60a5fa'
const PURPLE = '#a78bfa'
const AMBER  = '#fbbf24'

const STUDENT_GRADS = [
  'linear-gradient(135deg, #60a5fa, #818cf8)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
  `linear-gradient(135deg, ${CORAL}, #ff9a3c)`,
  'linear-gradient(135deg, #22d3ee, #0284c7)',
  'linear-gradient(135deg, #f472b6, #ec4899)',
  'linear-gradient(135deg, #fb923c, #ef4444)',
]

export default function ActiveStudents() {
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => {
    getActiveStudents()
      .then(({ data }) => setStudents(data.students ?? []))
      .catch(() => toast.error('Could not load students'))
      .finally(() => { setLoading(false); setTimeout(() => setMounted(true), 80) })
  }, [])

  return (
    <HubLayout initialMode="tutor">
      <PageTitle title="My Students" icon="group" />
      <PageHeader
        icon="group" iconColor={PURPLE}
        title="My Students"
        subtitle={loading ? '…' : `${students.length} active student${students.length !== 1 ? 's' : ''}`}
      />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: '130px', borderRadius: '16px' }} />)}
        </div>

      ) : students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: `${PURPLE}14`, border: `1px solid ${PURPLE}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: PURPLE }}>group</span>
          </div>
          <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '18px', marginBottom: '8px' }}>No active students yet</p>
          <p style={{ color: 'var(--text-faint)', fontSize: '14px' }}>Students can add you after viewing your profile</p>
        </div>

      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {students.map((student, idx) => {
            const initials = student.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
            const gradIdx  = idx % STUDENT_GRADS.length
            const DELAYS   = ['', 'delay-50', 'delay-100', 'delay-150', 'delay-200', 'delay-300']

            return (
              <div
                key={student.id_student}
                className={mounted ? `animate-slide-up ${DELAYS[Math.min(idx, DELAYS.length - 1)]}` : ''}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '16px', padding: '18px',
                  backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
              >
                {/* Avatar + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, background: STUDENT_GRADS[gradIdx], display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '15px', fontWeight: '900', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: '800', color: 'var(--text)', fontSize: '14px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.name}
                    </p>
                    <p style={{ color: 'var(--text-faint)', fontSize: '11px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.email}
                    </p>
                  </div>
                </div>

                {/* Active badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '12px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
                  <span style={{ fontSize: '11px', color: GREEN, fontWeight: '700' }}>Active</span>
                </div>

                {/* Message button */}
                <Link
                  to="/messages"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    width: '100%', padding: '8px 12px', borderRadius: '10px', textDecoration: 'none',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text)', fontSize: '12px', fontWeight: '700', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chat</span>
                  Message
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </HubLayout>
  )
}
