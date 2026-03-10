import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'

export default function HubLayout({ children, initialMode, raw = false }) {
  const { isTutor } = useAuth()
  const navigate    = useNavigate()

  // If no initial mode provided, default to student
  const [mode, setMode] = useState(initialMode ?? 'student')

  function toggleMode() {
    const next = mode === 'student' ? 'tutor' : 'student'
    setMode(next)
    navigate({ to: next === 'tutor' ? '/hub/tutor' : '/hub/student' })
  }

  return (
    <div className="flex min-h-screen bg-navy-500">
      <Sidebar mode={mode} onToggleMode={isTutor ? toggleMode : undefined} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        {raw ? children : (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
            {children}
          </div>
        )}
      </main>
    </div>
  )
}
