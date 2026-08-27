# MCL 2026-27 — Cricket Player Registration & Management

A production-ready player registration and management system for the **MCL 2026-27** hard-ball cricket league.

## What's Included

| Component | Stack | Purpose |
|-----------|-------|---------|
| **Mobile App** | React Native + TypeScript + Firebase | Player registration, profile, status |
| **Admin Dashboard** | React + Vite + Tailwind CSS + Firebase | Super Admin player management, export |
| **Backend** | Firebase Auth, Firestore + Cloudinary | Auth, data, profile image CDN |

## Features

### Player App
- Email/password authentication
- 4-step registration form with validation
- Profile photo upload
- Unique MCL Player ID (`MCL-2026-001`, etc.)
- Registration status tracking (Pending / Approved / Rejected / Suspended)
- Player profile view

### Super Admin Dashboard
- Dashboard with stat cards (total, approved, pending, rejected, draft eligible)
- Player table with search and multi-filter
- Approve / Reject / Suspend / Delete actions
- Draft eligibility management
- Export to Excel, CSV, and PDF
- League settings (registration open/close, public list)
- Audit log
- Public player list preview

## Project Structure

```
mclregistration/
├── src/                    # React Native mobile app
│   ├── components/
│   ├── screens/
│   ├── navigation/
│   ├── services/
│   ├── firebase/
│   ├── hooks/
│   ├── utils/
│   ├── constants/
│   └── types/
├── admin/                  # Web Super Admin dashboard
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── layouts/
│       ├── services/
│       └── firebase/
└── firebase/               # Security rules & indexes
    ├── firestore.rules
    ├── storage.rules
    └── firestore.indexes.json
```

## Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (e.g. `mcl-2026`)
3. Enable **Authentication** → Email/Password
4. Create **Firestore Database** (production mode)
5. Create **Firestore Database** (production mode)
6. Register a **Web app** and copy config values
7. Register an **Android/iOS app** for the mobile build
8. Set up **Cloudinary** for profile photos (see below)

### 2. Deploy Firebase Rules

```bash
firebase login
firebase init firestore storage
# Point to firebase/firestore.rules and firebase/storage.rules
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

### 3. Configure Environment

**Mobile Firebase** — already wired from `google-services.json` in `src/firebase/config.ts`.

**Cloudinary (profile photos)** — edit `src/config/cloudinary.ts`:

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. Copy your **Cloud Name**
3. Go to **Settings → Upload → Upload presets → Add upload preset**
   - Signing mode: **Unsigned**
   - Folder: `mcl-players` (optional)
4. Set values in `src/config/cloudinary.ts`:

```ts
export const CLOUDINARY = {
  cloudName: 'your_cloud_name',
  uploadPreset: 'your_unsigned_preset',
  folder: 'mcl-players',
};
```

**Admin** — copy `admin/.env.example` to `admin/.env` and fill in Firebase web config values.

### 4. Create Super Admin

1. In Firebase Console → **Authentication** → create a user (email/password), e.g. `admin@mcl2026.com`
2. Copy that user's **UID**
3. In **Firestore**, create document:

**Collection:** `admins`  
**Document ID:** `{that UID}`

```json
{
  "email": "admin@mcl2026.com",
  "role": "SUPER_ADMIN"
}
```

4. (Recommended) Also update `users/{UID}`:

```json
{
  "email": "admin@mcl2026.com",
  "role": "SUPER_ADMIN"
}
```

5. Sign in on the admin dashboard (`cd admin && npm run dev`) with that email/password.

> Admin login is blocked unless the UID exists in `admins` **or** `users.role == "SUPER_ADMIN"`.

Also initialize league settings:

```javascript
// Firestore: settings/league
{
  leagueName: "MCL 2026-27",
  season: "2026",
  registrationOpen: true,
  publicPlayerListEnabled: false,
  registrationDeadline: "2026-08-30"
}
```

Initialize player ID counter:

```javascript
// Firestore: counters/playerId
{ current: 0 }
```

### 5. Install & Run

**Mobile App:**

```bash
npm install
cd ios && bundle exec pod install && cd ..

# Android
npm run android

# iOS
npm run ios
```

**Admin Dashboard:**

```bash
cd admin
npm install
npm run dev
```

Open http://localhost:5173 and sign in with your Super Admin account.

## Design

Both apps use a premium cricket-themed design:

- **Primary:** Deep green `#0B3D2E`
- **Accent:** Gold `#C9A227`
- Card-based layouts, clean typography, responsive design

## Security

- Firebase Security Rules enforce role-based access
- Players can only read/update their own data
- Super Admin verified via `admins` collection or `users.role`
- No Admin SDK keys in client code
- Sensitive fields (CNIC, phone, email) excluded from public list

## Player ID Generation

Uses a Firestore transaction on `counters/playerId` to atomically generate unique IDs:

```
MCL-2026-001, MCL-2026-002, MCL-2026-003, ...
```

## Export Formats

| Format | Filename |
|--------|----------|
| Excel | `MCL_2026_Player_List.xlsx` |
| CSV | `MCL_2026_Player_List.csv` |
| PDF | Branded official player list |

## Not Included (By Design)

This is **not** a scoring app. The following are intentionally excluded:

- Live/ball-by-ball scoring
- Points tables & fixtures
- Tournament statistics
- Draft/auction system (only draft eligibility flag)

## Future Modules

The architecture supports adding later:

- Player Draft
- Team/Franchise Management
- Match Fixtures & Live Scoring
- Player Statistics

## License

Private — MCL 2026-27 League
