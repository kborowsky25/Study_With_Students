import { Link } from '@tanstack/react-router'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const BENEFITS = [
  { icon: '💰', title: 'Keep 100% of earnings', desc: 'Set your own rate and receive every pound your students pay. No cuts.' },
  { icon: '⏰', title: 'Flexible schedule',       desc: 'Tutor whenever it suits you. You control your availability calendar.' },
  { icon: '🌍', title: 'Reach more students',    desc: 'Access students from universities across the UK and beyond.' },
  { icon: '🚀', title: 'Build your profile',     desc: 'Showcase your degree, subjects, and experience with a verified profile.' },
]

const STEPS = [
  { step: '01', title: 'Create an account',  desc: 'Sign up as a regular user — it takes under a minute.' },
  { step: '02', title: 'Set up your profile', desc: 'Fill in your university, subjects, availability and a short bio.' },
  { step: '03', title: 'Get discovered',      desc: 'Students can now find and message you through the tutor search.' },
  { step: '04', title: 'Start earning',       desc: 'Agree a rate, schedule sessions, and get paid directly. 0% fee.' },
]

export default function BecomeATutor() {
  return (
    <div className="min-h-screen bg-navy-500">
      <Navbar />

      {/* Hero */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-coral-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-coral-400/10 border border-coral-400/20 text-coral-400 text-sm font-medium mb-6">
            🎓 Join 500+ peer tutors
          </div>
          <h1 className="text-5xl font-black text-white mb-4">
            Become a Tutor —<br />
            <span className="gradient-text">earn on your terms</span>
          </h1>
          <p className="text-white/60 text-xl leading-relaxed mb-8">
            Share your expertise, set your own rates, and keep every penny you earn. No platform fees. Ever.
          </p>
          <Link to="/signup" className="btn-primary text-lg px-10 py-3 inline-block">
            Start tutoring →
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-navy-600/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-white text-center mb-12">Why tutor with us?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map(({ icon, title, desc }) => (
              <div key={title} className="glass-hover p-6 text-center">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-white/50 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-black text-white text-center mb-12">How to get started</h2>
          <div className="space-y-6">
            {STEPS.map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-5 glass p-5">
                <div className="w-12 h-12 rounded-2xl bg-coral-400/10 border border-coral-400/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-coral-400 font-black">{step}</span>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{title}</h3>
                  <p className="text-white/50 text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-navy-600/50 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-black text-white mb-4">Join today — it's free</h2>
          <p className="text-white/60 mb-8">Set up your tutor profile in under 5 minutes.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="btn-primary text-lg px-10 py-3 inline-block">Create account</Link>
            <Link to="/login"  className="btn-secondary text-lg px-10 py-3 inline-block">Already a member?</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
