import { useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import { Link } from '@tanstack/react-router'

export default function Hub() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  function handleChoose(mode) {
    navigate({ to: mode === 'student' ? '/hub/student' : '/hub/tutor' })
  }

  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: '#1b263b', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Navbar */}
      <nav style={{ height: '8vh', backgroundColor: '#1b263b', display: 'flex', alignItems: 'center', padding: '0 3vw', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'white', fontWeight: '900', fontSize: '18px' }}>
          <span className="material-symbols-outlined" style={{ color: '#ff725e', fontSize: '24px' }}>rocket_launch</span>
          Study with Students
        </Link>
        {user && (
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            Welcome, {user.name?.split(' ')[0]}
          </span>
        )}
      </nav>

      {/* Choice panels */}
      <div style={{ flex: 1, display: 'flex' }}>
        <ChoicePanel
          label="STUDENT"
          bg="/static/images/hub/students.svg"
          onClick={() => handleChoose('student')}
        />
        <ChoicePanel
          label="TUTOR"
          bg="/static/images/hub/tutor.svg"
          onClick={() => handleChoose('tutor')}
        />
      </div>
    </div>
  )
}

function ChoicePanel({ label, bg, onClick }) {
  const panelRef = useRef(null)
  const textRef  = useRef(null)

  function onEnter() {
    if (panelRef.current) {
      panelRef.current.style.backgroundColor = '#ff725e'
      panelRef.current.style.backgroundImage = 'none'
      panelRef.current.style.color           = 'white'
    }
    if (textRef.current) {
      textRef.current.style.transform = 'translateY(30vh)'
    }
  }

  function onLeave() {
    if (panelRef.current) {
      panelRef.current.style.backgroundColor = 'transparent'
      panelRef.current.style.backgroundImage = `url(${bg})`
      panelRef.current.style.color           = '#ff725e'
    }
    if (textRef.current) {
      textRef.current.style.transform = 'translateY(0)'
    }
  }

  return (
    <div
      ref={panelRef}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        width: '50%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(${bg})`,
        backgroundSize: '70%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        color: '#ff725e',
        cursor: 'pointer',
        transition: 'background-color 0.4s ease',
        borderRight: label === 'STUDENT' ? '1px solid rgba(255,255,255,0.1)' : 'none',
      }}
    >
      <p
        ref={textRef}
        style={{
          fontSize: '50px',
          fontWeight: '900',
          letterSpacing: '4px',
          transition: 'transform 0.5s ease',
          userSelect: 'none',
        }}
      >
        {label}
      </p>
    </div>
  )
}
