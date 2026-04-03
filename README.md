# Phase - Period & Cycle Tracker PWA

A comprehensive cycle tracker for regular and irregular cycles (PCOD/PCOS) with intelligent symptom-based prediction and personalized wellness insights.

## Features

✨ **Dual Role System**
- **Tracker**: Female user tracking their cycle with customizable symptom logging
- **Partner**: Support partner with account linking or manual mode

🔐 **Hybrid Authentication**
- **Google Sign-In**: Secure OAuth authentication
- **Magic Link**: Passwordless email authentication
- **Role Selection**: Choose tracker or partner role before authentication
- **Seamless Integration**: Both auth methods create proper Firestore documents

📊 **Advanced Cycle Prediction**
- Symptom-based PCOD algorithm (not calendar-based)
- Weighted scoring: Cervical fluid (5 pts), BBT (2 pts), Cramps (1 pt)
- Ovulation detection at score >= 6
- Extended follicular detection for irregular cycles

💡 **Personalized Partner Suggestions**
- Smart daily suggestions tailored to the current cycle phase
- Adapts to partner support style and schedule constraints

🔗 **Secure Account Linking**
- 6-digit partner codes for account linking
- Manual mode for standalone partner tracking
- Firestore security rules for data privacy

📱 **PWA Capabilities**
- Offline support with service workers
- Installable as native app
- Mobile-first Tailwind CSS design

📅 **Interactive Cycle Calendar**
- Visual phase tracking with color-coded calendar
- Real-time phase updates based on symptoms
- Day-of-cycle tracking and next period predictions
- Click to view detailed calendar view

⚙️ **Customizable Settings**
- Adjustable cycle length settings
- Real-time ovulation prediction updates
- Personalized phase duration calculations

📝 **Smart Symptom Logging**
- Auto-update end date when start date changes (start date + 4 days)
- Manual override capability for end dates
- Symptom scoring and tracking
- Daily logging with real-time phase updates

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (mobile-first)
- **Backend**: Firebase Authentication + Cloud Firestore
- **PWA**: vite-plugin-pwa

## Project Structure

```
pt/
├── src/
│   ├── components/          # React components
│   │   ├── AuthPage.tsx
│   │   ├── TrackerOnboarding.tsx
│   │   ├── PartnerOnboarding.tsx
│   │   ├── TrackerDashboard.tsx
│   │   ├── PartnerDashboard.tsx
│   │   ├── LogSymptoms.tsx
│   │   └── LogPeriod.tsx
│   ├── services/            # Firebase services
│   │   ├── firebase.ts      # Firebase config
│   │   ├── auth.ts          # Auth logic
│   │   └── cycle.ts         # Cycle data operations
│   ├── utils/               # Utility functions
│   │   ├── pcod-algorithm.ts # PCOD calculation
│   │   └── codeGenerator.ts
│   ├── hooks/               # Custom React hooks
│   │   └── useAuth.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── firestore/
│   ├── firestore.rules      # Firestore security rules
│   └── firestore.indexes.json
├── public/                  # PWA assets
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## Setup Instructions

### 1. Prerequisites

- Node.js 16+ and npm
- Firebase project with Firestore enabled

### 2. Clone & Install

```bash
npm install
```

### 3. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore database in test mode (update rules later)
4. Get your Firebase config from Project Settings

### 4. Environment Variables

Create `.env.local` in the project root:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 5. Firestore Security Rules

1. Go to Firebase Console -> Firestore -> Rules
2. Replace with rules from `firestore/firestore.rules`
3. Publish the rules

### 6. Firestore Indexes

1. Go to Firebase Console -> Firestore -> Indexes
2. Create composite indexes from `firestore/firestore.indexes.json`
3. Or let Firebase auto-create them when needed

### 7. Deploy Firebase Functions (Optional)

```bash
firebase login
firebase deploy --only firestore:rules
```

### 8. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### 9. Build for Production

```bash
npm run build
npm run preview
```

## PCOD Algorithm Details

### Symptom Scoring

| Symptom | Score | Explanation |
|---------|-------|-------------|
| Egg-white cervical fluid | 5 | Primary ovulation indicator |
| BBT spike (>36.8°C) | 2 | Post-ovulation rise |
| Cramps | 1 | Secondary indicator |
| Mood changes | 0.5 | Subtle hormonal effect |

### Ovulation Detection

- **Trigger**: Daily symptom score >= 6
- **Result**: Sets phase to "ovulation" for 3 days
- **Forecast**: Next period exactly 14 days from ovulation

### Extended Follicular Phase

- **Trigger**: Day 20+ of cycle with no ovulation detected
- **Result**: Phase = "extended-follicular", next period = "pending"
- **Reason**: Handles PCOD with elongated follicular phases

## User Flows

### Tracker Onboarding

1. Sign up with email/password
2. Select role: "Tracker"
3. Receive unique 6-digit partner code
4. Choose symptoms to track (Cervical Fluid, BBT, Cramps, Mood)
5. Enter last period date
6. Start tracking!

### Partner Onboarding

1. Sign up with email/password
2. Select role: "Partner"
3. **Option A**: Link account with tracker's 6-digit code
   - Set support style & schedule constraints
4. **Option B**: Manual mode
   - Track data yourself
   - Set support style & schedule constraints

### Daily Logging (Tracker)

1. Log symptoms (only selected ones appear)
2. App updates cycle phase based on PCOD algorithm
3. Partner receives real-time notifications

### Partner Dashboard (Linked)

1. View linked tracker's current cycle phase
2. Receive personalized suggestions based on phase & preferences

### Partner Dashboard (Manual)

1. Log symptoms directly on partner's profile
2. View cycle phase in real-time
3. Access daily personalized suggestions

## Firestore Data Structure

### Collections

**`users/{uid}`**
```typescript
{
  uid: string
  email: string
  role: 'tracker' | 'partner'
  partnerCode?: string        // Only if Tracker
  linkedTrackerId?: string    // Only if Partner (linked)
  createdAt: Timestamp
}
```

**`trackerProfiles/{uid}`**
```typescript
{
  userId: string
  partnerCode: string
  trackedSymptoms: string[]
  lastPeriodDate: Timestamp | null
  cyclePhase: CyclePhase
  nextPeriodDate: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**`partnerProfiles/{uid}`**
```typescript
{
  userId: string
  linkedTrackerId?: string
  supportStyle?: string       // acts-of-service, gifts, emotional-support, etc.
  dailyScheduleConstraints?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**`cycleData/{userId}`**
```typescript
{
  userId: string
  phase: CyclePhase
  lastPeriodDate: Timestamp | null
  ovulationDetectedDate?: Timestamp
  nextPeriodDate: Timestamp | null
  dayOfCycle: number
  updatedAt: Timestamp
}
```

**`dailyLogs/{docId}`**
```typescript
{
  userId: string
  date: Timestamp
  symptoms: {
    cervicalFluid?: string
    bbt?: number
    cramps?: string
    mood?: string
  }
  notes?: string
  symptomScore: number
}
```

## Security & Privacy

### Firestore Security Rules

- Users can only access their own documents
- Linked partners can read tracker's cycle data
- Daily logs are private to the user
- Partner codes are 6-digit alphanumeric
- No unauthorized access to personal health data

## PWA Installation

The app works as a Progressive Web App:

**Desktop Chrome**: Click install icon in address bar
**Mobile**: "Add to Home Screen" in browser menu

Works offline with cached data. Service worker handles sync when connection returns.

## Customization

### Colors

Edit `tailwind.config.js` to customize phase colors.

### Scoring Algorithm

Adjust weights in `utils/pcod-algorithm.ts`.

## Troubleshooting

**Firebase Config Issues**
- Check `.env.local` matches Firebase project settings
- Verify Firestore is enabled in Firebase Console
- Check Firestore security rules are deployed

**PWA Not Installing**
- App must be served over HTTPS
- Check `vite.config.ts` PWA config
- Clear browser cache and service workers

## License

MIT
