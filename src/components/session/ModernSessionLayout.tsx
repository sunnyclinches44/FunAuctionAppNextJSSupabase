'use client'

import { useState } from 'react'
import ParticipantJoin from './ParticipantJoin'
import ParticipantsList from './ParticipantsList'
import Leaderboard from './Leaderboard'
import BidsHistory from '@/components/BidsHistory'
import AchievementToast from '@/components/ui/AchievementToast'

interface ModernSessionLayoutProps {
  session: any
  rtReady: boolean
  participants: any[]
  myDeviceId: string
  myName: string
  onNameChange: (name: string) => void
  onSave: () => Promise<void>
  isSaving: boolean
  hasJoined: boolean
  displayName?: string
  onPlaceBid: (amount: number, participantId: string) => Promise<boolean>
  onCustomBid: (participantId: string) => void
  isPlacingBid: string | null
  showCustomInput: string | null
  customAmount: string
  onCustomAmountChange: (amount: string) => void
  onCustomAmountSubmit: (participantId: string) => void
  onCustomAmountCancel: () => void
  totalAmount: number
  sessionCode: string
  achievementToast: any
  onCloseToast: () => void
}

export default function ModernSessionLayout({
  session,
  rtReady,
  participants,
  myDeviceId,
  myName,
  onNameChange,
  onSave,
  isSaving,
  hasJoined,
  displayName,
  onPlaceBid,
  onCustomBid,
  isPlacingBid,
  showCustomInput,
  customAmount,
  onCustomAmountChange,
  onCustomAmountSubmit,
  onCustomAmountCancel,
  totalAmount,
  sessionCode,
  achievementToast,
  onCloseToast
}: ModernSessionLayoutProps) {
  const [activeTab, setActiveTab] = useState<'participants' | 'leaderboard' | 'history'>('participants')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-blue-400/10 to-cyan-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-400/5 to-emerald-500/5 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Achievement Toast */}
      {achievementToast && (
        <AchievementToast
          message={achievementToast.message}
          type={achievementToast.type}
          onClose={onCloseToast}
          duration={5000}
        />
      )}

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Join Section - Enhanced Design */}
        <div className="mb-8 animate-fade-in-up">
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl text-amber-300">
                  <span className="text-lg">🚀</span>
                  <span className="font-medium">Join the Auction</span>
                </div>
                <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium ${
                  rtReady 
                    ? 'bg-green-500/20 border border-green-500/30 text-green-300' 
                    : 'bg-slate-500/20 border border-slate-500/30 text-slate-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${rtReady ? 'bg-green-400' : 'bg-slate-400'} ${rtReady ? 'animate-pulse' : ''}`}></div>
                  <span>{rtReady ? 'Live' : 'Connecting...'}</span>
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-200 mb-2">
                Ready to Start Bidding?
              </h2>
              <p className="text-slate-400">
                Enter your display name and join the excitement!
              </p>
            </div>
            
            <ParticipantJoin
              myName={myName}
              onNameChange={onNameChange}
              onSave={onSave}
              isSaving={isSaving}
              hasJoined={hasJoined}
              displayName={displayName}
            />
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden mb-6">
          <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-2">
            <div className="flex space-x-2">
              {[
                { key: 'participants', label: 'Participants', icon: '👥' },
                { key: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
                { key: 'history', label: 'History', icon: '📜' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="lg:hidden space-y-6">
          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div className="animate-fade-in-up">
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-xl">
                    👥
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">Participants</h3>
                </div>
                <ParticipantsList
                  participants={participants}
                  currentDeviceId={myDeviceId}
                  onPlaceBid={onPlaceBid}
                  onCustomBid={onCustomBid}
                  isPlacingBid={isPlacingBid}
                  showCustomInput={showCustomInput}
                  customAmount={customAmount}
                  onCustomAmountChange={onCustomAmountChange}
                  onCustomAmountSubmit={onCustomAmountSubmit}
                  onCustomAmountCancel={onCustomAmountCancel}
                />
              </div>
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-xl">
                    🏆
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">Leaderboard</h3>
                </div>
                <Leaderboard participants={participants} />
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-xl">
                    📜
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">Bid History</h3>
                </div>
                <BidsHistory sessionCode={sessionCode} />
              </div>
            </div>
          )}

          {/* Grand Total - Always Visible */}
          <div className="animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 backdrop-blur-xl rounded-3xl p-6 shadow-2xl">
              <div className="text-center">
                <div className="text-2xl mb-2">💰</div>
                <h3 className="text-lg font-medium text-amber-300 mb-2">Grand Total</h3>
                <div className="text-3xl font-bold text-white">${totalAmount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Join + Leaderboard */}
          <div className="lg:col-span-3 space-y-6">
            {/* Sticky Leaderboard */}
            <div className="sticky top-24">
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-xl">
                    🏆
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">Leaderboard</h3>
                </div>
                <Leaderboard participants={participants} />
              </div>
            </div>
          </div>

          {/* Center Column: Participants List */}
          <div className="lg:col-span-6">
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-xl">
                  👥
                </div>
                <h3 className="text-xl font-bold text-slate-200">Participants</h3>
              </div>
              <ParticipantsList
                participants={participants}
                currentDeviceId={myDeviceId}
                onPlaceBid={onPlaceBid}
                onCustomBid={onCustomBid}
                isPlacingBid={isPlacingBid}
                showCustomInput={showCustomInput}
                customAmount={customAmount}
                onCustomAmountChange={onCustomAmountChange}
                onCustomAmountSubmit={onCustomAmountSubmit}
                onCustomAmountCancel={onCustomAmountCancel}
              />
            </div>
          </div>

          {/* Right Column: Bids History + Total */}
          <div className="lg:col-span-3 space-y-6">
            {/* Sticky Bids History */}
            <div className="sticky top-24">
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-xl">
                    📜
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">Bid History</h3>
                </div>
                <BidsHistory sessionCode={sessionCode} />
              </div>

              {/* Grand Total */}
              <div className="mt-6 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 backdrop-blur-xl rounded-3xl p-6 shadow-2xl">
                <div className="text-center">
                  <div className="text-2xl mb-2">💰</div>
                  <h3 className="text-lg font-medium text-amber-300 mb-2">Grand Total</h3>
                  <div className="text-3xl font-bold text-white">${totalAmount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tablet Layout */}
        <div className="hidden md:block lg:hidden">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column: Leaderboard */}
            <div className="space-y-6">
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center text-xl">
                    🏆
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">Leaderboard</h3>
                </div>
                <Leaderboard participants={participants} />
              </div>
            </div>

            {/* Right Column: Participants + Bids + Total */}
            <div className="space-y-6">
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-xl">
                    👥
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">Participants</h3>
                </div>
                <ParticipantsList
                  participants={participants}
                  currentDeviceId={myDeviceId}
                  onPlaceBid={onPlaceBid}
                  onCustomBid={onCustomBid}
                  isPlacingBid={isPlacingBid}
                  showCustomInput={showCustomInput}
                  customAmount={customAmount}
                  onCustomAmountChange={onCustomAmountChange}
                  onCustomAmountSubmit={onCustomAmountSubmit}
                  onCustomAmountCancel={onCustomAmountCancel}
                />
              </div>

              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-xl">
                    📜
                  </div>
                  <h3 className="text-xl font-bold text-slate-200">Bid History</h3>
                </div>
                <BidsHistory sessionCode={sessionCode} />
              </div>

              <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 backdrop-blur-xl rounded-3xl p-6 shadow-2xl">
                <div className="text-center">
                  <div className="text-2xl mb-2">💰</div>
                  <h3 className="text-lg font-medium text-amber-300 mb-2">Grand Total</h3>
                  <div className="text-3xl font-bold text-white">${totalAmount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
