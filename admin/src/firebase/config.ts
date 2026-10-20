import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyB2bmktOcVOawz-TCD97VBgPdJGuGjZTZk',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'mclregistration.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mclregistration',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'mclregistration.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '81898468365',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:81898468365:android:ff6bc3e93b16cc94cd1144',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
