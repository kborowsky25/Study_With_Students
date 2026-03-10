import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'

export default function HubStudent() {
  const { user } = useAuth()
  const barRef = useRef(null)

  // Animate progress bar on mount (elastic fill like original)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = '30%'
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <HubLayout initialMode="student" raw>
      <div style={{ width: '100%', height: '100%', backgroundColor: '#1b263b', color: 'white', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 0px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', fontWeight: 'bold', padding: '4vh 2vw 1vh' }}>
          <h1>Ready to study, {user?.name?.split(' ')[0] ?? 'Student'}?</h1>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '0 2vw 2vh' }}>
          <span style={{ fontSize: '14px', color: '#b0bec5' }}>Level 1</span>
          <div style={{ width: '60%', backgroundColor: '#e0e0e0', borderRadius: '15px', overflow: 'hidden', height: '12px' }}>
            <div
              ref={barRef}
              style={{
                width: '5%',
                height: '100%',
                backgroundColor: '#ff725e',
                transition: 'width 1.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
                borderRadius: '15px',
              }}
            />
          </div>
        </div>

        {/* Card grid */}
        <div style={{ display: 'flex', flexDirection: 'row', flex: 1, padding: '1vh 3vw 3vh', gap: '2vw' }}>

          {/* Big card — Find a tutor */}
          <Link
            to="/find-tutors"
            style={{
              width: '50%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              borderRadius: '20px',
              backgroundImage: 'url(/static/images/hub/tutor.svg)',
              backgroundSize: '50%',
              backgroundPosition: 'center 30%',
              backgroundRepeat: 'no-repeat',
              backgroundColor: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(5px)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              paddingBottom: '6%',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.03)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', background: 'rgba(255,114,94,0.85)', padding: '8px 24px', borderRadius: '12px' }}>
              Find a tutor
            </span>
          </Link>

          {/* 2×2 small cards */}
          <div style={{ width: '50%', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2vh' }}>
            <HubCard to="/active-tutors" label="Active tutors" bg="/static/images/hub/student_profile.svg" bgSize="90%" />
            <HubCard to="/messages"      label="Messages"      bg="/static/images/hub/profile.svg"         bgSize="70%" />
            <HubCard to="/liked-tutors"  label="Liked Tutors"  bg="/static/images/hub/event.svg"           bgSize="50%" />
            <HubCard to="/dashboard"     label="Dashboard"     bg="/static/images/hub/dashboard.svg"       bgSize="70%" />
          </div>

        </div>
      </div>
    </HubLayout>
  )
}

function HubCard({ to, label, bg, bgSize = '60%' }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        borderRadius: '20px',
        backgroundImage: `url(${bg})`,
        backgroundSize: bgSize,
        backgroundPosition: 'center 30%',
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(5px)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        paddingBottom: '8%',
        textDecoration: 'none',
        minHeight: '120px',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.05)'
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>{label}</span>
    </Link>
  )
}
