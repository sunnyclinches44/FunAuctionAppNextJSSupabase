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
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-8 pt-24 overflow-x-hidden">
        {/* Join Section - Enhanced Design - Only show if user hasn't joined */}
        {!hasJoined && (
          <div className="mb-8 animate-fade-in-up">
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="text-center mb-6">
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
                  <div className="inline-flex items-center space-x-2 px-4 sm:px-6 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl text-amber-300">
                    <span className="text-lg">🚀</span>
                    <span className="font-medium text-sm sm:text-base">Join the Auction</span>
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
        )}

        {/* Mobile FAB Navigation */}
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <div className="flex flex-col space-y-3">
            {/* Participants FAB */}
            <button
              onClick={() => setActiveTab('participants')}
              className={`w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 ${
                activeTab === 'participants'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-500/50'
                  : 'bg-black/40 backdrop-blur-xl border border-white/20 text-slate-300 hover:bg-black/60'
              }`}
              title="Participants"
            >
              <div className="flex items-center justify-center w-full h-full">
                <span className="text-xl">👥</span>
              </div>
            </button>

            {/* Leaderboard FAB */}
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 ${
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-yellow-500/50'
                  : 'bg-black/40 backdrop-blur-xl border border-white/20 text-slate-300 hover:bg-black/60'
              }`}
              title="Leaderboard"
            >
              <div className="flex items-center justify-center w-full h-full">
                <span className="text-xl">🏆</span>
              </div>
            </button>

            {/* History FAB */}
            <button
              onClick={() => setActiveTab('history')}
              className={`w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-500/50'
                  : 'bg-black/40 backdrop-blur-xl border border-white/20 text-slate-300 hover:bg-black/60'
              }`}
              title="Bid History"
            >
              <div className="flex items-center justify-center w-full h-full">
                <span className="text-xl">📜</span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="lg:hidden space-y-6 pb-32">
          {/* Active Section Indicator */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl">
              <span className="text-lg">
                {activeTab === 'participants' && '👥'}
                {activeTab === 'leaderboard' && '🏆'}
                {activeTab === 'history' && '📜'}
              </span>
              <span className="text-sm font-medium text-slate-300 capitalize">
                {activeTab}
              </span>
            </div>
          </div>
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
