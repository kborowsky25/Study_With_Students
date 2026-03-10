import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'

// Hub is a smart redirect — send user to their appropriate view
export default function Hub() {
  const { isTutor } = useAuth()
  const navigate    = useNavigate()

  useEffect(() => {
    navigate({ to: isTutor ? '/hub/tutor' : '/hub/student', replace: true })
  }, [isTutor, navigate])

  return (
    <div className="min-h-screen bg-navy-500 flex items-center justify-center">
      <div className="text-white/40">Redirecting…</div>
    </div>
  )
}
