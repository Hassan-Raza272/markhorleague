/**
 * Run this script once after setting up Firebase to initialize required documents.
 *
 * Usage:
 *   1. Set up Firebase project and download service account key
 *   2. npm install firebase-admin (dev only)
 *   3. GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json node firebase/setup.js
 *
 * Or manually create these Firestore documents via Firebase Console.
 */

console.log(`
=== MCL 2026-27 Firebase Setup ===

Create the following Firestore documents manually:

1. settings/league
   {
     "leagueName": "MCL 2026-27",
     "season": "2026",
     "registrationOpen": true,
     "publicPlayerListEnabled": false,
     "registrationDeadline": "2026-08-30"
   }

2. counters/playerId
   { "current": 0 }

3. admins/{YOUR_ADMIN_UID}
   { "email": "admin@mcl2026.com", "role": "SUPER_ADMIN" }

4. Create admin user in Firebase Authentication (Email/Password)

Then deploy security rules:
   firebase deploy --only firestore:rules,storage:rules,firestore:indexes
`);
