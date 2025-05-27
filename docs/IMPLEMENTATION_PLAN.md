# & Friends App - Complete Implementation Plan

## Current Issues Found:
1. **Duplicate screens**: Screens exist in both `/src/screens/` and `/src/features/screens/`
2. **Missing screens**: Many Figma screens not implemented (17 auth screens, 6 RSVP confirmations, etc.)
3. **Incomplete features**: Polls, stories, event cover customization
4. **No gradient background system**
5. **Missing custom fonts and illustrations**
6. **Incorrect navigation structure**

## Required Folder Structure:
```
src/
├── screens/                    # All screens in one place
│   ├── splash/
│   │   ├── SplashScreen.tsx
│   │   └── OnboardingScreen.tsx
│   ├── auth/
│   │   ├── 01_PhoneVerificationScreen.tsx
│   │   ├── 02_CodeVerificationScreen.tsx
│   │   ├── 03_NameInputScreen.tsx
│   │   ├── 04_AvatarPickScreen.tsx
│   │   ├── 05_ContactsPermissionScreen.tsx
│   │   ├── 06_LocationPermissionScreen.tsx
│   │   ├── 07_AgeInputScreen.tsx
│   │   ├── 08_PathInputScreen.tsx
│   │   ├── 09_JamPickerScreen.tsx
│   │   ├── 10_RestaurantPickerScreen.tsx
│   │   ├── 11_HobbyPickerScreen.tsx
│   │   └── 12_LoadingScreen.tsx
│   ├── home/
│   │   ├── HomeScreen.tsx
│   │   ├── MapScreen.tsx
│   │   └── SearchScreen.tsx
│   ├── events/
│   │   ├── EventDetailsScreen.tsx
│   │   ├── CreateEventScreen.tsx
│   │   ├── EditCoverScreen.tsx
│   │   ├── RSVPConfirmationScreen.tsx
│   │   └── InviteFriendsScreen.tsx
│   ├── messages/
│   │   ├── ConversationsScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   └── PollScreen.tsx
│   ├── calendar/
│   │   ├── CalendarScreen.tsx
│   │   └── CalendarMonthScreen.tsx
│   ├── profile/
│   │   ├── ProfileScreen.tsx
│   │   ├── EditProfileScreen.tsx
│   │   └── PersonCardScreen.tsx
│   ├── notifications/
│   │   ├── NotificationsScreen.tsx
│   │   └── NotificationsFullScreen.tsx
│   └── memories/
│       ├── MemoriesScreen.tsx
│       └── CreateStoryScreen.tsx
├── components/
│   ├── common/
│   │   ├── GradientBackground.tsx
│   │   ├── CustomText.tsx
│   │   └── Illustrations.tsx
│   ├── event/
│   ├── chat/
│   ├── profile/
│   └── navigation/
├── hooks/
├── navigation/
├── lib/
├── utils/
└── types/
```

## Implementation Tasks:

### Phase 1: Fix File Organization
1. Remove `/src/features/` directory
2. Consolidate all screens in `/src/screens/`
3. Update all imports
4. Remove duplicate files

### Phase 2: Core Systems
1. **Gradient Background System**
   - Create reusable gradient component
   - Support animated transitions
   - Preset color combinations

2. **Custom Typography**
   - Install fonts: After Hours, Playfair Display, Classic Invite
   - Create text components with font variants

3. **Illustrations System**
   - Convert Figma illustrations to SVG
   - Create illustration component library

### Phase 3: Missing Screens
1. **Complete Auth Flow** (17 screens)
   - All onboarding steps with progress
   - Smooth transitions between steps
   - Data persistence

2. **RSVP Confirmations** (6 variations)
   - Animated illustrations
   - Different themes per event type
   - Share/calendar integration

3. **Event Cover Editor**
   - Style tab (fonts, colors)
   - Decorate tab (stickers)
   - Templates tab

4. **Poll System**
   - Create poll screen
   - Vote interface
   - Results display

5. **Calendar Month View**
   - Full month grid
   - Event indicators
   - Navigation

6. **Person Card Overlay**
   - Full-screen profile preview
   - Connect/follow actions

### Phase 4: Feature Completion
1. **Stories/Memories**
   - Story creation flow
   - Story viewer with progress
   - Memory gallery

2. **Map Features**
   - Event clustering
   - Category filtering
   - User location

3. **Chat Features**
   - Poll integration
   - Event group chats
   - Media sharing

### Phase 5: Supabase Integration
1. **Database**
   - Complete schema for all features
   - RLS policies
   - Migrations

2. **Storage**
   - Profile images
   - Event covers
   - Story media

3. **Real-time**
   - Chat messages
   - Notifications
   - RSVP updates

### Phase 6: Polish & Testing
1. **Animations**
   - Page transitions
   - Loading states
   - Micro-interactions

2. **Error Handling**
   - Network errors
   - Permission denials
   - Empty states

3. **Performance**
   - Image optimization
   - Lazy loading
   - Cache management

## Next Immediate Steps:
1. Clean up file structure
2. Implement gradient background system
3. Complete auth flow screens
4. Fix navigation to include all screens
5. Add missing UI components