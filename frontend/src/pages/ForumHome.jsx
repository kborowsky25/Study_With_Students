import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getCategories } from '../api/forum'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import PaywallGate from '../components/features/PaywallGate'
import toast from 'react-hot-toast'

const CORAL = '#ff725e'

const CATEGORY_META = [
  { icon: 'menu_book',       color: '#6c63ff' },
  { icon: 'lightbulb',       color: '#f9c74f' },
  { icon: 'science',         color: '#06d6a0' },
  { icon: 'architecture',    color: '#3a86ff' },
  { icon: 'forum',           color: '#ff725e' },
  { icon: 'language',        color: '#2ec4b6' },
  { icon: 'account_balance', color: '#a8dadc' },
  { icon: 'school',          color: '#f4845f' },
]

const TABS = [
  { id: 'hot', label: 'Popular',  icon: 'local_fire_department' },
  { id: 'new', label: 'Recent',   icon: 'schedule' },
  { id: 'top', label: 'Top',      icon: 'trending_up' },
]

export default function ForumHome() {
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [activeTab,   setActiveTab]   = useState('hot')
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted,     setMounted]     = useState(false)

  useEffect(() => {
    getCategories()
      .then(({ data }) => setCategories(data.categories ?? []))
      .catch(() => toast.error('Could not load forum'))
      .finally(() => setLoading(false))
    requestAnimationFrame(() => setMounted(true))
  }, [])

  const filteredCategories = searchQuery
    ? categories.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories

  return (
    <HubLayout>
      <PageTitle title="Forum" icon="forum" />
      <PaywallGate feature="Community Forum">
        <style>{`
          @keyframes forumIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div style={{ display: 'flex', gap: '22px', alignItems: 'flex-start', maxWidth: '1080px', margin: '0 auto' }}>

          {/* ── Left sidebar ──────────────────────────────────────── */}
          <div style={{ width: '230px', minWidth: '230px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Write a post CTA */}
            <Link
              to="/forum/category/$categoryId/new"
              params={{ categoryId: String(categories[0]?.id ?? '1') }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '12px',
                background: CORAL, color: 'white',
                fontWeight: '700', fontSize: '13px', textDecoration: 'none',
                boxShadow: `0 4px 20px ${CORAL}35`,
                transition: 'opacity 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1';   e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit_square</span>
              Write a Post
            </Link>

            {/* Category list */}
            {!loading && categories.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 10px' }}>
                <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 6px', marginBottom: '8px' }}>
                  Categories
                </p>
                {categories.map((cat, i) => {
                  const meta = CATEGORY_META[i % CATEGORY_META.length]
                  return (
                    <Link
                      key={cat.id}
                      to="/forum/category/$categoryId"
                      params={{ categoryId: String(cat.id) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '9px',
                        padding: '7px 8px', borderRadius: '9px',
                        textDecoration: 'none', transition: 'background 0.12s',
                        color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: '500',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent';            e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: meta.color, flexShrink: 0 }}>{meta.icon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Community guidelines */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
              <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
                Guidelines
              </p>
              {[
                { icon: 'handshake',  text: 'Be respectful to everyone' },
                { icon: 'verified',   text: 'Keep posts on-topic' },
                { icon: 'block',      text: 'No spam or self-promotion' },
              ].map((rule, i) => (
                <div key={i} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', marginBottom: i < 2 ? '10px' : 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--text-faint)', flexShrink: 0, marginTop: '1px' }}>{rule.icon}</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{rule.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Main content ──────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Stats row */}
            {!loading && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                {[
                  { label: 'Categories', value: categories.length, icon: 'category', color: CORAL },
                  { label: 'Members',    value: '1.2k',            icon: 'group',    color: '#6c63ff' },
                  { label: 'Threads',    value: '3.4k+',           icon: 'forum',    color: '#06d6a0' },
                ].map((s, i) => (
                  <div key={s.label}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: '12px', padding: '12px 14px',
                      animation: mounted ? `forumIn 0.3s ease ${i * 60}ms both` : 'none',
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ color: s.color, fontSize: '16px' }}>{s.icon}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: 'var(--text-faint)', pointerEvents: 'none' }}>search</span>
              <input
                type="text"
                placeholder="Search discussions…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  paddingLeft: '36px', paddingRight: searchQuery ? '34px' : '14px',
                  paddingTop: '9px', paddingBottom: '9px',
                  borderRadius: '11px', fontSize: '13px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  color: 'var(--text)', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = `${CORAL}55`; e.currentTarget.style.boxShadow = `0 0 0 3px ${CORAL}12` }}
                onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: 'var(--text-faint)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
              )}
            </div>

            {/* Tab bar — underline indicator style */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '18px', borderBottom: '1px solid var(--border)' }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 18px', marginBottom: '-1px',
                    border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? CORAL : 'transparent'}`,
                    background: 'transparent', cursor: 'pointer',
                    fontWeight: activeTab === tab.id ? '700' : '500',
                    fontSize: '12.5px',
                    color: activeTab === tab.id ? CORAL : 'var(--text-muted)',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Category cards */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="skeleton" style={{ height: '78px', borderRadius: '13px' }} />
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--text-faint)', display: 'block', marginBottom: '12px' }}>
                  {searchQuery ? 'search_off' : 'forum'}
                </span>
                <p style={{ color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' }}>
                  {searchQuery ? `No results for "${searchQuery}"` : 'No categories yet'}
                </p>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ marginTop: '10px', padding: '7px 18px', borderRadius: '10px', border: `1px solid ${CORAL}35`, background: `${CORAL}12`, color: CORAL, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredCategories.map((cat, i) => {
                  const meta = CATEGORY_META[i % CATEGORY_META.length]
                  return (
                    <Link
                      key={cat.id}
                      to="/forum/category/$categoryId"
                      params={{ categoryId: String(cat.id) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '13px',
                        padding: '14px 18px',
                        textDecoration: 'none',
                        transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
                        animation: mounted ? `forumIn 0.35s cubic-bezier(0.16,1,0.3,1) ${Math.min(i * 45, 360)}ms both` : 'none',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = `rgba(255,255,255,0.04)`
                        e.currentTarget.style.borderColor = `${meta.color}40`
                        e.currentTarget.style.transform = 'translateX(3px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--bg-card)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      {/* Icon box */}
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                        background: `${meta.color}18`, border: `1px solid ${meta.color}28`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: meta.color }}>{meta.icon}</span>
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '14px', marginBottom: '3px', lineHeight: 1.3 }}>
                          {cat.name}
                        </p>
                        <p style={{ color: 'var(--text-faint)', fontSize: '12px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cat.description || 'Browse and start discussions'}
                        </p>
                      </div>

                      {/* Arrow */}
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--text-faint)', flexShrink: 0 }}>chevron_right</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </PaywallGate>
    </HubLayout>
  )
}
