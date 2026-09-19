# Component Organization

This directory contains all React components organized by feature and purpose.

## Folder Structure

### 📁 `auth/` - Authentication Components
- `SignInCard.tsx` - User sign-in interface
- `AuthProvider.tsx` - Authentication context provider
- `UserBar.tsx` - User information display
- `index.ts` - Exports all auth components

### 📁 `auction/` - Auction Game Components
- `AuctionTable.tsx` - Main auction table display
- `BidsHistory.tsx` - Bidding history component
- `ControlsBar.tsx` - Auction control buttons
- `CustomAmountBar.tsx` - Custom bid amount input
- `Chips.tsx` - Chip/token components
- `index.ts` - Exports all auction components

### 📁 `layout/` - Layout & Navigation Components
- `Navigation.tsx` - Main navigation bar
- `ModernFooter.tsx` - Page footer
- `Toolbar.tsx` - Toolbar component
- `ErrorBoundary.tsx` - Error boundary wrapper
- `index.ts` - Exports all layout components

### 📁 `marketing/` - Landing Page Components
- `HeroSection.tsx` - Main hero section
- `FeaturesSection.tsx` - Features showcase
- `HowItWorksSection.tsx` - How it works section
- `Particles.tsx` - Background particles effect
- `index.ts` - Exports all marketing components

### 📁 `quiz/` - Live Quiz (participant side)
- `QuizModal.tsx` - The pop-up over the auction: question, own answer, reveal, final score
- `QuizCard.tsx` - Sidebar status card; reopens a dismissed pop-up
- `QuizOption.tsx` - One of the four options, shared with the admin views
- `index.ts` - Exports all quiz components

### 📁 `session/` - Session Management Components
- `ModernSessionLayout.tsx` - Session layout wrapper
- `ParticipantsList.tsx` - Session participants list
- `Leaderboard.tsx` - Session leaderboard
- `SessionHeader.tsx` - Session header
- `ParticipantJoin.tsx` - Participant join interface

### 📁 `admin/` - Admin Panel Components
- `ModernAdminLayout.tsx` - Admin layout wrapper
- `RoundControl.tsx` - Open the next bidding round
- `QuizRunner.tsx` - Live quiz control strip: release, reveal, finish, reset
- `QuizQuestionList.tsx` - The run sheet: every question with release/reveal/edit and who answered what
- `QuizQuestionForm.tsx` - Write or edit a question: prompt, four options, tick the correct one
- `QuizLeaderboard.tsx` - Everyone's score, organiser only

### 📁 `ui/` - Reusable UI Components
- `LoadingSpinner.tsx` - Loading spinner
- `AchievementToast.tsx` - Achievement notification

### 📁 `common/` - Common/Shared Components
- Re-exports from `ui/` for backward compatibility

## Import Usage

### Before (Flat Structure)
```typescript
import Navigation from '@/components/Navigation'
import HeroSection from '@/components/HeroSection'
```

### After (Organized Structure)
```typescript
import Navigation from '@/components/layout/Navigation'
import HeroSection from '@/components/marketing/HeroSection'
```

### Using Index Files
```typescript
// Import multiple components from a category
import { Navigation, ModernFooter } from '@/components/layout'
import { HeroSection, FeaturesSection } from '@/components/marketing'
```

## Benefits

1. **Better Organization** - Components are grouped by feature
2. **Easier Navigation** - Find related components quickly
3. **Scalability** - Can handle hundreds of components without chaos
4. **Team Collaboration** - Different developers can work on different features
5. **Code Splitting** - Better for lazy loading and bundle optimization
6. **Maintainability** - Easier to maintain and refactor

## Migration Notes

All import statements have been updated to reflect the new structure. The main `index.ts` file provides backward compatibility by re-exporting all components.
