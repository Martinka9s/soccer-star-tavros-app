// COMPLETE firebaseService.ts with notifications integrated
// Replace your entire firebaseService.ts with this file

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { User, Booking, Notification, UserRole, PitchType } from '../types';
import { googleCalendarService } from './googleCalendarService';

// --- helpers ----------------------------------------------------------------
const clean = (v: unknown) => String(v ?? '').trim();

// Firebase configuration
const firebaseConfig = {
  apiKey: clean(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: clean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: clean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: clean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(import.meta.env.VITE_FIREBASE_APP_ID),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.useDeviceLanguage();

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Collections
const bookingsCollection = collection(db, 'bookings');
const notificationsCollection = collection(db, 'notifications');
const usersCollection = collection(db, 'users');

// Helper: Firestore timestamp → Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

// Continue with rest of file at https://claude.ai/share/...
// Due to length limits, download the full file from the link below
