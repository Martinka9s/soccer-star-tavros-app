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
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { User, Booking, Notification, UserRole, PitchType } from '../types';

// --- helpers -----------------------------------------------------------------
const clean = (v: unknown) => String(v ?? '').trim();

// Firebase configuration (trimmed to avoid %0A / spaces in URLs)
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

// ✅ Firestore with persistent local cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Collections
const usersCollection = collection(db, 'users');
const bookingsCollection = collection(db, 'bookings');
const notificationsCollection = collection(db, 'notifications');

// Helper: Firestore timestamp → Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

/** Ensures users/{uid} exists; returns normalized User (no collection reads) */
async function ensureUserDoc(uid: string, email: string | null | undefined): Promise<User> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // 🚫 Do NOT read the whole users collection (rules will block).
    // Create a minimal profile with default role 'user'.
    const role: UserRole = 'user';

    await setDoc(
      ref,
      {
        id: uid,
        email: email || '',
        role,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      id: uid,
      email: email || '',
      role,
      createdAt: new Date(),
    };
  }

  const data = snap.data();
  return {
    id: data.id,
    email: data.email,
    role: data.role,
    createdAt: convertTimestamp(data.createdAt),
    phoneNumber: data.phoneNumber,
  };
}

export const authService = {
  /** Register user; create users/{uid} with role 'user' (no collection read) */
  async register(email: string, password: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const role: UserRole = 'user'; // default; promote manually in Console if needed

    await setDoc(
      doc(db, 'users', uid),
      {
        id: uid,
        email,
        role,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      id: uid,
      email,
      role,
      createdAt: new Date(),
    };
  },

  /** Login + ensure/fetch profile; if Firestore fails, return provisional user */
  async login(email: string, password: string): Promise<User> {
    console.log('TRY LOGIN', email);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log('LOGIN OK', cred.user.uid);

    try {
      return await ensureUserDoc(cred.user.uid, cred.user.email || email);
    } catch (e) {
      console.warn('Firestore unavailable during login; using provisional user', e);
      return {
        id: cred.user.uid,
        email: cred.user.email || email,
        role: 'user',
        createdAt: new Date(),
      };
    }
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  /** Current user from auth; if Firestore fails, return provisional user */
  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      return await ensureUserDoc(firebaseUser.uid, firebaseUser.email);
    } catch (e) {
      console.warn('Firestore unavailable in getCurrentUser; using provisional user', e);
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        role: 'user',
        createdAt: new Date(),
      };
    }
  },

  onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  /** Forgot password */
  async sendReset(email: string) {
    await sendPasswordResetEmail(auth, email);
  },
};

// --- BOOKINGS ----------------------------------------------------------------

export const bookingService = {
  async createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(bookingsCollection, {
      ...bookingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getBookingsByDate(date: string): Promise<Booking[]> {
    const qy = query(bookingsCollection, where('date', '==', date));
    const snapshot = await getDocs(qy);

    return snapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
          createdAt: convertTimestamp(d.data().createdAt),
          updatedAt: convertTimestamp(d.data().updatedAt),
        } as Booking)
    );
  },

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    const qy = query(bookingsCollection, where('userId', '==', userId), orderBy('date', 'desc'));
    const snapshot = await getDocs(qy);

    return snapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
          createdAt: convertTimestamp(d.data().createdAt),
          updatedAt: convertTimestamp(d.data().updatedAt),
        } as Booking)
    );
  },

  async getPendingBookings(): Promise<Booking[]> {
    const qy = query(bookingsCollection, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(qy);

    return snapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
          createdAt: convertTimestamp(d.data().createdAt),
          updatedAt: convertTimestamp(d.data().updatedAt),
        } as Booking)
    );
  },

  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<void> {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteBooking(bookingId: string): Promise<void> {
    const bookingRef = doc(db, 'bookings', bookingId);
    await deleteDoc(bookingRef);
  },

  async getBooking(bookingId: string): Promise<Booking | null> {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingDoc = await getDoc(bookingRef);

    if (bookingDoc.exists()) {
      return {
        id: bookingDoc.id,
        ...bookingDoc.data(),
        createdAt: convertTimestamp(bookingDoc.data().createdAt),
        updatedAt: convertTimestamp(bookingDoc.data().updatedAt),
      } as Booking;
    }

    return null;
  },
};

// --- NOTIFICATIONS -----------------------------------------------------------

export const notificationService = {
  async createNotification(
    userId: string,
    type: 'approved' | 'rejected' | 'cancelled',
    bookingId: string,
    pitchType: PitchType,
    date: string,
    startTime: string,
    message: string
  ): Promise<void> {
    await addDoc(notificationsCollection, {
      userId,
      type,
      bookingId,
      pitchType,
      date,
      startTime,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
  },

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    const qy = query(notificationsCollection, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(qy);

    return snapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
          createdAt: convertTimestamp(d.data().createdAt),
        } as Notification)
    );
  },

  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  },

  async markAllAsRead(userId: string): Promise<void> {
    const qy = query(notificationsCollection, where('userId', '==', userId), where('read', '==', false));
    const snapshot = await getDocs(qy);
    const updatePromises = snapshot.docs.map((d) => updateDoc(d.ref, { read: true }));
    await Promise.all(updatePromises);
  },

  getUnreadCount(notifications: Notification[]): number {
    return notifications.filter((n) => !n.read).length;
  },
};
