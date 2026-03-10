import { Link } from '@tanstack/react-router'

export default function Footer() {
  return (
    <footer className="bg-navy-600 border-t border-white/5 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <p className="text-xl font-black mb-3">
              Study<span className="text-coral-400">WithStudents</span>
            </p>
            <p className="text-white/50 text-sm leading-relaxed">
              Peer tutoring with 0% commission. Learn from students who've been there.
            </p>
          </div>
          <div>
            <p className="font-semibold mb-3 text-white/80">Platform</p>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link to="/how-it-works" className="hover:text-coral-400 transition-colors">How It Works</Link></li>
              <li><Link to="/find-tutors"  className="hover:text-coral-400 transition-colors">Find Tutors</Link></li>
              <li><Link to="/become-tutor" className="hover:text-coral-400 transition-colors">Become a Tutor</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3 text-white/80">Company</p>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link to="/about" className="hover:text-coral-400 transition-colors">About Us</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-3 text-white/80">Account</p>
            <ul className="space-y-2 text-sm text-white/50">
              <li><Link to="/login"  className="hover:text-coral-400 transition-colors">Log In</Link></li>
              <li><Link to="/signup" className="hover:text-coral-400 transition-colors">Sign Up</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <p>© {new Date().getFullYear()} StudyWithStudents. All rights reserved.</p>
          <p>0% commission · Peer-to-peer · Student-first</p>
        </div>
      </div>
    </footer>
  )
}
