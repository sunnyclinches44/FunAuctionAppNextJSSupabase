'use client'

import { useRouter } from 'next/navigation'

export default function ModernFooter() {
  const router = useRouter()

  // Type for footer links
  type FooterLink = { label: string; path?: string; icon: string }
  type FooterSection = { title: string; links: FooterLink[] }

  const footerSections: FooterSection[] = [
    {
      title: 'Quick Links',
      links: [
        { label: 'Join Session', path: '/join', icon: '🚀' },
        { label: 'Create Session', path: '/create', icon: '✨' },
        { label: 'Admin Panel', path: '/admin', icon: '⚙️' },
      ]
    },
    {
      title: 'Features',
      links: [
        { label: 'Real-time Bidding', icon: '⚡' },
        { label: 'Mobile Optimized', icon: '📱' },
        { label: 'Live Leaderboards', icon: '🏆' },
        { label: 'Custom Bidding', icon: '💰' },
      ]
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', icon: '❓' },
        { label: 'Contact Us', icon: '📧' },
        { label: 'Privacy Policy', icon: '🔒' },
        { label: 'Terms of Service', icon: '📋' },
      ]
    }
  ]

  return (
    <footer className="relative border-t border-white/10 bg-black/20 backdrop-blur-xl">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-amber-400/5 to-orange-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/5 to-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                🙏
              </div>
              <h3 className="text-2xl font-bold grand">Fun Auction</h3>
            </div>
            <p className="text-slate-400 mb-6 max-w-md text-sm leading-relaxed">
              Experience the thrill of real-time bidding in a fun, devotional atmosphere. 
              No registration required, mobile-optimized, and instant participation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push('/join')}
                className="btn btn-primary px-6 py-3 text-sm font-semibold w-full sm:w-auto"
              >
                Join Now
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="btn btn-ghost px-6 py-3 text-sm font-semibold w-full sm:w-auto"
              >
                Admin Panel
              </button>
            </div>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="text-lg font-semibold text-slate-200 mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    {link.path ? (
                      <button
                        onClick={() => link.path && router.push(link.path)}
                        className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 transition-colors duration-200 group"
                      >
                        <span className="text-sm group-hover:scale-110 transition-transform duration-200">
                          {link.icon}
                        </span>
                        <span className="text-sm">{link.label}</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2 text-slate-400">
                        <span className="text-sm">{link.icon}</span>
                        <span className="text-sm">{link.label}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-slate-500 text-sm text-center sm:text-left">
            © 2024 Fun Auction. All rights reserved.
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-slate-400">
              <span className="text-xs">Made with</span>
              <span className="text-red-400">❤️</span>
              <span className="text-xs">for amazing auctions</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
