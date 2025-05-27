# Figma Screens Analysis - &Friends App

## Complete Screen Inventory (55 screens)

### 1. Splash/Onboarding Screens (4 screens)
- **Splash animations** (3 screens): Gradient background animations with "&" logo appearing
- **Welcome screen**: "No more guessing. Real plans, real people, real good times." with Continue button

### 2. Authentication Flow (17 screens)
1. **Phone verification**: "Are you real or something?" - Country selector, phone input
2. **Phone keyboard active**: Shows number pad
3. **Phone entered**: Shows entered phone number
4. **OTP verification**: "And we are almost there" - 6-digit code input
5. **OTP partial**: Shows partial code entry
6. **Name input**: "What should we call you?" - Full name and handle fields
7. **Avatar picker**: "Time to add a face to the name" - Camera/gallery options
8. **Avatar selected**: Shows selected profile photo
9. **Contacts permission**: "Help us find your people" - Request contacts access
10. **Location permission**: "See what's happening nearby" - Request location access
11. **Birthday input**: "Gotta ask, how old are you?" - Date dropdowns with hide option
12. **Path input**: "What's your path?" - Job/school/freelance text input
13. **Path keyboard**: Shows keyboard active state
14. **Music preference**: "What's your jam?" - Song search and selection list
15. **Restaurant preference**: "Got restaurant recs?" - Restaurant search list
16. **Hobbies selection**: "Yep, let's talk hobbies" - Multi-select hobby chips
17. **Hobbies selected**: Shows selected hobbies highlighted

### 3. Home/Feed Screens (3 screens)
1. **Home feed**: "Good Morning [Name]" - Stories strip, search bar, category tabs, map preview, event recommendations
2. **Map view expanded**: Full map with event pins and clusters
3. **Map with people**: Shows attendee avatars on event pins

### 4. Event Details Screens (3 screens)
1. **Pasta Night (locked)**: Yellow theme, "No peeking" section for non-RSVPed users
2. **Pasta Night (unlocked)**: Full details with time, location, attendees, what to bring
3. **Birthday Party**: Green theme with cake illustration, full event details

### 5. RSVP Confirmation Screens (6 screens)
- Various themed confirmation animations:
  1. Beer cheers illustration
  2. Disco ball
  3. Wine/cheese/bread
  4. Birthday cake
  5. Dancing figure
  6. Geometric pattern
- All show "You are in! [Event Name]" with calendar/share options

### 6. Notifications Screens (2 screens)
1. **Notifications list**: Shows invites, follows, RSVPs, messages
2. **Empty notifications**: "Nothing here yet!" with relaxing figure illustration

### 7. Messages/Chat Screens (4 screens)
1. **Chat list**: Groups, upcoming event chats, friends list
2. **1-on-1 conversation**: Individual chat with message bubbles
3. **Event group chat**: Shows poll options (meeting location)
4. **Poll overlay**: Time/movie selection polls with vote counts

### 8. Create Event Screens (6 screens)
1. **Create event form**: Title, date/time, location, description, tags, privacy
2. **Form filled**: Shows entered event details
3. **Edit cover - Style tab**: Font selection, background colors, media upload
4. **Edit cover - Decorate tab**: Illustration stickers grid
5. **Edit cover - Templates tab**: Pre-designed event templates
6. **Event published**: Success screen with preview card

### 9. Calendar Screens (4 screens)
1. **Today view (gradient 1)**: Pink/yellow gradient, daily event list
2. **Today view (gradient 2)**: Blue/white gradient
3. **Today view (gradient 3)**: Purple gradient
4. **Calendar month view**: Full month calendar with event dots

### 10. Profile Screens (4 screens)
1. **Profile - About tab**: Bio, location, stats, interests, favorite items
2. **Profile - Attended tab**: Past events grid
3. **Profile - Memories tab**: Photo grid from events
4. **Profile - Organized tab**: Events user has created

### 11. Person Card Screens (2 screens)
1. **User card 1**: Full-screen profile preview with Connect button
2. **User card 2**: Different user example

## Key UI Components & Features

### Navigation
- Bottom tab bar: Home, Memories, Create (plus button), Calendar, Profile
- Top bar: Back arrow, screen title, chat/notification icons

### Common Elements
- Custom illustrations throughout (black & white line art)
- Gradient backgrounds (various color combinations)
- Rounded corners on all cards/buttons
- Custom fonts: Classic Invite, After Hours, Playfair Display
- Avatar stacks showing attendees
- "+X going" indicators
- Category chips/tabs
- Search bars with placeholder text

### Special Features
- Stories/memories strip at top of home
- Interactive map with event clustering
- Poll creation in group chats
- Event cover customization (fonts, colors, stickers, templates)
- RSVP animations with themed illustrations
- Privacy toggles (hide birth date, invite-only events)
- Multi-step onboarding with progress indicators
- Permission requests with custom illustrations

## Missing from Current Implementation
Based on the codebase review, the following screens/features need to be implemented:
1. Complete onboarding flow (all 17 screens)
2. RSVP confirmation animations
3. Poll creation/voting in chats
4. Event cover customization UI
5. Calendar month view
6. Person card overlay
7. Empty states with custom illustrations
8. Gradient backgrounds system
9. Custom font integration
10. Stories/memories creation flow