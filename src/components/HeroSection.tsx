'use client'

import { useRouter } from 'next/navigation'

export default function HeroSection() {
  const router = useRouter()

  // Auction-related data nodes for background
  const dataNodes = [
    { icon: '🏆', label: 'Active Sessions', value: '12', position: 'top-left' },
    { icon: '👥', label: 'Participants', value: '156', position: 'top-right' },
    { icon: '💰', label: 'Total Bids', value: '2.4K', position: 'mid-left' },
    { icon: '⚡', label: 'Real-time', value: 'Live', position: 'mid-right' },
  ]

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-cyan-500/20 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-400/10 to-emerald-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Data Nodes - Similar to reference image */}
      {dataNodes.map((node, index) => (
        <div
          key={index}
          className={`absolute hidden lg:block ${getNodePosition(node.position)} animate-fade-in-up`}
          style={{animationDelay: `${0.5 + index * 0.2}s`}}
        >
          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center shadow-2xl">
            <div className="text-2xl mb-2">{node.icon}</div>
            <div className="text-sm text-slate-300 font-medium">{node.label}</div>
            <div className="text-lg font-bold text-white">{node.value}</div>
          </div>
        </div>
      ))}

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        {/* Interactive Button Above Title */}
        <div className="mb-8 animate-fade-in-up">
          <button className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl text-purple-300 hover:text-white hover:border-purple-400/50 transition-all duration-300 group">
            <span className="text-lg">🎯</span>
            <span className="font-medium">Unlock Your Bidding Power!</span>
            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
          </button>
        </div>

        {/* Main Title and Tagline */}
        <header className="mb-12 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black grand mb-6 leading-tight">
            Experience the Thrill of
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-red-500">
              Real-Time Bidding
            </span>
          </h1>
          <p className="text-xl sm:text-2xl lg:text-3xl text-slate-300 mb-6 max-w-4xl mx-auto leading-relaxed font-light">
            Dive into the world of auctions where innovative technology meets 
            <span className="text-amber-400 font-semibold"> instant participation</span> and 
            <span className="text-blue-400 font-semibold"> real-time excitement</span>
          </p>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
            No registration required • Mobile-optimized • Instant access
          </p>
        </header>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <button
            onClick={() => router.push('/join')}
            className="group relative px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-2xl shadow-2xl hover:shadow-amber-500/25 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
          >
            <span className="relative z-10 flex items-center space-x-2">
              <span>🚀</span>
              <span>Join Session Now</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          <button
            onClick={() => router.push('/create')}
            className="px-8 py-4 bg-white/10 border border-white/20 text-white font-semibold text-lg rounded-2xl hover:bg-white/20 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:-translate-y-1 backdrop-blur-sm"
          >
            <span className="flex items-center space-x-2">
              <span>✨</span>
              <span>Create Session</span>
            </span>
          </button>
        </div>

        {/* Additional Info */}
        <div className="text-center animate-fade-in-up" style={{animationDelay: '0.6s'}}>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            Perfect for community events, temple auctions, charity fundraisers, and group activities
          </p>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-fade-in-up" style={{animationDelay: '0.8s'}}>
          <div className="flex flex-col items-center space-y-2 text-slate-400">
            <span className="text-xs font-medium">Scroll down</span>
            <div className="w-6 h-10 border-2 border-slate-400 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-slate-400 rounded-full mt-2 animate-bounce"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function getNodePosition(position: string): string {
  switch (position) {
    case 'top-left':
      return 'top-20 left-20'
    case 'top-right':
      return 'top-20 right-20'
    case 'mid-left':
      return 'top-1/2 left-20 transform -translate-y-1/2'
    case 'mid-right':
      return 'top-1/2 right-20 transform -translate-y-1/2'
    default:
      return ''
  }
}
