import { Link } from '@tanstack/react-router'

export default function TutorCard({ tutor, onLike, liked = false }) {
  const initials = tutor.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="glass-hover p-5 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-coral-400 to-orange-400 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-bold text-white">{tutor.name}</p>
            <p className="text-white/50 text-sm">{tutor.university}</p>
          </div>
        </div>
        {onLike && (
          <button
            onClick={() => onLike(tutor.id_tutor)}
            className={`p-2 rounded-xl transition-all ${
              liked
                ? 'text-red-400 bg-red-400/10'
                : 'text-white/30 hover:text-red-400 hover:bg-red-400/10'
            }`}
          >
            {liked ? '❤️' : '🤍'}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1.5 mb-4">
        <InfoRow label="Course"    value={tutor.course} />
        <InfoRow label="Age"       value={tutor.age} />
        <InfoRow label="Available" value={tutor.availability} />
      </div>

      {/* Subjects */}
      {tutor.subjects && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tutor.subjects.split(',').map(s => (
            <span key={s.trim()} className="badge bg-coral-400/10 text-coral-400 border border-coral-400/20">
              {s.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Bio */}
      {tutor.about_me && (
        <p className="text-white/50 text-sm leading-relaxed line-clamp-2 mb-4">
          {tutor.about_me}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          to="/tutor/$tutorId"
          params={{ tutorId: String(tutor.id_tutor) }}
          className="flex-1 btn-primary text-center text-sm py-2"
        >
          View Profile
        </Link>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-white/30 w-16 flex-shrink-0">{label}</span>
      <span className="text-white/80">{value}</span>
    </div>
  )
}
