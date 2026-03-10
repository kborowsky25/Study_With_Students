import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getCategories } from '../api/forum'
import HubLayout from '../components/layout/HubLayout'
import toast from 'react-hot-toast'

const CATEGORY_ICONS = ['📚', '💡', '🔬', '📐', '💬', '🌍', '🏛️', '🎓']

export default function ForumHome() {
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    getCategories()
      .then(({ data }) => setCategories(data.categories ?? []))
      .catch(() => toast.error('Could not load forum'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <HubLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Community Forum</h1>
        <p className="text-white/50">Ask questions, share knowledge, and connect with peers</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="glass h-32 animate-pulse" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🗣️</p>
          <p className="text-white/60">No forum categories yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, i) => (
            <Link
              key={cat.id}
              to="/forum/category/$categoryId"
              params={{ categoryId: String(cat.id) }}
              className="glass-hover p-5 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-coral-400/10 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                  {CATEGORY_ICONS[i % CATEGORY_ICONS.length]}
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{cat.name}</h3>
                  <p className="text-white/50 text-sm leading-snug">{cat.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </HubLayout>
  )
}
