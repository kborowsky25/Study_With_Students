import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getCategories } from '../api/forum'
import HubLayout from '../components/layout/HubLayout'
import { PageTitle } from '../context/PageTitleContext'
import PaywallGate from '../components/features/PaywallGate'
import toast from 'react-hot-toast'

const CORAL = '#ff725e'

const CATEGORY_ICONS = [
  { icon: 'menu_book', color: '#6c63ff' },
  { icon: 'lightbulb', color: '#f9c74f' },
  { icon: 'science', color: '#06d6a0' },
  { icon: 'architecture', color: '#3a86ff' },
  { icon: 'forum', color: '#ff725e' },
  { icon: 'language', color: '#2ec4b6' },
  { icon: 'account_balance', color: '#a8dadc' },
  { icon: 'school', color: '#f4845f' },
]

const COMMUNITY_RULES = [
  { icon: 'handshake', title: 'Be respectful', desc: 'Treat all members with kindness.' },
  { icon: 'verified', title: 'Stay on topic', desc: 'Keep discussions relevant to studying.' },
  { icon: 'block', title: 'No spam', desc: 'No self-promotion or repetitive posts.' },
]

const TABS = [
  { id: 'hot',  label: 'Hot',  icon: 'local_fire_department' },
  { id: 'new',  label: 'New',  icon: 'auto_awesome' },
  { id: 'top',  label: 'Top',  icon: 'trending_up' },
]

export default function ForumHome() {
  const [categories, setCategories] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState('hot')

  useEffect(() => {
    getCategories()
      .then(({ data }) => setCategories(data.categories ?? []))
      .catch(() => toast.error('Could not load forum'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <HubLayout>
      <PageTitle title="Forum" icon="forum" />
      <PaywallGate feature="Community Forum">
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', maxWidth: '1100px', margin: '0 auto' }}>

          {/* ── Left sidebar ──────────────────────────────────────────── */}
          <div style={{
            width: '240px', minWidth: '240px', flexShrink: 0,
            display: 'flex', flexDirection: 'column', gap: '14px',
          }}
            className="hidden lg:flex"
          >
            {/* Branding card */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              overflow: 'hidden',
            }}>
              {/* Banner */}
              <div style={{
                height: '60px',
                background: `linear-gradient(135deg, ${CORAL}cc, #ff8f7e99)`,
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', bottom: '-20px', left: '16px',
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: 'var(--bg-card)', border: '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: CORAL }}>school</span>
                </div>
              </div>
              <div style={{ padding: '28px 16px 16px' }}>
                <p style={{ color: 'var(--text)', fontWeight: '800', fontSize: '14px', marginBottom: '4px' }}>r/SWSForum</p>
                <p style={{ color: 'var(--text-faint)', fontSize: '12px', lineHeight: 1.5, marginBottom: '14px' }}>
                  The Study With Students community. Ask questions, share knowledge, and grow together.
                </p>
                <Link
                  to="/forum/category/$categoryId/new"
                  params={{ categoryId: String(categories[0]?.id ?? '1') }}
                  style={{
                    display: 'block', width: '100%', padding: '9px 12px',
                    background: CORAL, color: 'white', fontWeight: '700', fontSize: '13px',
                    borderRadius: '10px', textAlign: 'center', textDecoration: 'none',
                    transition: 'opacity 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Create Post
                </Link>
              </div>
            </div>

            {/* Category quick-links */}
            {!loading && categories.length > 0 && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '14px',
              }}>
                <p style={{ color: 'var(--text-faint)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '10px' }}>Categories</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {categories.map((cat, i) => {
                    const ic = CATEGORY_ICONS[i % CATEGORY_ICONS.length]
                    return (
                      <Link
                        key={cat.id}
                        to="/forum/category/$categoryId"
                        params={{ categoryId: String(cat.id) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '8px 10px', borderRadius: '9px',
                          textDecoration: 'none', transition: 'background 0.12s',
                          color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '17px', color: ic.color, flexShrink: 0 }}>
                          {ic.icon}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Community rules */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '14px',
            }}>
              <p style={{ color: 'var(--text-faint)', fontSize: '11px', fontWeight: '700', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '12px' }}>Community Rules</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {COMMUNITY_RULES.map((rule, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '8px',
                      background: CORAL + '15', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: CORAL }}>{rule.icon}</span>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text)', fontWeight: '600', fontSize: '12px', marginBottom: '2px' }}>
                        {i + 1}. {rule.title}
                      </p>
                      <p style={{ color: 'var(--text-faint)', fontSize: '11px', lineHeight: 1.4 }}>{rule.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Main content ──────────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Page title */}
            <div style={{ marginBottom: '18px' }}>
              <h1 style={{ color: 'var(--text)', fontWeight: '900', fontSize: '26px', letterSpacing: '-0.5px', marginBottom: '4px' }}>
                Community Forum
              </h1>
              <p style={{ color: 'var(--text-faint)', fontSize: '14px' }}>Ask questions, share knowledge, and connect with peers</p>
            </div>

            {/* Tab bar */}
            <div style={{
              display: 'flex', gap: '4px', marginBottom: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '5px',
              width: 'fit-content',
            }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 16px', borderRadius: '9px',
                    border: 'none', cursor: 'pointer',
                    fontWeight: '600', fontSize: '13px',
                    background: activeTab === tab.id ? CORAL : 'transparent',
                    color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Category cards */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{
                    height: '88px', borderRadius: '14px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '52px', color: 'var(--text-faint)', marginBottom: '12px', display: 'block' }}>forum</span>
                <p style={{ color: 'var(--text-muted)', fontWeight: '600', marginBottom: '6px' }}>No forum categories yet</p>
                <p style={{ color: 'var(--text-faint)', fontSize: '13px' }}>Check back soon!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categories.map((cat, i) => {
                  const ic = CATEGORY_ICONS[i % CATEGORY_ICONS.length]
                  const delayClass = `delay-${Math.min(i * 100, 500)}`
                  return (
                    <div
                      key={cat.id}
                      className={`animate-slide-up ${delayClass}`}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'stretch',
                        overflow: 'hidden',
                        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)'
                        e.currentTarget.style.borderColor = ic.color + '50'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = 'none'
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      {/* Vote column */}
                      <div style={{
                        width: '52px', flexShrink: 0,
                        background: 'var(--bg)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: '4px', padding: '14px 0',
                        borderRight: '1px solid var(--border)',
                      }}>
                        <button
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-faint)', padding: '2px',
                            display: 'flex', borderRadius: '6px', transition: 'color 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = CORAL}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                          onClick={e => e.preventDefault()}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_drop_up</span>
                        </button>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700' }}>0</span>
                        <button
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-faint)', padding: '2px',
                            display: 'flex', borderRadius: '6px', transition: 'color 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#3a86ff'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                          onClick={e => e.preventDefault()}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_drop_down</span>
                        </button>
                      </div>

                      {/* Main content */}
                      <Link
                        to="/forum/category/$categoryId"
                        params={{ categoryId: String(cat.id) }}
                        style={{
                          flex: 1, minWidth: 0,
                          display: 'flex', alignItems: 'center', gap: '16px',
                          padding: '16px 18px',
                          textDecoration: 'none',
                        }}
                      >
                        {/* Category icon */}
                        <div style={{
                          width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
                          background: ic.color + '20',
                          border: `1.5px solid ${ic.color}35`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: ic.color }}>{ic.icon}</span>
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: 'var(--text)', fontWeight: '700', fontSize: '15px', marginBottom: '4px' }}>
                            {cat.name}
                          </p>
                          <p style={{
                            color: 'var(--text-faint)', fontSize: '13px', lineHeight: 1.4,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {cat.description}
                          </p>
                        </div>

                        {/* Right: view threads + member count */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            background: ic.color + '15',
                            border: `1px solid ${ic.color}25`,
                            borderRadius: '20px', padding: '3px 10px',
                          }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: ic.color }}>people</span>
                            <span style={{ color: ic.color, fontSize: '11px', fontWeight: '700' }}>
                              {Math.floor(Math.random() * 900 + 100)}
                            </span>
                          </div>
                          <span style={{ color: CORAL, fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            View threads
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                          </span>
                        </div>
                      </Link>
                    </div>
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
