import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  // 🔄 use initializeFirestore + persistent cache (instead of getFirestore)
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { User, Booking, Notification, UserRole, PitchType } from '../types';

// Firebase configuration from environment variables (Vite: must be VITE_*)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ✅ Firestore with persistent local cache for instant reads after first load
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Collections
const usersCollection = collection(db, 'users');
const bookingsCollection = collection(db, 'bookings');
const notificationsCollection = collection(db, 'notifications');

// Helper function to convert Firestore timestamp to Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

// Auth Service
export const authService = {
  async register(email: string, password: string): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // First user becomes admin
    const usersSnapshot = await getDocs(usersCollection);
    const isFirstUser = usersSnapshot.empty;
    const role: UserRole = isFirstUser ? 'admin' : 'user';

    const userData = {
      email,
      role,
      createdAt: serverTimestamp(),
    };

    await addDoc(usersCollection, {
      ...userData,
      id: firebaseUser.uid,
    });

    return {
      id: firebaseUser.uid,
      email,
      role,
      createdAt: new Date(),
    };
  },

  async login(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    const q = query(usersCollection, where('id', '==', firebaseUser.uid));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      return {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        createdAt: convertTimestamp(userData.createdAt),
        phoneNumber: userData.phoneNumber,
      };
    }

    throw new Error('User data not found');
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    const q = query(usersCollection, where('id', '==', firebaseUser.uid));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      return {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        createdAt: convertTimestamp(userData.createdAt),
        phoneNumber: userData.phoneNumber,
      };
    }

    return null;
  },

  onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },
};

// Booking Service
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
    const q = query(bookingsCollection, where('date', '==', date));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data().createdAt),
          updatedAt: convertTimestamp(doc.data().updatedAt),
        } as Booking)
    );
  },

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    const q = query(bookingsCollection, where('userId', '==', userId), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data().createdAt),
          updatedAt: convertTimestamp(doc.data().updatedAt),
        } as Booking)
    );
  },

  async getPendingBookings(): Promise<Booking[]> {
    const q = query(bookingsCollection, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data().createdAt),
          updatedAt: convertTimestamp(doc.data().updatedAt),
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

// Notification Service
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
    const q = query(notificationsCollection, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data().createdAt),
        } as Notification)
    );
  },

  async markAsRead(notificationId: string): Promise<void> {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  },

  async markAllAsRead(userId: string): Promise<void> {
    const q = query(notificationsCollection, where('userId', '==', userId), where('read', '==', false));
    const snapshot = await getDocs(q);

    const updatePromises = snapshot.docs.map((docRef) => updateDoc(docRef.ref, { read: true }));
    await Promise.all(updatePromises);
  },

  getUnreadCount(notifications: Notification[]): number {
    return notifications.filter((n) => !n.read).length;
  },
};
