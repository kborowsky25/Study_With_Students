import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getActiveStudents } from '../api/tutors'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

export default function ActiveStudents() {
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getActiveStudents()
      .then(({ data }) => setStudents(data.students ?? []))
      .catch(() => toast.error('Could not load students'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <HubLayout initialMode="tutor">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">My Students</h1>
        <p className="text-white/50">{students.length} active student{students.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="glass h-36 animate-pulse" />)}
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">👩‍🎓</p>
          <p className="text-white/60 text-lg">No active students yet</p>
          <p className="text-white/40 text-sm mt-2">Students can add you after viewing your profile</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(student => {
            const initials = student.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={student.id_student} className="glass-hover p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-400 font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{student.name}</p>
                    <p className="text-white/40 text-sm truncate">{student.email}</p>
                  </div>
                </div>
                <Link
                  to="/messages"
                  className="w-full btn-secondary text-sm py-1.5 text-center block"
                >
                  💬 Message
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </HubLayout>
  )
}
