import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const STEPS = [
  { step: '01', title: 'Create your account', desc: 'Sign up for free in seconds. No credit card required.' },
  { step: '02', title: 'Find your tutor',     desc: 'Filter by subject, university, and availability to find the perfect match.' },
  { step: '03', title: 'Message directly',    desc: 'Chat with tutors, agree on a rate, and schedule your first session.' },
  { step: '04', title: 'Learn and grow',      desc: 'Meet on Zoom or in person. Pay your tutor directly — 0% platform fee.' },
]

const FEATURES = [
  { icon: '🔍', title: 'Smart search',       desc: 'Filter tutors by subject, university, availability and more.' },
  { icon: '💬', title: 'Direct messaging',   desc: 'No middlemen. Talk directly with your tutor before committing.' },
  { icon: '📅', title: 'Session scheduling', desc: 'Book sessions that fit your calendar with automatic reminders.' },
  { icon: '📚', title: 'Study rooms',        desc: 'Join group virtual study sessions for collaborative learning.' },
  { icon: '🗣️', title: 'Community forum',    desc: 'Ask questions, share knowledge, and connect with other students.' },
  { icon: '🏆', title: 'Progress tracking',  desc: 'Track your learning journey with XP and achievement milestones.' },
]

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-navy-500">
      <Navbar />

      {/* Hero */}
      <section className="py-24 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-coral-400/5 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-5xl font-black text-white mb-4">How It Works</h1>
          <p className="text-white/60 text-xl">Get started with peer tutoring in 4 simple steps</p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          {STEPS.map(({ step, title, desc }, i) => (
            <div key={step} className="flex items-start gap-6 glass p-6 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-14 h-14 rounded-2xl bg-coral-400/10 border border-coral-400/20 flex items-center justify-center flex-shrink-0">
                <span className="text-coral-400 font-black text-lg">{step}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
                <p className="text-white/50">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-navy-600/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-white text-center mb-12">Everything on the platform</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="glass-hover p-6">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-bold text-white text-lg mb-1">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-black text-white mb-4">Ready to get started?</h2>
          <p className="text-white/60 mb-8">Join thousands of students learning smarter with peer tutors.</p>
          <Link to="/signup" className="btn-primary text-lg px-10 py-3 inline-block">
            Create free account →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
