import { Link } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'

export default function HubTutor() {
  const { user } = useAuth()
  const name = user?.name?.split(' ')[0] ?? 'Tutor'

  return (
    <HubLayout initialMode="tutor" raw>
      <div style={{ width: '100%', minHeight: '100%', backgroundColor: '#1b263b', color: 'white', display: 'flex', flexDirection: 'column' }}>

        {/* Row 1: Payments + Active Students */}
        <div style={{ display: 'flex', width: '100%', flex: 1, padding: '3vh 3vw 1vh', gap: '2vw' }}>
          <TutorCard
            to="/payments"
            label="Payments"
            bg="/static/images/hub/dashboard.svg"
            bgSize="50%"
          />
          <TutorCard
            to="/active-students"
            label="Active Students"
            bg="/static/images/hub/students.svg"
            bgSize="50%"
          />
        </div>

        {/* Row 2: Tutor Profile + Messages + Schedule */}
        <div style={{ display: 'flex', width: '100%', flex: 1, padding: '1vh 3vw', gap: '2vw' }}>
          <TutorCard
            to="/tutor-profile"
            label="Tutor Profile"
            bg="/static/images/hub/tutor-profile.svg"
            bgSize="50%"
          />
          <TutorCard
            to="/messages"
            label="Messages"
            bg="/static/images/hub/profile.svg"
            bgSize="50%"
          />
          <TutorCard
            to="/calendar/tutor"
            label="Schedule"
            bg="/static/images/hub/event.svg"
            bgSize="50%"
          />
        </div>

        {/* Row 3: Heading */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 0.6, padding: '1vh 3vw 3vh', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 'bold' }}>
            Tutoring time, {name}?
          </h1>
        </div>

      </div>
    </HubLayout>
  )
}

function TutorCard({ to, label, bg, bgSize = '50%' }) {
  return (
    <Link
      to={to}
      style={{
        flex: 1,
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
        paddingBottom: '6%',
        textDecoration: 'none',
        minHeight: '150px',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.04)'
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <span style={{ color: 'white', fontSize: '15px', fontWeight: 'bold', background: 'rgba(255,114,94,0.8)', padding: '6px 16px', borderRadius: '10px' }}>
        {label}
      </span>
    </Link>
  )
}
