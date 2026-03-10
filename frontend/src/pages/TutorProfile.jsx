import { useEffect, useState } from 'react'
import { getTutorProfile, saveTutorProfile } from '../api/tutors'
import { useAuth } from '../context/AuthContext'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const SUBJECTS_LIST = [
  'Maths', 'Further Maths', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'Economics', 'English', 'History', 'Geography',
  'Law', 'Psychology', 'Statistics', 'Philosophy', 'Engineering',
  'Medicine', 'Finance', 'Accounting',
]

export default function TutorProfile() {
  const { updateUser } = useAuth()
  const [form,    setForm]    = useState({ age: '', university: '', course: '', about_me: '', subjects: '', availability: '' })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    getTutorProfile()
      .then(({ data }) => {
        if (data.profile) setForm(data.profile)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function update(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function toggleSubject(sub) {
    setForm(f => {
      const current = f.subjects ? f.subjects.split(',').map(s => s.trim()).filter(Boolean) : []
      const idx = current.indexOf(sub)
      const next = idx === -1 ? [...current, sub] : current.filter((_, i) => i !== idx)
      return { ...f, subjects: next.join(', ') }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveTutorProfile(form)
      updateUser({ is_tutor: true })
      toast.success('Profile saved!')
    } catch (err) {
      toast.error(err.response?.data?.error ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const selectedSubjects = form.subjects ? form.subjects.split(',').map(s => s.trim()).filter(Boolean) : []

  return (
    <HubLayout initialMode="tutor">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-1">My Tutor Profile</h1>
        <p className="text-white/50 mb-8">This is what students see when they search for tutors</p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="glass h-14 animate-pulse" />)}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="glass p-6 space-y-5">
              <h2 className="font-bold text-white text-lg">Basic info</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/50 mb-1.5">Age</label>
                  <input type="number" min="16" max="100" value={form.age} onChange={update('age')} className="input-field" placeholder="21" />
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-1.5">Availability</label>
                  <input type="text" value={form.availability} onChange={update('availability')} className="input-field" placeholder="Weekday evenings, weekends" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-1.5">University</label>
                <input type="text" value={form.university} onChange={update('university')} className="input-field" placeholder="e.g. University of Oxford" />
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-1.5">Course / Degree</label>
                <input type="text" value={form.course} onChange={update('course')} className="input-field" placeholder="e.g. Mathematics BSc" />
              </div>
            </div>

            <div className="glass p-6">
              <h2 className="font-bold text-white text-lg mb-4">Subjects you teach</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {SUBJECTS_LIST.map(sub => {
                  const active = selectedSubjects.includes(sub)
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubject(sub)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                        active
                          ? 'bg-coral-400/20 text-coral-400 border-coral-400/40'
                          : 'bg-white/5 text-white/50 border-white/10 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {sub}
                    </button>
                  )
                })}
              </div>
              {selectedSubjects.length > 0 && (
                <p className="text-white/40 text-sm">Selected: {selectedSubjects.join(', ')}</p>
              )}
            </div>

            <div className="glass p-6">
              <h2 className="font-bold text-white text-lg mb-4">About you</h2>
              <textarea
                value={form.about_me}
                onChange={update('about_me')}
                rows={5}
                className="input-field resize-none"
                placeholder="Tell students about your experience, teaching style, and what makes you a great tutor…"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full btn-primary py-3 text-base disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save profile →'}
            </button>
          </form>
        )}
      </div>
    </HubLayout>
  )
}
