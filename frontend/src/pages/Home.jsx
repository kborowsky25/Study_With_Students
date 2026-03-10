import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'Economics', 'English', 'History', 'Law', 'Psychology',
  'Engineering', 'Medicine', 'Finance', 'Statistics', 'Philosophy',
]

const FEATURES = [
  {
    icon: '🎓',
    title: 'Expert Peer Tutors',
    desc: 'Learn from students at top universities who aced the same courses.',
  },
  {
    icon: '💬',
    title: 'Real-time Messaging',
    desc: 'Connect directly with tutors and students — no middlemen.',
  },
  {
    icon: '📅',
    title: 'Flexible Scheduling',
    desc: 'Book sessions that fit your timetable with calendar sync.',
  },
  {
    icon: '🗣️',
    title: 'Community Forum',
    desc: 'Ask questions, share resources, and learn together.',
  },
  {
    icon: '📚',
    title: 'Study Rooms',
    desc: 'Join group sessions and collaborative online study rooms.',
  },
  {
    icon: '🏦',
    title: '0% Commission',
    desc: 'Every penny you pay goes directly to your tutor. Always.',
  },
]

const UNIS = ['Oxford', 'Cambridge', 'Imperial', 'UCL', 'KCL', 'NYU', 'NUS']

const REVIEWS = [
  { name: 'Aisha K.', uni: 'UCL', text: 'Found an incredible maths tutor in 10 minutes. Passed my exam with a First!' },
  { name: 'James T.', uni: 'Cambridge', text: 'As a tutor, getting 100% of what students pay makes such a difference.' },
  { name: 'Priya M.', uni: 'Imperial', text: 'The study rooms feature is game-changing for group revision.' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-navy-500">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[88vh] flex items-center">
        {/* Ambient blobs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-coral-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-coral-400/10 border border-coral-400/20 text-coral-400 text-sm font-medium mb-8 animate-fade-in">
            🎉 0% commission — always
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 animate-slide-up">
            Find a tutor who<br />
            <span className="gradient-text">really gets it</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 animate-slide-up">
            Connect with peer tutors from top universities. Zero commission, flexible scheduling, and a community that helps you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <Link to="/signup" className="btn-primary text-lg px-8 py-3 inline-block">
              Get started free →
            </Link>
            <Link to="/how-it-works" className="btn-secondary text-lg px-8 py-3 inline-block">
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Universities */}
      <section className="bg-white/5 py-10 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-white/40 text-sm font-medium uppercase tracking-widest mb-6">
            Tutors from top universities
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6">
            {UNIS.map(uni => (
              <div key={uni} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/60 font-semibold text-sm hover:border-coral-400/40 hover:text-white transition-all">
                {uni}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="section-title">Every subject covered</h2>
          <p className="section-sub">From A-levels to postgrad — find experts in your field</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {SUBJECTS.map(sub => (
            <Link
              key={sub}
              to="/find-tutors"
              className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white/70 font-medium text-sm hover:bg-coral-400/10 hover:border-coral-400/30 hover:text-coral-400 transition-all duration-200"
            >
              {sub}
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-navy-600/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">Everything you need to learn</h2>
            <p className="section-sub">A complete platform built for students, by students</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="glass-hover p-6">
                <div className="w-12 h-12 rounded-2xl bg-coral-400/10 flex items-center justify-center text-2xl mb-4">
                  {icon}
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why 0% commission */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="glass p-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-coral-400/10 to-transparent pointer-events-none rounded-2xl" />
            <p className="text-coral-400 font-bold uppercase tracking-widest text-sm mb-4">Our promise</p>
            <h2 className="text-4xl font-black text-white mb-4">
              Tutors keep <span className="gradient-text">100%</span> of earnings
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
              Traditional tutoring platforms take 20–30% of every session. We take nothing.
              Students pay less, tutors earn more. That's how it should be.
            </p>
            <div className="grid grid-cols-3 gap-6">
              {[['0%', 'Platform fee'], ['100%', 'To tutors'], ['∞', 'Scale possible']].map(([num, label]) => (
                <div key={label}>
                  <p className="text-4xl font-black text-coral-400">{num}</p>
                  <p className="text-white/50 text-sm mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-20 bg-navy-600/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">Loved by students and tutors</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {REVIEWS.map(({ name, uni, text }) => (
              <div key={name} className="glass p-6">
                <p className="text-white/70 text-sm leading-relaxed mb-4">"{text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-coral-400/20 flex items-center justify-center text-coral-400 font-bold text-xs">
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{name}</p>
                    <p className="text-white/40 text-xs">{uni}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to start learning?</h2>
          <p className="text-white/60 text-lg mb-8">Join thousands of students getting ahead with peer tutoring.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="btn-primary text-lg px-10 py-3 inline-block">
              Sign up — it's free
            </Link>
            <Link to="/become-tutor" className="btn-secondary text-lg px-10 py-3 inline-block">
              Become a tutor
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
