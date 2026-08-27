import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';

// Values from android/app/google-services.json
const firebaseConfig = {
  apiKey: 'AIzaSyB2bmktOcVOawz-TCD97VBgPdJGuGjZTZk',
  authDomain: 'mclregistration.firebaseapp.com',
  projectId: 'mclregistration',
  storageBucket: 'mclregistration.firebasestorage.app',
  messagingSenderId: '81898468365',
  appId: '1:81898468365:android:ff6bc3e93b16cc94cd1144',
};

const appStorage = createAsyncStorage('mcl-auth');

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    try {
      auth = initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(appStorage),
      });
    } catch {
      // Auth already initialized (e.g. Fast Refresh)
      auth = getAuth(firebaseApp);
    }
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export { firebaseConfig };
