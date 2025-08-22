'use client'

export default function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Join Session',
      description: 'Enter the session code and choose your display name. No account needed!',
      icon: '🚀',
      gradient: 'from-blue-500 to-cyan-500',
      delay: '0.1s'
    },
    {
      number: '02',
      title: 'Place Bids',
      description: 'Use preset amounts or enter custom bids. Watch the leaderboard in real-time!',
      icon: '💰',
      gradient: 'from-green-500 to-emerald-500',
      delay: '0.2s'
    },
    {
      number: '03',
      title: 'Win & Celebrate',
      description: 'Achieve the highest bid and see your name at the top of the leaderboard!',
      icon: '🏆',
      gradient: 'from-amber-500 to-orange-500',
      delay: '0.3s'
    }
  ]

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Top Border Separator - Subtle gradient line */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
      
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-gradient-to-br from-blue-400/5 to-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-gradient-to-br from-green-400/5 to-emerald-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20 animate-fade-in-up">
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl text-green-300 mb-6 shadow-inner shadow-green-500/10">
            <span className="text-lg">🎯</span>
            <span className="font-medium">How It Works</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-200 mb-6">
            Get Started in
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
              Three Simple Steps
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto">
            Experience the thrill of real-time bidding in just a few clicks
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative animate-fade-in-up group"
              style={{animationDelay: step.delay}}
            >
              {/* Step Card */}
              <div className="relative h-full p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 text-center group-hover:border-white/20 shadow-inner shadow-slate-900/20">
                {/* Step Number */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-white/20 shadow-lg shadow-inner shadow-slate-900/30">
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`w-20 h-20 bg-gradient-to-br ${step.gradient} rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300 shadow-inner shadow-black/20`}>
                  {step.icon}
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-slate-200 mb-4 group-hover:text-white transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors duration-300">
                  {step.description}
                </p>

                {/* Hover effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <div className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl text-amber-300 shadow-inner shadow-amber-500/10">
            <span className="text-lg">🎉</span>
            <span className="font-medium">Ready to experience the thrill?</span>
          </div>
        </div>
      </div>
      
      {/* Bottom Border Separator - Subtle gradient line */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
    </section>
  )
}
