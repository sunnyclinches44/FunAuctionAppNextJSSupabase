'use client'

export default function FeaturesSection() {
  const features = [
    {
      icon: '⚡',
      title: 'Real-time Bidding',
      description: 'Experience instant updates as bids are placed. No page refreshes needed!',
      gradient: 'from-purple-500 to-pink-500',
      delay: '0.1s',
      badge: 'Free'
    },
    {
      icon: '📱',
      title: 'Mobile Optimized',
      description: 'Perfect experience on all devices. Touch-friendly interface for mobile users.',
      gradient: 'from-green-500 to-teal-500',
      delay: '0.2s',
      badge: 'Free'
    },
    {
      icon: '🚀',
      title: 'Instant Join',
      description: 'Jump right into the action! Just enter a session code and start bidding.',
      gradient: 'from-blue-500 to-indigo-500',
      delay: '0.3s',
      badge: 'Free'
    },
    {
      icon: '🏆',
      title: 'Live Leaderboards',
      description: 'See who\'s leading in real-time with beautiful visual rankings and achievements.',
      gradient: 'from-yellow-500 to-orange-500',
      delay: '0.4s',
      badge: 'Free'
    },
    {
      icon: '💰',
      title: 'Flexible Bidding',
      description: 'Use preset amounts or enter custom bids. Full control over your contribution.',
      gradient: 'from-red-500 to-pink-500',
      delay: '0.5s',
      badge: 'Free'
    },
    {
      icon: '✨',
      title: 'Session Creation',
      description: 'Create and manage your own auction sessions with advanced admin features.',
      gradient: 'from-indigo-500 to-purple-500',
      delay: '0.6s',
      badge: 'Sign Up'
    }
  ]

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl text-blue-300 mb-6">
            <span className="text-lg">✨</span>
            <span className="font-medium">Key Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-200 mb-6">
            Everything You Need for
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Amazing Auctions
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto">
            Discover the features that make Fun Auction the perfect platform for real-time bidding experiences
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative animate-fade-in-up"
              style={{animationDelay: feature.delay}}
            >
              {/* Card */}
              <div className="relative h-full p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden">
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                {/* Icon */}
                <div className={`relative z-10 w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center text-2xl shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>

                {/* Badge */}
                <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-medium ${
                  feature.badge === 'Free' 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {feature.badge}
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-slate-200 mb-3 group-hover:text-white transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>

                {/* Hover effect line */}
                <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:w-full transition-all duration-500"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 animate-fade-in-up" style={{animationDelay: '0.7s'}}>
          <div className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl text-amber-300">
            <span className="text-lg">🎯</span>
            <span className="font-medium">Ready to start bidding?</span>
          </div>
        </div>
      </div>
    </section>
  )
}
