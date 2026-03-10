import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

const TEAM = [
  { name: 'Kilian', role: 'Co-founder', emoji: '👨‍💻', desc: 'Computer Science student passionate about making education accessible.' },
  { name: 'Mickey', role: 'Co-founder', emoji: '👨‍🎓', desc: 'Economics graduate who believes everyone deserves quality tutoring.' },
]

const VALUES = [
  { icon: '🌍', title: 'Community', desc: 'We believe learning happens best together. Our platform connects students who lift each other up.' },
  { icon: '⭐', title: 'Excellence', desc: 'We hold ourselves and our tutors to the highest standards, so you always get the best.' },
  { icon: '💡', title: 'Innovation', desc: "We're constantly building new features to make studying more efficient and enjoyable." },
]

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-navy-500">
      <Navbar />

      {/* Hero */}
      <section className="py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-coral-400/5 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-5xl font-black text-white mb-4">About Us</h1>
          <p className="text-white/60 text-xl leading-relaxed">
            We're students who got tired of expensive, commission-heavy tutoring platforms. So we built our own — with 0% commission, forever.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-navy-600/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-black text-white mb-6">Our Mission</h2>
          <p className="text-white/60 text-lg leading-relaxed max-w-2xl mx-auto">
            Education should be affordable and accessible. When a tutor earns £30/hour but a student pays £40, something's broken. We connect them directly — no middleman, no cuts, no hidden fees.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-white text-center mb-12">What we stand for</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {VALUES.map(({ icon, title, desc }) => (
              <div key={title} className="glass-hover p-8 text-center">
                <div className="text-5xl mb-4">{icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-navy-600/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-white text-center mb-12">Meet the team</h2>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {TEAM.map(({ name, role, emoji, desc }) => (
              <div key={name} className="glass p-8 text-center">
                <div className="text-6xl mb-4">{emoji}</div>
                <h3 className="text-xl font-bold text-white">{name}</h3>
                <p className="text-coral-400 text-sm font-medium mb-3">{role}</p>
                <p className="text-white/50 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
